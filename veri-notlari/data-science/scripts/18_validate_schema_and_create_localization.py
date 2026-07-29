import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


# Windows terminalinde Türkçe karakter desteği
try:
    sys.stdout.reconfigure(encoding="utf-8")
except AttributeError:
    pass


# =====================================================
# 1. GENEL AYARLAR
# =====================================================

DATABASE_SCHEMA_VERSION = "4.3.0"
LOCALIZATION_EXPORT_VERSION = "localization-export-v1"

FAIL_ON_VALIDATION_ERROR = True

SUPPORTED_LANGUAGES = {
    "tr",
    "en",
}

ALLOWED_ENTITY_FIELDS = {
    "pricing_zone": {
        "name",
        "description",
    },
    "campaign": {
        "name",
        "description",
    },
    "pricing_rule": {
        "name",
        "reason",
    },
    "loyalty_tier": {
        "description",
    },
    "vehicle": {
        "color",
    },
}

FORBIDDEN_RESERVATION_ANALYTICS_COLUMNS = {
    "weather_hour_utc",
    "weather_hour_local",
    "weather_condition",
    "temperature_c",
    "precipitation_mm",
    "snowfall_mm",
    "wind_speed_kmh",
    "relative_humidity_pct",
    "cloud_cover_pct",
    "visibility_m",
    "is_rainy",
    "is_snowy",
    "is_foggy",
    "is_bad_weather",
    "weather_severity_score",
    "weather_data_source",
    "weather_is_synthetic",
    "source_trip_id",
    "source_fare_amount_usd",
    "source_total_amount_usd",
}


# =====================================================
# 2. SQL TABLO SÜTUNLARI
# =====================================================

EXPECTED_COLUMNS = {
    "vehicles": [
        "id",
        "plate_number",
        "vehicle_class",
        "brand",
        "model",
        "year",
        "color",
        "photo_url",
        "capacity",
        "base_price_multiplier",
        "opening_price",
        "is_active",
        "created_at",
        "updated_at",
    ],

    "pricing_zones": [
        "id",
        "name",
        "description",
        "polygon_geom",
        "base_price",
        "min_price",
        "price_per_km",
        "currency",
        "is_active",
        "created_at",
        "updated_at",
    ],

    "pricing_rules": [
        "id",
        "zone_id",
        "name",
        "day_of_week",
        "start_time",
        "end_time",
        "multiplier",
        "reason",
        "valid_from",
        "valid_to",
        "is_active",
        "created_at",
    ],

    "loyalty_tier_config": [
        "id",
        "tier",
        "min_points",
        "earn_rate",
        "discount_percentage",
        "priority_support",
        "description",
    ],

    "reservations": [
        "id",
        "booking_reference",
        "user_id",
        "guest_phone",
        "pickup_address",
        "pickup_point",
        "dropoff_address",
        "dropoff_point",
        "pickup_zone_id",
        "dropoff_zone_id",
        "scheduled_time",
        "vehicle_id",
        "passenger_count",
        "distance_km",
        "route_polyline",
        "base_price",
        "surge_multiplier",
        "discount_amount",
        "loyalty_discount",
        "opening_price",
        "calculated_price",
        "currency",
        "status",
        "campaign_id",
        "flight_number",
        "notes",
        "cancelled_at",
        "cancellation_reason",
        "completed_at",
        "created_at",
        "updated_at",
    ],

    "campaigns": [
        "id",
        "code",
        "name",
        "description",
        "discount_type",
        "discount_value",
        "max_discount_amount",
        "min_order_amount",
        "max_uses",
        "used_count",
        "max_uses_per_user",
        "valid_from",
        "valid_to",
        "is_active",
        "created_by",
        "created_at",
        "updated_at",
    ],

    "entity_translations": [
        "id",
        "entity_type",
        "entity_id",
        "field_name",
        "lang_code",
        "value",
        "created_at",
        "updated_at",
    ],

    "translations": [
        "id",
        "trans_key",
        "lang_code",
        "value",
        "created_at",
        "updated_at",
    ],
}


# =====================================================
# 3. SQL LOYALTY CONFIG
# =====================================================

EXPECTED_LOYALTY_CONFIG = pd.DataFrame(
    [
        {
            "id": 1,
            "tier": "BRONZE",
            "min_points": 0,
            "earn_rate": 1.00,
            "discount_percentage": 0.00,
            "priority_support": False,
            "description": "Başlangıç seviyesi",
        },
        {
            "id": 2,
            "tier": "SILVER",
            "min_points": 500,
            "earn_rate": 1.25,
            "discount_percentage": 2.00,
            "priority_support": False,
            "description": "Düzenli müşteri",
        },
        {
            "id": 3,
            "tier": "GOLD",
            "min_points": 2_000,
            "earn_rate": 1.50,
            "discount_percentage": 5.00,
            "priority_support": True,
            "description": "Değerli müşteri",
        },
        {
            "id": 4,
            "tier": "PLATINUM",
            "min_points": 5_000,
            "earn_rate": 1.75,
            "discount_percentage": 8.00,
            "priority_support": True,
            "description": "Premium müşteri",
        },
        {
            "id": 5,
            "tier": "VIP",
            "min_points": 10_000,
            "earn_rate": 2.00,
            "discount_percentage": 12.00,
            "priority_support": True,
            "description": "Elit VIP müşteri",
        },
    ]
)


LOYALTY_DESCRIPTION_EN = {
    "BRONZE": "Starter level",
    "SILVER": "Regular customer",
    "GOLD": "Valued customer",
    "PLATINUM": "Premium customer",
    "VIP": "Elite VIP customer",
}


# =====================================================
# 4. ARAÇ RENK ÇEVİRİLERİ
# =====================================================

VEHICLE_COLOR_EN = {
    "siyah": "Black",
    "black": "Black",

    "beyaz": "White",
    "white": "White",

    "gri": "Gray",
    "gray": "Gray",
    "grey": "Gray",

    "gümüş": "Silver",
    "gumus": "Silver",
    "silver": "Silver",

    "lacivert": "Navy Blue",
    "navy": "Navy Blue",
    "navy blue": "Navy Blue",

    "mavi": "Blue",
    "blue": "Blue",

    "kırmızı": "Red",
    "kirmizi": "Red",
    "red": "Red",

    "yeşil": "Green",
    "yesil": "Green",
    "green": "Green",

    "bej": "Beige",
    "beige": "Beige",

    "kahverengi": "Brown",
    "brown": "Brown",

    "bordo": "Burgundy",
    "burgundy": "Burgundy",

    "füme": "Anthracite",
    "fume": "Anthracite",
    "anthracite": "Anthracite",

    "turuncu": "Orange",
    "orange": "Orange",
}


# =====================================================
# 5. STATİK ENUM ÇEVİRİLERİ
# =====================================================

