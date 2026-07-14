-- Separator: ;; (çift noktalı virgül)
-- Spring SQL parser içteki ; karakterini statement sonu saydığı için
-- DO $$ bloklarını kesiyor. ;; ayırıcısı bu sorunu çözer.
-- NOT: postgis/pgcrypto extension'larını bir kez elle çalıştır:
--      psql -d btk -c "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS pgcrypto;"

DO $$
BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'CUSTOMER');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$
;;

DO $$
BEGIN
    CREATE TYPE reservation_status AS ENUM ('PENDING', 'ASSIGNED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$
;;

DO $$
BEGIN
    CREATE TYPE notification_channel AS ENUM ('EMAIL', 'SMS', 'PUSH', 'WHATSAPP');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$
;;

DO $$
BEGIN
    CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$
;;

DO $$
BEGIN
    CREATE TYPE loyalty_tier AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'VIP');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$
;;

DO $$
BEGIN
    CREATE TYPE discount_type AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$
;;

DO $$
BEGIN
    CREATE TYPE vehicle_class AS ENUM ('ECONOMY', 'STANDARD', 'BUSINESS', 'VIP', 'LUXURY', 'MINIVAN');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$
;;
