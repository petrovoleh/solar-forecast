#!/usr/bin/env python3
"""
Compare two forecasting models on PVGIS/Open-Meteo data and report a rich
set of error metrics:

- MAE, RMSE, R²
- MAPE, sMAPE (with an optional floor to avoid night-time divide-by-zero)
- Bias (mean error)

The script loads (or trains, if requested) an XGBoost and a RandomForest
regressor, scores them on a held-out location, writes the metrics to CSV,
saves the full prediction table, and produces a prediction overlay plot
plus a PNG rendering of the metrics table for quick visual inspection.
"""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from io import StringIO
import pathlib
from typing import Dict, Tuple

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import requests
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor


FEATURE_COLUMNS = [
    "temperature_2m",
    "cloudcover",
    "shortwave_radiation",
    "wind_speed_10m",
    "hour_sin",
    "hour_cos",
    "day_sin",
    "day_cos",
]


@dataclass
class ModelBundle:
    name: str
    model: object
    feature_names: Tuple[str, ...]


def get_pvgis_data(lat: float, lon: float, start_year: int = 2016, end_year: int = 2023) -> pd.DataFrame:
    """Download hourly PVGIS PV production data and clean it."""

    url = (
        "https://re.jrc.ec.europa.eu/api/seriescalc?"
        f"lat={lat}&lon={lon}"
        f"&startyear={start_year}&endyear={end_year}"
        "&raddatabase=PVGIS-ERA5"
        "&pvcalculation=1"
        "&peakpower=1"
        "&pvtechchoice=crystSi"
        "&loss=14"
        "&mountingplace=free"
        "&angle=35"
        "&aspect=180"
        "&usehorizon=1"
        "&outputformat=csv"
    )

    try:
        response = requests.get(url, timeout=60)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise RuntimeError(f"Failed to fetch PVGIS data for lat={lat}, lon={lon}: {exc}") from exc
    text = response.text.strip().replace("\r", "")

    lines = text.splitlines()
    start_idx = next((i for i, line in enumerate(lines) if line.lower().startswith("time")), None)
    if start_idx is None:
        raise ValueError("CSV table not found in PVGIS response")

    csv_data = "\n".join(lines[start_idx:])
    df = pd.read_csv(StringIO(csv_data))
    df.columns = [c.strip() for c in df.columns]

    time_col = next((c for c in df.columns if "time" in c.lower()), None)
    if not time_col:
        raise ValueError("CSV response is missing a time column")

    df["time_str"] = (
        df[time_col]
        .astype(str)
        .str.replace(":", " ", regex=False)
        .str.replace(r"(\d{4})(\d{2})(\d{2})", r"\1-\2-\3", regex=True)
    )
    df["time"] = pd.to_datetime(df["time_str"], format="%Y-%m-%d %H%M", utc=True, errors="coerce")

    df["P"] = (
        df["P"]
        .astype(str)
        .str.replace(",", ".", regex=False)
        .replace(["", "nan", "None"], np.nan)
    )
    df["P"] = pd.to_numeric(df["P"], errors="coerce")

    df = df.dropna(subset=["time", "P"]).reset_index(drop=True)
    df = df.rename(columns={"P": "power_PVGIS_W_per_kWp"})
    return df


def get_openmeteo(lat: float, lon: float, start_date: str = "2016-01-01", end_date: str = "2023-12-31") -> pd.DataFrame:
    """Load historical weather data from Open-Meteo ERA5 archive."""

    url = (
        f"https://archive-api.open-meteo.com/v1/era5?"
        f"latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}"
        f"&hourly=temperature_2m,cloudcover,shortwave_radiation,wind_speed_10m"
    )
    try:
        response = requests.get(url, timeout=60)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise RuntimeError(f"Failed to fetch Open-Meteo data for lat={lat}, lon={lon}: {exc}") from exc
    data = response.json()

    return pd.DataFrame(
        {
            "time": pd.to_datetime(data["hourly"]["time"], utc=True),
            "temperature_2m": data["hourly"]["temperature_2m"],
            "cloudcover": data["hourly"]["cloudcover"],
            "shortwave_radiation": data["hourly"]["shortwave_radiation"],
            "wind_speed_10m": data["hourly"]["wind_speed_10m"],
        }
    )


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["hour"] = df["time"].dt.hour
    df["dayofyear"] = df["time"].dt.dayofyear
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
    df["day_sin"] = np.sin(2 * np.pi * df["dayofyear"] / 365)
    df["day_cos"] = np.cos(2 * np.pi * df["dayofyear"] / 365)
    return df


