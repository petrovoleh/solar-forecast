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
import time

app = FastAPI(title="PV Forecast API", version="1.1")

MODEL_PATH = "model.joblib"
FEATURES_PATH = "model_features.joblib"

import logging
import sys

# ============================================================
# 🧩 Configure Logger
# ============================================================
def configure_logger():
    logger = logging.getLogger("pv_forecast")
    logger.setLevel(logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        "%(levelname)s %(asctime)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    # avoid duplicate handlers
    if not logger.handlers:
        logger.addHandler(handler)

    # silence overly chatty loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("matplotlib").setLevel(logging.WARNING)

    return logger


logger = configure_logger()

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

def fetch_open_meteo(lat: float, lon: float, start_date: str, end_date: str) -> pd.DataFrame:
    start_date = start_date.split(" ")[0]
    end_date = end_date.split(" ")[0]

    today = datetime.utcnow().date()
    df_parts = []

    def _safe_request(url: str, label: str):
        """Helper with retry for Too Many Requests"""
        for attempt in range(1, 11):  # up to 10 tries
            try:
                r = requests.get(url, timeout=30)
                if r.status_code == 200:
                    return r
                elif r.status_code in (429, 503) or "Too many" in r.text:
                    logger.warning(f"⚠️ {label} API rate-limited (attempt {attempt}/10). Waiting 2s...")
                    time.sleep(2)
                else:
                    logger.error(f"❌ {label} API error ({r.status_code}): {r.text[:120]}")
                    break
            except requests.exceptions.RequestException as e:
                logger.warning(f"⚠️ Network error on {label} attempt {attempt}/10: {e}")
                time.sleep(2)
        raise HTTPException(status_code=500, detail=f"{label} API failed after 10 attempts")

    # ---------------------- ARCHIVE (past data) ----------------------
    if datetime.strptime(start_date, "%Y-%m-%d").date() <= today:
        archive_end = min(datetime.strptime(end_date, "%Y-%m-%d").date(), today)
        url_archive = (
            "https://archive-api.open-meteo.com/v1/era5?"
            f"latitude={lat}&longitude={lon}"
            f"&start_date={start_date}&end_date={archive_end}"
            f"&hourly=temperature_2m,cloudcover,shortwave_radiation,wind_speed_10m"
            "&timezone=UTC"
        )
        r = _safe_request(url_archive, "Open-Meteo (archive)")
        data = r.json()
        if "hourly" in data:
            df_archive = pd.DataFrame({
                "time": pd.to_datetime(data["hourly"]["time"], utc=True),
                "temperature_2m": data["hourly"]["temperature_2m"],
                "cloudcover": data["hourly"]["cloudcover"],
                "shortwave_radiation": data["hourly"]["shortwave_radiation"],
                "wind_speed_10m": data["hourly"]["wind_speed_10m"],
            })
            df_parts.append(df_archive)

    # ---------------------- FORECAST (future data) ----------------------
    if datetime.strptime(end_date, "%Y-%m-%d").date() > today:
        forecast_start = max(datetime.strptime(start_date, "%Y-%m-%d").date(), today)
        url_forecast = (
            "https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}"
            f"&start_date={forecast_start}&end_date={end_date}"
            f"&hourly=temperature_2m,cloudcover,shortwave_radiation,wind_speed_10m"
            "&timezone=UTC"
        )
        r2 = _safe_request(url_forecast, "Open-Meteo (forecast)")
        data2 = r2.json()
        if "hourly" in data2:
            df_forecast = pd.DataFrame({
                "time": pd.to_datetime(data2["hourly"]["time"], utc=True),
                "temperature_2m": data2["hourly"]["temperature_2m"],
                "cloudcover": data2["hourly"]["cloudcover"],
                "shortwave_radiation": data2["hourly"]["shortwave_radiation"],
                "wind_speed_10m": data2["hourly"]["wind_speed_10m"],
            })
            df_parts.append(df_forecast)

    # ---------------------- MERGE RESULTS ----------------------
    if not df_parts:
        raise HTTPException(status_code=500, detail="❌ No weather data available for requested range")

    df = pd.concat(df_parts).drop_duplicates(subset=["time"]).sort_values("time").reset_index(drop=True)
    logger.info(f"✅ Weather data fetched successfully: {len(df)} records")
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

    # 🩵 Фільтруємо всі від’ємні значення (нічний шум або похибку)
    preds_w = np.maximum(preds_w, 0)
    preds_w_per_kwp = np.maximum(preds_w_per_kwp, 0)

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
        lat: float = Query(...),
        lon: float = Query(...),
        start: str = Query(...),
        end: str = Query(...),
        kwp: float = Query(...),
):
    logger.info(f"🔹 daily_forecast called with lat={lat}, lon={lon}, kwp={kwp}, {start}→{end}")
    try:
        model, features = load_model()
        logger.info(f"✅ Model and features loaded: {len(features)} features")

        df = predict_for_range(lat, lon, start, end, kwp, model, features)
        logger.info(f"✅ Predictions generated: {len(df)} rows")

        df["date"] = df["time"].dt.date
        daily = (
            df.groupby("date")["pred_kW"]
            .sum()
            .reset_index()
            .rename(columns={"pred_kW": "pred_kWh"})
        )
        daily["pred_kWh"] = (daily["pred_kWh"] * 2.0).round(2)
        daily["date"] = daily["date"].astype(str)

        logger.info("✅ Daily forecast ready")
        return JSONResponse(daily.to_dict(orient="records"))

    except Exception as e:
        logger.exception("❌ Error in /daily_forecast")
        raise HTTPException(status_code=500, detail=str(e))
