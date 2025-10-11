import logging
from datetime import datetime, timedelta

import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel

from forecast import run_forecast
from pydantic_model import PVSite

app = FastAPI()


def _configure_logger() -> logging.Logger:
    logger = logging.getLogger("model")
    logger.setLevel(logging.INFO)

    uvicorn_logger = logging.getLogger("uvicorn.error")
    if uvicorn_logger.handlers:
        logger.handlers.clear()
        for handler in uvicorn_logger.handlers:
            logger.addHandler(handler)
        logger.propagate = False
    elif not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(
            logging.Formatter("%(levelname)s %(asctime)s [%(name)s] %(message)s")
        )
        logger.addHandler(handler)
        logger.propagate = False

    return logger


logger = _configure_logger()


@app.on_event("startup")
async def _configure_logger_on_startup() -> None:
    _configure_logger()


def generate_all_forecasts(
    start: datetime,
    end: datetime,
    latitude: float,
    longitude: float,
    capacity_kwp: float,
) -> pd.DataFrame:

    logger.info(
        "Generating forecasts | start=%s end=%s lat=%.6f lon=%.6f capacity_kwp=%.3f",
        start,
        end,
        latitude,
        longitude,
        capacity_kwp,
    )
    all_forecasts = pd.DataFrame()
    init_time = start
    while init_time <= end:
        logger.info("Running forecast iteration | init_time=%s", init_time)
        predictions_df = forecast_for_site(
            latitude, longitude, capacity_kwp, init_time=init_time
        )
        all_forecasts = pd.concat([all_forecasts, predictions_df])
        init_time += timedelta(hours=48)

    logger.info("Completed forecast generation | total_rows=%d", len(all_forecasts))
    return all_forecasts


def forecast_for_site(
    latitude: float,
    longitude: float,
    capacity_kwp: float,
    init_time: datetime = None,
) -> pd.DataFrame:

    site = PVSite(latitude=latitude, longitude=longitude, capacity_kwp=capacity_kwp)
    logger.info(
        "Calling run_forecast | lat=%.6f lon=%.6f capacity_kwp=%.3f init_time=%s",
        latitude,
        longitude,
        capacity_kwp,
        init_time,
    )
    predictions_df = run_forecast(site=site, ts=init_time)
    predictions_df.reset_index(inplace=True)
    predictions_df.rename(columns={"index": "datetime"}, inplace=True)
    logger.info(
        "Forecast run complete | init_time=%s rows=%d",
        init_time,
        len(predictions_df),
    )
    return predictions_df


class ForecastRequest(BaseModel):

    start_datetime: str
    end_datetime: str
    latitude: float
    longitude: float
    capacity_kwp: float


@app.post("/forecast")
async def get_forecast(data: ForecastRequest):
    logger.info(
        "Received forecast request | start=%s end=%s lat=%.6f lon=%.6f capacity_kwp=%.3f",
        data.start_datetime,
        data.end_datetime,
        data.latitude,
        data.longitude,
        data.capacity_kwp,
    )

    try:
        start = datetime.strptime(data.start_datetime, "%Y-%m-%d %H:%M:%S")
        end = datetime.strptime(data.end_datetime, "%Y-%m-%d %H:%M:%S")

        forecasts_df = generate_all_forecasts(
            start, end, data.latitude, data.longitude, data.capacity_kwp
        )
        response = forecasts_df.to_dict(orient="records")
        logger.info("Returning forecast response | rows=%d", len(response))
        return response
    except Exception as e:
        # 👇 тут ключ — logger.exception + повертаємо текст помилки
        logger.exception("❌ Failed to generate forecast: %s", str(e))
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "type": type(e).__name__},
        )

