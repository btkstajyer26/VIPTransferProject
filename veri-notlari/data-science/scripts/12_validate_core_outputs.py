import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

try:
    import pyarrow.parquet as pq
except ImportError as error:
    raise ImportError(
        "Parquet kontrolleri için pyarrow gereklidir.\n"
        "VS Code terminalinde şu komutu çalıştır:\n\n"
        "pip install pyarrow"
    ) from error


# Windows terminalinde Türkçe karakter desteği
try:
    sys.stdout.reconfigure(encoding="utf-8")
except AttributeError:
    pass


# =====================================================
# 1. AYARLAR
# =====================================================

CHUNK_SIZE = 200_000
HASH_CHUNK_SIZE = 8 * 1024 * 1024

# Büyük dosyalarda biraz süre alabilir.
# Dosya bütünlüğü için açık bırakılması önerilir.
CALCULATE_SHA256 = True

# Hata bulunursa pipeline durdurulsun.
FAIL_ON_ERROR = True

EXPECTED_CURRENCY = "TRY"

VALIDATION_VERSION = "core-output-validation-v3"


ALLOWED_STATUSES = [
    "PENDING",
    "ASSIGNED",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
]


ALLOWED_VEHICLE_CLASSES = {
    "ECONOMY",
    "STANDARD",
    "BUSINESS",
    "VIP",
    "LUXURY",
    "MINIVAN",
}


ALLOWED_LOYALTY_TIERS = [
    "BRONZE",
    "SILVER",
    "GOLD",
    "PLATINUM",
    "VIP",
]


ALLOWED_RECOMMENDATION_TYPES = {
    "OPERATIONAL_RISK",
    "CHURN_RISK",
    "VIP_RETENTION",
    "HIGH_VALUE_GROWTH",
    "NEW_CUSTOMER_NURTURE",
    "FIRST_BOOKING_ACTIVATION",
    "REACTIVATION",
    "STANDARD_MONITORING",
    "NO_ACTION_INACTIVE",
}


# =====================================================
# 2. PROJE KLASÖRLERİ
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

GENERATED_DIR = PROJECT_ROOT / "data" / "generated"
REFERENCE_DIR = PROJECT_ROOT / "data" / "reference"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"

MODEL_DIR = (
    PROJECT_ROOT
    / "models"
    / "customer_segmentation"
)

REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "12_validate_core_outputs"
)

REPORT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# =====================================================
# 3. DOSYA YOLLARI
# =====================================================

FILES = {
    # -------------------------------------------------
    # SQL'e aktarılabilecek üretilmiş tablolar
    # -------------------------------------------------
    "users": (
        GENERATED_DIR
        / "users.csv"
    ),

    "reservations": (
        GENERATED_DIR
        / "reservations.csv"
    ),

    "reservation_status_history": (
        GENERATED_DIR
        / "reservation_status_history.csv"
    ),

    "loyalty_accounts": (
        GENERATED_DIR
        / "loyalty_accounts.csv"
    ),

    # -------------------------------------------------
    # Referans tablolar
    # -------------------------------------------------
    "vehicles": (
        REFERENCE_DIR
        / "vehicles.csv"
    ),

    "pricing_zones": (
        REFERENCE_DIR
        / "pricing_zones.csv"
    ),

    "pricing_zone_centers": (
        REFERENCE_DIR
        / "pricing_zone_centers.csv"
    ),

    "pricing_rules": (
        REFERENCE_DIR
        / "pricing_rules.csv"
    ),

    "route_pricing_matrix": (
        REFERENCE_DIR
        / "route_pricing_matrix.csv"
    ),

    "zone_mapping_istanbul": (
        REFERENCE_DIR
        / "zone_mapping_istanbul.csv"
    ),

    "istanbul_zone_catalog": (
        REFERENCE_DIR
        / "istanbul_zone_catalog.csv"
    ),

    "loyalty_tier_config": (
        REFERENCE_DIR
        / "loyalty_tier_config.csv"
    ),

    # -------------------------------------------------
    # Data Science analitik çıktıları
    # -------------------------------------------------
    "reservations_analytics": (
        PROCESSED_DIR
        / "reservations_analytics.parquet"
    ),

    "loyalty_account_analytics": (
        PROCESSED_DIR
        / "loyalty_account_analytics.parquet"
    ),

    "rfm_customer_segments": (
        PROCESSED_DIR
        / "rfm_customer_segments.parquet"
    ),

    "customer_kmeans_segments": (
        PROCESSED_DIR
        / "customer_kmeans_segments.parquet"
    ),

    "kmeans_cluster_summary": (
        PROCESSED_DIR
        / "kmeans_cluster_summary.csv"
    ),

    "admin_customer_recommendations": (
        PROCESSED_DIR
        / "admin_customer_recommendations.parquet"
    ),

    "admin_top_recommendations": (
        PROCESSED_DIR
        / "admin_top_1000_customer_recommendations.csv"
    ),

    # -------------------------------------------------
    # K-Means model dosyaları
    # -------------------------------------------------
    "kmeans_model_bundle": (
        MODEL_DIR
        / "kmeans_customer_segmentation_bundle.joblib"
    ),

    "kmeans_metadata": (
        MODEL_DIR
        / "preprocessing_metadata.json"
    ),

    # -------------------------------------------------
    # Önceki doğrulama raporları
    # -------------------------------------------------
    "price_validation_summary": (
        PROJECT_ROOT
        / "outputs"
        / "reports"
        / "06b_validate_reservation_prices"
        / "price_validation_summary.json"
    ),

    "location_validation_summary": (
        PROJECT_ROOT
        / "outputs"
        / "reports"
        / "11_validate_istanbul_locations"
        / "location_validation_summary.json"
    ),
}


FILE_MANIFEST_OUTPUT = (
    REPORT_DIR
    / "file_manifest.csv"
)

VALIDATION_CHECKS_OUTPUT = (
    REPORT_DIR
    / "validation_checks.csv"
)

TABLE_ROW_COUNTS_OUTPUT = (
    REPORT_DIR
    / "table_row_counts.csv"
)

STATUS_DISTRIBUTION_OUTPUT = (
    REPORT_DIR
    / "reservation_status_distribution.csv"
)

FINAL_SUMMARY_OUTPUT = (
    REPORT_DIR
    / "core_output_validation_summary.json"
)


# =====================================================
# 4. SQL CSV SÜTUNLARI
# =====================================================

