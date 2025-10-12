#!/usr/bin/env python3
import pandas as pd
import numpy as np
import requests
from io import StringIO
import os
import joblib
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# ============================================================
# 1️⃣ PVGIS data ingestion
# ============================================================
def get_pvgis_data(lat: float, lon: float, year: int = 2023) -> pd.DataFrame:
    url = (
        "https://re.jrc.ec.europa.eu/api/seriescalc?"
        f"lat={lat}&lon={lon}"
        f"&startyear=2016&endyear={year}"
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

    print(f"\n➡️ Отримую PVGIS дані для ({lat}, {lon}) {year}")
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    text = response.text.strip().replace("\r", "")

    lines = text.splitlines()
    start_idx = next((i for i, l in enumerate(lines) if l.lower().startswith("time")), None)
    if start_idx is None:
        raise ValueError("❌ Не знайдено таблицю CSV у відповіді PVGIS!")
    csv_data = "\n".join(lines[start_idx:])
    df = pd.read_csv(StringIO(csv_data))
    df.columns = [c.strip() for c in df.columns]

    time_col = next((c for c in df.columns if "time" in c.lower()), None)
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
    df = df.dropna(subset=["time", "P"]).rename(columns={"P": "power_PVGIS_W_per_kWp"}).reset_index(drop=True)
    return df


# ============================================================
# 2️⃣ Open-Meteo API
# ============================================================
def get_openmeteo(lat, lon, start="2016-01-01", end="2023-12-31"):
    url = (
        f"https://archive-api.open-meteo.com/v1/era5?"
        f"latitude={lat}&longitude={lon}&start_date={start}&end_date={end}"
        f"&hourly=temperature_2m,cloudcover,shortwave_radiation,wind_speed_10m"
    )
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    data = r.json()
    df = pd.DataFrame(
        {
            "time": pd.to_datetime(data["hourly"]["time"], utc=True),
            "temperature_2m": data["hourly"]["temperature_2m"],
            "cloudcover": data["hourly"]["cloudcover"],
            "shortwave_radiation": data["hourly"]["shortwave_radiation"],
            "wind_speed_10m": data["hourly"]["wind_speed_10m"],
        }
    )
    return df


# ============================================================
# 3️⃣ Feature engineering
# ============================================================
def prepare_features(df):
    df["hour"] = df["time"].dt.hour
    df["dayofyear"] = df["time"].dt.dayofyear
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
    df["day_sin"] = np.sin(2 * np.pi * df["dayofyear"] / 365)
    df["day_cos"] = np.cos(2 * np.pi * df["dayofyear"] / 365)
    return df


# ============================================================
# 4️⃣ Metrics
# ============================================================
def compute_metrics(y_true, y_pred):
    # Convert to NumPy and drop NaN/Inf values
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    mask = np.isfinite(y_true) & np.isfinite(y_pred)
    y_true = y_true[mask]
    y_pred = y_pred[mask]

    mae = mean_absolute_error(y_true, y_pred)

    # Support both older and newer sklearn versions:
    try:
        # Newer versions (>=0.22)
        rmse = mean_squared_error(y_true, y_pred, squared=False)
    except TypeError:
        # Older versions — compute MSE and take the square root
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))

    r2 = r2_score(y_true, y_pred)

    # Stable MAPE / sMAPE
    denom = np.maximum(np.abs(y_true), 1e-6)
    mape = np.mean(np.abs((y_pred - y_true) / denom)) * 100.0
    smape = np.mean(200.0 * np.abs(y_pred - y_true) / (np.abs(y_true) + np.abs(y_pred) + 1e-6))
    bias = float(np.mean(y_pred - y_true))

    return {
        "MAE": float(mae),
        "RMSE": float(rmse),
        "R²": float(r2),
        "MAPE%": float(mape),
        "sMAPE%": float(smape),
        "Bias": bias,
    }


# ============================================================
# 5️⃣ Loading models and testing
# ============================================================
def evaluate_saved_models(test_lat=54.8979, test_lon=23.8869, year=2023):
    os.makedirs("data", exist_ok=True)
    print(f"📥 Завантажую тестові дані (Каунас, {year})...")
    df_pv = get_pvgis_data(test_lat, test_lon, year)
    df_weather = get_openmeteo(test_lat, test_lon)
    df_test = pd.merge_asof(
        df_pv.sort_values("time"),
        df_weather.sort_values("time"),
        on="time",
    ).dropna(subset=["power_PVGIS_W_per_kWp"])

    df_test = prepare_features(df_test)

    # Load both models
    model_xgb = joblib.load("model.joblib")
    features_xgb = joblib.load("model_features.joblib")

    model_rf = joblib.load("model_rf.joblib")
    features_rf = joblib.load("model_rf_features.joblib")

    X_xgb = df_test[features_xgb]
    X_rf = df_test[features_rf]
    y_true = df_test["power_PVGIS_W_per_kWp"]

    print("⚡ Прогнозую XGBoost...")
    y_pred_xgb = model_xgb.predict(X_xgb)

    print("🌲 Прогнозую RandomForest...")
    y_pred_rf = model_rf.predict(X_rf)

    metrics_xgb = compute_metrics(y_true, y_pred_xgb)
    metrics_rf = compute_metrics(y_true, y_pred_rf)

    df_cmp = pd.DataFrame([metrics_rf, metrics_xgb], index=["RandomForest", "XGBoost"])
    print("\n🌞 === Порівняння моделей (готові моделі) ===")
    print(df_cmp.round(3))

    df_out = df_test[["time"]].copy()
    df_out["actual"] = y_true.values
    df_out["pred_xgb"] = y_pred_xgb
    df_out["pred_rf"] = y_pred_rf
    df_out.to_csv("data/results_evaluated_models.csv", index=False)

    print("\n📁 Збережено результати у data/results_evaluated_models.csv")


# ============================================================
# 6️⃣ Entry point
# ============================================================
if __name__ == "__main__":
    evaluate_saved_models()