STATIC_TRANSLATIONS = {
    # -------------------------------------------------
    # Vehicle class
    # -------------------------------------------------
    "vehicle_class.ECONOMY": {
        "tr": "Ekonomi",
        "en": "Economy",
    },
    "vehicle_class.STANDARD": {
        "tr": "Standart",
        "en": "Standard",
    },
    "vehicle_class.BUSINESS": {
        "tr": "Business",
        "en": "Business",
    },
    "vehicle_class.VIP": {
        "tr": "VIP",
        "en": "VIP",
    },
    "vehicle_class.LUXURY": {
        "tr": "Lüks",
        "en": "Luxury",
    },
    "vehicle_class.MINIVAN": {
        "tr": "Minivan",
        "en": "Minivan",
    },

    # -------------------------------------------------
    # Reservation status
    # -------------------------------------------------
    "reservation_status.PENDING": {
        "tr": "Beklemede",
        "en": "Pending",
    },
    "reservation_status.ASSIGNED": {
        "tr": "Araç Atandı",
        "en": "Assigned",
    },
    "reservation_status.COMPLETED": {
        "tr": "Tamamlandı",
        "en": "Completed",
    },
    "reservation_status.CANCELLED": {
        "tr": "İptal Edildi",
        "en": "Cancelled",
    },
    "reservation_status.NO_SHOW": {
        "tr": "Gelmedi",
        "en": "No Show",
    },

    # -------------------------------------------------
    # Loyalty tier names
    # -------------------------------------------------
    "loyalty_tier.BRONZE": {
        "tr": "Bronz",
        "en": "Bronze",
    },
    "loyalty_tier.SILVER": {
        "tr": "Gümüş",
        "en": "Silver",
    },
    "loyalty_tier.GOLD": {
        "tr": "Altın",
        "en": "Gold",
    },
    "loyalty_tier.PLATINUM": {
        "tr": "Platin",
        "en": "Platinum",
    },
    "loyalty_tier.VIP": {
        "tr": "VIP",
        "en": "VIP",
    },

    # -------------------------------------------------
    # User role
    # -------------------------------------------------
    "user_role.ADMIN": {
        "tr": "Yönetici",
        "en": "Administrator",
    },
    "user_role.CUSTOMER": {
        "tr": "Müşteri",
        "en": "Customer",
    },

    # -------------------------------------------------
    # Notification channel
    # -------------------------------------------------
    "notification_channel.EMAIL": {
        "tr": "E-posta",
        "en": "Email",
    },
    "notification_channel.SMS": {
        "tr": "SMS",
        "en": "SMS",
    },
    "notification_channel.PUSH": {
        "tr": "Anlık Bildirim",
        "en": "Push Notification",
    },
    "notification_channel.WHATSAPP": {
        "tr": "WhatsApp",
        "en": "WhatsApp",
    },

    # -------------------------------------------------
    # Notification status
    # -------------------------------------------------
    "notification_status.PENDING": {
        "tr": "Beklemede",
        "en": "Pending",
    },
    "notification_status.SENT": {
        "tr": "Gönderildi",
        "en": "Sent",
    },
    "notification_status.DELIVERED": {
        "tr": "Teslim Edildi",
        "en": "Delivered",
    },
    "notification_status.FAILED": {
        "tr": "Başarısız",
        "en": "Failed",
    },
    "notification_status.READ": {
        "tr": "Okundu",
        "en": "Read",
    },

    # -------------------------------------------------
    # Discount type
    # -------------------------------------------------
    "discount_type.PERCENTAGE": {
        "tr": "Yüzde",
        "en": "Percentage",
    },
    "discount_type.FIXED_AMOUNT": {
        "tr": "Sabit Tutar",
        "en": "Fixed Amount",
    },
}


# =====================================================
# 6. PROJE KLASÖRLERİ
# =====================================================

def find_project_root() -> Path:
    """
    Python dosyasının bulunduğu klasöre göre proje kökünü bulur.
    """

    script_directory = Path(__file__).resolve().parent

    known_script_directories = {
        "scripts",
        "src",
        "data-science",
        "data_science",
    }

    if script_directory.name.lower() in known_script_directories:
        return script_directory.parent

    return script_directory


PROJECT_ROOT = find_project_root()

REFERENCE_DIR = (
    PROJECT_ROOT
    / "data"
    / "reference"
)

GENERATED_DIR = (
    PROJECT_ROOT
    / "data"
    / "generated"
)

REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "18_validate_schema_and_create_localization"
)

GENERATED_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

REPORT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# =====================================================
# 7. DOSYA YOLLARI
# =====================================================

VEHICLES_FILE = (
    REFERENCE_DIR
    / "vehicles.csv"
)

PRICING_ZONES_FILE = (
    REFERENCE_DIR
    / "pricing_zones.csv"
)

PRICING_RULES_FILE = (
    REFERENCE_DIR
    / "pricing_rules.csv"
)

LOYALTY_TIER_CONFIG_FILE = (
    REFERENCE_DIR
    / "loyalty_tier_config.csv"
)

RESERVATIONS_FILE = (
    GENERATED_DIR
    / "reservations.csv"
)

# Campaign çıktısı şu an pipeline'da zorunlu değildir.
CAMPAIGN_FILE_CANDIDATES = [
    GENERATED_DIR / "campaigns.csv",
    REFERENCE_DIR / "campaigns.csv",
]

ENTITY_TRANSLATIONS_OUTPUT = (
    GENERATED_DIR
    / "entity_translations.csv"
)

STATIC_TRANSLATIONS_OUTPUT = (
    GENERATED_DIR
    / "translations.csv"
)

VALIDATION_CHECKS_OUTPUT = (
    REPORT_DIR
    / "localization_validation_checks.csv"
)

ENTITY_TRANSLATION_AUDIT_OUTPUT = (
    REPORT_DIR
    / "entity_translation_audit.csv"
)

ENTITY_TRANSLATION_COVERAGE_OUTPUT = (
    REPORT_DIR
    / "entity_translation_coverage.csv"
)

STATIC_TRANSLATION_COVERAGE_OUTPUT = (
    REPORT_DIR
    / "static_translation_coverage.csv"
)

UNKNOWN_VEHICLE_COLORS_OUTPUT = (
    REPORT_DIR
    / "unknown_vehicle_colors.csv"
)

SUMMARY_OUTPUT = (
    REPORT_DIR
    / "localization_export_summary.json"
)

IMPORT_NOTES_OUTPUT = (
    REPORT_DIR
    / "LOCALIZATION_IMPORT_NOTES.txt"
)


# =====================================================
# 8. DOĞRULAMA KAYDEDİCİ
# =====================================================

class CheckRecorder:
    """
    Bütün doğrulama sonuçlarını tek DataFrame içinde toplar.
    """

    def __init__(self) -> None:
        self.rows = []

    def add(
        self,
        category: str,
        check_name: str,
        passed: bool,
        details: str,
        severity: str = "ERROR",
    ) -> None:
        row = {
            "category": category,
            "check_name": check_name,
            "passed": bool(passed),
            "severity": severity,
            "details": str(details),
        }

        self.rows.append(row)

        if passed:
            icon = "✅"
        elif severity == "WARNING":
            icon = "⚠️"
        else:
            icon = "❌"

        print(
            f"{icon} [{category}] "
            f"{check_name}: {details}"
        )

    def to_dataframe(self) -> pd.DataFrame:
        return pd.DataFrame(self.rows)

    def failed_error_count(self) -> int:
        return sum(
            1
            for row in self.rows
            if (
                not row["passed"]
                and row["severity"] == "ERROR"
            )
        )

    def warning_count(self) -> int:
        return sum(
            1
            for row in self.rows
            if (
                not row["passed"]
                and row["severity"] == "WARNING"
            )
        )


# =====================================================
# 9. YARDIMCI FONKSİYONLAR
# =====================================================

def require_file(file_path: Path) -> None:
    """
    Zorunlu dosyanın mevcut olduğunu doğrular.
    """

    if not file_path.exists():
        raise FileNotFoundError(
            f"Gerekli dosya bulunamadı:\n{file_path}"
        )


def clean_text(value) -> str:
    """
    Null, NaN ve gereksiz boşlukları temizler.
    """

    if pd.isna(value):
        return ""

    text = str(value).strip()

    if text.lower() in {
        "nan",
        "none",
        "null",
        "<na>",
    }:
        return ""

    return " ".join(
        text.split()
    )


TURKISH_TRANSLITERATION_TABLE = str.maketrans(
    {
        "İ": "I",
        "ı": "i",
        "Ş": "S",
        "ş": "s",
        "Ç": "C",
        "ç": "c",
        "Ğ": "G",
        "ğ": "g",
        "Ö": "O",
        "ö": "o",
        "Ü": "U",
        "ü": "u",
    }
)


def transliterate_turkish(value) -> str:
    """
    Türkçe özel karakterleri İngilizce/ASCII karşılıklarına dönüştürür.

    Bu fonksiyon çeviri değildir; özellikle özel yer adlarında
    İngilizce gösterim için transliterasyon sağlar.
    """

    return clean_text(value).translate(
        TURKISH_TRANSLITERATION_TABLE
    )


