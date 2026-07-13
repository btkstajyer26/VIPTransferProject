-- =============================================================================
-- VIP TRANSFER RESERVATION SYSTEM — DATABASE SCHEMA
-- Version  : 4.3.0
-- Engine   : PostgreSQL 15+ with PostGIS 3+
-- Encoding : UTF-8
-- Değişiklikler (v4.1.0):
--   • vehicles.opening_price        — araç bazlı sabit açılış ücreti eklendi
--   • reservations.opening_price    — uygulanan açılış ücretinin denetim kaydı
--   • entity_translations tablosu   — dinamik iş verisi (bölge, kampanya vb.)
--     için polimorfik çok-dilli içerik desteği eklendi
-- Değişiklikler (v4.2.0):
--   • Formül düzeltmesi: opening_price metre tabanına (flag_fee) taşındı;
--     artık araç çarpanı ve surge ile ölçekleniyor (DDL değişikliği yok).
--   • Minimum-fare bug düzeltmesi: MAX(·,min_price) indirimlerden SONRA uygulanır.
--   • Yalnızca alan yorumları (comment) güncellendi; şema yapısı aynı.
-- Değişiklikler (v4.3.0):
--   • entity_translations sağlamlaştırıldı (DDL değişikliği yok, yeni mekanizmalar):
--     - fn_purge_entity_translations / fn_create_translation_purge_trigger eklendi;
--       kaynak satır silinince öksüz çeviriler AFTER DELETE trigger'ı ile otomatik
--       temizlenir (cascade emülasyonu). 5 kaynak tabloya bağlandı.
--     - entity_type CHECK kısıtı: kanonik küme DB düzeyinde enforced edildi.
--     - Tasarım gerekçesi dokümante edildi (polimorfik seçim nedeni + trade-off).
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE user_role AS ENUM (
    'ADMIN',
    'CUSTOMER'
);

CREATE TYPE reservation_status AS ENUM (
    'PENDING',
    'ASSIGNED',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW'
);

CREATE TYPE notification_channel AS ENUM (
    'EMAIL',
    'SMS',
    'PUSH',
    'WHATSAPP'
);

CREATE TYPE notification_status AS ENUM (
    'PENDING',
    'SENT',
    'DELIVERED',
    'FAILED',
    'READ'
);

CREATE TYPE loyalty_tier AS ENUM (
    'BRONZE',
    'SILVER',
    'GOLD',
    'PLATINUM',
    'VIP'
);

CREATE TYPE discount_type AS ENUM (
    'PERCENTAGE',
    'FIXED_AMOUNT'
);

CREATE TYPE vehicle_class AS ENUM (
    'ECONOMY',
    'STANDARD',
    'BUSINESS',
    'VIP',
    'LUXURY',
    'MINIVAN'
);