def build_dataset(lat: float, lon: float, year: int, start_year: int) -> pd.DataFrame:
    df_pv = get_pvgis_data(lat, lon, start_year, year)
    df_weather = get_openmeteo(lat, lon, f"{start_year}-01-01", f"{year}-12-31")
    df = pd.merge_asof(df_pv.sort_values("time"), df_weather.sort_values("time"), on="time")
    return prepare_features(df.dropna(subset=["power_PVGIS_W_per_kWp"]))


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray, mape_floor: float = 0.0) -> Dict[str, float]:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    mask = np.isfinite(y_true) & np.isfinite(y_pred)
    y_true = y_true[mask]
    y_pred = y_pred[mask]

    mae = mean_absolute_error(y_true, y_pred)
    try:
        rmse = mean_squared_error(y_true, y_pred, squared=False)
    except TypeError:
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)

    if mape_floor > 0:
        rel_mask = np.abs(y_true) >= mape_floor
        y_true_rel = y_true[rel_mask]
        y_pred_rel = y_pred[rel_mask]
    else:
        y_true_rel = y_true
        y_pred_rel = y_pred

    if y_true_rel.size == 0:
        mape = float("nan")
        smape = float("nan")
    else:
        denom = np.maximum(np.abs(y_true_rel), 1e-6)
        mape = np.mean(np.abs((y_pred_rel - y_true_rel) / denom)) * 100.0
        smape = np.mean(
            200.0 * np.abs(y_pred_rel - y_true_rel) / (np.abs(y_true_rel) + np.abs(y_pred_rel) + 1e-6)
        )
    bias = float(np.mean(y_pred - y_true))

    return {
        "MAE": float(mae),
        "RMSE": float(rmse),
        "R²": float(r2),
        "MAPE%": float(mape),
        "sMAPE%": float(smape),
        "Bias": bias,
    }


def train_xgb_model(train_df: pd.DataFrame, estimators: int, max_depth: int, learning_rate: float) -> XGBRegressor:
    model = XGBRegressor(
        n_estimators=estimators,
        max_depth=max_depth,
        learning_rate=learning_rate,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
    )
    model.fit(train_df[FEATURE_COLUMNS], train_df["power_PVGIS_W_per_kWp"])
    return model


def train_rf_model(train_df: pd.DataFrame, estimators: int, max_depth: int) -> RandomForestRegressor:
    model = RandomForestRegressor(
        n_estimators=estimators,
        max_depth=max_depth,
        n_jobs=-1,
        random_state=42,
    )
    model.fit(train_df[FEATURE_COLUMNS], train_df["power_PVGIS_W_per_kWp"])
    return model


def load_or_train_models(
        args: argparse.Namespace, train_df: pd.DataFrame | None
) -> Tuple[ModelBundle, ModelBundle]:
    if args.xgb_model.exists() and not args.force_retrain:
        xgb_model = joblib.load(args.xgb_model)
        xgb_features = tuple(joblib.load(args.xgb_features))
    else:
        if train_df is None:
            raise RuntimeError("Training data is required to (re)train the XGBoost model.")
        xgb_model = train_xgb_model(train_df, args.xgb_estimators, args.xgb_max_depth, args.xgb_learning_rate)
        joblib.dump(xgb_model, args.xgb_model)
        joblib.dump(FEATURE_COLUMNS, args.xgb_features)
        xgb_features = tuple(FEATURE_COLUMNS)

    if args.rf_model.exists() and not args.force_retrain:
        rf_model = joblib.load(args.rf_model)
        rf_features = tuple(joblib.load(args.rf_features))
    else:
        if train_df is None:
            raise RuntimeError("Training data is required to (re)train the RandomForest model.")
        rf_model = train_rf_model(train_df, args.rf_estimators, args.rf_max_depth)
        joblib.dump(rf_model, args.rf_model)
        joblib.dump(FEATURE_COLUMNS, args.rf_features)
        rf_features = tuple(FEATURE_COLUMNS)

    return (
        ModelBundle("XGBoost", xgb_model, xgb_features),
        ModelBundle("RandomForest", rf_model, rf_features),
    )