def convert_boolean(
    series: pd.Series,
    column_name: str,
) -> pd.Series:
    """
    CSV boolean değerlerini güvenli biçimde dönüştürür.
    """

    if pd.api.types.is_bool_dtype(series):
        return series.astype(bool)

    converted = (
        series.astype("string")
        .str.strip()
        .str.lower()
        .map(
            {
                "true": True,
                "false": False,
                "1": True,
                "0": False,
            }
        )
    )

    if converted.isna().any():
        invalid_values = (
            series.loc[
                converted.isna()
            ]
            .drop_duplicates()
            .head(10)
            .tolist()
        )

        raise ValueError(
            f"{column_name} alanında geçersiz "
            f"boolean değerler bulundu: {invalid_values}"
        )

    return converted.astype(bool)


def read_required_csv(
    file_path: Path,
) -> pd.DataFrame:
    """
    Zorunlu CSV dosyasını okur.
    """

    require_file(file_path)

    return pd.read_csv(
        file_path,
        low_memory=False,
    )


def find_campaign_file() -> Path | None:
    """
    Opsiyonel campaigns.csv dosyasını arar.
    """

    for candidate in CAMPAIGN_FILE_CANDIDATES:
        if candidate.exists():
            return candidate

    return None


def validate_exact_columns(
    recorder: CheckRecorder,
    dataframe: pd.DataFrame,
    expected_columns: list[str],
    table_name: str,
) -> None:
    """
    Sütun isimlerini ve sırasını SQL şemasıyla karşılaştırır.
    """

    actual_columns = dataframe.columns.tolist()

    passed = (
        actual_columns
        == expected_columns
    )

    missing_columns = [
        column
        for column in expected_columns
        if column not in actual_columns
    ]

    extra_columns = [
        column
        for column in actual_columns
        if column not in expected_columns
    ]

    recorder.add(
        category="SCHEMA",
        check_name=f"{table_name}_exact_columns",
        passed=passed,
        details=(
            f"Beklenen={len(expected_columns)}, "
            f"bulunan={len(actual_columns)}, "
            f"eksik={missing_columns}, "
            f"fazla={extra_columns}"
        ),
    )


def write_csv_atomic(
    dataframe: pd.DataFrame,
    output_path: Path,
) -> None:
    """
    CSV'yi önce geçici dosyaya yazar.

    Yazma tamamen başarılı olduğunda ana dosyanın üzerine atomik
    olarak taşır.
    """

    temporary_path = output_path.with_suffix(
        output_path.suffix + ".tmp"
    )

    if temporary_path.exists():
        temporary_path.unlink()

    dataframe.to_csv(
        temporary_path,
        index=False,
        encoding="utf-8",
        na_rep="",
    )

    temporary_path.replace(
        output_path
    )


# =====================================================
# 10. KAYNAK TABLOLARI OKUMA
# =====================================================

def read_source_tables(
    recorder: CheckRecorder,
) -> dict:
    """
    Localization kaynak tablolarını ve reservations header'ını okur.
    """

    vehicles_df = read_required_csv(
        VEHICLES_FILE
    )

    pricing_zones_df = read_required_csv(
        PRICING_ZONES_FILE
    )

    pricing_rules_df = read_required_csv(
        PRICING_RULES_FILE
    )

    loyalty_tier_df = read_required_csv(
        LOYALTY_TIER_CONFIG_FILE
    )

    require_file(
        RESERVATIONS_FILE
    )

    reservations_header_df = pd.read_csv(
        RESERVATIONS_FILE,
        nrows=0,
    )

    campaign_file = find_campaign_file()

    if campaign_file is not None:
        campaigns_df = pd.read_csv(
            campaign_file,
            low_memory=False,
        )

        validate_exact_columns(
            recorder=recorder,
            dataframe=campaigns_df,
            expected_columns=EXPECTED_COLUMNS[
                "campaigns"
            ],
            table_name="campaigns",
        )

        recorder.add(
            category="SOURCE_FILES",
            check_name="campaigns_file_found",
            passed=True,
            details=str(campaign_file),
            severity="WARNING",
        )

    else:
        campaigns_df = pd.DataFrame(
            columns=EXPECTED_COLUMNS[
                "campaigns"
            ]
        )

        recorder.add(
            category="SOURCE_FILES",
            check_name="campaigns_file_found",
            passed=False,
            details=(
                "campaigns.csv bulunmadı. "
                "Campaign çevirileri üretilmeyecek."
            ),
            severity="WARNING",
        )

    validate_exact_columns(
        recorder=recorder,
        dataframe=vehicles_df,
        expected_columns=EXPECTED_COLUMNS[
            "vehicles"
        ],
        table_name="vehicles",
    )

    validate_exact_columns(
        recorder=recorder,
        dataframe=pricing_zones_df,
        expected_columns=EXPECTED_COLUMNS[
            "pricing_zones"
        ],
        table_name="pricing_zones",
    )

    validate_exact_columns(
        recorder=recorder,
        dataframe=pricing_rules_df,
        expected_columns=EXPECTED_COLUMNS[
            "pricing_rules"
        ],
        table_name="pricing_rules",
    )

    validate_exact_columns(
        recorder=recorder,
        dataframe=loyalty_tier_df,
        expected_columns=EXPECTED_COLUMNS[
            "loyalty_tier_config"
        ],
        table_name="loyalty_tier_config",
    )

    validate_exact_columns(
        recorder=recorder,
        dataframe=reservations_header_df,
        expected_columns=EXPECTED_COLUMNS[
            "reservations"
        ],
        table_name="reservations",
    )

    return {
        "vehicles": vehicles_df,
        "pricing_zones": pricing_zones_df,
        "pricing_rules": pricing_rules_df,
        "loyalty_tier_config": loyalty_tier_df,
        "campaigns": campaigns_df,
        "campaign_file": campaign_file,
        "reservations_header": reservations_header_df,
    }


# =====================================================
# 11. KAYNAK TABLO DOĞRULAMALARI
# =====================================================

