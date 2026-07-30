-- Post-import validation. Every query should return zero rows or zero count.

SELECT 'orphan_reservation_user' AS check_name, COUNT(*) AS error_count
FROM reservations r
LEFT JOIN users u ON u.id = r.user_id
WHERE r.user_id IS NOT NULL AND u.id IS NULL
UNION ALL
SELECT 'orphan_reservation_vehicle', COUNT(*)
FROM reservations r
LEFT JOIN vehicles v ON v.id = r.vehicle_id
WHERE r.vehicle_id IS NOT NULL AND v.id IS NULL
UNION ALL
SELECT 'orphan_pickup_zone', COUNT(*)
FROM reservations r
LEFT JOIN pricing_zones z ON z.id = r.pickup_zone_id
WHERE r.pickup_zone_id IS NOT NULL AND z.id IS NULL
UNION ALL
SELECT 'orphan_dropoff_zone', COUNT(*)
FROM reservations r
LEFT JOIN pricing_zones z ON z.id = r.dropoff_zone_id
WHERE r.dropoff_zone_id IS NOT NULL AND z.id IS NULL
UNION ALL
SELECT 'orphan_status_history', COUNT(*)
FROM reservation_status_history h
LEFT JOIN reservations r ON r.id = h.reservation_id
WHERE r.id IS NULL
UNION ALL
SELECT 'registered_user_without_loyalty', COUNT(*)
FROM users u
LEFT JOIN loyalty_accounts l ON l.user_id = u.id
WHERE u.is_guest = FALSE AND l.user_id IS NULL
UNION ALL
SELECT 'guest_user_with_loyalty', COUNT(*)
FROM users u
JOIN loyalty_accounts l ON l.user_id = u.id
WHERE u.is_guest = TRUE;

SELECT status, COUNT(*) FROM reservations GROUP BY status ORDER BY status;
SELECT tier, COUNT(*) FROM loyalty_accounts GROUP BY tier ORDER BY tier;
