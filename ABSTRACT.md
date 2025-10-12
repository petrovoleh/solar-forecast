This bachelor project started with a simple question from future solar plant owners: “How much
energy will my array produce each day if I install it here?” To answer it, I designed an end-to-end
pipeline that begins with historical irradiance profiles from PVGIS ERA5 for Lithuanian
coordinates and hourly weather forecasts from Open-Meteo. After cleaning and aligning these
sources, I engineered cyclical time features (sine and cosine of the hour and day-of-year) and
combined them with temperature, cloud cover, shortwave radiation, and wind speed. An XGBoost
gradient boosting model was trained on Vilnius data and validated on Kaunas, with MAE, RMSE,
and R² capturing both absolute error and generalization when the model is transferred to a new
city.

Once the offline experiments matured, I deployed the model inside a FastAPI service. The service
pulls historical and forecast weather series on demand, rebuilds the feature matrix in real time,
rescales outputs to the requested system size, and returns predictions as JSON, CSV, or an
interactive chart. A Spring Boot backend coordinates user workflows: it stores panels, inverters,
clusters, and daily summaries in MongoDB, enforces JWT-based authentication, and manages
role-specific permissions. The React + TypeScript frontend renders multilingual dashboards
(English, Ukrainian, Lithuanian), allows operators to configure their fleet, and overlays forecasts
with observed production for quick diagnostics.

The result is a deployable platform rather than a generic machine learning demo. With
docker-compose the entire stack spins up quickly, delivering location-specific forecasts that help
engineers and investors evaluate new solar sites or optimize existing ones.