def validate_source_tables(
    recorder: CheckRecorder,
    source_tables: dict,
) -> dict:
    """
    Backend kaynak tablolarının temel şema ve ilişki kontrollerini yapar.
    """

    vehicles_df = source_tables[
        "vehicles"
    ].copy()

    zones_df = source_tables[
        "pricing_zones"
    ].copy()

    rules_df = source_tables[
        "pricing_rules"
    ].copy()

    loyalty_df = source_tables[
        "loyalty_tier_config"
    ].copy()

    campaigns_df = source_tables[
        "campaigns"
    ].copy()

    reservations_header_df = source_tables[
        "reservations_header"
    ]

    # -------------------------------------------------
    # Vehicles
    # -------------------------------------------------

    vehicles_df["id"] = pd.to_numeric(
        vehicles_df["id"],
        errors="raise",
    ).astype("int64")

    vehicles_df["opening_price"] = pd.to_numeric(
        vehicles_df["opening_price"],
        errors="raise",
    )

    vehicles_df[
        "base_price_multiplier"
    ] = pd.to_numeric(
        vehicles_df[
            "base_price_multiplier"
        ],
        errors="raise",
    )

    vehicle_integrity = (
        not vehicles_df[
            "id"
        ].duplicated().any()
        and not vehicles_df[
            "plate_number"
        ].duplicated().any()
        and (
            vehicles_df[
                "opening_price"
            ] >= 0
        ).all()
        and (
            vehicles_df[
                "base_price_multiplier"
            ] > 0
        ).all()
    )

    recorder.add(
        category="VEHICLES",
        check_name="vehicle_prices_and_ids_valid",
        passed=vehicle_integrity,
        details=(
            f"Araç sayısı={len(vehicles_df):,}. "
            "opening_price araç bazında korunmalıdır."
        ),
    )

    # -------------------------------------------------
    # Pricing zones
    # -------------------------------------------------

    zones_df["id"] = pd.to_numeric(
        zones_df["id"],
        errors="raise",
    ).astype("int64")

    zones_df["is_active"] = convert_boolean(
        zones_df["is_active"],
        "pricing_zones.is_active",
    )

    for column in [
        "base_price",
        "min_price",
        "price_per_km",
    ]:
        zones_df[column] = pd.to_numeric(
            zones_df[column],
            errors="raise",
        )

    zone_integrity = (
        not zones_df[
            "id"
        ].duplicated().any()
        and not zones_df[
            "name"
        ].duplicated().any()
        and (
            zones_df[
                "base_price"
            ] >= 0
        ).all()
        and (
            zones_df[
                "min_price"
            ] >= 0
        ).all()
        and (
            zones_df[
                "price_per_km"
            ] >= 0
        ).all()
        and zones_df[
            "currency"
        ]
        .astype("string")
        .eq("TRY")
        .all()
        and zones_df[
            "polygon_geom"
        ]
        .astype("string")
        .str.startswith(
            "SRID=4326;POLYGON(("
        )
        .all()
    )

    recorder.add(
        category="PRICING",
        check_name="pricing_zones_valid",
        passed=zone_integrity,
        details=(
            f"Pricing zone sayısı={len(zones_df):,}."
        ),
    )

    # -------------------------------------------------
    # Pricing rules
    # -------------------------------------------------

    rules_df["id"] = pd.to_numeric(
        rules_df["id"],
        errors="raise",
    ).astype("int64")

    rules_df["zone_id"] = pd.to_numeric(
        rules_df["zone_id"],
        errors="raise",
    ).astype("int64")

    valid_zone_ids = set(
        zones_df["id"].astype(int)
    )

    rules_valid = (
        not rules_df[
            "id"
        ].duplicated().any()
        and set(
            rules_df[
                "zone_id"
            ].astype(int)
        ).issubset(
            valid_zone_ids
        )
    )

    recorder.add(
        category="PRICING",
        check_name="pricing_rule_zone_foreign_keys_valid",
        passed=rules_valid,
        details=(
            f"Pricing rule sayısı={len(rules_df):,}."
        ),
    )

    # -------------------------------------------------
    # Loyalty config
    # -------------------------------------------------

    loyalty_df["id"] = pd.to_numeric(
        loyalty_df["id"],
        errors="raise",
    ).astype("int64")

    loyalty_df["min_points"] = pd.to_numeric(
        loyalty_df["min_points"],
        errors="raise",
    ).astype("int64")

    loyalty_df["earn_rate"] = pd.to_numeric(
        loyalty_df["earn_rate"],
        errors="raise",
    )

    loyalty_df[
        "discount_percentage"
    ] = pd.to_numeric(
        loyalty_df[
            "discount_percentage"
        ],
        errors="raise",
    )

    loyalty_df[
        "priority_support"
    ] = convert_boolean(
        loyalty_df[
            "priority_support"
        ],
        "loyalty_tier_config.priority_support",
    )

    loyalty_comparison_columns = [
        "id",
        "tier",
        "min_points",
        "earn_rate",
        "discount_percentage",
        "priority_support",
        "description",
    ]

    actual_loyalty = (
        loyalty_df[
            loyalty_comparison_columns
        ]
        .sort_values("id")
        .reset_index(drop=True)
    )

    expected_loyalty = (
        EXPECTED_LOYALTY_CONFIG[
            loyalty_comparison_columns
        ]
        .sort_values("id")
        .reset_index(drop=True)
    )

    text_columns_match = (
        actual_loyalty[
            [
                "id",
                "tier",
                "min_points",
                "priority_support",
                "description",
            ]
        ]
        .equals(
            expected_loyalty[
                [
                    "id",
                    "tier",
                    "min_points",
                    "priority_support",
                    "description",
                ]
            ]
        )
    )

    numeric_columns_match = (
        actual_loyalty[
            [
                "earn_rate",
                "discount_percentage",
            ]
        ]
        .round(2)
        .equals(
            expected_loyalty[
                [
                    "earn_rate",
                    "discount_percentage",
                ]
            ]
            .round(2)
        )
    )

    loyalty_matches_sql = (
        text_columns_match
        and numeric_columns_match
    )

    recorder.add(
        category="LOYALTY",
        check_name="loyalty_config_matches_sql_v430",
        passed=loyalty_matches_sql,
        details=(
            "Kademe eşikleri, puan oranları ve açıklamalar "
            "scripts.sql ile aynı olmalıdır."
        ),
    )

    # -------------------------------------------------
    # Campaigns
    # -------------------------------------------------

    if not campaigns_df.empty:
        campaigns_df["id"] = pd.to_numeric(
            campaigns_df["id"],
            errors="raise",
        ).astype("int64")

        campaign_integrity = (
            not campaigns_df[
                "id"
            ].duplicated().any()
            and not campaigns_df[
                "code"
            ].duplicated().any()
        )

        recorder.add(
            category="CAMPAIGNS",
            check_name="campaign_ids_and_codes_unique",
            passed=campaign_integrity,
            details=(
                f"Campaign sayısı={len(campaigns_df):,}."
            ),
        )

    # -------------------------------------------------
    # Reservations header
    # -------------------------------------------------

    reservation_columns = set(
        reservations_header_df.columns
    )

    forbidden_columns_found = (
        reservation_columns
        .intersection(
            FORBIDDEN_RESERVATION_ANALYTICS_COLUMNS
        )
    )

    recorder.add(
        category="RESERVATIONS",
        check_name="reservations_has_no_analytics_weather_columns",
        passed=not forbidden_columns_found,
        details=(
            "SQL reservations.csv hava durumu ve "
            "Data Science sütunları içermemelidir."
            if not forbidden_columns_found
            else (
                "SQL tablosunda olmaması gereken sütunlar: "
                f"{sorted(forbidden_columns_found)}"
            )
        ),
    )

    recorder.add(
        category="RESERVATIONS",
        check_name="opening_price_already_exists",
        passed=(
            "opening_price"
            in reservations_header_df.columns
        ),
        details=(
            "opening_price 06 aşamasında oluşturulmuş "
            "olmalıdır; 18 aşamasında eklenmez."
        ),
    )

    recorder.add(
        category="PIPELINE_OWNERSHIP",
        check_name="price_recalculation_not_required",
        passed=True,
        details=(
            "Rezervasyon fiyatları 06 aşamasında hesaplanır "
            "ve 06b aşamasında doğrulanır. "
            "18 numaralı dosya fiyat değiştirmez."
        ),
    )

    source_ids = {
        "pricing_zone": set(
            zones_df["id"].astype(int)
        ),
        "pricing_rule": set(
            rules_df["id"].astype(int)
        ),
        "loyalty_tier": set(
            loyalty_df["id"].astype(int)
        ),
        "vehicle": set(
            vehicles_df["id"].astype(int)
        ),
        "campaign": (
            set(
                campaigns_df[
                    "id"
                ].astype(int)
            )
            if not campaigns_df.empty
            else set()
        ),
    }

    return {
        "vehicles": vehicles_df,
        "pricing_zones": zones_df,
        "pricing_rules": rules_df,
        "loyalty_tier_config": loyalty_df,
        "campaigns": campaigns_df,
        "source_ids": source_ids,
    }


# =====================================================
# 12. DİNAMİK ENTITY ÇEVİRİLERİ
# =====================================================

