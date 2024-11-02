from datetime import datetime
import logging

import pandas as pd

from data import get_nwp, make_pv_data
from orientation import forecast
from pydantic_model import PVSite

log = logging.getLogger(__name__)



def run_forecast(
        site: PVSite, ts: datetime | str = None, nwp_source: str = "icon"
):
    if ts is None:
        ts = pd.Timestamp.now().round("15min")

    if isinstance(ts, str):
        ts = datetime.fromisoformat(ts)

    if site.capacity_kwp > 4:
        log.warning("Your site capacity is greater than 4kWp, "
                    "however the model is trained on sites with capacity <= 4kWp."
                    "We therefore will run the model with a capacity of 4 kWp, "
                    "and we'll scale the results afterwards.")
        capacity_kwp_original = site.capacity_kwp
        site.capacity_kwp = 4
    else:
        capacity_kwp_original = site.capacity_kwp

    # make pv and nwp data from nwp_source
    nwp_xr = get_nwp(site=site, ts=ts, nwp_source=nwp_source)
    pv_xr = make_pv_data(site=site, ts=ts)

    # load and run models
    pred_df = forecast(nwp_source, nwp_xr, pv_xr, ts)

    # scale the results if the capacity is different
    if capacity_kwp_original != site.capacity_kwp:
        pred_df["power_kw"] = pred_df["power_kw"] * capacity_kwp_original / site.capacity_kwp

    return pred_df