EXPECTED_COLUMNS = {
    "users": [
        "id",
        "phone_number",
        "email",
        "password_hash",
        "first_name",
        "last_name",
        "profile_photo",
        "preferred_lang",
        "role",
        "is_guest",
        "is_active",
        "email_verified",
        "phone_verified",
        "created_at",
        "updated_at",
        "deleted_at",
    ],

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

    "reservation_status_history": [
        "id",
        "reservation_id",
        "status",
        "changed_by",
        "note",
        "changed_at",
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

    "loyalty_accounts": [
        "user_id",
        "lifetime_points",
        "tier",
        "updated_at",
    ],
}


# =====================================================
# 5. DOĞRULAMA KAYDEDİCİ
# =====================================================

class CheckRecorder:
    """
    Bütün doğrulama sonuçlarını tek tabloda toplar.
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
# 6. YARDIMCI FONKSİYONLAR
# =====================================================

def calculate_sha256(
    file_path: Path,
) -> str:
    """
    Dosyanın SHA-256 özetini hesaplar.
    """

    digest = hashlib.sha256()

    with open(file_path, "rb") as file_handle:
        while True:
            data = file_handle.read(
                HASH_CHUNK_SIZE
            )

            if not data:
                break

            digest.update(data)

    return digest.hexdigest()


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
            series.loc[converted.isna()]
            .drop_duplicates()
            .head(10)
            .tolist()
        )

        raise ValueError(
            f"{column_name} alanında geçersiz "
            f"boolean değerler bulundu: {invalid_values}"
        )

    return converted.astype(bool)


def clean_nullable_text(
    series: pd.Series,
) -> pd.Series:
    """
    Boş ve null metinleri karşılaştırılabilir hale getirir.
    """

    return (
        series.astype("string")
        .fillna("")
        .str.strip()
    )


def parse_datetime_utc(
    series: pd.Series,
) -> pd.Series:
    """
    CSV içindeki farklı ISO-8601 tarih biçimlerini UTC olarak okur.

    Aynı sütunda saniyeli, mikrosaniyeli ve nanosaniyeli değerler
    bulunabilir. Pandas'ın varsayılan tek-format çıkarımı bu değerlerin
    bir bölümünü yanlışlıkla NaT yapabildiği için format="mixed"
    kullanılır.
    """

    return pd.to_datetime(
        series,
        errors="coerce",
        utc=True,
        format="mixed",
    )


def read_csv_header(
    file_path: Path,
) -> list[str]:
    """
    CSV'nin yalnızca sütun başlıklarını okur.
    """

    return pd.read_csv(
        file_path,
        nrows=0,
    ).columns.tolist()


def parquet_row_count(
    file_path: Path,
) -> int:
    """
    Parquet dosyasını belleğe almadan satır sayısını okur.
    """

    return int(
        pq.ParquetFile(
            file_path
        ).metadata.num_rows
    )


def read_json(
    file_path: Path,
) -> dict:
    """
    JSON dosyasını okur.
    """

    with open(
        file_path,
        "r",
        encoding="utf-8",
    ) as json_file:
        return json.load(json_file)


def save_preliminary_reports(
    recorder: CheckRecorder,
) -> None:
    """
    Pipeline erken durursa o ana kadarki kontrolleri kaydeder.
    """

    recorder.to_dataframe().to_csv(
        VALIDATION_CHECKS_OUTPUT,
        index=False,
        encoding="utf-8-sig",
    )


# =====================================================
# 7. DOSYA VARLIĞI
# =====================================================

def ensure_all_files_exist(
    recorder: CheckRecorder,
) -> None:
    """
    Bu aşamaya kadar oluşması gereken bütün dosyaları kontrol eder.
    """

    missing_files = []

    for file_name, file_path in FILES.items():
        exists = file_path.exists()

        recorder.add(
            category="FILES",
            check_name=f"{file_name}_exists",
            passed=exists,
            details=str(file_path),
        )

        if not exists:
            missing_files.append(
                str(file_path)
            )

    if missing_files:
        save_preliminary_reports(
            recorder=recorder
        )

        raise FileNotFoundError(
            "Gerekli pipeline çıktıları eksik:\n"
            + "\n".join(missing_files)
        )


# =====================================================
# 8. DOSYA MANİFESTOSU
# =====================================================

def create_file_manifest() -> pd.DataFrame:
    """
    Dosya boyutu, değiştirilme zamanı ve SHA-256 bilgisi oluşturur.
    """

    rows = []

    for logical_name, file_path in FILES.items():
        file_stat = file_path.stat()
        suffix = file_path.suffix.lower()

        if suffix == ".parquet":
            row_count = parquet_row_count(
                file_path
            )
        else:
            row_count = pd.NA

        if CALCULATE_SHA256:
            sha256_value = calculate_sha256(
                file_path
            )
        else:
            sha256_value = ""

        rows.append(
            {
                "logical_name": logical_name,
                "relative_path": str(
                    file_path.relative_to(
                        PROJECT_ROOT
                    )
                ),
                "file_type": suffix,
                "size_bytes": int(
                    file_stat.st_size
                ),
                "size_mb": round(
                    file_stat.st_size
                    / 1024
                    / 1024,
                    3,
                ),
                "modified_at_utc": (
                    datetime.fromtimestamp(
                        file_stat.st_mtime,
                        tz=timezone.utc,
                    )
                    .replace(microsecond=0)
                    .isoformat()
                ),
                "parquet_row_count": row_count,
                "sha256": sha256_value,
            }
        )

    manifest_df = pd.DataFrame(rows)

    manifest_df.to_csv(
        FILE_MANIFEST_OUTPUT,
        index=False,
        encoding="utf-8-sig",
    )

    return manifest_df


# =====================================================
# 9. CSV ŞEMA DOĞRULAMASI
# =====================================================

def validate_sql_csv_schemas(
    recorder: CheckRecorder,
) -> None:
    """
    SQL'e aktarılacak CSV sütunlarının tam sırasını doğrular.
    """

    for logical_name, expected_columns in EXPECTED_COLUMNS.items():
        actual_columns = read_csv_header(
            FILES[logical_name]
        )

        passed = (
            actual_columns
            == expected_columns
        )

        details = (
            f"Beklenen sütun={len(expected_columns)}, "
            f"bulunan sütun={len(actual_columns)}"
        )

        if not passed:
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

            details += (
                f"; eksik={missing_columns}; "
                f"fazla={extra_columns}; "
                f"gerçek sıra={actual_columns}"
            )

        recorder.add(
            category="SCHEMA",
            check_name=(
                f"{logical_name}_exact_columns"
            ),
            passed=passed,
            details=details,
        )


# =====================================================
# 10. CORE TABLOLARI OKUMA VE DOĞRULAMA
# =====================================================

def read_and_validate_core_tables(
    recorder: CheckRecorder,
) -> dict:
    """
    Kullanıcı, araç, zone, pricing rule ve sadakat
    tablolarını doğrular.
    """

    users_df = pd.read_csv(
        FILES["users"],
        dtype={
            "phone_number": "string",
            "email": "string",
            "password_hash": "string",
        },
        low_memory=False,
    )

    vehicles_df = pd.read_csv(
        FILES["vehicles"],
        low_memory=False,
    )

    zones_df = pd.read_csv(
        FILES["pricing_zones"],
        low_memory=False,
    )

    rules_df = pd.read_csv(
        FILES["pricing_rules"],
        low_memory=False,
    )

    tier_config_df = pd.read_csv(
        FILES["loyalty_tier_config"],
        low_memory=False,
    )

    loyalty_df = pd.read_csv(
        FILES["loyalty_accounts"],
        low_memory=False,
    )

    # -------------------------------------------------
    # Users
    # -------------------------------------------------

    users_df["id"] = pd.to_numeric(
        users_df["id"],
        errors="raise",
    ).astype("int64")

    users_df["is_guest"] = convert_boolean(
        users_df["is_guest"],
        "users.is_guest",
    )

    users_df["is_active"] = convert_boolean(
        users_df["is_active"],
        "users.is_active",
    )

    user_ids = users_df[
        "id"
    ].to_numpy(dtype=np.int64)

    user_ids_sequential = np.array_equal(
        user_ids,
        np.arange(
            1,
            len(users_df) + 1,
            dtype=np.int64,
        ),
    )

    recorder.add(
        "USERS",
        "user_ids_are_sequential",
        user_ids_sequential,
        (
            f"Kullanıcı sayısı={len(users_df):,}; "
            "ID aralığı 1..N olmalıdır."
        ),
    )

    recorder.add(
        "USERS",
        "phone_numbers_unique",
        not users_df[
            "phone_number"
        ].duplicated().any(),
        "Telefon numaraları benzersiz olmalıdır.",
    )

    recorder.add(
        "USERS",
        "roles_are_customer",
        users_df["role"]
        .astype("string")
        .eq("CUSTOMER")
        .all(),
        "Data Science pipeline ADMIN hesabı üretmemelidir.",
    )

    language_values = set(
        users_df[
            "preferred_lang"
        ]
        .astype("string")
        .dropna()
    )

    recorder.add(
        "USERS",
        "preferred_languages_valid",
        language_values.issubset(
            {"tr", "en"}
        ),
        "Desteklenen diller tr ve en olmalıdır.",
    )

    recorder.add(
        "USERS",
        "synthetic_passwords_not_created",
        users_df[
            "password_hash"
        ].isna().all(),
        "Sentetik password_hash üretilmemelidir.",
    )

    registered_mask = (
        ~users_df["is_guest"]
    )

    guest_mask = users_df["is_guest"]

    registered_email_valid = (
        users_df.loc[
            registered_mask,
            "email",
        ].notna().all()
    )

    guest_email_valid = (
        users_df.loc[
            guest_mask,
            "email",
        ].isna().all()
    )

    recorder.add(
        "USERS",
        "guest_registered_email_rules",
        (
            registered_email_valid
            and guest_email_valid
        ),
        (
            "Kayıtlı kullanıcı e-postası dolu, "
            "misafir e-postası boş olmalıdır."
        ),
    )

    # -------------------------------------------------
    # Vehicles
    # -------------------------------------------------

    vehicles_df["id"] = pd.to_numeric(
        vehicles_df["id"],
        errors="raise",
    ).astype("int64")

    vehicles_df["capacity"] = pd.to_numeric(
        vehicles_df["capacity"],
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

    vehicles_df["opening_price"] = pd.to_numeric(
        vehicles_df["opening_price"],
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
            vehicles_df["capacity"] > 0
        ).all()
        and (
            vehicles_df[
                "base_price_multiplier"
            ] > 0
        ).all()
        and (
            vehicles_df[
                "opening_price"
            ] >= 0
        ).all()
        and set(
            vehicles_df[
                "vehicle_class"
            ]
        ).issubset(
            ALLOWED_VEHICLE_CLASSES
        )
    )

    recorder.add(
        "VEHICLES",
        "vehicle_reference_integrity",
        vehicle_integrity,
        (
            f"Araç sayısı={len(vehicles_df):,}; "
            "ID, plaka, kapasite ve fiyat alanları."
        ),
    )

    # -------------------------------------------------
    # Pricing zones
    # -------------------------------------------------

    zones_df["id"] = pd.to_numeric(
        zones_df["id"],
        errors="raise",
    ).astype("int64")

    for price_column in [
        "base_price",
        "min_price",
        "price_per_km",
    ]:
        zones_df[price_column] = pd.to_numeric(
            zones_df[price_column],
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
            zones_df["base_price"] >= 0
        ).all()
        and (
            zones_df["min_price"]
            >= zones_df["base_price"]
        ).all()
        and (
            zones_df["price_per_km"] >= 0
        ).all()
        and zones_df[
            "currency"
        ]
        .astype("string")
        .eq(EXPECTED_CURRENCY)
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
        "PRICING",
        "pricing_zone_integrity",
        zone_integrity,
        (
            f"Zone sayısı={len(zones_df):,}; "
            "TRY, fiyat ve polygon kontrolü."
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

    rules_df["day_of_week"] = pd.to_numeric(
        rules_df["day_of_week"],
        errors="raise",
    )

    rules_df["multiplier"] = pd.to_numeric(
        rules_df["multiplier"],
        errors="raise",
    )

    rule_zone_valid = set(
        rules_df[
            "zone_id"
        ].astype(int)
    ).issubset(
        set(
            zones_df[
                "id"
            ].astype(int)
        )
    )

    start_times = pd.to_datetime(
        rules_df["start_time"],
        errors="coerce",
    )

    end_times = pd.to_datetime(
        rules_df["end_time"],
        errors="coerce",
    )

    rule_time_valid = (
        start_times.notna()
        & end_times.notna()
        & (
            end_times > start_times
        )
    ).all()

    pricing_rule_integrity = (
        not rules_df[
            "id"
        ].duplicated().any()
        and rule_zone_valid
        and rules_df[
            "day_of_week"
        ].between(
            0,
            6,
        ).all()
        and (
            rules_df["multiplier"] >= 1
        ).all()
        and rule_time_valid
    )

    recorder.add(
        "PRICING",
        "pricing_rule_integrity",
        pricing_rule_integrity,
        (
            f"Pricing rule sayısı={len(rules_df):,}; "
            "zone FK, gün, saat ve multiplier."
        ),
    )

    # -------------------------------------------------
    # Loyalty tier config
    # -------------------------------------------------

    expected_config = pd.DataFrame(
        [
            [
                1,
                "BRONZE",
                0,
                1.00,
                0.00,
                False,
            ],
            [
                2,
                "SILVER",
                500,
                1.25,
                2.00,
                False,
            ],
            [
                3,
                "GOLD",
                2_000,
                1.50,
                5.00,
                True,
            ],
            [
                4,
                "PLATINUM",
                5_000,
                1.75,
                8.00,
                True,
            ],
            [
                5,
                "VIP",
                10_000,
                2.00,
                12.00,
                True,
            ],
        ],
        columns=[
            "id",
            "tier",
            "min_points",
            "earn_rate",
            "discount_percentage",
            "priority_support",
        ],
    )

    expected_config["id"] = (
        expected_config["id"]
        .astype("int64")
    )

    expected_config["min_points"] = (
        expected_config["min_points"]
        .astype("int64")
    )

    tier_config_df[
        "priority_support"
    ] = convert_boolean(
        tier_config_df[
            "priority_support"
        ],
        "loyalty_tier_config.priority_support",
    )

    actual_config = tier_config_df[
        expected_config.columns
    ].copy()

    actual_config["id"] = pd.to_numeric(
        actual_config["id"],
        errors="raise",
    ).astype("int64")

    actual_config["min_points"] = pd.to_numeric(
        actual_config["min_points"],
        errors="raise",
    ).astype("int64")

    actual_config["earn_rate"] = pd.to_numeric(
        actual_config["earn_rate"],
        errors="raise",
    ).astype(float)

    actual_config[
        "discount_percentage"
    ] = pd.to_numeric(
        actual_config[
            "discount_percentage"
        ],
        errors="raise",
    ).astype(float)

    config_matches = (
        actual_config.reset_index(drop=True)
        .equals(
            expected_config.reset_index(
                drop=True
            )
        )
    )

    recorder.add(
        "LOYALTY",
        "loyalty_tier_config_matches_sql",
        config_matches,
        (
            "Kademe eşikleri ve oranları "
            "scripts.sql ile aynı olmalıdır."
        ),
    )

    # -------------------------------------------------
    # Loyalty accounts
    # -------------------------------------------------

    loyalty_df["user_id"] = pd.to_numeric(
        loyalty_df["user_id"],
        errors="raise",
    ).astype("int64")

    loyalty_df[
        "lifetime_points"
    ] = pd.to_numeric(
        loyalty_df[
            "lifetime_points"
        ],
        errors="raise",
    ).astype("int64")

    registered_user_ids = set(
        users_df.loc[
            registered_mask,
            "id",
        ].astype(int)
    )

    guest_user_ids = set(
        users_df.loc[
            guest_mask,
            "id",
        ].astype(int)
    )

    loyalty_user_ids = set(
        loyalty_df[
            "user_id"
        ].astype(int)
    )

    loyalty_account_coverage = (
        loyalty_user_ids
        == registered_user_ids
        and not loyalty_user_ids.intersection(
            guest_user_ids
        )
    )

    recorder.add(
        "LOYALTY",
        "loyalty_accounts_cover_registered_only",
        loyalty_account_coverage,
        (
            f"Kayıtlı kullanıcı={len(registered_user_ids):,}; "
            f"loyalty account={len(loyalty_user_ids):,}; "
            "misafir hesabı=0"
        ),
    )

    minimum_points = (
        expected_config[
            "min_points"
        ].to_numpy(
            dtype=np.int64
        )
    )

    tier_names = (
        expected_config[
            "tier"
        ].to_numpy(
            dtype=object
        )
    )

    expected_tier_indexes = (
        np.searchsorted(
            minimum_points,
            loyalty_df[
                "lifetime_points"
            ].to_numpy(
                dtype=np.int64
            ),
            side="right",
        )
        - 1
    )

    expected_tiers = tier_names[
        expected_tier_indexes
    ]

    tier_consistent = np.array_equal(
        loyalty_df[
            "tier"
        ]
        .astype(str)
        .to_numpy(),
        expected_tiers,
    )

    recorder.add(
        "LOYALTY",
        "loyalty_points_match_tier",
        tier_consistent,
        (
            "lifetime_points değeri doğru "
            "sadakat kademesini vermelidir."
        ),
    )

    return {
        "users": users_df,
        "vehicles": vehicles_df,
        "zones": zones_df,
        "rules": rules_df,
        "tier_config": tier_config_df,
        "loyalty": loyalty_df,
    }


# =====================================================
# 11. ÖNCEKİ DOĞRULAMA RAPORLARI
# =====================================================

def validate_previous_reports(
    recorder: CheckRecorder,
) -> None:
    """
    Fiyat ve lokasyon doğrulama raporlarının başarılı ve güncel
    olduğunu kontrol eder.
    """

    price_summary = read_json(
        FILES[
            "price_validation_summary"
        ]
    )

    location_summary = read_json(
        FILES[
            "location_validation_summary"
        ]
    )

    price_passed = bool(
        price_summary.get(
            "validation_passed",
            False,
        )
    )

    location_passed = bool(
        location_summary.get(
            "validation_passed",
            False,
        )
    )

    recorder.add(
        "PRIOR_VALIDATION",
        "price_validation_passed",
        price_passed,
        "06b fiyat doğrulaması başarılı olmalıdır.",
    )

    recorder.add(
        "PRIOR_VALIDATION",
        "location_validation_passed",
        location_passed,
        "11 lokasyon doğrulaması başarılı olmalıdır.",
    )

    price_report_time = FILES[
        "price_validation_summary"
    ].stat().st_mtime

    newest_price_input = max(
        FILES["reservations"].stat().st_mtime,
        FILES["vehicles"].stat().st_mtime,
        FILES["pricing_zones"].stat().st_mtime,
        FILES[
            "route_pricing_matrix"
        ].stat().st_mtime,
    )

    recorder.add(
        "PRIOR_VALIDATION",
        "price_report_is_not_stale",
        price_report_time >= newest_price_input,
        (
            "Fiyat raporu reservations ve fiyat "
            "referanslarından daha yeni olmalıdır."
        ),
    )

    location_report_time = FILES[
        "location_validation_summary"
    ].stat().st_mtime

    newest_location_input = max(
        FILES["reservations"].stat().st_mtime,
        FILES[
            "reservations_analytics"
        ].stat().st_mtime,
        FILES["pricing_zones"].stat().st_mtime,
        FILES[
            "pricing_zone_centers"
        ].stat().st_mtime,
        FILES[
            "zone_mapping_istanbul"
        ].stat().st_mtime,
        FILES[
            "route_pricing_matrix"
        ].stat().st_mtime,
    )

    recorder.add(
        "PRIOR_VALIDATION",
        "location_report_is_not_stale",
        (
            location_report_time
            >= newest_location_input
        ),
        (
            "Lokasyon raporu reservations ve zone "
            "referanslarından daha yeni olmalıdır."
        ),
    )


# =====================================================
# 12. RESERVATIONS CHUNK DOĞRULAMASI
# =====================================================

def validate_reservations(
    recorder: CheckRecorder,
    users_df: pd.DataFrame,
    vehicles_df: pd.DataFrame,
    zones_df: pd.DataFrame,
) -> dict:
    """
    Büyük reservations.csv dosyasını belleğe almadan doğrular.

    Aynı zamanda RFM ile karşılaştırmak için kullanıcı bazında
    rezervasyon durum ve harcama özetlerini üretir.
    """

    users_sorted = (
        users_df
        .sort_values("id")
        .reset_index(drop=True)
    )

    user_count = len(users_sorted)

    user_guest_flags = (
        users_sorted[
            "is_guest"
        ].to_numpy(dtype=bool)
    )

    vehicle_capacity_lookup = (
        vehicles_df
        .set_index("id")[
            "capacity"
        ]
        .astype(int)
        .to_dict()
    )

    valid_vehicle_ids = set(
        vehicles_df[
            "id"
        ].astype(int)
    )

    valid_zone_ids = set(
        zones_df[
            "id"
        ].astype(int)
    )

    status_to_index = {
        status: index
        for index, status in enumerate(
            ALLOWED_STATUSES
        )
    }

    user_status_counts = np.zeros(
        (
            user_count,
            len(ALLOWED_STATUSES),
        ),
        dtype=np.int64,
    )

    user_completed_spend = np.zeros(
        user_count,
        dtype=np.float64,
    )

    reservation_status_chunks = []

    counters = {
        "reservation_count": 0,
        "completed_count": 0,
        "cancelled_count": 0,
        "no_show_count": 0,
        "guest_reservation_count": 0,
    }

    violation_counts = {
        "id_sequence": 0,
        "booking_reference": 0,
        "unknown_user": 0,
        "unknown_vehicle": 0,
        "unknown_zone": 0,
        "vehicle_capacity": 0,
        "guest_phone_rule": 0,
        "invalid_status": 0,
        "invalid_currency": 0,
        "invalid_price": 0,
        "invalid_surge": 0,
        "invalid_timestamps": 0,
        "completion_fields": 0,
        "cancellation_fields": 0,
    }

    expected_first_id = 1

    csv_iterator = pd.read_csv(
        FILES["reservations"],
        chunksize=CHUNK_SIZE,
        low_memory=False,
        dtype={
            "guest_phone": "string",
        },
    )

    for chunk_number, chunk in enumerate(
        csv_iterator,
        start=1,
    ):
        row_count = len(chunk)

        numeric_columns = [
            "id",
            "user_id",
            "vehicle_id",
            "pickup_zone_id",
            "dropoff_zone_id",
            "passenger_count",
            "distance_km",
            "base_price",
            "surge_multiplier",
            "discount_amount",
            "loyalty_discount",
            "opening_price",
            "calculated_price",
        ]

        for column in numeric_columns:
            chunk[column] = pd.to_numeric(
                chunk[column],
                errors="coerce",
            )

        # -------------------------------------------------
        # ID ve booking reference
        # -------------------------------------------------

        expected_ids = np.arange(
            expected_first_id,
            expected_first_id
            + row_count,
            dtype=np.int64,
        )

        actual_ids = chunk[
            "id"
        ].to_numpy(dtype=float)

        id_valid = (
            np.isfinite(actual_ids)
            & (
                actual_ids
                == expected_ids
            )
        )

        violation_counts[
            "id_sequence"
        ] += int(
            (~id_valid).sum()
        )

        expected_booking_reference = (
            "VIP-202501-"
            + pd.Series(
                expected_ids,
                index=chunk.index,
            )
            .astype(str)
            .str.zfill(7)
        )

        booking_valid = (
            chunk[
                "booking_reference"
            ]
            .astype("string")
            .eq(
                expected_booking_reference
            )
            .fillna(False)
        )

        violation_counts[
            "booking_reference"
        ] += int(
            (~booking_valid).sum()
        )

        # -------------------------------------------------
        # Foreign key kontrolleri
        # -------------------------------------------------

        user_ids = (
            chunk["user_id"]
            .fillna(-1)
            .astype(int)
        )

        user_valid = user_ids.between(
            1,
            user_count,
        )

        violation_counts[
            "unknown_user"
        ] += int(
            (~user_valid).sum()
        )

        vehicle_ids = (
            chunk["vehicle_id"]
            .fillna(-1)
            .astype(int)
        )

        vehicle_valid = vehicle_ids.isin(
            valid_vehicle_ids
        )

        violation_counts[
            "unknown_vehicle"
        ] += int(
            (~vehicle_valid).sum()
        )

        pickup_zone_valid = (
            chunk[
                "pickup_zone_id"
            ]
            .fillna(-1)
            .astype(int)
            .isin(valid_zone_ids)
        )

        dropoff_zone_valid = (
            chunk[
                "dropoff_zone_id"
            ]
            .fillna(-1)
            .astype(int)
            .isin(valid_zone_ids)
        )

        violation_counts[
            "unknown_zone"
        ] += int(
            (
                ~pickup_zone_valid
                | ~dropoff_zone_valid
            ).sum()
        )

        # -------------------------------------------------
        # Araç kapasitesi
        # -------------------------------------------------

        vehicle_capacities = (
            vehicle_ids.map(
                vehicle_capacity_lookup
            )
        )

        capacity_valid = (
            vehicle_valid
            & chunk[
                "passenger_count"
            ].notna()
            & (
                chunk[
                    "passenger_count"
                ] > 0
            )
            & (
                vehicle_capacities
                >= chunk[
                    "passenger_count"
                ]
            )
        )

        violation_counts[
            "vehicle_capacity"
        ] += int(
            (~capacity_valid).sum()
        )

        # -------------------------------------------------
        # Misafir telefon kuralı
        # -------------------------------------------------

        guest_phone_valid = pd.Series(
            False,
            index=chunk.index,
        )

        valid_user_positions = (
            user_ids.loc[
                user_valid
            ]
            .to_numpy(dtype=np.int64)
            - 1
        )

        actual_guest_phone = (
            clean_nullable_text(
                chunk.loc[
                    user_valid,
                    "guest_phone",
                ]
            )
        )

        expected_guest_flags = (
            user_guest_flags[
                valid_user_positions
            ]
        )

        # SQL ve 06_create_reservations.py kuralı:
        # - Misafir kullanıcı rezervasyonunda guest_phone dolu olmalı.
        # - Kayıtlı kullanıcı rezervasyonunda guest_phone boş olmalı.
        #
        # Telefonun users.phone_number ile birebir metin eşitliği
        # zorunlu değildir. CSV okuma/yazma sırasında +90, baştaki 0
        # veya metin biçimi farklılaşabilir. Burada veri modelinin
        # gerçekten istediği dolu/boş kuralı doğrulanır.
        valid_guest_rules = np.where(
            expected_guest_flags,
            actual_guest_phone.ne(""),
            actual_guest_phone.eq(""),
        )

        guest_phone_valid.loc[
            user_valid
        ] = valid_guest_rules

        violation_counts[
            "guest_phone_rule"
        ] += int(
            (~guest_phone_valid).sum()
        )

        counters[
            "guest_reservation_count"
        ] += int(
            expected_guest_flags.sum()
        )

        # -------------------------------------------------
        # Status ve para birimi
        # -------------------------------------------------

        statuses = (
            chunk["status"]
            .astype("string")
            .str.upper()
        )

        status_valid = statuses.isin(
            ALLOWED_STATUSES
        )

        violation_counts[
            "invalid_status"
        ] += int(
            (~status_valid).sum()
        )

        currency_valid = (
            chunk["currency"]
            .astype("string")
            .eq(EXPECTED_CURRENCY)
            .fillna(False)
        )

        violation_counts[
            "invalid_currency"
        ] += int(
            (~currency_valid).sum()
        )

        # -------------------------------------------------
        # Fiyat alanları
        # -------------------------------------------------

        non_negative_columns = [
            "distance_km",
            "base_price",
            "discount_amount",
            "loyalty_discount",
            "opening_price",
            "calculated_price",
        ]

        price_valid = (
            chunk[
                non_negative_columns
            ]
            .notna()
            .all(axis=1)
            & (
                chunk[
                    non_negative_columns
                ] >= 0
            ).all(axis=1)
        )

        violation_counts[
            "invalid_price"
        ] += int(
            (~price_valid).sum()
        )

        surge_valid = (
            chunk[
                "surge_multiplier"
            ].notna()
            & (
                chunk[
                    "surge_multiplier"
                ] >= 1
            )
        )

        violation_counts[
            "invalid_surge"
        ] += int(
            (~surge_valid).sum()
        )

        # -------------------------------------------------
        # Tarih alanları
        # -------------------------------------------------

        scheduled_time = parse_datetime_utc(
            chunk["scheduled_time"]
        )

        created_at = parse_datetime_utc(
            chunk["created_at"]
        )

        updated_at = parse_datetime_utc(
            chunk["updated_at"]
        )

        completed_at = parse_datetime_utc(
            chunk["completed_at"]
        )

        cancelled_at = parse_datetime_utc(
            chunk["cancelled_at"]
        )

        basic_timestamp_valid = (
            scheduled_time.notna()
            & created_at.notna()
            & updated_at.notna()
            & (
                created_at
                <= scheduled_time
            )
            & (
                updated_at
                >= created_at
            )
        )

        violation_counts[
            "invalid_timestamps"
        ] += int(
            (
                ~basic_timestamp_valid
            ).sum()
        )

        # -------------------------------------------------
        # Completed alanları
        # -------------------------------------------------

        completed_mask = (
            statuses == "COMPLETED"
        )

        completed_fields_valid = np.where(
            completed_mask,
            (
                completed_at.notna()
                & (
                    completed_at
                    > scheduled_time
                )
            ),
            completed_at.isna(),
        )

        violation_counts[
            "completion_fields"
        ] += int(
            (
                ~completed_fields_valid
            ).sum()
        )

        # -------------------------------------------------
        # Cancelled alanları
        # -------------------------------------------------

        cancelled_mask = (
            statuses == "CANCELLED"
        )

        cancellation_reason_filled = (
            clean_nullable_text(
                chunk[
                    "cancellation_reason"
                ]
            ).ne("")
        )

        cancellation_fields_valid = np.where(
            cancelled_mask,
            (
                cancelled_at.notna()
                & (
                    cancelled_at
                    < scheduled_time
                )
                & cancellation_reason_filled
            ),
            cancelled_at.isna(),
        )

        violation_counts[
            "cancellation_fields"
        ] += int(
            (
                ~cancellation_fields_valid
            ).sum()
        )

        # -------------------------------------------------
        # Kullanıcı bazlı RFM kontrol özetleri
        # -------------------------------------------------

        valid_aggregate_rows = (
            user_valid
            & status_valid
        )

        aggregate_user_positions = (
            user_ids.loc[
                valid_aggregate_rows
            ]
            .to_numpy(dtype=np.int64)
            - 1
        )

        aggregate_status_indexes = (
            statuses.loc[
                valid_aggregate_rows
            ]
            .map(
                status_to_index
            )
            .to_numpy(dtype=np.int64)
        )

        np.add.at(
            user_status_counts,
            (
                aggregate_user_positions,
                aggregate_status_indexes,
            ),
            1,
        )

        valid_completed_rows = (
            valid_aggregate_rows
            & completed_mask
            & chunk[
                "calculated_price"
            ].notna()
        )

        completed_user_positions = (
            user_ids.loc[
                valid_completed_rows
            ]
            .to_numpy(dtype=np.int64)
            - 1
        )

        completed_prices = (
            chunk.loc[
                valid_completed_rows,
                "calculated_price",
            ]
            .to_numpy(dtype=np.float64)
        )

        np.add.at(
            user_completed_spend,
            completed_user_positions,
            completed_prices,
        )

        counters[
            "completed_count"
        ] += int(
            completed_mask.sum()
        )

        counters[
            "cancelled_count"
        ] += int(
            cancelled_mask.sum()
        )

        counters[
            "no_show_count"
        ] += int(
            (
                statuses == "NO_SHOW"
            ).sum()
        )

        reservation_status_chunks.append(
            statuses.map(
                status_to_index
            )
            .fillna(-1)
            .to_numpy(dtype=np.int8)
        )

        counters[
            "reservation_count"
        ] += row_count

        expected_first_id += row_count

        print(
            f"Rezervasyon parçası {chunk_number}: "
            f"{counters['reservation_count']:,} satır kontrol edildi."
        )

    reservation_status_codes = (
        np.concatenate(
            reservation_status_chunks
        )
    )

    for violation_name, violation_count in violation_counts.items():
        recorder.add(
            "RESERVATIONS",
            violation_name,
            violation_count == 0,
            (
                f"Hatalı rezervasyon satırı="
                f"{violation_count:,}"
            ),
        )

    status_distribution_df = pd.DataFrame(
        {
            "status": ALLOWED_STATUSES,
            "reservation_count": [
                int(
                    user_status_counts[
                        :,
                        status_to_index[
                            status
                        ],
                    ].sum()
                )
                for status in ALLOWED_STATUSES
            ],
        }
    )

    status_distribution_df[
        "percentage"
    ] = (
        status_distribution_df[
            "reservation_count"
        ]
        / counters[
            "reservation_count"
        ]
        * 100
    ).round(4)

    status_distribution_df.to_csv(
        STATUS_DISTRIBUTION_OUTPUT,
        index=False,
        encoding="utf-8-sig",
    )

    return {
        **counters,
        "violation_counts": (
            violation_counts
        ),
        "user_status_counts": (
            user_status_counts
        ),
        "user_completed_spend": (
            np.round(
                user_completed_spend,
                2,
            )
        ),
        "reservation_status_codes": (
            reservation_status_codes
        ),
    }


# =====================================================
# 13. STATUS HISTORY DOĞRULAMASI
# =====================================================

def validate_status_history(
    recorder: CheckRecorder,
    users_df: pd.DataFrame,
    reservation_result: dict,
) -> dict:
    """
    Bütün rezervasyonların durum geçmişini doğrular.
    """

    reservation_count = int(
        reservation_result[
            "reservation_count"
        ]
    )

    current_status_codes = (
        reservation_result[
            "reservation_status_codes"
        ]
    )

    history_count = np.zeros(
        reservation_count,
        dtype=np.int16,
    )

    pending_count = np.zeros(
        reservation_count,
        dtype=np.int8,
    )

    last_status_code = np.full(
        reservation_count,
        -1,
        dtype=np.int8,
    )

    status_to_index = {
        status: index
        for index, status in enumerate(
            ALLOWED_STATUSES
        )
    }

    valid_user_ids = set(
        users_df[
            "id"
        ].astype(int)
    )

    counters = {
        "history_row_count": 0,
        "invalid_history_id_sequence": 0,
        "unknown_reservation_id": 0,
        "invalid_status": 0,
        "unknown_changed_by": 0,
        "invalid_changed_at": 0,
        "non_chronological_change": 0,
    }

    expected_first_history_id = 1

    previous_reservation_id = -1
    previous_changed_at_ns = np.iinfo(
        np.int64
    ).min

    csv_iterator = pd.read_csv(
        FILES[
            "reservation_status_history"
        ],
        chunksize=CHUNK_SIZE,
        low_memory=False,
    )

    for chunk_number, chunk in enumerate(
        csv_iterator,
        start=1,
    ):
        row_count = len(chunk)

        chunk["id"] = pd.to_numeric(
            chunk["id"],
            errors="coerce",
        )

        chunk[
            "reservation_id"
        ] = pd.to_numeric(
            chunk["reservation_id"],
            errors="coerce",
        )

        expected_history_ids = np.arange(
            expected_first_history_id,
            expected_first_history_id
            + row_count,
            dtype=np.int64,
        )

        history_id_valid = (
            chunk["id"].notna()
            & (
                chunk[
                    "id"
                ].to_numpy(dtype=float)
                == expected_history_ids
            )
        )

        counters[
            "invalid_history_id_sequence"
        ] += int(
            (
                ~history_id_valid
            ).sum()
        )

        reservation_ids = (
            chunk[
                "reservation_id"
            ]
            .fillna(-1)
            .astype(int)
        )

        reservation_valid = (
            reservation_ids.between(
                1,
                reservation_count,
            )
        )

        counters[
            "unknown_reservation_id"
        ] += int(
            (
                ~reservation_valid
            ).sum()
        )

        statuses = (
            chunk["status"]
            .astype("string")
            .str.upper()
        )

        status_valid = statuses.isin(
            ALLOWED_STATUSES
        )

        counters[
            "invalid_status"
        ] += int(
            (
                ~status_valid
            ).sum()
        )

        changed_by = pd.to_numeric(
            chunk["changed_by"],
            errors="coerce",
        )

        changed_by_valid = (
            changed_by.isna()
            | changed_by.astype(
                "Int64"
            ).isin(valid_user_ids)
        )

        counters[
            "unknown_changed_by"
        ] += int(
            (
                ~changed_by_valid
            ).sum()
        )

        changed_at = parse_datetime_utc(
            chunk["changed_at"]
        )

        changed_at_valid = (
            changed_at.notna()
        )

        counters[
            "invalid_changed_at"
        ] += int(
            (
                ~changed_at_valid
            ).sum()
        )

        valid_rows = (
            reservation_valid
            & status_valid
            & changed_at_valid
        )

        valid_history_df = pd.DataFrame(
            {
                "reservation_id": (
                    reservation_ids.loc[
                        valid_rows
                    ].astype("int64")
                ),
                "status_code": (
                    statuses.loc[
                        valid_rows
                    ]
                    .map(
                        status_to_index
                    )
                    .astype("int8")
                ),
                "changed_at_ns": (
                    changed_at.loc[
                        valid_rows
                    ]
                    .astype("int64")
                ),
            }
        ).reset_index(drop=True)

        if not valid_history_df.empty:
            current_reservation_ids = (
                valid_history_df[
                    "reservation_id"
                ].to_numpy(dtype=np.int64)
            )

            current_changed_times = (
                valid_history_df[
                    "changed_at_ns"
                ].to_numpy(dtype=np.int64)
            )

            previous_reservation_values = np.empty_like(
                current_reservation_ids
            )

            previous_time_values = np.empty_like(
                current_changed_times
            )

            previous_reservation_values[0] = (
                previous_reservation_id
            )

            previous_time_values[0] = (
                previous_changed_at_ns
            )

            if len(
                current_reservation_ids
            ) > 1:
                previous_reservation_values[
                    1:
                ] = current_reservation_ids[
                    :-1
                ]

                previous_time_values[
                    1:
                ] = current_changed_times[
                    :-1
                ]

            same_reservation = (
                current_reservation_ids
                == previous_reservation_values
            )

            reservation_order_valid = (
                current_reservation_ids
                >= previous_reservation_values
            )

            changed_time_order_valid = (
                ~same_reservation
                | (
                    current_changed_times
                    >= previous_time_values
                )
            )

            counters[
                "non_chronological_change"
            ] += int(
                (
                    ~reservation_order_valid
                    | ~changed_time_order_valid
                ).sum()
            )

            valid_positions = (
                current_reservation_ids
                - 1
            )

            status_codes = (
                valid_history_df[
                    "status_code"
                ].to_numpy(dtype=np.int8)
            )

            np.add.at(
                history_count,
                valid_positions,
                1,
            )

            pending_positions = (
                valid_positions[
                    status_codes
                    == status_to_index[
                        "PENDING"
                    ]
                ]
            )

            np.add.at(
                pending_count,
                pending_positions,
                1,
            )

            last_rows = (
                valid_history_df
                .groupby(
                    "reservation_id",
                    sort=False,
                )
                .tail(1)
            )

            last_positions = (
                last_rows[
                    "reservation_id"
                ].to_numpy(dtype=np.int64)
                - 1
            )

            last_status_code[
                last_positions
            ] = last_rows[
                "status_code"
            ].to_numpy(dtype=np.int8)

            previous_reservation_id = int(
                current_reservation_ids[-1]
            )

            previous_changed_at_ns = int(
                current_changed_times[-1]
            )

        counters[
            "history_row_count"
        ] += row_count

        expected_first_history_id += row_count

        print(
            f"History parçası {chunk_number}: "
            f"{counters['history_row_count']:,} satır kontrol edildi."
        )

    every_reservation_has_history = (
        history_count >= 1
    )

    every_reservation_has_pending = (
        pending_count >= 1
    )

    final_status_matches = (
        last_status_code
        == current_status_codes
    )

    recorder.add(
        "STATUS_HISTORY",
        "every_reservation_has_history",
        every_reservation_has_history.all(),
        (
            "History kaydı olmayan rezervasyon="
            f"{int((~every_reservation_has_history).sum()):,}"
        ),
    )

    recorder.add(
        "STATUS_HISTORY",
        "every_reservation_has_pending",
        every_reservation_has_pending.all(),
        (
            "PENDING kaydı olmayan rezervasyon="
            f"{int((~every_reservation_has_pending).sum()):,}"
        ),
    )

    recorder.add(
        "STATUS_HISTORY",
        "final_history_status_matches_reservation",
        final_status_matches.all(),
        (
            "Final status uyuşmazlığı="
            f"{int((~final_status_matches).sum()):,}"
        ),
    )

    for counter_name in [
        "invalid_history_id_sequence",
        "unknown_reservation_id",
        "invalid_status",
        "unknown_changed_by",
        "invalid_changed_at",
        "non_chronological_change",
    ]:
        recorder.add(
            "STATUS_HISTORY",
            counter_name,
            counters[counter_name] == 0,
            (
                "Hatalı history satırı="
                f"{counters[counter_name]:,}"
            ),
        )

    return counters


# =====================================================
# 14. ARA DOSYA SATIR SAYILARI
# =====================================================

def validate_intermediate_row_counts(
    recorder: CheckRecorder,
    core_tables: dict,
    reservation_result: dict,
) -> None:
    """
    Aynı verinin farklı formatlardaki satır sayılarını karşılaştırır.
    """

    reservation_count = int(
        reservation_result[
            "reservation_count"
        ]
    )

    reservation_analytics_count = (
        parquet_row_count(
            FILES[
                "reservations_analytics"
            ]
        )
    )

    recorder.add(
        "ROW_COUNTS",
        "reservations_analytics_matches_reservations",
        (
            reservation_analytics_count
            == reservation_count
        ),
        (
            f"Analytics={reservation_analytics_count:,}; "
            f"reservations.csv={reservation_count:,}"
        ),
    )

    loyalty_count = len(
        core_tables["loyalty"]
    )

    loyalty_analytics_count = (
        parquet_row_count(
            FILES[
                "loyalty_account_analytics"
            ]
        )
    )

    recorder.add(
        "ROW_COUNTS",
        "loyalty_analytics_matches_accounts",
        (
            loyalty_analytics_count
            == loyalty_count
        ),
        (
            f"Analytics={loyalty_analytics_count:,}; "
            f"loyalty_accounts={loyalty_count:,}"
        ),
    )

    zone_catalog_count = len(
        pd.read_csv(
            FILES[
                "istanbul_zone_catalog"
            ],
            usecols=["zone_id"],
        )
    )

    zone_count = len(
        core_tables["zones"]
    )

    recorder.add(
        "ROW_COUNTS",
        "zone_catalog_matches_pricing_zones",
        (
            zone_catalog_count
            == zone_count
        ),
        (
            f"Zone katalog={zone_catalog_count:,}; "
            f"pricing_zones={zone_count:,}"
        ),
    )


# =====================================================
# 15. RFM DOĞRULAMASI
# =====================================================

def validate_rfm(
    recorder: CheckRecorder,
    users_df: pd.DataFrame,
    reservation_result: dict,
) -> pd.DataFrame:
    """
    RFM çıktılarını reservations.csv üzerinden yeniden hesaplanan
    kullanıcı özetleriyle karşılaştırır.
    """

    rfm_df = pd.read_parquet(
        FILES[
            "rfm_customer_segments"
        ]
    )

    rfm_df["user_id"] = pd.to_numeric(
        rfm_df["user_id"],
        errors="raise",
    ).astype("int64")

    rfm_df = (
        rfm_df
        .sort_values("user_id")
        .reset_index(drop=True)
    )

    users_sorted = (
        users_df
        .sort_values("id")
        .reset_index(drop=True)
    )

    expected_user_ids = (
        users_sorted[
            "id"
        ].to_numpy(dtype=np.int64)
    )

    actual_user_ids = (
        rfm_df[
            "user_id"
        ].to_numpy(dtype=np.int64)
    )

    coverage_valid = np.array_equal(
        actual_user_ids,
        expected_user_ids,
    )

    recorder.add(
        "RFM",
        "rfm_covers_all_customers_once",
        coverage_valid,
        (
            f"RFM satırı={len(rfm_df):,}; "
            f"users satırı={len(users_df):,}"
        ),
    )

    if not coverage_valid:
        return rfm_df

    status_counts = (
        reservation_result[
            "user_status_counts"
        ]
    )

    expected_total_reservations = (
        status_counts.sum(
            axis=1
        )
    )

    expected_completed = (
        status_counts[
            :,
            ALLOWED_STATUSES.index(
                "COMPLETED"
            ),
        ]
    )

    expected_monetary = (
        reservation_result[
            "user_completed_spend"
        ]
    )

    comparison_checks = {
        "total_reservations_match": (
            pd.to_numeric(
                rfm_df[
                    "total_reservations"
                ],
                errors="coerce",
            ).to_numpy()
            == expected_total_reservations
        ),

        "frequency_matches_completed": (
            pd.to_numeric(
                rfm_df[
                    "frequency"
                ],
                errors="coerce",
            ).to_numpy()
            == expected_completed
        ),

        "monetary_matches_completed_spend": (
            np.isclose(
                pd.to_numeric(
                    rfm_df[
                        "monetary"
                    ],
                    errors="coerce",
                ).to_numpy(
                    dtype=float
                ),
                expected_monetary,
                atol=0.01,
                rtol=0,
            )
        ),
    }

    for status_index, status_name in enumerate(
        ALLOWED_STATUSES
    ):
        comparison_checks[
            f"{status_name.lower()}_counts_match"
        ] = (
            pd.to_numeric(
                rfm_df[
                    status_name
                ],
                errors="coerce",
            ).to_numpy()
            == status_counts[
                :,
                status_index,
            ]
        )

    for check_name, check_values in comparison_checks.items():
        check_values = np.asarray(
            check_values,
            dtype=bool,
        )

        recorder.add(
            "RFM",
            check_name,
            check_values.all(),
            (
                "Uyuşmayan müşteri="
                f"{int((~check_values).sum()):,}"
            ),
        )

    rfm_guest_flags = convert_boolean(
        rfm_df[
            "is_guest"
        ],
        "rfm.is_guest",
    ).to_numpy(dtype=bool)

    expected_guest_flags = (
        users_sorted[
            "is_guest"
        ].to_numpy(dtype=bool)
    )

    recorder.add(
        "RFM",
        "rfm_guest_flags_match_users",
        np.array_equal(
            rfm_guest_flags,
            expected_guest_flags,
        ),
        (
            "RFM is_guest alanı users.csv "
            "ile aynı olmalıdır."
        ),
    )

    recorder.add(
        "RFM",
        "rfm_currency_is_try",
        rfm_df[
            "monetary_currency"
        ]
        .astype("string")
        .eq(EXPECTED_CURRENCY)
        .all(),
        "RFM monetary para birimi TRY olmalıdır.",
    )

    return rfm_df


# =====================================================
# 16. K-MEANS DOĞRULAMASI
# =====================================================

def validate_kmeans(
    recorder: CheckRecorder,
    rfm_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    K-Means müşteri çıktısı, cluster özeti ve model bundle
    dosyasını doğrular.
    """

    segments_df = pd.read_parquet(
        FILES[
            "customer_kmeans_segments"
        ]
    )

    segments_df["user_id"] = pd.to_numeric(
        segments_df["user_id"],
        errors="raise",
    ).astype("int64")

    segments_df = (
        segments_df
        .sort_values("user_id")
        .reset_index(drop=True)
    )

    rfm_ids = (
        rfm_df[
            "user_id"
        ]
        .sort_values()
        .to_numpy(dtype=np.int64)
    )

    segment_ids = (
        segments_df[
            "user_id"
        ].to_numpy(dtype=np.int64)
    )

    coverage_valid = np.array_equal(
        segment_ids,
        rfm_ids,
    )

    recorder.add(
        "KMEANS",
        "kmeans_covers_rfm_customers_once",
        coverage_valid,
        (
            f"Segment satırı={len(segments_df):,}; "
            f"RFM satırı={len(rfm_df):,}"
        ),
    )

    model_eligible = convert_boolean(
        segments_df[
            "model_eligible"
        ],
        "segments.model_eligible",
    )

    clusters = pd.to_numeric(
        segments_df[
            "kmeans_cluster"
        ],
        errors="coerce",
    )

    cluster_rule_valid = (
        (
            model_eligible
            & (
                clusters >= 0
            )
        )
        | (
            ~model_eligible
            & (
                clusters < 0
            )
        )
    ).all()

    recorder.add(
        "KMEANS",
        "eligible_cluster_id_rule",
        cluster_rule_valid,
        (
            "Modele giren müşteride cluster>=0, "
            "model dışı müşteride cluster<0 olmalıdır."
        ),
    )

    required_segment_fields = [
        "ml_segment_code",
        "ml_segment_name",
        "ml_segment_description",
        "segmentation_model_version",
    ]

    segment_fields_filled = (
        segments_df[
            required_segment_fields
        ]
        .notna()
        .all()
        .all()
    )

    recorder.add(
        "KMEANS",
        "segment_labels_are_filled",
        segment_fields_filled,
        "Semantik ML segment alanları boş olamaz.",
    )

    cluster_summary_df = pd.read_csv(
        FILES[
            "kmeans_cluster_summary"
        ],
        low_memory=False,
    )

    eligible_customer_count = int(
        model_eligible.sum()
    )

    cluster_summary_count = int(
        pd.to_numeric(
            cluster_summary_df[
                "customer_count"
            ],
            errors="coerce",
        ).sum()
    )

    recorder.add(
        "KMEANS",
        "cluster_summary_count_matches",
        (
            cluster_summary_count
            == eligible_customer_count
        ),
        (
            f"Cluster özet müşteri={cluster_summary_count:,}; "
            f"modele giren={eligible_customer_count:,}"
        ),
    )

    model_bundle = joblib.load(
        FILES[
            "kmeans_model_bundle"
        ]
    )

    model_bundle_valid = (
        isinstance(
            model_bundle,
            dict,
        )
        and {
            "model",
            "scaler",
            "metadata",
        }.issubset(
            model_bundle.keys()
        )
    )

    recorder.add(
        "KMEANS",
        "model_bundle_structure",
        model_bundle_valid,
        (
            "Model bundle model, scaler ve "
            "metadata içermelidir."
        ),
    )

    metadata = read_json(
        FILES[
            "kmeans_metadata"
        ]
    )

    metadata_cluster_count = int(
        metadata.get(
            "selected_cluster_count",
            -1,
        )
    )

    output_cluster_count = int(
        segments_df.loc[
            model_eligible,
            "kmeans_cluster",
        ].nunique()
    )

    recorder.add(
        "KMEANS",
        "metadata_cluster_count_matches",
        (
            metadata_cluster_count
            == output_cluster_count
        ),
        (
            f"Metadata K={metadata_cluster_count}; "
            f"çıktı K={output_cluster_count}"
        ),
    )

    return segments_df


# =====================================================
# 17. ADMIN ÖNERİLERİ DOĞRULAMASI
# =====================================================

def validate_admin_recommendations(
    recorder: CheckRecorder,
    segments_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Admin müşteri önerilerini güvenlik ve bütünlük
    açısından doğrular.
    """

    admin_df = pd.read_parquet(
        FILES[
            "admin_customer_recommendations"
        ]
    )

    admin_df["user_id"] = pd.to_numeric(
        admin_df["user_id"],
        errors="raise",
    ).astype("int64")

    admin_df = (
        admin_df
        .sort_values("user_id")
        .reset_index(drop=True)
    )

    segment_ids = (
        segments_df[
            "user_id"
        ]
        .sort_values()
        .to_numpy(dtype=np.int64)
    )

    admin_ids = (
        admin_df[
            "user_id"
        ].to_numpy(dtype=np.int64)
    )

    coverage_valid = np.array_equal(
        admin_ids,
        segment_ids,
    )

    recorder.add(
        "ADMIN",
        "admin_recommendations_cover_all_customers",
        coverage_valid,
        (
            f"Admin öneri={len(admin_df):,}; "
            f"segment müşteri={len(segments_df):,}"
        ),
    )

    recommendation_types_valid = set(
        admin_df[
            "recommendation_type"
        ].astype(str)
    ).issubset(
        ALLOWED_RECOMMENDATION_TYPES
    )

    recorder.add(
        "ADMIN",
        "recommendation_types_valid",
        recommendation_types_valid,
        (
            "Öneri tipleri tanımlı semantik "
            "kodlardan oluşmalıdır."
        ),
    )

    priority_valid = pd.to_numeric(
        admin_df[
            "priority_score"
        ],
        errors="coerce",
    ).between(
        0,
        100,
    ).all()

    confidence_valid = pd.to_numeric(
        admin_df[
            "recommendation_confidence"
        ],
        errors="coerce",
    ).between(
        0,
        1,
    ).all()

    recorder.add(
        "ADMIN",
        "priority_and_confidence_ranges",
        (
            priority_valid
            and confidence_valid
        ),
        (
            "priority_score 0–100 ve "
            "recommendation_confidence 0–1 olmalıdır."
        ),
    )

    auto_execute_values = convert_boolean(
        admin_df[
            "auto_execute"
        ],
        "admin.auto_execute",
    )

    recorder.add(
        "ADMIN",
        "recommendations_are_not_auto_executed",
        not auto_execute_values.any(),
        (
            "Data Science önerileri otomatik "
            "uygulanmamalıdır."
        ),
    )

    forbidden_personal_columns = {
        "phone_number",
        "guest_phone",
        "email",
        "first_name",
        "last_name",
        "password_hash",
    }

    recorder.add(
        "ADMIN",
        "admin_output_has_no_direct_pii",
        not forbidden_personal_columns.intersection(
            admin_df.columns
        ),
        (
            "Admin analitik çıktısında doğrudan "
            "iletişim bilgisi bulunmamalıdır."
        ),
    )

    recorder.add(
        "ADMIN",
        "admin_currency_is_try",
        admin_df[
            "monetary_currency"
        ]
        .astype("string")
        .eq(EXPECTED_CURRENCY)
        .all(),
        "Admin monetary alanı TRY olmalıdır.",
    )

    top_df = pd.read_csv(
        FILES[
            "admin_top_recommendations"
        ],
        low_memory=False,
    )

    top_actionable = convert_boolean(
        top_df[
            "is_actionable"
        ],
        "top.is_actionable",
    ).all()

    top_ids = set(
        pd.to_numeric(
            top_df[
                "user_id"
            ],
            errors="raise",
        ).astype(int)
    )

    top_ids_subset = top_ids.issubset(
        set(
            admin_df[
                "user_id"
            ].astype(int)
        )
    )

    queue_ranks = pd.to_numeric(
        top_df[
            "queue_rank"
        ],
        errors="coerce",
    )

    top_valid = (
        len(top_df) <= 1_000
        and top_actionable
        and top_ids_subset
        and queue_ranks.notna().all()
        and queue_ranks.is_monotonic_increasing
    )

    recorder.add(
        "ADMIN",
        "top_1000_queue_valid",
        top_valid,
        (
            f"Top queue satırı={len(top_df):,}; "
            "actionable ve sıralı olmalıdır."
        ),
    )

    return admin_df


# =====================================================
# 18. SATIR SAYISI RAPORU
# =====================================================

def save_row_counts(
    core_tables: dict,
    reservation_result: dict,
    history_result: dict,
    rfm_df: pd.DataFrame,
    segments_df: pd.DataFrame,
    admin_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Ana tablo ve analitik çıktıların satır sayılarını kaydeder.
    """

    rows = [
        {
            "table_or_output": "users",
            "row_count": len(
                core_tables[
                    "users"
                ]
            ),
        },
        {
            "table_or_output": "vehicles",
            "row_count": len(
                core_tables[
                    "vehicles"
                ]
            ),
        },
        {
            "table_or_output": "pricing_zones",
            "row_count": len(
                core_tables[
                    "zones"
                ]
            ),
        },
        {
            "table_or_output": "pricing_rules",
            "row_count": len(
                core_tables[
                    "rules"
                ]
            ),
        },
        {
            "table_or_output": "loyalty_tier_config",
            "row_count": len(
                core_tables[
                    "tier_config"
                ]
            ),
        },
        {
            "table_or_output": "loyalty_accounts",
            "row_count": len(
                core_tables[
                    "loyalty"
                ]
            ),
        },
        {
            "table_or_output": "reservations",
            "row_count": reservation_result[
                "reservation_count"
            ],
        },
        {
            "table_or_output": (
                "reservation_status_history"
            ),
            "row_count": history_result[
                "history_row_count"
            ],
        },
        {
            "table_or_output": (
                "rfm_customer_segments"
            ),
            "row_count": len(
                rfm_df
            ),
        },
        {
            "table_or_output": (
                "customer_kmeans_segments"
            ),
            "row_count": len(
                segments_df
            ),
        },
        {
            "table_or_output": (
                "admin_customer_recommendations"
            ),
            "row_count": len(
                admin_df
            ),
        },
    ]

    row_counts_df = pd.DataFrame(
        rows
    )

    row_counts_df.to_csv(
        TABLE_ROW_COUNTS_OUTPUT,
        index=False,
        encoding="utf-8-sig",
    )

    return row_counts_df


# =====================================================
# 19. SON RAPOR
# =====================================================

def save_final_reports(
    recorder: CheckRecorder,
    manifest_df: pd.DataFrame,
    row_counts_df: pd.DataFrame,
    reservation_result: dict,
    history_result: dict,
) -> dict:
    """
    Bütün kontrolleri CSV ve JSON olarak kaydeder.
    """

    checks_df = (
        recorder.to_dataframe()
    )

    checks_df.to_csv(
        VALIDATION_CHECKS_OUTPUT,
        index=False,
        encoding="utf-8-sig",
    )

    failed_error_count = (
        recorder.failed_error_count()
    )

    warning_count = (
        recorder.warning_count()
    )

    validation_passed = (
        failed_error_count == 0
    )

    summary = {
        "validation_version": (
            VALIDATION_VERSION
        ),

        "generated_at_utc": (
            datetime.now(timezone.utc)
            .replace(microsecond=0)
            .isoformat()
        ),

        "project_root": str(
            PROJECT_ROOT
        ),

        "validation_scope": (
            "01–12 core data pipeline outputs, "
            "before weather and demand forecasting stages"
        ),

        "validation_passed": (
            validation_passed
        ),

        "total_check_count": int(
            len(checks_df)
        ),

        "passed_check_count": int(
            checks_df[
                "passed"
            ].sum()
        ),

        "failed_error_count": int(
            failed_error_count
        ),

        "warning_count": int(
            warning_count
        ),

        "file_count": int(
            len(manifest_df)
        ),

        "sha256_calculated": (
            CALCULATE_SHA256
        ),

        "row_counts": {
            row[
                "table_or_output"
            ]: int(
                row["row_count"]
            )
            for row in row_counts_df.to_dict(
                "records"
            )
        },

        "reservation_summary": {
            "reservation_count": int(
                reservation_result[
                    "reservation_count"
                ]
            ),

            "completed_count": int(
                reservation_result[
                    "completed_count"
                ]
            ),

            "cancelled_count": int(
                reservation_result[
                    "cancelled_count"
                ]
            ),

            "no_show_count": int(
                reservation_result[
                    "no_show_count"
                ]
            ),

            "guest_reservation_count": int(
                reservation_result[
                    "guest_reservation_count"
                ]
            ),
        },

        "status_history_summary": {
            key: int(value)
            for key, value in history_result.items()
        },

        "pricing_currency": (
            EXPECTED_CURRENCY
        ),

        "distance_unit": (
            "kilometre"
        ),

        "source_usd_used_for_backend_price": (
            False
        ),

        "weather_outputs_checked": (
            False
        ),

        "demand_model_outputs_checked": (
            False
        ),

        "reason_weather_not_checked": (
            "15–22 numaralı hava durumu, tahmin, "
            "XGBoost ve backend teslim aşamaları "
            "bu kontrol noktasından sonra çalışacaktır."
        ),

        "simulated_geometry_warning": (
            "SIMULATED_GRID polygonlar staj "
            "simülasyonu içindir. Üretimde admin "
            "panelinden çizilmiş doğrulanmış "
            "polygonlar kullanılmalıdır."
        ),

        "report_files": {
            "file_manifest": str(
                FILE_MANIFEST_OUTPUT
            ),

            "validation_checks": str(
                VALIDATION_CHECKS_OUTPUT
            ),

            "table_row_counts": str(
                TABLE_ROW_COUNTS_OUTPUT
            ),

            "status_distribution": str(
                STATUS_DISTRIBUTION_OUTPUT
            ),
        },
    }

    with open(
        FINAL_SUMMARY_OUTPUT,
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
# 20. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 75)
    print("12 — CORE PIPELINE ÇIKTILARININ DOĞRULANMASI")
    print("=" * 75)

    recorder = CheckRecorder()

    print(
        "\n1/10 Dosya varlıkları kontrol ediliyor..."
    )

    ensure_all_files_exist(
        recorder=recorder
    )

    print(
        "\n2/10 Dosya manifestosu oluşturuluyor..."
    )

    manifest_df = (
        create_file_manifest()
    )

    print(
        "\n3/10 SQL CSV şemaları doğrulanıyor..."
    )

    validate_sql_csv_schemas(
        recorder=recorder
    )

    print(
        "\n4/10 Referans ve kullanıcı tabloları doğrulanıyor..."
    )

    core_tables = (
        read_and_validate_core_tables(
            recorder=recorder
        )
    )

    print(
        "\n5/10 Önceki fiyat ve lokasyon raporları kontrol ediliyor..."
    )

    validate_previous_reports(
        recorder=recorder
    )

    print(
        "\n6/10 Reservations parça parça doğrulanıyor..."
    )

    reservation_result = (
        validate_reservations(
            recorder=recorder,
            users_df=(
                core_tables[
                    "users"
                ]
            ),
            vehicles_df=(
                core_tables[
                    "vehicles"
                ]
            ),
            zones_df=(
                core_tables[
                    "zones"
                ]
            ),
        )
    )

    print(
        "\n7/10 Ara dosya satır sayıları karşılaştırılıyor..."
    )

    validate_intermediate_row_counts(
        recorder=recorder,
        core_tables=core_tables,
        reservation_result=(
            reservation_result
        ),
    )

    print(
        "\n8/10 Reservation status history doğrulanıyor..."
    )

    history_result = (
        validate_status_history(
            recorder=recorder,
            users_df=(
                core_tables[
                    "users"
                ]
            ),
            reservation_result=(
                reservation_result
            ),
        )
    )

    print(
        "\n9/10 RFM, K-Means ve admin çıktıları doğrulanıyor..."
    )

    rfm_df = validate_rfm(
        recorder=recorder,
        users_df=(
            core_tables[
                "users"
            ]
        ),
        reservation_result=(
            reservation_result
        ),
    )

    segments_df = validate_kmeans(
        recorder=recorder,
        rfm_df=rfm_df,
    )

    admin_df = (
        validate_admin_recommendations(
            recorder=recorder,
            segments_df=(
                segments_df
            ),
        )
    )

    print(
        "\n10/10 Son raporlar kaydediliyor..."
    )

    row_counts_df = save_row_counts(
        core_tables=core_tables,
        reservation_result=(
            reservation_result
        ),
        history_result=(
            history_result
        ),
        rfm_df=rfm_df,
        segments_df=segments_df,
        admin_df=admin_df,
    )

    summary = save_final_reports(
        recorder=recorder,
        manifest_df=manifest_df,
        row_counts_df=row_counts_df,
        reservation_result=(
            reservation_result
        ),
        history_result=(
            history_result
        ),
    )

    print("\n" + "=" * 75)
    print("CORE OUTPUT DOĞRULAMA SONUCU")
    print("=" * 75)

    print(
        f"Toplam kontrol : "
        f"{summary['total_check_count']:,}"
    )

    print(
        f"Başarılı       : "
        f"{summary['passed_check_count']:,}"
    )

    print(
        f"Hatalı         : "
        f"{summary['failed_error_count']:,}"
    )

    print(
        f"Uyarı          : "
        f"{summary['warning_count']:,}"
    )

    print(
        f"Reservations   : "
        f"{reservation_result['reservation_count']:,}"
    )

    print(
        "Status history : "
        f"{history_result['history_row_count']:,}"
    )

    print(
        f"\nRapor klasörü : "
        f"{REPORT_DIR}"
    )

    print(
        f"- {FILE_MANIFEST_OUTPUT.name}"
    )

    print(
        f"- {VALIDATION_CHECKS_OUTPUT.name}"
    )

    print(
        f"- {TABLE_ROW_COUNTS_OUTPUT.name}"
    )

    print(
        f"- {STATUS_DISTRIBUTION_OUTPUT.name}"
    )

    print(
        f"- {FINAL_SUMMARY_OUTPUT.name}"
    )

    if summary["validation_passed"]:
        print(
            "\n 01–12 core pipeline çıktıları "
            "birbiriyle ve SQL şemasıyla uyumludur."
        )

    elif FAIL_ON_ERROR:
        raise ValueError(
            "\nCore pipeline doğrulamasında hata bulundu.\n"
            "Ayrıntılar için kontrol et:\n"
            f"{VALIDATION_CHECKS_OUTPUT}"
        )

    else:
        print(
            "\n Hatalar bulundu ancak "
            "FAIL_ON_ERROR=False olduğu için "
            "pipeline durdurulmadı."
        )

    print(
        "\nNot: Hava durumu ve talep tahmin "
        "çıktıları bu dosyada kontrol edilmez. "
        "Bunlar 15–22 aşamalarında üretilecektir."
    )


if __name__ == "__main__":
    main()