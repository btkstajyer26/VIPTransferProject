# VIP Transfer Backend-Ready Package

Schema version: `4.3.0`  
Package version: `backend-import-package-v3`  
Selected demand model: `XGBOOST_WEATHER`  
Generated at: `2026-07-26T18:47:29+00:00`

## Folder separation

- `sql_import/` contains only database-table CSV files.
- `service_contracts/` contains read-only Data Science outputs for Pricing Service and Admin.
- `sql/` contains import, sequence-reset and post-import validation scripts.
- `reports/` contains validation and source/output mapping reports.

Data Science forecast files are not renamed to `reservations.csv` and are never imported into the reservations table.

## Import prerequisites

1. PostgreSQL 15+ and PostGIS 3+.
2. Create the schema from `scripts.sql` version 4.3.0.
3. Do not execute the demo seed inserts for vehicles, loyalty tiers or translations when these CSV files are the source of truth.
4. Run psql from this release directory:

```bash
psql -d YOUR_DATABASE -f sql/01_import_into_empty_schema.sql
```

## Important trigger behavior

Importing users automatically creates BRONZE loyalty accounts for registered users. The import script therefore loads `loyalty_accounts.csv` through a temporary staging table and performs an UPSERT.

## Sensitive data

`sql_import/users.csv` and `sql_import/reservations.csv` contain personal and operational data. Keep this package outside public Git repositories, restrict filesystem access and delete unnecessary copies.

## Pricing Service contract

File: `service_contracts/pricing_service_surge_recommendations.csv`

- Primary key: `zone_id + demand_hour_utc`
- `auto_apply = false`
- `requires_pricing_service_validation = true`
- `pricing_rule_merge_strategy = MAX`

The model recommends a multiplier only. Pricing Service remains responsible for active rule selection, business limits and final reservation price calculation.

## Admin recommendation contract

Files:

- `service_contracts/admin_customer_recommendations.csv`
- `service_contracts/admin_top_1000_customer_recommendations.csv`

These files contain `user_id` but no direct phone, e-mail, name, password or address fields. Recommendations are decision support only and `auto_execute` is false.

## Integrity

- `release_manifest.csv` lists every packaged file and SHA-256 hash.
- `checksums.sha256` can be used to verify integrity.
- `reports/backend_package_validation_checks.csv` contains all pipeline checks.
