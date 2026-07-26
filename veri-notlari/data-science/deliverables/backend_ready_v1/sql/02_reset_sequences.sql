-- Reset sequences after explicit-ID CSV import

SELECT setval(pg_get_serial_sequence('users', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM users), 1), 1), EXISTS (SELECT 1 FROM users));
SELECT setval(pg_get_serial_sequence('vehicles', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM vehicles), 1), 1), EXISTS (SELECT 1 FROM vehicles));
SELECT setval(pg_get_serial_sequence('pricing_zones', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM pricing_zones), 1), 1), EXISTS (SELECT 1 FROM pricing_zones));
SELECT setval(pg_get_serial_sequence('pricing_rules', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM pricing_rules), 1), 1), EXISTS (SELECT 1 FROM pricing_rules));
SELECT setval(pg_get_serial_sequence('campaigns', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM campaigns), 1), 1), EXISTS (SELECT 1 FROM campaigns));
SELECT setval(pg_get_serial_sequence('loyalty_tier_config', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM loyalty_tier_config), 1), 1), EXISTS (SELECT 1 FROM loyalty_tier_config));
SELECT setval(pg_get_serial_sequence('translations', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM translations), 1), 1), EXISTS (SELECT 1 FROM translations));
SELECT setval(pg_get_serial_sequence('entity_translations', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM entity_translations), 1), 1), EXISTS (SELECT 1 FROM entity_translations));
SELECT setval(pg_get_serial_sequence('reservations', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM reservations), 1), 1), EXISTS (SELECT 1 FROM reservations));
SELECT setval(pg_get_serial_sequence('reservation_status_history', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM reservation_status_history), 1), 1), EXISTS (SELECT 1 FROM reservation_status_history));
SELECT setval(
    'seq_booking_ref',
    GREATEST(
        COALESCE(
            (
                SELECT MAX((regexp_match(booking_reference, '([0-9]+)$'))[1]::BIGINT)
                FROM reservations
            ),
            1
        ),
        1
    ),
    EXISTS (SELECT 1 FROM reservations)
);