-- =============================================================================
-- UTILITY: auto-update updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_create_updated_at_trigger(tbl TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    EXECUTE format(
        'CREATE TRIGGER trg_%s_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()',
        tbl, tbl
    );
END;
$$;

-- =============================================================================
-- GEO HELPER FUNCTIONS  (PostGIS)
-- =============================================================================

-- Verilen koordinatın hangi aktif fiyat bölgesinde olduğunu döndürür.
CREATE OR REPLACE FUNCTION fn_find_zone(p_point GEOGRAPHY)
RETURNS BIGINT LANGUAGE sql STABLE AS $$
    SELECT id
    FROM   pricing_zones
    WHERE  is_active = TRUE
      AND  ST_Contains(polygon_geom::geometry, p_point::geometry)
    LIMIT 1;
$$;

-- İki nokta arasındaki küresel mesafeyi metre cinsinden döndürür.
CREATE OR REPLACE FUNCTION fn_distance_m(p1 GEOGRAPHY, p2 GEOGRAPHY)
RETURNS FLOAT LANGUAGE sql IMMUTABLE AS $$
    SELECT ST_Distance(p1, p2);
$$;

-- =============================================================================
-- 1. USERS
-- =============================================================================

CREATE TABLE users (
    id              BIGSERIAL    PRIMARY KEY,
    phone_number    VARCHAR(20)  NOT NULL UNIQUE,
    email           VARCHAR(150)          UNIQUE,
    password_hash   VARCHAR(255),
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    profile_photo   VARCHAR(500),
    preferred_lang  VARCHAR(5)   NOT NULL DEFAULT 'tr',
    role            user_role    NOT NULL DEFAULT 'CUSTOMER',
    is_guest        BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    phone_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

SELECT fn_create_updated_at_trigger('users');

CREATE TABLE refresh_tokens (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(500) NOT NULL UNIQUE,
    device_info VARCHAR(255),
    ip_address  INET,
    expires_at  TIMESTAMPTZ  NOT NULL,
    revoked     BOOLEAN      NOT NULL DEFAULT FALSE,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. VEHICLES
-- (vehicle_types ile birleştirildi — her araç kendi sınıf bilgisini taşır)
-- =============================================================================

CREATE TABLE vehicles (
    id                    BIGSERIAL     PRIMARY KEY,
    plate_number          VARCHAR(20)   NOT NULL UNIQUE,
    vehicle_class         vehicle_class NOT NULL DEFAULT 'STANDARD',
    brand                 VARCHAR(50),
    model                 VARCHAR(50),
    year                  SMALLINT,
    color                 VARCHAR(30),
    photo_url             VARCHAR(500),
    capacity              SMALLINT      NOT NULL CHECK (capacity > 0),
    base_price_multiplier DECIMAL(4,2)  NOT NULL DEFAULT 1.00 CHECK (base_price_multiplier > 0),
    opening_price         DECIMAL(10,2) NOT NULL DEFAULT 0    CHECK (opening_price >= 0),
    -- Araç bazlı sabit açılış ücreti.
    -- v4.2.0: Bu değer flag_fee içinde (pickup_zone.base_price + opening_price)
    -- metre tabanına girer; base_price_multiplier ve surge_multiplier ile ölçeklenir.
    -- Fiyat kırılımında ayrı gösterilebilmesi için reservations.opening_price'a
    -- anlık görüntüsü alınır (denetim amacı).
    is_active             BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

SELECT fn_create_updated_at_trigger('vehicles');

-- =============================================================================
-- 3. PRICING
-- =============================================================================

CREATE TABLE pricing_zones (
    id           BIGSERIAL                 PRIMARY KEY,
    name         VARCHAR(150)              NOT NULL,
    description  VARCHAR(255),
    polygon_geom GEOMETRY(POLYGON, 4326)   NOT NULL,
    base_price   DECIMAL(10,2)             NOT NULL CHECK (base_price   >= 0),
    min_price    DECIMAL(10,2)             NOT NULL DEFAULT 0 CHECK (min_price >= 0),
    price_per_km DECIMAL(10,2)             NOT NULL CHECK (price_per_km >= 0),
    currency     VARCHAR(3)                NOT NULL DEFAULT 'TRY',
    is_active    BOOLEAN                   NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ               NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ               NOT NULL DEFAULT NOW()
);

SELECT fn_create_updated_at_trigger('pricing_zones');

CREATE TABLE pricing_rules (
    id          BIGSERIAL    PRIMARY KEY,
    zone_id     BIGINT       NOT NULL REFERENCES pricing_zones(id) ON DELETE CASCADE,
    name        VARCHAR(100),
    day_of_week SMALLINT              CHECK (day_of_week BETWEEN 0 AND 6),
    start_time  TIME         NOT NULL,
    end_time    TIME         NOT NULL,
    multiplier  DECIMAL(4,2) NOT NULL CHECK (multiplier > 0),
    reason      VARCHAR(100),
    valid_from  DATE,
    valid_to    DATE,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time),
    CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE campaigns (
    id                  BIGSERIAL     PRIMARY KEY,
    code                VARCHAR(50)   NOT NULL UNIQUE,
    name                VARCHAR(150)  NOT NULL,
    description         VARCHAR(500),
    discount_type       discount_type NOT NULL,
    discount_value      DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
    max_discount_amount DECIMAL(10,2),
    min_order_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_uses            INT,
    used_count          INT           NOT NULL DEFAULT 0,
    max_uses_per_user   INT           NOT NULL DEFAULT 1,
    valid_from          TIMESTAMPTZ   NOT NULL,
    valid_to            TIMESTAMPTZ   NOT NULL,
    is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
    created_by          BIGINT                 REFERENCES users(id),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CHECK (valid_to > valid_from)
);

SELECT fn_create_updated_at_trigger('campaigns');

-- =============================================================================
-- 4. RESERVATIONS
-- =============================================================================

CREATE SEQUENCE seq_booking_ref START 1;

CREATE OR REPLACE FUNCTION fn_generate_booking_ref()
RETURNS TEXT LANGUAGE SQL AS $$
    SELECT 'VIP-' || TO_CHAR(NOW(), 'YYYYMM') || '-' ||
           LPAD(nextval('seq_booking_ref')::TEXT, 6, '0');
$$;

CREATE TABLE reservations (
    id                  BIGSERIAL           PRIMARY KEY,
    booking_reference   VARCHAR(20)         NOT NULL UNIQUE DEFAULT fn_generate_booking_ref(),

    -- Kayıtlı kullanıcı ya da misafir telefonu — ikisinden biri dolu olmalı
    user_id             BIGINT                       REFERENCES users(id),
    guest_phone         VARCHAR(20),

    pickup_address      TEXT                NOT NULL,
    pickup_point        GEOGRAPHY(POINT, 4326) NOT NULL,
    dropoff_address     TEXT                NOT NULL,
    dropoff_point       GEOGRAPHY(POINT, 4326) NOT NULL,

    pickup_zone_id      BIGINT                       REFERENCES pricing_zones(id),
    dropoff_zone_id     BIGINT                       REFERENCES pricing_zones(id),

    scheduled_time      TIMESTAMPTZ         NOT NULL,
    vehicle_id          BIGINT                       REFERENCES vehicles(id),
    passenger_count     SMALLINT            NOT NULL DEFAULT 1 CHECK (passenger_count > 0),

    -- Fiyat alanları
    distance_km         DECIMAL(10,2),
    route_polyline      TEXT,
    base_price          DECIMAL(10,2)       NOT NULL CHECK (base_price      >= 0),
    -- v4.2.0: base_price = flag_fee + distance_fee
    --           = (pickup_zone.base_price + vehicle.opening_price) + Σ(km_in_zone × zone.price_per_km)
    -- Araç çarpanı ve surge ÖNCESI metre tabanı; opening_price DAHIL.
    -- base_price × base_price_multiplier × surge = class/surge sonrası fiyat (indirim öncesi).
    surge_multiplier    DECIMAL(4,2)        NOT NULL DEFAULT 1.00 CHECK (surge_multiplier >= 1),
    discount_amount     DECIMAL(10,2)       NOT NULL DEFAULT 0.00 CHECK (discount_amount  >= 0),
    loyalty_discount    DECIMAL(10,2)       NOT NULL DEFAULT 0.00 CHECK (loyalty_discount >= 0),
    opening_price       DECIMAL(10,2)       NOT NULL DEFAULT 0.00 CHECK (opening_price    >= 0),
    -- Rezervasyon anındaki vehicle.opening_price değerinin anlık görüntüsü (denetim).
    -- v4.2.0: Bu tutar base_price içine katılmıştır (flag_fee bileşeni olarak).
    -- Fatura/fiş kırılımında "bunun X TL'si açılış ücreti" gösterimi için ayrıca saklanır.
    calculated_price    DECIMAL(10,2)       NOT NULL CHECK (calculated_price >= 0),
    currency            VARCHAR(3)          NOT NULL DEFAULT 'TRY',

    status              reservation_status  NOT NULL DEFAULT 'PENDING',
    campaign_id         BIGINT                       REFERENCES campaigns(id),
    flight_number       VARCHAR(20),
    notes               TEXT,
    cancelled_at        TIMESTAMPTZ,
    cancellation_reason TEXT,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_user_or_guest CHECK (user_id IS NOT NULL OR guest_phone IS NOT NULL)
);

SELECT fn_create_updated_at_trigger('reservations');

CREATE TABLE reservation_status_history (
    id              BIGSERIAL          PRIMARY KEY,
    reservation_id  BIGINT             NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    status          reservation_status NOT NULL,
    changed_by      BIGINT                      REFERENCES users(id),
    note            TEXT,
    changed_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. LOYALTY SYSTEM
-- (loyalty_transactions kaldırıldı — bakiye değişiklikleri audit_logs üzerinden izlenebilir)
-- =============================================================================

CREATE TABLE loyalty_tier_config (
    id                    SERIAL        PRIMARY KEY,
    tier                  loyalty_tier  NOT NULL UNIQUE,
    min_points            INT           NOT NULL CHECK (min_points >= 0),
    earn_rate             DECIMAL(6,2)  NOT NULL DEFAULT 1.00, -- rezervasyon başına TL başına kazanılan puan
    discount_percentage   DECIMAL(5,2)  NOT NULL DEFAULT 0.00 CHECK (discount_percentage BETWEEN 0 AND 100),
    priority_support      BOOLEAN       NOT NULL DEFAULT FALSE,
    description           VARCHAR(255)
);

CREATE TABLE loyalty_accounts (
    user_id         BIGINT       PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    lifetime_points INT          NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
    tier            loyalty_tier NOT NULL DEFAULT 'BRONZE',
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Yeni kayıtlı kullanıcı oluşturulduğunda otomatik BRONZE hesap açılır
CREATE OR REPLACE FUNCTION fn_create_loyalty_account()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_guest = FALSE THEN
        INSERT INTO loyalty_accounts (user_id) VALUES (NEW.id)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_loyalty_account
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION fn_create_loyalty_account();

-- =============================================================================
-- 6. NOTIFICATIONS & LOCALIZATION
-- =============================================================================

CREATE TABLE notification_templates (
    id          BIGSERIAL            PRIMARY KEY,
    code        VARCHAR(50)          NOT NULL,
    channel     notification_channel NOT NULL,
    lang_code   VARCHAR(5)           NOT NULL,
    subject     VARCHAR(200),
    content     TEXT                 NOT NULL,
    created_at  TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    UNIQUE (code, channel, lang_code)
);

SELECT fn_create_updated_at_trigger('notification_templates');

CREATE TABLE notifications (
    id              BIGSERIAL            PRIMARY KEY,
    user_id         BIGINT               NOT NULL REFERENCES users(id),
    reservation_id  BIGINT                        REFERENCES reservations(id),
    channel         notification_channel NOT NULL,
    title           VARCHAR(150)         NOT NULL,
    message         TEXT                 NOT NULL,
    status          notification_status  NOT NULL DEFAULT 'PENDING',
    sent_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    failure_reason  VARCHAR(255),
    created_at      TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

-- Statik arayüz metinleri: buton etiketleri, menü metinleri, enum görünen
-- adları vb. sabit kümeler için trans_key bazlı erişim.
-- Ör: trans_key = 'vehicle_class.VIP', lang_code = 'en', value = 'VIP Class'
CREATE TABLE translations (
    id          BIGSERIAL    PRIMARY KEY,
    trans_key   VARCHAR(150) NOT NULL,
    lang_code   VARCHAR(5)   NOT NULL,
    value       TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (trans_key, lang_code)
);

SELECT fn_create_updated_at_trigger('translations');

-- Dinamik iş verisi çevirisi: veritabanı satırlarındaki kullanıcıya görünen
-- metin alanları için polimorfik çok-dilli içerik tablosu.
-- Kapsam: pricing_zones.name/description, campaigns.name/description,
--         pricing_rules.name/reason, loyalty_tier_config.description,
--         vehicles.color, notifications.title/message (şablon dışı).
--
-- TASARIM GEREKÇESİ (Polimorfik tek-tablo seçimi):
--   Sistemde yalnızca 2 dil (tr/en) ve ~5 çevirilebilir entity mevcuttur.
--   Entity başına ayrı çeviri tablosu (pricing_zone_translations, vb.) referans
--   bütünlüğü açısından daha güçlü olur; ancak her yeni entity için DDL değişikliği
--   gerektirir. Bu ölçekte DDL esnekliği ve tek-tablo sadeliği tercih edildi.
--
-- KABUL EDİLEN TRADE-OFF (native FK yok) + AZALTICI ÖNLEMLER:
--   entity_id gerçek bir FK olamaz (birden çok tabloya işaret eder). Bunun yerine:
--   1. CASCADE EMÜLASYONU — kaynak satır silinince trg_*_purge_translations trigger'ı
--      ilgili entity_translations satırlarını AFTER DELETE anında siler (aşağıda).
--   2. entity_type CHECK — kanonik küme DB düzeyinde kısıtlanır; tipo/geçersiz değer
--      DB tarafından reddedilir (chk_entity_type).
--   3. COALESCE FALLBACK — uygulama katmanı: dil kaydı yoksa kaynak tablonun TR
--      değerine düşer (örnek sorgu: seed bölümüne bakın).
CREATE TABLE entity_translations (
    id           BIGSERIAL    PRIMARY KEY,
    entity_type  VARCHAR(50)  NOT NULL,   -- kanonik küme: chk_entity_type CHECK'e bakın
    entity_id    BIGINT       NOT NULL,   -- ilgili satırın id değeri (mantıksal FK)
    field_name   VARCHAR(50)  NOT NULL,   -- 'name', 'description', 'reason', ...
    lang_code    VARCHAR(5)   NOT NULL,   -- 'tr', 'en'
    value        TEXT         NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (entity_type, entity_id, field_name, lang_code),
    CONSTRAINT chk_entity_type CHECK (entity_type IN (
        'pricing_zone', 'campaign', 'pricing_rule', 'loyalty_tier', 'vehicle'
    ))
);

-- Birincil arama deseni: entity_type + entity_id + lang_code üçlüsü
CREATE INDEX idx_entity_translations_lookup
    ON entity_translations (entity_type, entity_id, lang_code);

SELECT fn_create_updated_at_trigger('entity_translations');

-- CASCADE EMÜLASYONU — polimorfik FK bütünlüğü
-- Kaynak tablo satırı silinince, o entity'ye ait tüm entity_translations satırları
-- AFTER DELETE trigger'ı aracılığıyla otomatik temizlenir. Bu sayede öksüz (orphan)
-- çeviri satırları oluşmaz ve uygulama/cron düzeyinde ek temizleme gerekmez.
CREATE OR REPLACE FUNCTION fn_purge_entity_translations()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM entity_translations
    WHERE entity_type = TG_ARGV[0]
      AND entity_id   = OLD.id;
    RETURN OLD;
END;
$$;

-- Yukarıdaki purge fonksiyonunu verilen kaynak tabloya AFTER DELETE trigger olarak bağlar.
-- tbl:   kaynak tablonun adı (ör. 'pricing_zones')
-- etype: entity_translations.entity_type değeri (ör. 'pricing_zone')
CREATE OR REPLACE FUNCTION fn_create_translation_purge_trigger(tbl TEXT, etype TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    EXECUTE format(
        'CREATE TRIGGER trg_%s_purge_translations
         AFTER DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION fn_purge_entity_translations(%L)',
        tbl, tbl, etype
    );
END;
$$;

-- 5 kaynak tabloya purge trigger bağlanır (chk_entity_type kümesiyle birebir aynı liste).
SELECT fn_create_translation_purge_trigger('pricing_zones',       'pricing_zone');
SELECT fn_create_translation_purge_trigger('campaigns',           'campaign');
SELECT fn_create_translation_purge_trigger('pricing_rules',       'pricing_rule');
SELECT fn_create_translation_purge_trigger('loyalty_tier_config', 'loyalty_tier');
SELECT fn_create_translation_purge_trigger('vehicles',            'vehicle');

-- =============================================================================
-- 7. AUDIT LOG
-- =============================================================================

CREATE TABLE audit_logs (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT                REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50)  NOT NULL,
    entity_id   BIGINT,
    old_values  JSONB,
    new_values  JSONB,
    ip_address  INET,
    user_agent  VARCHAR(500),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- users
CREATE INDEX idx_users_phone     ON users(phone_number);
CREATE INDEX idx_users_email     ON users(email)     WHERE email IS NOT NULL;
CREATE INDEX idx_users_active    ON users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role      ON users(role);

-- refresh_tokens
CREATE INDEX idx_rt_user         ON refresh_tokens(user_id);
CREATE INDEX idx_rt_expires      ON refresh_tokens(expires_at) WHERE revoked = FALSE;

-- vehicles
CREATE INDEX idx_vehicles_class  ON vehicles(vehicle_class);
CREATE INDEX idx_vehicles_active ON vehicles(is_active);

-- pricing_zones — GiST: ST_Contains sorgularını hızlandırır
CREATE INDEX idx_pzones_geom     ON pricing_zones USING GIST (polygon_geom);
CREATE INDEX idx_pzones_active   ON pricing_zones(is_active);

-- pricing_rules
CREATE INDEX idx_prules_zone     ON pricing_rules(zone_id);
CREATE INDEX idx_prules_daytime  ON pricing_rules(day_of_week, start_time, end_time) WHERE is_active = TRUE;

-- reservations — GiST: koordinat sorguları için
CREATE INDEX idx_res_pickup_pt   ON reservations USING GIST (pickup_point);
CREATE INDEX idx_res_dropoff_pt  ON reservations USING GIST (dropoff_point);
CREATE INDEX idx_res_user        ON reservations(user_id);
CREATE INDEX idx_res_vehicle     ON reservations(vehicle_id);
CREATE INDEX idx_res_status      ON reservations(status);
CREATE INDEX idx_res_scheduled   ON reservations(scheduled_time);
CREATE INDEX idx_res_booking     ON reservations(booking_reference);
CREATE INDEX idx_res_guest       ON reservations(guest_phone) WHERE guest_phone IS NOT NULL;
CREATE INDEX idx_res_created     ON reservations(created_at DESC);

-- reservation_status_history
CREATE INDEX idx_rsh_res         ON reservation_status_history(reservation_id);

-- loyalty_accounts
CREATE INDEX idx_lac_tier        ON loyalty_accounts(tier);

-- notifications
CREATE INDEX idx_notif_user      ON notifications(user_id);
CREATE INDEX idx_notif_pending   ON notifications(status) WHERE status = 'PENDING';
CREATE INDEX idx_notif_res       ON notifications(reservation_id);

-- audit_logs
CREATE INDEX idx_audit_user      ON audit_logs(user_id);
CREATE INDEX idx_audit_entity    ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created   ON audit_logs(created_at DESC);

-- entity_translations — idx_entity_translations_lookup tablo tanımında oluşturuldu

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- opening_price: araç bazlı sabit açılış ücreti (TRY).
-- Sınıf hiyerarşisine göre artar; surge ve araç çarpanından bağımsızdır.
INSERT INTO vehicles (plate_number, vehicle_class, brand, model, capacity, base_price_multiplier, opening_price) VALUES
    ('34 AA 001', 'STANDARD', 'Toyota',  'Corolla',    4,  1.00,  20.00),
    ('34 BB 002', 'BUSINESS', 'Toyota',  'RAV4',       7,  1.25,  30.00),
    ('34 CC 003', 'VIP',      'Mercedes','E-Class',    4,  1.75,  50.00),
    ('34 DD 004', 'STANDARD', 'Ford',    'Tourneo',    8,  1.30,  25.00),
    ('34 EE 005', 'LUXURY',   'Mercedes','S-Class',    4,  2.50,  75.00),
    ('34 FF 006', 'ECONOMY',  'Mercedes','Sprinter',   16, 1.50,  15.00);

INSERT INTO loyalty_tier_config
    (tier, min_points, earn_rate, discount_percentage, priority_support, description)
VALUES
    ('BRONZE',    0,     1.00,  0.00, FALSE, 'Başlangıç seviyesi'),
    ('SILVER',    500,   1.25,  2.00, FALSE, 'Düzenli müşteri'),
    ('GOLD',      2000,  1.50,  5.00, TRUE,  'Değerli müşteri'),
    ('PLATINUM',  5000,  1.75,  8.00, TRUE,  'Premium müşteri'),
    ('VIP',       10000, 2.00, 12.00, TRUE,  'Elit VIP müşteri');

-- Örnek entity_translations: loyalty_tier_config açıklamalarının EN karşılıkları.
-- Uygulama katmanı: users.preferred_lang'a göre önce entity_translations'tan
-- çeker; kayıt yoksa kaynak tablonun TR değerine (COALESCE) düşer.
-- Ör: SELECT COALESCE(et.value, ltc.description) AS description
--     FROM loyalty_tier_config ltc
--     LEFT JOIN entity_translations et
--           ON et.entity_type = 'loyalty_tier'
--          AND et.entity_id   = ltc.id
--          AND et.field_name  = 'description'
--          AND et.lang_code   = 'en'
--     WHERE ltc.tier = 'GOLD';
INSERT INTO entity_translations (entity_type, entity_id, field_name, lang_code, value) VALUES
    ('loyalty_tier', 1, 'description', 'en', 'Starter level'),
    ('loyalty_tier', 2, 'description', 'en', 'Regular customer'),
    ('loyalty_tier', 3, 'description', 'en', 'Valued customer'),
    ('loyalty_tier', 4, 'description', 'en', 'Premium customer'),
    ('loyalty_tier', 5, 'description', 'en', 'Elite VIP customer');