def create_entity_translations(
    validated_tables: dict,
    generated_at: str,
) -> tuple[
    pd.DataFrame,
    pd.DataFrame,
    pd.DataFrame,
]:
    """
    SQL entity_translations tablosu için İngilizce kayıtlar oluşturur.

    Türkçe kayıtlar kaynak tablolarda bulunduğu için tekrar üretilmez.
    Uygulama, EN çeviri bulunmazsa kaynak tablonun Türkçe değerine
    COALESCE ile düşebilir.
    """

    zones_df = validated_tables[
        "pricing_zones"
    ]

    rules_df = validated_tables[
        "pricing_rules"
    ]

    loyalty_df = validated_tables[
        "loyalty_tier_config"
    ]

    vehicles_df = validated_tables[
        "vehicles"
    ]

    campaigns_df = validated_tables[
        "campaigns"
    ]

    records = []
    audit_rows = []
    unknown_color_rows = []

    def add_translation(
        entity_type: str,
        entity_id: int,
        field_name: str,
        source_value,
        translated_value,
        translation_method: str,
    ) -> None:
        source_text = clean_text(
            source_value
        )

        translated_text = clean_text(
            translated_value
        )

        if not translated_text:
            return

        records.append(
            {
                "entity_type": entity_type,
                "entity_id": int(entity_id),
                "field_name": field_name,
                "lang_code": "en",
                "value": translated_text,
                "created_at": generated_at,
                "updated_at": generated_at,
            }
        )

        audit_rows.append(
            {
                "entity_type": entity_type,
                "entity_id": int(entity_id),
                "field_name": field_name,
                "lang_code": "en",
                "source_value": source_text,
                "translated_value": (
                    translated_text
                ),
                "translation_method": (
                    translation_method
                ),
                "human_review_recommended": (
                    translation_method
                    in {
                        "GENERATED_TEMPLATE",
                        "TRANSLITERATED_FALLBACK",
                    }
                ),
            }
        )

    # -------------------------------------------------
    # Pricing zones
    # -------------------------------------------------

    for row in zones_df.itertuples(
        index=False
    ):
        english_name = transliterate_turkish(
            row.name
        )

        add_translation(
            entity_type="pricing_zone",
            entity_id=int(row.id),
            field_name="name",
            source_value=row.name,
            translated_value=english_name,
            translation_method=(
                "PROPER_NAME_TRANSLITERATION"
            ),
        )

        add_translation(
            entity_type="pricing_zone",
            entity_id=int(row.id),
            field_name="description",
            source_value=row.description,
            translated_value=(
                f"{english_name} pricing zone "
                "for the VIP transfer service."
            ),
            translation_method=(
                "GENERATED_TEMPLATE"
            ),
        )

    zone_english_lookup = {
        int(row.id): transliterate_turkish(
            row.name
        )
        for row in zones_df.itertuples(
            index=False
        )
    }

    # -------------------------------------------------
    # Pricing rules
    # -------------------------------------------------

    for row in rules_df.itertuples(
        index=False
    ):
        zone_name = zone_english_lookup.get(
            int(row.zone_id),
            f"Zone {int(row.zone_id)}",
        )

        add_translation(
            entity_type="pricing_rule",
            entity_id=int(row.id),
            field_name="name",
            source_value=row.name,
            translated_value=(
                f"{zone_name} Demand Surge Rule"
            ),
            translation_method=(
                "GENERATED_TEMPLATE"
            ),
        )

        add_translation(
            entity_type="pricing_rule",
            entity_id=int(row.id),
            field_name="reason",
            source_value=row.reason,
            translated_value=(
                "Demand-based surge pricing rule "
                f"for {zone_name}."
            ),
            translation_method=(
                "GENERATED_TEMPLATE"
            ),
        )

    # -------------------------------------------------
    # Loyalty tier descriptions
    # -------------------------------------------------

    for row in loyalty_df.itertuples(
        index=False
    ):
        tier_name = str(
            row.tier
        ).upper()

        english_description = (
            LOYALTY_DESCRIPTION_EN.get(
                tier_name
            )
        )

        if english_description is None:
            raise ValueError(
                "İngilizce sadakat açıklaması bulunamadı: "
                f"{tier_name}"
            )

        add_translation(
            entity_type="loyalty_tier",
            entity_id=int(row.id),
            field_name="description",
            source_value=row.description,
            translated_value=(
                english_description
            ),
            translation_method=(
                "EXPLICIT_DICTIONARY"
            ),
        )

    # -------------------------------------------------
    # Vehicle colors
    # vehicle_class burada kullanılmaz.
    # -------------------------------------------------

    for row in vehicles_df.itertuples(
        index=False
    ):
        source_color = clean_text(
            row.color
        )

        if not source_color:
            continue

        lookup_key = (
            source_color
            .casefold()
            .strip()
        )

        english_color = (
            VEHICLE_COLOR_EN.get(
                lookup_key
            )
        )

        if english_color is not None:
            translation_method = (
                "EXPLICIT_DICTIONARY"
            )

        else:
            english_color = (
                transliterate_turkish(
                    source_color
                )
                .title()
            )

            translation_method = (
                "TRANSLITERATED_FALLBACK"
            )

            unknown_color_rows.append(
                {
                    "vehicle_id": int(
                        row.id
                    ),
                    "source_color": (
                        source_color
                    ),
                    "fallback_value": (
                        english_color
                    ),
                    "requires_human_review": True,
                }
            )

        add_translation(
            entity_type="vehicle",
            entity_id=int(row.id),
            field_name="color",
            source_value=source_color,
            translated_value=english_color,
            translation_method=(
                translation_method
            ),
        )

    # -------------------------------------------------
    # Campaigns — opsiyonel
    # -------------------------------------------------

    if not campaigns_df.empty:
        for row in campaigns_df.itertuples(
            index=False
        ):
            campaign_code = clean_text(
                row.code
            )

            if not campaign_code:
                campaign_code = str(
                    row.id
                )

            add_translation(
                entity_type="campaign",
                entity_id=int(row.id),
                field_name="name",
                source_value=row.name,
                translated_value=(
                    f"Campaign {campaign_code}"
                ),
                translation_method=(
                    "GENERATED_TEMPLATE"
                ),
            )

            add_translation(
                entity_type="campaign",
                entity_id=int(row.id),
                field_name="description",
                source_value=row.description,
                translated_value=(
                    "Promotional campaign "
                    f"{campaign_code} for the "
                    "VIP transfer service."
                ),
                translation_method=(
                    "GENERATED_TEMPLATE"
                ),
            )

    entity_df = pd.DataFrame(
        records
    )

    if entity_df.empty:
        raise ValueError(
            "Hiç entity translation kaydı oluşturulamadı."
        )

    entity_df = (
        entity_df
        .sort_values(
            [
                "entity_type",
                "entity_id",
                "field_name",
                "lang_code",
            ]
        )
        .reset_index(drop=True)
    )

    entity_df.insert(
        0,
        "id",
        range(
            1,
            len(entity_df) + 1,
        ),
    )

    entity_df = entity_df[
        EXPECTED_COLUMNS[
            "entity_translations"
        ]
    ]

    audit_df = (
        pd.DataFrame(
            audit_rows
        )
        .sort_values(
            [
                "entity_type",
                "entity_id",
                "field_name",
            ]
        )
        .reset_index(drop=True)
    )

    unknown_colors_df = pd.DataFrame(
        unknown_color_rows,
        columns=[
            "vehicle_id",
            "source_color",
            "fallback_value",
            "requires_human_review",
        ],
    )

    return (
        entity_df,
        audit_df,
        unknown_colors_df,
    )


# =====================================================
# 13. STATİK ENUM ÇEVİRİLERİ
# =====================================================

def create_static_translations(
    generated_at: str,
) -> pd.DataFrame:
    """
    SQL translations tablosu için statik enum görünen adlarını üretir.
    """

    rows = []

    for trans_key in sorted(
        STATIC_TRANSLATIONS
    ):
        language_values = (
            STATIC_TRANSLATIONS[
                trans_key
            ]
        )

        for lang_code in sorted(
            language_values
        ):
            rows.append(
                {
                    "trans_key": (
                        trans_key
                    ),
                    "lang_code": (
                        lang_code
                    ),
                    "value": (
                        language_values[
                            lang_code
                        ]
                    ),
                    "created_at": (
                        generated_at
                    ),
                    "updated_at": (
                        generated_at
                    ),
                }
            )

    translations_df = pd.DataFrame(
        rows
    )

    translations_df.insert(
        0,
        "id",
        range(
            1,
            len(translations_df) + 1,
        ),
    )

    return translations_df[
        EXPECTED_COLUMNS[
            "translations"
        ]
    ]


