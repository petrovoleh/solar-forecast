from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
from datetime import datetime, timedelta
from forecast import run_forecast
from pydantic_model import PVSite

app = FastAPI()


def generate_all_forecasts(
    init_time_freq: int,
    start: datetime,
    end: datetime,
    latitude: float,
    longitude: float,
    capacity_kwp: float,
) -> pd.DataFrame:

    all_forecasts = pd.DataFrame()
    init_time = start
    while init_time <= end:
        predictions_df = forecast_for_site(
            latitude, longitude, capacity_kwp, init_time=init_time
        )
        predictions_df["forecast_init_time"] = init_time
        all_forecasts = pd.concat([all_forecasts, predictions_df])
        init_time += timedelta(hours=init_time_freq)

    return all_forecasts


def forecast_for_site(
    latitude: float,
    longitude: float,
    capacity_kwp: float,
    init_time: datetime = None,
) -> pd.DataFrame:

    site = PVSite(latitude=latitude, longitude=longitude, capacity_kwp=capacity_kwp)
    predictions_df = run_forecast(site=site, ts=init_time)
    predictions_df.reset_index(inplace=True)
    predictions_df.rename(columns={"index": "datetime"}, inplace=True)
    return predictions_df


class ForecastRequest(BaseModel):
    init_time_freq: int
    start_datetime: str
    end_datetime: str
    latitude: float
    longitude: float
    capacity_kwp: float


@app.post("/forecast")
async def get_forecast(data: ForecastRequest):
    """
    Generate solar forecasts at specified intervals and return as JSON response.

    Args:
        data (ForecastRequest): Input data containing forecast parameters.

    Returns:
        JSON: Forecast data for the specified site and parameters.
    """
    start = datetime.strptime(data.start_datetime, "%Y-%m-%d %H:%M:%S")
    end = datetime.strptime(data.end_datetime, "%Y-%m-%d %H:%M:%S")

    forecasts_df = generate_all_forecasts(
        data.init_time_freq, start, end, data.latitude, data.longitude, data.capacity_kwp
    )

    return forecasts_df.to_dict(orient="records")
