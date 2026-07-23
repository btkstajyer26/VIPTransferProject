-- Separator: ;; (çift noktalı virgül)
-- Spring SQL parser içteki ; karakterini statement sonu saydığı için
-- DO $$ bloklarını kesiyor. ;; ayırıcısı bu sorunu çözer.
-- NOT: postgis/pgcrypto extension'larını bir kez elle çalıştır:
--      psql -d btk -c "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS pgcrypto;"

-- Firebase Admin SDK 9.10.0 ile registration token yerine FID kullanilir.
-- Eski tablo varsa adi korunarak yeni modele tasinir.
DO $$
BEGIN
    IF to_regclass('public.user_device_tokens') IS NOT NULL
            AND to_regclass('public.user_firebase_installations') IS NULL THEN
        ALTER TABLE user_device_tokens
            RENAME TO user_firebase_installations;
    END IF;
END
$$
;;

DO $$
BEGIN
    IF to_regclass('public.user_firebase_installations') IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'user_firebase_installations'
                  AND column_name = 'token'
            ) THEN
        ALTER TABLE user_firebase_installations
            RENAME COLUMN token TO fid;

        -- Registration token degerleri FID degildir; yeniden kayit gerekir.
        UPDATE user_firebase_installations SET active = false;
    END IF;
END
$$
;;

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