# =====================================================
# 14. ENTITY TRANSLATION DOĞRULAMA
# =====================================================

def validate_entity_translations(
    recorder: CheckRecorder,
    entity_df: pd.DataFrame,
    source_ids: dict,
) -> None:
    """
    Dinamik çevirilerin SQL constraint ve mantıksal FK
    kurallarına uyumunu doğrular.
    """

    validate_exact_columns(
        recorder=recorder,
        dataframe=entity_df,
        expected_columns=EXPECTED_COLUMNS[
            "entity_translations"
        ],
        table_name="entity_translations",
    )

    expected_ids = pd.Series(
        range(
            1,
            len(entity_df) + 1,
        ),
        dtype="int64",
    )

    id_sequence_valid = (
        entity_df["id"]
        .reset_index(drop=True)
        .astype("int64")
        .equals(
            expected_ids
        )
    )

    recorder.add(
        category="ENTITY_TRANSLATIONS",
        check_name="ids_are_sequential",
        passed=id_sequence_valid,
        details=(
            f"ID aralığı 1–{len(entity_df):,}."
        ),
    )

    unique_key_columns = [
        "entity_type",
        "entity_id",
        "field_name",
        "lang_code",
    ]

    duplicate_count = int(
        entity_df[
            unique_key_columns
        ].duplicated().sum()
    )

    recorder.add(
        category="ENTITY_TRANSLATIONS",
        check_name="unique_constraint_valid",
        passed=(
            duplicate_count == 0
        ),
        details=(
            f"Tekrar eden unique key="
            f"{duplicate_count:,}"
        ),
    )

    invalid_entity_types = (
        set(
            entity_df[
                "entity_type"
            ].astype(str)
        )
        - set(
            ALLOWED_ENTITY_FIELDS
        )
    )

    recorder.add(
        category="ENTITY_TRANSLATIONS",
        check_name="entity_types_valid",
        passed=not invalid_entity_types,
        details=(
            "Bütün entity_type değerleri SQL CHECK "
            "kısıtına uygundur."
            if not invalid_entity_types
            else (
                "Geçersiz entity_type değerleri: "
                f"{sorted(invalid_entity_types)}"
            )
        ),
    )

    invalid_field_rows = []

    for row in entity_df.itertuples(
        index=False
    ):
        allowed_fields = (
            ALLOWED_ENTITY_FIELDS.get(
                row.entity_type,
                set(),
            )
        )

        if row.field_name not in (
            allowed_fields
        ):
            invalid_field_rows.append(
                {
                    "entity_type": (
                        row.entity_type
                    ),
                    "entity_id": (
                        row.entity_id
                    ),
                    "field_name": (
                        row.field_name
                    ),
                }
            )

    recorder.add(
        category="ENTITY_TRANSLATIONS",
        check_name="entity_fields_valid",
        passed=(
            len(invalid_field_rows)
            == 0
        ),
        details=(
            "Dinamik alanlar SQL tasarımıyla uyumlu."
            if not invalid_field_rows
            else (
                "Geçersiz entity/field çiftleri: "
                f"{invalid_field_rows[:10]}"
            )
        ),
    )

    orphan_rows = []

    for row in entity_df.itertuples(
        index=False
    ):
        valid_ids = source_ids.get(
            row.entity_type,
            set(),
        )

        if int(row.entity_id) not in valid_ids:
            orphan_rows.append(
                {
                    "entity_type": (
                        row.entity_type
                    ),
                    "entity_id": (
                        int(row.entity_id)
                    ),
                    "field_name": (
                        row.field_name
                    ),
                }
            )

    recorder.add(
        category="ENTITY_TRANSLATIONS",
        check_name="logical_foreign_keys_valid",
        passed=(
            len(orphan_rows) == 0
        ),
        details=(
            "Bütün entity_id değerleri kaynak "
            "tabloda bulunuyor."
            if not orphan_rows
            else (
                "Öksüz çeviri satırları: "
                f"{orphan_rows[:10]}"
            )
        ),
    )

    language_values = set(
        entity_df[
            "lang_code"
        ].astype(str)
    )

    recorder.add(
        category="ENTITY_TRANSLATIONS",
        check_name="language_codes_valid",
        passed=language_values.issubset(
            SUPPORTED_LANGUAGES
        ),
        details=(
            f"Kullanılan diller="
            f"{sorted(language_values)}"
        ),
    )

    nonempty_values = (
        entity_df[
            "value"
        ]
        .astype("string")
        .fillna("")
        .str.strip()
        .ne("")
        .all()
    )

    recorder.add(
        category="ENTITY_TRANSLATIONS",
        check_name="translation_values_not_empty",
        passed=nonempty_values,
        details=(
            "Çeviri değerleri boş olamaz."
        ),
    )

    timestamps_valid = (
        pd.to_datetime(
            entity_df[
                "created_at"
            ],
            errors="coerce",
            utc=True,
        )
        .notna()
        .all()
        and pd.to_datetime(
            entity_df[
                "updated_at"
            ],
            errors="coerce",
            utc=True,
        )
        .notna()
        .all()
    )

    recorder.add(
        category="ENTITY_TRANSLATIONS",
        check_name="timestamps_valid",
        passed=timestamps_valid,
        details=(
            "created_at ve updated_at UTC "
            "timestamp olmalıdır."
        ),
    )

    forbidden_dynamic_pairs = {
        (
            "vehicle",
            "vehicle_class",
        ),
        (
            "loyalty_tier",
            "tier",
        ),
    }

    actual_pairs = set(
        zip(
            entity_df[
                "entity_type"
            ],
            entity_df[
                "field_name"
            ],
        )
    )

    recorder.add(
        category="ENTITY_TRANSLATIONS",
        check_name="enum_labels_not_stored_as_dynamic_entities",
        passed=not actual_pairs.intersection(
            forbidden_dynamic_pairs
        ),
        details=(
            "vehicle_class ve loyalty tier adı "
            "translations tablosunda tutulmalıdır."
        ),
    )


# =====================================================
# 15. STATİK TRANSLATION DOĞRULAMA
# =====================================================

def validate_static_translations(
    recorder: CheckRecorder,
    translations_df: pd.DataFrame,
) -> None:
    """
    Statik enum çevirilerinin bütünlüğünü doğrular.
    """

    validate_exact_columns(
        recorder=recorder,
        dataframe=translations_df,
        expected_columns=EXPECTED_COLUMNS[
            "translations"
        ],
        table_name="translations",
    )

    duplicate_count = int(
        translations_df[
            [
                "trans_key",
                "lang_code",
            ]
        ].duplicated().sum()
    )

    recorder.add(
        category="TRANSLATIONS",
        check_name="unique_constraint_valid",
        passed=(
            duplicate_count == 0
        ),
        details=(
            f"Tekrar eden trans_key/lang="
            f"{duplicate_count:,}"
        ),
    )

    key_language_coverage = (
        translations_df
        .groupby(
            "trans_key"
        )["lang_code"]
        .agg(
            lambda values: set(
                values.astype(str)
            )
        )
    )

    incomplete_keys = (
        key_language_coverage[
            key_language_coverage
            != SUPPORTED_LANGUAGES
        ]
    )

    recorder.add(
        category="TRANSLATIONS",
        check_name="every_key_has_tr_and_en",
        passed=incomplete_keys.empty,
        details=(
            f"Toplam anahtar="
            f"{translations_df['trans_key'].nunique():,}; "
            f"eksik dil kapsamı="
            f"{len(incomplete_keys):,}"
        ),
    )

    values_nonempty = (
        translations_df[
            "value"
        ]
        .astype("string")
        .fillna("")
        .str.strip()
        .ne("")
        .all()
    )

    recorder.add(
        category="TRANSLATIONS",
        check_name="values_not_empty",
        passed=values_nonempty,
        details=(
            "Statik çeviri değerleri boş olamaz."
        ),
    )