def evaluate_models(
        df_eval: pd.DataFrame, models: Tuple[ModelBundle, ModelBundle], mape_floor: float
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    y_true = df_eval["power_PVGIS_W_per_kWp"].to_numpy()

    preds = {}
    metrics = {}
    for bundle in models:
        X = df_eval[list(bundle.feature_names)]
        y_pred = bundle.model.predict(X)
        y_pred = np.clip(y_pred, 0.0, None)
        preds[bundle.name] = y_pred
        metrics[bundle.name] = compute_metrics(y_true, y_pred, mape_floor)

    metrics_df = pd.DataFrame(metrics).T
    results = df_eval[["time", "power_PVGIS_W_per_kWp"]].copy()
    results = results.rename(columns={"power_PVGIS_W_per_kWp": "actual"})
    for name, pred in preds.items():
        results[f"pred_{name.lower()}"] = pred

    return metrics_df, results


def plot_predictions(results: pd.DataFrame, plot_days: int, lat: float, lon: float, year: int, output_dir: os.PathLike) -> str:
    os.makedirs(output_dir, exist_ok=True)

    results = results.copy()
    results["time"] = pd.to_datetime(results["time"], utc=True)
    results = results.sort_values("time")

    if plot_days > 0 and not results.empty:
        last_ts = results["time"].max()
        cutoff = last_ts - pd.Timedelta(days=plot_days)
        results = results[results["time"] >= cutoff]

    plt.figure(figsize=(14, 6))
    plt.plot(results["time"], results["actual"], label="Actual")
    for col in [c for c in results.columns if c.startswith("pred_")]:
        plt.plot(results["time"], results[col], label=col.replace("pred_", "").title())

    plt.xlabel("Time (UTC)")
    plt.ylabel("Power (W per kWp)")
    plt.title(f"Model predictions vs actual — last {plot_days} days (lat={lat}, lon={lon}, year={year})")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()

    filename = f"model_comparison_{lat}_{lon}_{year}.png"
    plot_path = os.fspath(os.path.join(output_dir, filename))
    plt.savefig(plot_path, dpi=200, bbox_inches="tight")
    plt.close()
    return plot_path


def save_metrics_table(metrics_df: pd.DataFrame, output_dir: os.PathLike) -> str:
    os.makedirs(output_dir, exist_ok=True)

    formatted = metrics_df.copy()
    formatted.index.name = "Model"
    formatted.reset_index(inplace=True)
    formatted = formatted[[col for col in formatted.columns if col is not None]]

    for col in formatted.columns:
        if col == "Model":
            continue
        formatted[col] = formatted[col].apply(
            lambda v: f"{v:.5f}" if isinstance(v, (float, int, np.floating)) and np.isfinite(v) else str(v)
        )

    fig, ax = plt.subplots(figsize=(10, 1 + 0.6 * len(formatted)))
    ax.axis("off")

    table_data = formatted.values.tolist()
    col_labels = formatted.columns.tolist()
    table = ax.table(cellText=table_data, colLabels=col_labels, loc="center")
    table.auto_set_font_size(False)
    table.set_fontsize(10)
    table.scale(1, 1.2)

    for (row, col), cell in table.get_celld().items():
        if row == 0:
            cell.set_facecolor("#f0f0f0")
            cell.set_text_props(weight="bold")

    fig.tight_layout()
    out_path = os.fspath(os.path.join(output_dir, "model_metrics_table_after_removing_0.png"))
    fig.savefig(out_path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    return out_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compare two trained models on PVGIS/Open-Meteo data")
    parser.add_argument("--train-lat", type=float, default=54.6872, help="Latitude for training data (default: Vilnius)")
    parser.add_argument("--train-lon", type=float, default=25.2797, help="Longitude for training data (default: Vilnius)")
    parser.add_argument("--eval-lat", type=float, default=54.8979, help="Latitude for evaluation data (default: Kaunas)")
    parser.add_argument("--eval-lon", type=float, default=23.8869, help="Longitude for evaluation data (default: Kaunas)")
    parser.add_argument("--year", type=int, default=2023, help="End year for PVGIS/Open-Meteo data")
    parser.add_argument("--start-year", type=int, default=2016, help="First year to include in the historical data")
    parser.add_argument("--plot-days", type=int, default=7, help="How many trailing days to include in the plot")
    parser.add_argument(
        "--mape-floor",
        type=float,
        default=0.0,
        help="Ignore points below this absolute actual value when computing MAPE/sMAPE (helps with night hours)",
    )

    parser.add_argument("--xgb-model", type=pathlib.Path, default=pathlib.Path("model.joblib"), help="Path to the XGBoost model file")
    parser.add_argument(
        "--xgb-features", type=pathlib.Path, default=pathlib.Path("model_features.joblib"), help="Path to the stored XGBoost feature list"
    )
    parser.add_argument("--rf-model", type=pathlib.Path, default=pathlib.Path("model_rf.joblib"), help="Path to the RandomForest model file")
    parser.add_argument(
        "--rf-features",
        type=pathlib.Path,
        default=pathlib.Path("model_rf_features.joblib"),
        help="Path to the stored RandomForest feature list",
    )

    parser.add_argument("--xgb-estimators", type=int, default=600, help="Number of estimators for XGBoost training")
    parser.add_argument("--xgb-max-depth", type=int, default=6, help="Max depth for XGBoost training")
    parser.add_argument("--xgb-learning-rate", type=float, default=0.05, help="Learning rate for XGBoost training")
    parser.add_argument("--rf-estimators", type=int, default=300, help="Number of trees for RandomForest training")
    parser.add_argument("--rf-max-depth", type=int, default=12, help="Max depth for RandomForest training")

    parser.add_argument(
        "--force-retrain",
        action="store_true",
        help="Retrain both models even if model artifacts already exist",
    )
    parser.add_argument(
        "--train-if-missing",
        dest="train_if_missing",
        action="store_true",
        default=True,
        help="Train models when artifacts are missing (default: enabled)",
    )
    parser.add_argument(
        "--no-train-if-missing",
        dest="train_if_missing",
        action="store_false",
        help="Fail instead of training when artifacts are missing",
    )

    parser.add_argument(
        "--output-dir",
        type=pathlib.Path,
        default=pathlib.Path("data"),
        help="Directory to write metrics and prediction CSV files",
    )
    parser.add_argument("--plots-dir", type=pathlib.Path, default=pathlib.Path("plots"), help="Directory to write plots")

    return parser.parse_args()


def main() -> None:
    args = parse_args()

    needs_training = args.force_retrain or not (
            args.xgb_model.exists()
            and args.xgb_features.exists()
            and args.rf_model.exists()
            and args.rf_features.exists()
    )
    train_df = None

    if needs_training and not args.train_if_missing:
        raise FileNotFoundError("Model artifacts missing; rerun with --train-if-missing to train them automatically.")

    if needs_training:
        print("Preparing training dataset...")
        train_df = build_dataset(args.train_lat, args.train_lon, args.year, args.start_year)

    print("Loading evaluation dataset...")
    eval_df = build_dataset(args.eval_lat, args.eval_lon, args.year, args.start_year)

    xgb_bundle, rf_bundle = load_or_train_models(args, train_df)

    metrics_df, results_df = evaluate_models(eval_df, (xgb_bundle, rf_bundle), args.mape_floor)

    os.makedirs(args.output_dir, exist_ok=True)
    metrics_path = args.output_dir / "model_metrics_comparison.csv"
    results_path = args.output_dir / "model_predictions_comparison.csv"
    metrics_df.to_csv(metrics_path)
    results_df.to_csv(results_path, index=False)

    print("\n=== Metrics ===")
    print(metrics_df)
    print(f"\nMetrics saved to: {metrics_path}")
    print(f"Predictions saved to: {results_path}")

    plot_path = plot_predictions(results_df, args.plot_days, args.eval_lat, args.eval_lon, args.year, args.plots_dir)
    metrics_table_path = save_metrics_table(metrics_df, args.plots_dir)
    print(f"Prediction plot saved to: {plot_path}")
    print(f"Metrics table saved to: {metrics_table_path}")


if __name__ == "__main__":
    main()