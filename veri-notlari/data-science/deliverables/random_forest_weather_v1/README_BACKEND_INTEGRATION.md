# Random Forest Weather Data Science Release

Release ID: `random_forest_weather_v1-20260726T204517Z`  
Package version: `data-science-release-v1`  
Demand model: `random-forest-demand-weather-v1`  
Customer segmentation model: `kmeans-rfm-v1`

## Package Purpose

This package contains Data Science outputs for:

1. Hourly pricing-zone demand forecasting
2. Weather-aware surge multiplier recommendations
3. RFM and K-Means customer segmentation
4. Admin customer action recommendations
5. Model files, metadata and validation reports

## Important: This Is Not a SQL Import Package

Files in this package must not be imported directly as replacements for
the main `users`, `vehicles` or `reservations` database tables.

Backend-ready SQL import files are prepared separately by:

`22_prepare_backend_ready_csvs.py`

No weather-enriched reservations file has been renamed to `reservations.csv`.

## Pricing Service Contract

File:

`backend_contract/pricing_service_surge_recommendations.csv`

Primary lookup key:

- `zone_id`
- `demand_hour_utc`

Important fields:

- `predicted_demand`
- `predicted_demand_level`
- `recommended_surge_multiplier`
- `surge_reason`
- `pricing_rule_merge_strategy`
- `requires_pricing_service_validation`
- `auto_apply`

Integration rules:

- `auto_apply` is always `false`.
- Pricing Service must validate the recommendation.
- The merge strategy is `MAX`.
- Pricing Service compares the model recommendation with applicable active
  `pricing_rules` and uses the highest valid multiplier.
- The configured business limits and minimum-price rule remain authoritative.
- Data Science does not calculate or modify a final reservation price.

## Admin Contract

Files:

- `backend_contract/admin_customer_recommendations.csv`
- `backend_contract/admin_top_1000_customer_recommendations.csv`

Primary lookup key:

- `user_id`

The backend joins `user_id` with User Service data when authorized.
Direct phone, e-mail, first name and last name values are intentionally
not included in the Data Science output.

Recommendations are decision-support records only:

- They do not create campaigns.
- They do not send notifications.
- They do not apply discounts.
- They do not change loyalty tiers.
- `auto_execute` is always `false`.

## Model Files

Demand model:

`models/demand_forecast/random_forest_weather_bundle.joblib`

The bundle contains:

- Scikit-learn pipeline
- Preprocessing steps
- Random Forest model
- Zone demand thresholds
- Metadata

Customer segmentation model:

`models/customer_segmentation/kmeans_customer_segmentation_bundle.joblib`

## Weather Warning

Check:

`reports/weather/weather_feature_summary.json`

When `weather_is_synthetic=true`, results are suitable for internship
simulation and integration testing. They must not be presented as proof
of a real-world causal relationship between weather and demand.

For production forecasting, provide real historical weather observations
and real future weather forecasts using the same data contract.

## Integrity

- `release_manifest.csv` lists packaged files and SHA-256 hashes.
- `checksums.sha256` can be used to verify file integrity.
- `reports/release_validation_checks.csv` contains all packaging checks.