# =====================================================
# 16. KAPSAM RAPORLARI
# =====================================================

def create_coverage_reports(
    entity_df: pd.DataFrame,
    translations_df: pd.DataFrame,
) -> tuple[
    pd.DataFrame,
    pd.DataFrame,
]:
    """
    Entity ve statik çeviri kapsam raporlarını oluşturur.
    """

    entity_coverage_df = (
        entity_df
        .groupby(
            [
                "entity_type",
                "field_name",
                "lang_code",
            ],
            as_index=False,
        )
        .agg(
            translation_count=(
                "id",
                "count",
            ),
            unique_entity_count=(
                "entity_id",
                "nunique",
            ),
        )
        .sort_values(
            [
                "entity_type",
                "field_name",
                "lang_code",
            ]
        )
        .reset_index(drop=True)
    )

    static_coverage_df = (
        translations_df
        .assign(
            translation_group=(
                translations_df[
                    "trans_key"
                ]
                .str.split(".")
                .str[0]
            )
        )
        .groupby(
            [
                "translation_group",
                "lang_code",
            ],
            as_index=False,
        )
        .agg(
            translation_count=(
                "id",
                "count",
            )
        )
        .sort_values(
            [
                "translation_group",
                "lang_code",
            ]
        )
        .reset_index(drop=True)
    )

    return (
        entity_coverage_df,
        static_coverage_df,
    )


# =====================================================
# 17. IMPORT NOTLARI
# =====================================================

def create_import_notes() -> str:
    """
    Backend import ve seed conflict notlarını oluşturur.
    """

    return f"""
LOCALIZATION IMPORT NOTLARI

SQL şema sürümü:
{DATABASE_SCHEMA_VERSION}

Üretilen dosyalar:
1. data/generated/translations.csv
2. data/generated/entity_translations.csv

translations.csv:
- Statik enum ve arayüz görünen adları içindir.
- Örnek:
  vehicle_class.VIP
  reservation_status.COMPLETED
  loyalty_tier.GOLD

entity_translations.csv:
- Veritabanı satırlarına bağlı dinamik iş verisi çevirileridir.
- Üretilen entity tipleri:
  pricing_zone
  pricing_rule
  loyalty_tier
  vehicle
  campaign — campaigns.csv mevcutsa

Önemli ayrım:
- vehicle_class değeri entity_translations içinde tutulmaz.
- loyalty tier adı entity_translations içinde tutulmaz.
- Bunlar statik enum olduğu için translations tablosunda tutulur.
- vehicles için dinamik çevrilebilir alan color alanıdır.
- loyalty_tier_config için dinamik çevrilebilir alan description alanıdır.

Türkçe fallback:
- Kaynak iş tablolarındaki metinler Türkçedir.
- Bu nedenle entity_translations.csv yalnızca İngilizce kayıtlar içerir.
- İngilizce kayıt bulunmazsa uygulama kaynak Türkçe metne COALESCE ile düşmelidir.

Önerilen import sırası:
1. vehicles
2. pricing_zones
3. pricing_rules
4. loyalty_tier_config
5. campaigns — varsa
6. translations
7. entity_translations

Seed conflict uyarısı:
- scripts.sql içinde örnek translations/entity_translations seed kayıtları olabilir.
- CSV ana veri olarak kullanılacaksa seed kayıtları atlanmalıdır.
- Alternatif olarak şu unique alanlarla UPSERT uygulanmalıdır:

translations:
(trans_key, lang_code)

entity_translations:
(entity_type, entity_id, field_name, lang_code)

ID sequence:
- CSV ile id değerleri import edildikten sonra BIGSERIAL sequence,
  MAX(id) değerine göre resetlenmelidir.

İnsan kontrolü:
- Proper-name transliteration kayıtları genellikle güvenlidir.
- GENERATED_TEMPLATE ve TRANSLITERATED_FALLBACK olarak işaretlenen
  kayıtlar üretim öncesinde dil bilen bir kişi tarafından incelenmelidir.

Pipeline sahipliği:
- Bu dosya vehicles.csv dosyasını değiştirmez.
- Bu dosya loyalty_tier_config.csv dosyasını değiştirmez.
- Bu dosya reservations.csv fiyatlarını değiştirmez.
- Bu dosya final_outputs klasörünü güncellemez.
- Backend-ready paket 22_prepare_backend_ready_csvs.py tarafından hazırlanır.
""".strip()


# =====================================================
# 18. RAPORLARI KAYDETME
# =====================================================

def save_reports(
    recorder: CheckRecorder,
    entity_df: pd.DataFrame,
    translations_df: pd.DataFrame,
    audit_df: pd.DataFrame,
    unknown_colors_df: pd.DataFrame,
    entity_coverage_df: pd.DataFrame,
    static_coverage_df: pd.DataFrame,
    validated_tables: dict,
    generated_at: str,
) -> dict:
    """
    CSV ve JSON doğrulama raporlarını kaydeder.
    """

    checks_df = (
        recorder.to_dataframe()
    )

    checks_df.to_csv(
        VALIDATION_CHECKS_OUTPUT,
        index=False,
        encoding="utf-8-sig",
    )

    audit_df.to_csv(
        ENTITY_TRANSLATION_AUDIT_OUTPUT,
        index=False,
        encoding="utf-8-sig",
    )

    entity_coverage_df.to_csv(
        ENTITY_TRANSLATION_COVERAGE_OUTPUT,
        index=False,
        encoding="utf-8-sig",
    )

    static_coverage_df.to_csv(
        STATIC_TRANSLATION_COVERAGE_OUTPUT,
        index=False,
        encoding="utf-8-sig",
    )

    unknown_colors_df.to_csv(
        UNKNOWN_VEHICLE_COLORS_OUTPUT,
        index=False,
        encoding="utf-8-sig",
    )

    IMPORT_NOTES_OUTPUT.write_text(
        create_import_notes(),
        encoding="utf-8",
    )

    translation_method_counts = (
        audit_df[
            "translation_method"
        ]
        .value_counts()
        .to_dict()
    )

    summary = {
        "database_schema_version": (
            DATABASE_SCHEMA_VERSION
        ),
        "localization_export_version": (
            LOCALIZATION_EXPORT_VERSION
        ),
        "generated_at_utc": (
            generated_at
        ),
        "validation_passed": (
            recorder.failed_error_count()
            == 0
        ),
        "failed_error_count": (
            recorder.failed_error_count()
        ),
        "warning_count": (
            recorder.warning_count()
        ),
        "entity_translations_output": str(
            ENTITY_TRANSLATIONS_OUTPUT
        ),
        "static_translations_output": str(
            STATIC_TRANSLATIONS_OUTPUT
        ),
        "entity_translation_count": int(
            len(entity_df)
        ),
        "static_translation_count": int(
            len(translations_df)
        ),
        "static_translation_key_count": int(
            translations_df[
                "trans_key"
            ].nunique()
        ),
        "entity_type_distribution": (
            entity_df[
                "entity_type"
            ]
            .value_counts()
            .to_dict()
        ),
        "entity_field_distribution": (
            entity_df
            .groupby(
                [
                    "entity_type",
                    "field_name",
                ]
            )
            .size()
            .rename("count")
            .reset_index()
            .to_dict("records")
        ),
        "translation_method_distribution": (
            translation_method_counts
        ),
        "human_review_recommended_count": int(
            audit_df[
                "human_review_recommended"
            ].sum()
        ),
        "unknown_vehicle_color_count": int(
            len(unknown_colors_df)
        ),
        "source_table_counts": {
            "vehicles": int(
                len(
                    validated_tables[
                        "vehicles"
                    ]
                )
            ),
            "pricing_zones": int(
                len(
                    validated_tables[
                        "pricing_zones"
                    ]
                )
            ),
            "pricing_rules": int(
                len(
                    validated_tables[
                        "pricing_rules"
                    ]
                )
            ),
            "loyalty_tier_config": int(
                len(
                    validated_tables[
                        "loyalty_tier_config"
                    ]
                )
            ),
            "campaigns": int(
                len(
                    validated_tables[
                        "campaigns"
                    ]
                )
            ),
        },
        "source_tables_modified": False,
        "vehicles_modified": False,
        "loyalty_tier_config_modified": False,
        "reservations_modified": False,
        "reservation_prices_recalculated": False,
        "weather_reservations_used_as_sql_table": False,
        "final_outputs_modified": False,
        "entity_translations_contains_turkish_rows": False,
        "turkish_fallback_source_tables": True,
        "backend_package_stage": (
            "22_prepare_backend_ready_csvs.py"
        ),
    }

    with open(
        SUMMARY_OUTPUT,
        "w",
        encoding="utf-8",
    ) as json_file:
        json.dump(
            summary,
            json_file,
            ensure_ascii=False,
            indent=4,
            default=str,
        )

    return summary


