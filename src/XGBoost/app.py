#!/usr/bin/env python3
import io
import joblib
import pandas as pd
import numpy as np
import requests
import matplotlib.pyplot as plt
from fastapi import FastAPI, Query, HTTPException, Response
from fastapi.responses import JSONResponse, StreamingResponse
from datetime import datetime
from typing import Optional

app = FastAPI(title="PV Forecast API", version="1.1")

MODEL_PATH = "model.joblib"
FEATURES_PATH = "model_features.joblib"


# ============================================================
# 1️⃣ Завантаження моделі
# ============================================================
def load_model():
    try:
        model = joblib.load(MODEL_PATH)
        features = joblib.load(FEATURES_PATH)
        return model, features
    except Exception as e:
        raise RuntimeError(f"❌ Failed to load model: {e}")


# ============================================================
# 2️⃣ Отримання погоди
# ============================================================
def fetch_open_meteo(lat: float, lon: float, start_date: str, end_date: str) -> pd.DataFrame:
    url = (
        "https://archive-api.open-meteo.com/v1/era5?"
        f"latitude={lat}&longitude={lon}"
        f"&start_date={start_date}&end_date={end_date}"
        f"&hourly=temperature_2m,cloudcover,shortwave_radiation,wind_speed_10m"
        "&timezone=UTC"
    )

    r = requests.get(url, timeout=30)
    if r.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Open-Meteo error: {r.text[:200]}")
    data = r.json()

    if "hourly" not in data:
        raise HTTPException(status_code=500, detail="❌ Open-Meteo did not return hourly data")

    df = pd.DataFrame({
        "time": pd.to_datetime(data["hourly"]["time"], utc=True),
        "temperature_2m": data["hourly"]["temperature_2m"],
        "cloudcover": data["hourly"]["cloudcover"],
        "shortwave_radiation": data["hourly"]["shortwave_radiation"],
        "wind_speed_10m": data["hourly"]["wind_speed_10m"],
    })
    return df


# ============================================================
# 3️⃣ Генерація фіч
# ============================================================
def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["hour"] = df["time"].dt.hour
    df["dayofyear"] = df["time"].dt.dayofyear
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
    df["day_sin"] = np.sin(2 * np.pi * df["dayofyear"] / 365)
    df["day_cos"] = np.cos(2 * np.pi * df["dayofyear"] / 365)
    return df


# ============================================================
# 4️⃣ Прогноз
# ============================================================
def predict_for_range(lat, lon, start_date, end_date, kWp, model, features):
    df_weather = fetch_open_meteo(lat, lon, start_date, end_date)
    df_feat = prepare_features(df_weather)
    X = df_feat[features].fillna(0)
    preds_w_per_kwp = model.predict(X)
    preds_w = preds_w_per_kwp * float(kWp)
    res = pd.DataFrame({
        "time": df_feat["time"],
        "pred_W": preds_w,
        "pred_kW": preds_w / 1000.0,
        "pred_W_per_kWp": preds_w_per_kwp,
    })
    return res


# ============================================================
# 5️⃣ Побудова графіка
# ============================================================
def make_plot(df, start_date, end_date, lat, lon, kwp):
    buf = io.BytesIO()
    plt.figure(figsize=(10, 5))
    plt.plot(df["time"], df["pred_kW"], color="orange", lw=1.8, label="Predicted Power (kW)")
    plt.title(f"PV Forecast {start_date} → {end_date} | {lat:.3f},{lon:.3f} | {kwp} kWp")
    plt.xlabel("Time (UTC)")
    plt.ylabel("Power (kW)")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.savefig(buf, format="png")
    plt.close()
    buf.seek(0)
    return buf


# ============================================================
# 6️⃣ Endpoints
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Welcome to PV Forecast API 🚀",
        "usage": {
            "/forecast": "hourly forecast",
            "/daily_forecast": "daily aggregated forecast (kWh per day)"
        }
    }


@app.get("/forecast")
def forecast(
        lat: float = Query(..., description="Latitude"),
        lon: float = Query(..., description="Longitude"),
        start: str = Query(..., description="Start date (YYYY-MM-DD)"),
        end: str = Query(..., description="End date (YYYY-MM-DD)"),
        kwp: float = Query(..., description="Installed capacity (kWp)"),
        plot: Optional[bool] = Query(False, description="Return PNG plot instead of JSON"),
        csv: Optional[bool] = Query(False, description="Return CSV instead of JSON"),
):
    try:
        model, features = load_model()
        df = predict_for_range(lat, lon, start, end, kwp, model, features)

        # Convert timestamps to strings
        df["time"] = df["time"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        if plot:
            buf = make_plot(df, start, end, lat, lon, kwp)
            return StreamingResponse(buf, media_type="image/png")

        if csv:
            csv_bytes = df.to_csv(index=False).encode()
            return Response(
                csv_bytes,
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=forecast.csv"},
            )

        return JSONResponse(df.to_dict(orient="records"))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 7️⃣ Новий ендпойнт: добова сума виробки
# ============================================================
@app.get("/daily_forecast")
def daily_forecast(
        lat: float = Query(..., description="Latitude"),
        lon: float = Query(..., description="Longitude"),
        start: str = Query(..., description="Start date (YYYY-MM-DD)"),
        end: str = Query(..., description="End date (YYYY-MM-DD)"),
        kwp: float = Query(..., description="Installed capacity (kWp)"),
):
    """
    Повертає сумарну прогнозовану виробку по днях у кВт·год (kWh).
    """
    try:
        model, features = load_model()
        df = predict_for_range(lat, lon, start, end, kwp, model, features)

        # Додаємо дату без часу
        df["date"] = df["time"].dt.date

        # Сума потужності (kWh = сума kW * 1 год)
        daily = (
            df.groupby("date")["pred_kW"]
            .sum()
            .reset_index()
            .rename(columns={"pred_kW": "pred_kWh"})
        )

        # ✅ Округлення та конвертація дати у string
        daily["pred_kWh"] = daily["pred_kWh"].round(2)
        daily["date"] = daily["date"].astype(str)

        return JSONResponse(daily.to_dict(orient="records"))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
