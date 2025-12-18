import pandas as pd
import numpy as np
import requests
from io import StringIO
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import matplotlib.pyplot as plt
import os
import joblib
# ============================================================
# 1. PVGIS data ingestion
# ============================================================


def get_pvgis_data(lat: float, lon: float, year: int = 2023) -> pd.DataFrame:
    """
    Download yearly solar production data from PVGIS (ERA5)
    with pvcalculation=1. Supports timestamps like 20230101:0030.
    """

    os.makedirs("data", exist_ok=True)

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

    print(f"\nFetching PVGIS (ERA5) data for {year}...")
    print(f"URL: {url}")

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
    except Exception as e:
        raise RuntimeError(f"PVGIS request failed: {e}")

    text = response.text.strip().replace("\r", "")
    with open("data/pvgis_last_response.txt", "w", encoding="utf-8") as f:
        f.write(text)

    # Find where the table begins
    lines = text.splitlines()
    start_idx = next((i for i, l in enumerate(lines) if l.lower().startswith("time")), None)
    if start_idx is None:
        raise ValueError("CSV table not found in PVGIS response. Check data/pvgis_last_response.txt")

    csv_data = "\n".join(lines[start_idx:])
    df = pd.read_csv(StringIO(csv_data))
    df.columns = [c.strip() for c in df.columns]

    print(f"CSV columns: {df.columns.tolist()}")

    # === Time processing ===
    time_col = next((c for c in df.columns if "time" in c.lower()), None)
    if not time_col:
        raise ValueError("CSV response is missing a time column (time/time(UTC))")

    # Reformat timestamps: 20230101:0030 → 2023-01-01 00:30
    df["time_str"] = (
        df[time_col]
        .astype(str)
        .str.replace(":", " ", regex=False)
        .str.replace(r"(\d{4})(\d{2})(\d{2})", r"\1-\2-\3", regex=True)
    )
    df["time"] = pd.to_datetime(df["time_str"], format="%Y-%m-%d %H%M", utc=True, errors="coerce")

    # === Power output P ===
    if "P" not in df.columns:
        raise ValueError("CSV response is missing the 'P' (power) column.")

    df["P"] = (
        df["P"]
        .astype(str)
        .str.replace(",", ".", regex=False)
        .str.replace(" ", "", regex=False)
        .replace(["", "nan", "None"], np.nan)
    )
    df["P"] = pd.to_numeric(df["P"], errors="coerce")

    # === Temperature ===
    if "T2m" in df.columns:
        df = df.rename(columns={"T2m": "temp_air"})
    elif "Temp" in df.columns:
        df = df.rename(columns={"Temp": "temp_air"})

    # === Cleaning ===
    df = df.dropna(subset=["time", "P"]).reset_index(drop=True)
    df = df.rename(columns={"P": "power_PVGIS_W_per_kWp"})

    if len(df) == 0:
        raise ValueError("PVGIS returned a table without valid power values.")

    print(f"Loaded {len(df)} rows of PVGIS data (ERA5, {year})")
    print("Sample data:")
    print(df.head(5)[["time", "power_PVGIS_W_per_kWp", "temp_air"]])

    return df

# ============================================================
# 2. Weather ingestion from Open-Meteo
# ============================================================
def get_openmeteo(lat, lon, start="2016-01-01", end="2023-12-31"):
    url = (
        f"https://archive-api.open-meteo.com/v1/era5?"
        f"latitude={lat}&longitude={lon}&start_date={start}&end_date={end}"
        f"&hourly=temperature_2m,cloudcover,shortwave_radiation,wind_speed_10m"
    )
    r = requests.get(url)
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
# 3. Feature preparation
# ============================================================
def prepare_features(df):
    df = df.copy()
    df["hour"] = df["time"].dt.hour
    df["dayofyear"] = df["time"].dt.dayofyear
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
    df["day_sin"] = np.sin(2 * np.pi * df["dayofyear"] / 365)
    df["day_cos"] = np.cos(2 * np.pi * df["dayofyear"] / 365)
    return df


# ============================================================
# 4. Training and testing
# ============================================================
def train_and_test(train_lat, train_lon, test_lat, test_lon, year=2023):
    os.makedirs("data", exist_ok=True)

    # --- Training ---
    print("Loading data for Vilnius...")
    vilnius_pv = get_pvgis_data(train_lat, train_lon, year)
    vilnius_weather = get_openmeteo(train_lat, train_lon)

    df_train = pd.merge_asof(
        vilnius_pv.sort_values("time"),
        vilnius_weather.sort_values("time"),
        on="time",
    )

    df_train = df_train.dropna(subset=["power_PVGIS_W_per_kWp"])
    df_train = prepare_features(df_train)
    train_path = "data/train_vilnius_2023.csv"
    df_train.to_csv(train_path, index=False)
    print(f"Training data saved to {train_path}")

    X_train = df_train[
        [
            "temperature_2m",
            "cloudcover",
            "shortwave_radiation",
            "wind_speed_10m",
            "hour_sin",
            "hour_cos",
            "day_sin",
            "day_cos",
        ]
    ]
    y_train = df_train["power_PVGIS_W_per_kWp"]

    print("Training XGBoost model...")
    model = XGBRegressor(
        n_estimators=600,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
    )
    model.fit(X_train, y_train)
    print("Model trained.")
    joblib.dump(model, "model.joblib")
    # Save the feature list to preserve ordering during inference
    features = ["temperature_2m","cloudcover","shortwave_radiation","wind_speed_10m","hour_sin","hour_cos","day_sin","day_cos"]
    joblib.dump(features, "model_features.joblib")
    # --- Testing ---
    print("\nLoading data for Kaunas...")
    kaunas_pv = get_pvgis_data(test_lat, test_lon, year)
    kaunas_weather = get_openmeteo(test_lat, test_lon)

    df_test = pd.merge_asof(
        kaunas_pv.sort_values("time"),
        kaunas_weather.sort_values("time"),
        on="time",
    )
    df_test = df_test.dropna(subset=["power_PVGIS_W_per_kWp"])
    df_test = prepare_features(df_test)

    test_path = "data/test_kaunas_2023.csv"
    df_test.to_csv(test_path, index=False)
    print(f"Test data saved to {test_path}")

    X_test = df_test[
        [
            "temperature_2m",
            "cloudcover",
            "shortwave_radiation",
            "wind_speed_10m",
            "hour_sin",
            "hour_cos",
            "day_sin",
            "day_cos",
        ]
    ]
    y_test = df_test["power_PVGIS_W_per_kWp"]

    print("Calculating metrics...")
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print("\nResults:")
    print(f"MAE: {mae:.2f} W/kWp")
    print(f"R² : {r2:.3f}")

    plt.figure(figsize=(10, 4))
    plt.plot(y_test.values[:200], label="Kaunas PVGIS (actual)")
    plt.plot(y_pred[:200], label="Predicted", alpha=0.7)
    plt.legend()
    plt.title("Forecast for Kaunas (trained on Vilnius, 2023 data)")
    plt.tight_layout()
    plt.show()


# ============================================================
# 5. Entry point
# ============================================================
if __name__ == "__main__":
    train_and_test(54.6872, 25.2797, 54.8979, 23.8869, 2023)
