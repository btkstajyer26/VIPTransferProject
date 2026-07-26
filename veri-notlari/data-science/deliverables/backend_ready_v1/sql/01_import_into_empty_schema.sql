\set ON_ERROR_STOP on

-- VIP Transfer backend demo/import package
-- PostgreSQL 15+ / PostGIS 3+
-- Run from the release root with psql.
-- The target schema must be empty of demo seed rows.

BEGIN;

\copy vehicles (id, plate_number, vehicle_class, brand, model, year, color, photo_url, capacity, base_price_multiplier, opening_price, is_active, created_at, updated_at) FROM 'sql_import/vehicles.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');
\copy pricing_zones (id, name, description, polygon_geom, base_price, min_price, price_per_km, currency, is_active, created_at, updated_at) FROM 'sql_import/pricing_zones.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');
\copy pricing_rules (id, zone_id, name, day_of_week, start_time, end_time, multiplier, reason, valid_from, valid_to, is_active, created_at) FROM 'sql_import/pricing_rules.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');
\copy loyalty_tier_config (id, tier, min_points, earn_rate, discount_percentage, priority_support, description) FROM 'sql_import/loyalty_tier_config.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');
\copy users (id, phone_number, email, password_hash, first_name, last_name, profile_photo, preferred_lang, role, is_guest, is_active, email_verified, phone_verified, created_at, updated_at, deleted_at) FROM 'sql_import/users.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');
\copy campaigns (id, code, name, description, discount_type, discount_value, max_discount_amount, min_order_amount, max_uses, used_count, max_uses_per_user, valid_from, valid_to, is_active, created_by, created_at, updated_at) FROM 'sql_import/campaigns.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');
\copy translations (id, trans_key, lang_code, value, created_at, updated_at) FROM 'sql_import/translations.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');
\copy entity_translations (id, entity_type, entity_id, field_name, lang_code, value, created_at, updated_at) FROM 'sql_import/entity_translations.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');

-- users insert trigger creates BRONZE accounts. Import desired values through staging + UPSERT.
CREATE TEMP TABLE staging_loyalty_accounts (
    user_id BIGINT,
    lifetime_points INT,
    tier loyalty_tier,
    updated_at TIMESTAMPTZ
) ON COMMIT DROP;

\copy staging_loyalty_accounts (user_id, lifetime_points, tier, updated_at) FROM 'sql_import/loyalty_accounts.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');

INSERT INTO loyalty_accounts (user_id, lifetime_points, tier, updated_at)
SELECT user_id, lifetime_points, tier, updated_at
FROM staging_loyalty_accounts
ON CONFLICT (user_id) DO UPDATE
SET lifetime_points = EXCLUDED.lifetime_points,
    tier = EXCLUDED.tier,
    updated_at = EXCLUDED.updated_at;

\copy reservations (id, booking_reference, user_id, guest_phone, pickup_address, pickup_point, dropoff_address, dropoff_point, pickup_zone_id, dropoff_zone_id, scheduled_time, vehicle_id, passenger_count, distance_km, route_polyline, base_price, surge_multiplier, discount_amount, loyalty_discount, opening_price, calculated_price, currency, status, campaign_id, flight_number, notes, cancelled_at, cancellation_reason, completed_at, created_at, updated_at) FROM 'sql_import/reservations.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');
\copy reservation_status_history (id, reservation_id, status, changed_by, note, changed_at) FROM 'sql_import/reservation_status_history.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');

COMMIT;

\i sql/02_reset_sequences.sql
\i sql/03_post_import_validation.sql