# =====================================================
# 19. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 78)
    print("18 — BACKEND ŞEMA VE LOCALIZATION ÇIKTILARI")
    print("=" * 78)

    recorder = CheckRecorder()

    generated_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
    )

    print(
        "\n1/7 Kaynak tablolar okunuyor..."
    )

    source_tables = read_source_tables(
        recorder=recorder
    )

    print(
        "\n2/7 Backend kaynak tabloları doğrulanıyor..."
    )

    validated_tables = validate_source_tables(
        recorder=recorder,
        source_tables=source_tables,
    )

    if (
        recorder.failed_error_count() > 0
        and FAIL_ON_VALIDATION_ERROR
    ):
        recorder.to_dataframe().to_csv(
            VALIDATION_CHECKS_OUTPUT,
            index=False,
            encoding="utf-8-sig",
        )

        raise ValueError(
            "Kaynak tablolar SQL şemasıyla uyumlu değil.\n"
            "Localization dosyaları oluşturulmadı.\n\n"
            f"Kontrol raporu:\n"
            f"{VALIDATION_CHECKS_OUTPUT}"
        )

    print(
        "\n3/7 Dinamik entity çevirileri oluşturuluyor..."
    )

    (
        entity_df,
        audit_df,
        unknown_colors_df,
    ) = create_entity_translations(
        validated_tables=validated_tables,
        generated_at=generated_at,
    )

    print(
        "\n4/7 Statik enum çevirileri oluşturuluyor..."
    )

    translations_df = create_static_translations(
        generated_at=generated_at
    )

    print(
        "\n5/7 Çeviri bütünlüğü doğrulanıyor..."
    )

    validate_entity_translations(
        recorder=recorder,
        entity_df=entity_df,
        source_ids=validated_tables[
            "source_ids"
        ],
    )

    validate_static_translations(
        recorder=recorder,
        translations_df=translations_df,
    )

    (
        entity_coverage_df,
        static_coverage_df,
    ) = create_coverage_reports(
        entity_df=entity_df,
        translations_df=translations_df,
    )

    if not unknown_colors_df.empty:
        recorder.add(
            category="TRANSLATION_QUALITY",
            check_name="all_vehicle_colors_have_dictionary_translation",
            passed=False,
            details=(
                f"Sözlükte bulunmayan araç rengi="
                f"{len(unknown_colors_df):,}. "
                "Transliterasyon fallback uygulandı."
            ),
            severity="WARNING",
        )

    else:
        recorder.add(
            category="TRANSLATION_QUALITY",
            check_name="all_vehicle_colors_have_dictionary_translation",
            passed=True,
            details=(
                "Bütün araç renkleri açık çeviri "
                "sözlüğünde bulundu."
            ),
            severity="WARNING",
        )

    if (
        recorder.failed_error_count() > 0
        and FAIL_ON_VALIDATION_ERROR
    ):
        recorder.to_dataframe().to_csv(
            VALIDATION_CHECKS_OUTPUT,
            index=False,
            encoding="utf-8-sig",
        )

        audit_df.to_csv(
            ENTITY_TRANSLATION_AUDIT_OUTPUT,
            index=False,
            encoding="utf-8-sig",
        )

        raise ValueError(
            "Localization doğrulamasında hata bulundu.\n"
            "Ana CSV çıktıları oluşturulmadı.\n\n"
            f"Kontrol raporu:\n"
            f"{VALIDATION_CHECKS_OUTPUT}"
        )

    print(
        "\n6/7 Localization CSV dosyaları kaydediliyor..."
    )

    write_csv_atomic(
        dataframe=entity_df,
        output_path=(
            ENTITY_TRANSLATIONS_OUTPUT
        ),
    )

    write_csv_atomic(
        dataframe=translations_df,
        output_path=(
            STATIC_TRANSLATIONS_OUTPUT
        ),
    )

    print(
        "\n7/7 Raporlar oluşturuluyor..."
    )

    summary = save_reports(
        recorder=recorder,
        entity_df=entity_df,
        translations_df=translations_df,
        audit_df=audit_df,
        unknown_colors_df=(
            unknown_colors_df
        ),
        entity_coverage_df=(
            entity_coverage_df
        ),
        static_coverage_df=(
            static_coverage_df
        ),
        validated_tables=(
            validated_tables
        ),
        generated_at=generated_at,
    )

    print("\n" + "=" * 78)
    print("LOCALIZATION ÇIKTILARI HAZIR")
    print("=" * 78)

    print(
        f"SQL şema sürümü          : "
        f"{DATABASE_SCHEMA_VERSION}"
    )

    print(
        f"Entity translation       : "
        f"{len(entity_df):,}"
    )

    print(
        f"Statik translation       : "
        f"{len(translations_df):,}"
    )

    print(
        f"Statik translation key   : "
        f"{translations_df['trans_key'].nunique():,}"
    )

    print(
        f"İnsan incelemesi gereken : "
        f"{summary['human_review_recommended_count']:,}"
    )

    print(
        f"Bilinmeyen araç rengi    : "
        f"{len(unknown_colors_df):,}"
    )

    print(
        f"\nDinamik çeviriler : "
        f"{ENTITY_TRANSLATIONS_OUTPUT}"
    )

    print(
        f"Statik çeviriler  : "
        f"{STATIC_TRANSLATIONS_OUTPUT}"
    )

    print(
        f"Raporlar          : "
        f"{REPORT_DIR}"
    )

    print("\nKontroller:")
    print(
        "vehicles.csv değiştirilmedi."
    )
    print(
        "opening_price değerleri yeniden yazılmadı."
    )
    print(
        "loyalty_tier_config.csv değiştirilmedi."
    )
    print(
        "reservations.csv değiştirilmedi."
    )
    print(
        "Rezervasyon fiyatları yeniden hesaplanmadı."
    )
    print(
        "Hava durumlu analitik dosya SQL reservations olarak kullanılmadı."
    )
    print(
        "final_outputs klasörü kullanılmadı."
    )
    print(
        "vehicle_class statik translations tablosuna taşındı."
    )
    print(
        "loyalty tier adları statik translations tablosuna taşındı."
    )
    print(
        "vehicle.color dinamik entity translation olarak üretildi."
    )
    print(
        "loyalty tier description İngilizce karşılıkları SQL seed ile uyumlu."
    )
    print(
        "Entity çevirilerinde mantıksal foreign key kontrolü yapıldı."
    )
    print(
        "entity_type ve field_name çiftleri doğrulandı."
    )
    print(
        "Tekrarlı çeviri anahtarı kontrol edildi."
    )
    print(
        "CSV dosyaları geçici dosya üzerinden atomik kaydedildi."
    )

    if summary[
        "human_review_recommended_count"
    ] > 0:
        print(
            "\n GENERATED_TEMPLATE veya "
            "TRANSLITERATED_FALLBACK kayıtları var."
        )

        print(
            "Üretimden önce şu raporu dil bilen "
            "bir kişinin incelemesi gerekir:"
        )

        print(
            ENTITY_TRANSLATION_AUDIT_OUTPUT
        )


if __name__ == "__main__":
    main()