# XGBoost Weather Data Science Release

Release ID: `xgboost_weather_v1-20260726T182145Z`  
Package version: `data-science-release-v1`  
XGBoost model version: `xgboost-demand-weather-v1`  
Customer segmentation model: `kmeans-rfm-v1`  
Recommended model by test metrics: `XGBOOST_WEATHER`

## Package Purpose

This package contains:

1. XGBoost hourly pricing-zone demand forecasts
2. Weather-aware surge recommendations
3. Random Forest and XGBoost comparison outputs
4. RFM and K-Means customer segmentation
5. Admin customer recommendations
6. Model files, metadata and validation reports

## This Is Not a SQL Import Package

This package must not replace the main database tables.

It intentionally does not contain:

- `users.csv`
- `vehicles.csv`
- `reservations.csv`
- `reservation_status_history.csv`
- `loyalty_accounts.csv`

Backend-ready SQL import files are prepared separately by:

`22_prepare_backend_ready_csvs.py`

A weather-enriched analytics file has not been renamed to
`reservations.csv`.

## Pricing Service Contract

File:

`backend_contract/pricing_service_surge_recommendations.csv`

Primary key:

- `zone_id`
- `demand_hour_utc`

Important fields:

- `predicted_demand`
- `predicted_demand_level`
- `prediction_lower_80`
- `prediction_upper_80`
- `recommended_surge_multiplier`
- `surge_reason`
- `pricing_rule_merge_strategy`
- `requires_pricing_service_validation`
- `auto_apply`

Rules:

- `auto_apply` is always `false`.
- `requires_pricing_service_validation` is always `true`.
- `pricing_rule_merge_strategy` is `MAX`.
- Pricing Service compares the model recommendation with active
  configured pricing rules.
- The highest valid multiplier is selected.
- Minimum-price and other business rules remain authoritative.
- Data Science does not update reservation prices directly.

## Admin Contract

Files:

- `backend_contract/admin_customer_recommendations.csv`
- `backend_contract/admin_top_1000_customer_recommendations.csv`

Primary key:

- `user_id`

These outputs do not include direct:

- phone number
- e-mail
- first name
- last name
- password hash

The backend may join `user_id` with User Service data after
authorization.

Recommendations are decision-support records only:

- They do not create campaigns.
- They do not send notifications.
- They do not apply discounts.
- They do not change loyalty tiers.
- `auto_execute` is always `false`.

## XGBoost Model Files

Full inference bundle:

`models/demand_forecast/xgboost_weather_bundle.joblib`

The bundle contains:

- One-hot preprocessor
- XGBoost model
- Zone demand thresholds
- Metadata

Native XGBoost model:

`models/demand_forecast/xgboost_weather_model.json`

The native JSON contains the XGBoost tree model only. It does not
contain the one-hot encoder or original feature order. Use the joblib
bundle for complete Python inference.

## Model Selection

Report:

`reports/demand/model_selection_recommendation.json`

The package may still be generated when Random Forest or the seasonal
baseline has a lower test error. In that case, this XGBoost release
should be treated as a comparison and integration artifact rather than
the automatically selected production model.

Model deployment is never automatic.

## Weather Warning

Check:

`reports/weather/weather_feature_summary.json`

When weather data is synthetic, the outputs are suitable for internship
simulation and integration testing only. They do not prove a real-world
causal relationship between weather and demand.

## Integrity

- `release_manifest.csv` contains file paths, sizes and SHA-256 hashes.
- `checksums.sha256` can be used to verify package integrity.
- `reports/release_validation_checks.csv` contains all validation results.
