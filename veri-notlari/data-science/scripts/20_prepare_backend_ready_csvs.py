import gc
import hashlib
import json
import os
import re
import shutil
import sqlite3
import stat
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd


try:
    sys.stdout.reconfigure(encoding="utf-8")
except AttributeError:
    pass


# =====================================================
# 1. GENEL AYARLAR
# =====================================================

DATABASE_SCHEMA_VERSION = "4.3.0"
RELEASE_NAME = "backend_ready_v1"
PACKAGE_VERSION = "backend-import-package-v3"
CHUNK_SIZE = 150_000
FAIL_ON_VALIDATION_ERROR = True

EXPECTED_CURRENCY = "TRY"
EXPECTED_FORECAST_HOURS = 24
MIN_SURGE_MULTIPLIER = 1.00
MAX_SURGE_MULTIPLIER = 1.60

ALLOWED_ROLES = {"ADMIN", "CUSTOMER"}
ALLOWED_VEHICLE_CLASSES = {
    "ECONOMY", "STANDARD", "BUSINESS", "VIP", "LUXURY", "MINIVAN"
}
ALLOWED_RESERVATION_STATUSES = {
    "PENDING", "ASSIGNED", "COMPLETED", "CANCELLED", "NO_SHOW"
}
ALLOWED_LOYALTY_TIERS = {"BRONZE", "SILVER", "GOLD", "PLATINUM", "VIP"}
ALLOWED_DISCOUNT_TYPES = {"PERCENTAGE", "FIXED_AMOUNT"}
ALLOWED_ENTITY_FIELDS = {
    "pricing_zone": {"name", "description"},
    "campaign": {"name", "description"},
    "pricing_rule": {"name", "reason"},
    "loyalty_tier": {"description"},
    "vehicle": {"color"},
}
FORBIDDEN_SERVICE_CONTRACT_PII = {
    "phone_number", "guest_phone", "email", "first_name", "last_name",
    "password_hash", "pickup_address", "dropoff_address",
}

BOOKING_REFERENCE_PATTERN = re.compile(r"^VIP-\d{6}-\d{6,10}$")
POINT_PATTERN = re.compile(
    r"^SRID=4326;POINT\((-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\)$"
)
POLYGON_PATTERN = re.compile(r"^SRID=4326;POLYGON\(\((.+)\)\)$")

EXPECTED_LOYALTY_CONFIG = pd.DataFrame(
    [
        [1, "BRONZE", 0, 1.00, 0.00, False, "Başlangıç seviyesi"],
        [2, "SILVER", 500, 1.25, 2.00, False, "Düzenli müşteri"],
        [3, "GOLD", 2_000, 1.50, 5.00, True, "Değerli müşteri"],
        [4, "PLATINUM", 5_000, 1.75, 8.00, True, "Premium müşteri"],
        [5, "VIP", 10_000, 2.00, 12.00, True, "Elit VIP müşteri"],
    ],
    columns=[
        "id", "tier", "min_points", "earn_rate", "discount_percentage",
        "priority_support", "description",
    ],
)

TABLE_COLUMNS = {
    "users": [
        "id", "phone_number", "email", "password_hash", "first_name",
        "last_name", "profile_photo", "preferred_lang", "role", "is_guest",
        "is_active", "email_verified", "phone_verified", "created_at",
        "updated_at", "deleted_at",
    ],
    "vehicles": [
        "id", "plate_number", "vehicle_class", "brand", "model", "year",
        "color", "photo_url", "capacity", "base_price_multiplier",
        "opening_price", "is_active", "created_at", "updated_at",
    ],
    "pricing_zones": [
        "id", "name", "description", "polygon_geom", "base_price",
        "min_price", "price_per_km", "currency", "is_active", "created_at",
        "updated_at",
    ],
    "pricing_rules": [
        "id", "zone_id", "name", "day_of_week", "start_time", "end_time",
        "multiplier", "reason", "valid_from", "valid_to", "is_active",
        "created_at",
    ],
    "campaigns": [
        "id", "code", "name", "description", "discount_type",
        "discount_value", "max_discount_amount", "min_order_amount",
        "max_uses", "used_count", "max_uses_per_user", "valid_from",
        "valid_to", "is_active", "created_by", "created_at", "updated_at",
    ],
    "loyalty_tier_config": [
        "id", "tier", "min_points", "earn_rate", "discount_percentage",
        "priority_support", "description",
    ],
    "loyalty_accounts": [
        "user_id", "lifetime_points", "tier", "updated_at",
    ],
    "translations": [
        "id", "trans_key", "lang_code", "value", "created_at", "updated_at",
    ],
    "entity_translations": [
        "id", "entity_type", "entity_id", "field_name", "lang_code", "value",
        "created_at", "updated_at",
    ],
    "reservations": [
        "id", "booking_reference", "user_id", "guest_phone", "pickup_address",
        "pickup_point", "dropoff_address", "dropoff_point", "pickup_zone_id",
        "dropoff_zone_id", "scheduled_time", "vehicle_id", "passenger_count",
        "distance_km", "route_polyline", "base_price", "surge_multiplier",
        "discount_amount", "loyalty_discount", "opening_price",
        "calculated_price", "currency", "status", "campaign_id",
        "flight_number", "notes", "cancelled_at", "cancellation_reason",
        "completed_at", "created_at", "updated_at",
    ],
    "reservation_status_history": [
        "id", "reservation_id", "status", "changed_by", "note", "changed_at",
    ],
}

PRICING_CONTRACT_COLUMNS = [
    "zone_id", "zone_name", "zone_category", "demand_hour_utc",
    "demand_hour_local", "forecast_horizon_hour", "predicted_demand",
    "predicted_demand_rounded", "prediction_lower_80", "prediction_upper_80",
    "predicted_demand_level", "weather_condition", "weather_severity_score",
    "weather_data_source", "weather_is_synthetic", "is_peak_hour",
    "is_holiday", "low_demand_threshold", "high_demand_threshold",
    "demand_surge_component", "peak_hour_surge_component",
    "weather_surge_component", "recommended_surge_multiplier", "surge_reason",
    "pricing_rule_merge_strategy", "requires_pricing_service_validation",
    "auto_apply", "forecast_model_version", "forecast_generated_at_utc",
]

ADMIN_REQUIRED_COLUMNS = [
    "user_id", "monetary_currency", "recommendation_type", "priority_score",
    "recommendation_confidence", "is_actionable", "auto_execute", "queue_rank",
]


# =====================================================
# 2. PROJE VE ÇIKTI KLASÖRLERİ
# =====================================================

def find_project_root() -> Path:
    script_directory = Path(__file__).resolve().parent
    if script_directory.name.lower() in {
        "scripts", "src", "data-science", "data_science"
    }:
        return script_directory.parent
    return script_directory


PROJECT_ROOT = find_project_root()
REFERENCE_DIR = PROJECT_ROOT / "data" / "reference"
GENERATED_DIR = PROJECT_ROOT / "data" / "generated"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
REPORTS_DIR = PROJECT_ROOT / "outputs" / "reports"
DELIVERABLES_DIR = PROJECT_ROOT / "deliverables"
FINAL_RELEASE_DIR = DELIVERABLES_DIR / RELEASE_NAME
STAGING_RELEASE_DIR = DELIVERABLES_DIR / f".{RELEASE_NAME}_staging"
BACKUP_RELEASE_DIR = DELIVERABLES_DIR / f".{RELEASE_NAME}_backup"

SQL_IMPORT_DIR = STAGING_RELEASE_DIR / "sql_import"
SERVICE_CONTRACT_DIR = STAGING_RELEASE_DIR / "service_contracts"
SQL_SCRIPTS_DIR = STAGING_RELEASE_DIR / "sql"
PACKAGE_REPORT_DIR = STAGING_RELEASE_DIR / "reports"

EXTERNAL_REPORT_DIR = REPORTS_DIR / "20_prepare_backend_ready_csvs"
EXTERNAL_REPORT_DIR.mkdir(parents=True, exist_ok=True)
DELIVERABLES_DIR.mkdir(parents=True, exist_ok=True)

EXTERNAL_VALIDATION_FILE = EXTERNAL_REPORT_DIR / "backend_package_validation_checks.csv"
EXTERNAL_SUMMARY_FILE = EXTERNAL_REPORT_DIR / "backend_package_summary.json"


@dataclass(frozen=True)
class SourceSpec:
    logical_name: str
    candidates: tuple[Path, ...]
    required: bool = True


SOURCE_SPECS = {
    "users": SourceSpec("users", (GENERATED_DIR / "users.csv",)),
    "vehicles": SourceSpec("vehicles", (REFERENCE_DIR / "vehicles.csv",)),
    "pricing_zones": SourceSpec(
        "pricing_zones", (REFERENCE_DIR / "pricing_zones.csv",)
    ),
    "pricing_rules": SourceSpec(
        "pricing_rules", (REFERENCE_DIR / "pricing_rules.csv",)
    ),
    "campaigns": SourceSpec(
        "campaigns",
        (GENERATED_DIR / "campaigns.csv", REFERENCE_DIR / "campaigns.csv"),
        required=False,
    ),
    "loyalty_tier_config": SourceSpec(
        "loyalty_tier_config", (REFERENCE_DIR / "loyalty_tier_config.csv",)
    ),
    "loyalty_accounts": SourceSpec(
        "loyalty_accounts", (GENERATED_DIR / "loyalty_accounts.csv",)
    ),
    "translations": SourceSpec(
        "translations", (GENERATED_DIR / "translations.csv",)
    ),
    "entity_translations": SourceSpec(
        "entity_translations", (GENERATED_DIR / "entity_translations.csv",)
    ),
    "reservations": SourceSpec(
        "reservations", (GENERATED_DIR / "reservations.csv",)
    ),
    "reservation_status_history": SourceSpec(
        "reservation_status_history",
        (GENERATED_DIR / "reservation_status_history.csv",),
    ),
}

MODEL_SELECTION_FILE = (
    REPORTS_DIR
    / "16_xgboost_demand_prediction_weather"
    / "model_selection_recommendation.json"
)

PRICING_CONTRACT_SOURCES = {
    "XGBOOST_WEATHER": PROCESSED_DIR / "pricing_service_surge_xgboost_weather.csv",
    "RANDOM_FOREST_WEATHER": (
        PROCESSED_DIR / "pricing_service_surge_random_forest_weather.csv"
    ),
}

ADMIN_RECOMMENDATIONS_SOURCE = (
    PROCESSED_DIR / "admin_customer_recommendations.csv"
)
ADMIN_TOP_RECOMMENDATIONS_SOURCE = (
    PROCESSED_DIR / "admin_top_1000_customer_recommendations.csv"
)


# =====================================================
# 3. DOĞRULAMA KAYDEDİCİ
# =====================================================

class CheckRecorder:
    def __init__(self) -> None:
        self.rows: list[dict] = []

    def add(
        self,
        category: str,
        check_name: str,
        passed: bool,
        details: str,
        severity: str = "ERROR",
    ) -> None:
        self.rows.append(
            {
                "category": category,
                "check_name": check_name,
                "passed": bool(passed),
                "severity": severity,
                "details": str(details),
            }
        )
        icon = "✅" if passed else ("⚠️" if severity == "WARNING" else "❌")
        print(f"{icon} [{category}] {check_name}: {details}")

    def to_dataframe(self) -> pd.DataFrame:
        return pd.DataFrame(self.rows)

    def failed_error_count(self) -> int:
        return sum(
            1
            for row in self.rows
            if not row["passed"] and row["severity"] == "ERROR"
        )

    def warning_count(self) -> int:
        return sum(
            1
            for row in self.rows
            if not row["passed"] and row["severity"] == "WARNING"
        )


# =====================================================
# 4. YARDIMCI FONKSİYONLAR
# =====================================================

def json_safe(value):
    if isinstance(value, dict):
        return {str(key): json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(item) for item in value]
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        return float(value)
    if isinstance(value, np.bool_):
        return bool(value)
    if isinstance(value, pd.Timestamp):
        return str(value)
    return value


def clean_string(series: pd.Series) -> pd.Series:
    return series.astype("string").fillna("").str.strip()


def blank_mask(series: pd.Series) -> pd.Series:
    return clean_string(series).eq("")


def parse_boolean(series: pd.Series, column_name: str) -> pd.Series:
    if pd.api.types.is_bool_dtype(series):
        return series.astype(bool)
    converted = (
        clean_string(series)
        .str.lower()
        .map({"true": True, "false": False, "1": True, "0": False})
    )
    if converted.isna().any():
        invalid = clean_string(series.loc[converted.isna()]).drop_duplicates().head(10)
        raise ValueError(
            f"{column_name} alanında geçersiz boolean değerler var: "
            f"{invalid.tolist()}"
        )
    return converted.astype(bool)


def parse_integer(
    series: pd.Series,
    column_name: str,
    nullable: bool,
    minimum: int | None = None,
) -> pd.Series:
    text = clean_string(series)
    numeric = pd.to_numeric(series, errors="coerce")
    supplied = text.ne("")
    invalid = supplied & (numeric.isna() | (numeric % 1 != 0))
    if invalid.any():
        raise ValueError(
            f"{column_name} alanında geçersiz tam sayı değerleri var: "
            f"{text.loc[invalid].drop_duplicates().head(10).tolist()}"
        )
    if not nullable and numeric.isna().any():
        raise ValueError(f"{column_name} alanında boş değer bulunamaz.")
    if minimum is not None and (numeric.dropna() < minimum).any():
        raise ValueError(f"{column_name} alanı en az {minimum} olmalıdır.")
    return numeric.astype("Int64")


def parse_numeric(
    series: pd.Series,
    column_name: str,
    nullable: bool,
    minimum: float | None = None,
) -> pd.Series:
    text = clean_string(series)
    numeric = pd.to_numeric(series, errors="coerce")
    invalid = text.ne("") & numeric.isna()
    if invalid.any():
        raise ValueError(
            f"{column_name} alanında geçersiz sayısal değerler var: "
            f"{text.loc[invalid].drop_duplicates().head(10).tolist()}"
        )
    if not nullable and numeric.isna().any():
        raise ValueError(f"{column_name} alanında boş değer bulunamaz.")
    if minimum is not None and (numeric.dropna() < minimum).any():
        raise ValueError(f"{column_name} alanı en az {minimum} olmalıdır.")
    return numeric.astype(float)


def parse_timestamp(
    series: pd.Series,
    column_name: str,
    nullable: bool,
) -> pd.Series:
    text = clean_string(series)
    parsed = pd.to_datetime(
        series,
        errors="coerce",
        utc=True,
        format="mixed",
    )
    invalid = text.ne("") & parsed.isna()
    if invalid.any():
        raise ValueError(
            f"{column_name} alanında geçersiz timestamp değerleri var: "
            f"{text.loc[invalid].drop_duplicates().head(10).tolist()}"
        )
    if not nullable and parsed.isna().any():
        raise ValueError(f"{column_name} alanında boş timestamp bulunamaz.")
    return parsed


def parse_date(series: pd.Series, column_name: str) -> pd.Series:
    text = clean_string(series)
    parsed = pd.to_datetime(series, errors="coerce").dt.date
    invalid = text.ne("") & pd.isna(parsed)
    if invalid.any():
        raise ValueError(
            f"{column_name} alanında geçersiz tarih değerleri var: "
            f"{text.loc[invalid].drop_duplicates().head(10).tolist()}"
        )
    return parsed


def assert_exact_columns(
    dataframe: pd.DataFrame,
    table_name: str,
    recorder: CheckRecorder,
) -> None:
    expected = TABLE_COLUMNS[table_name]
    actual = dataframe.columns.tolist()
    recorder.add(
        "SCHEMA",
        f"{table_name}_exact_columns",
        actual == expected,
        f"Beklenen={expected}; bulunan={actual}",
    )


def resolve_sources(recorder: CheckRecorder) -> dict[str, Path | None]:
    resolved: dict[str, Path | None] = {}
    for table_name, spec in SOURCE_SPECS.items():
        found = next((path for path in spec.candidates if path.exists()), None)
        resolved[table_name] = found
        recorder.add(
            "SOURCE_FILES",
            f"{table_name}_source_exists",
            found is not None or not spec.required,
            str(found) if found else f"Aranan yollar: {[str(p) for p in spec.candidates]}",
            severity="ERROR" if spec.required else "WARNING",
        )
    return resolved


def remove_tree_safely(
    directory_path: Path,
    *,
    strict: bool,
    attempts: int = 6,
    delay_seconds: float = 0.75,
) -> bool:
    """
    Windows ve OneDrive altında geçici dosya kilitleri oluştuğunda
    klasörü birkaç kez deneyerek siler.

    strict=False kullanıldığında temizlik hatası asıl pipeline
    hatasını maskelemez.
    """

    if not directory_path.exists():
        return True

    last_error: Exception | None = None

    for attempt in range(1, attempts + 1):
        try:
            # Salt-okunur işaretleri kaldır.
            try:
                paths = sorted(
                    directory_path.rglob("*"),
                    key=lambda path: len(path.parts),
                    reverse=True,
                )
            except OSError:
                paths = []

            for path in paths:
                try:
                    os.chmod(
                        path,
                        stat.S_IWRITE | stat.S_IREAD,
                    )
                except OSError:
                    pass

            try:
                os.chmod(
                    directory_path,
                    stat.S_IWRITE | stat.S_IREAD,
                )
            except OSError:
                pass

            shutil.rmtree(directory_path)
            return True

        except (PermissionError, OSError) as error:
            last_error = error
            gc.collect()

            if attempt < attempts:
                time.sleep(delay_seconds * attempt)

    message = (
        "Geçici staging klasörü temizlenemedi:\n"
        f"{directory_path}\n"
        f"Son hata: {last_error}"
    )

    if strict:
        raise PermissionError(message) from last_error

    print(f"⚠️ {message}")
    print(
        "Asıl pipeline hatası korunarak yeniden yükseltilecek. "
        "Gerekirse klasörü VS Code ve Dosya Gezgini kapalıyken elle sil."
    )
    return False


def calculate_sha256(file_path: Path) -> str:
    digest = hashlib.sha256()
    with open(file_path, "rb") as file_handle:
        while True:
            block = file_handle.read(8 * 1024 * 1024)
            if not block:
                break
            digest.update(block)
    return digest.hexdigest()


def count_csv_rows(file_path: Path) -> int:
    with open(file_path, "rb") as file_handle:
        return max(sum(1 for _ in file_handle) - 1, 0)


def write_small_table(dataframe: pd.DataFrame, table_name: str) -> Path:
    output = SQL_IMPORT_DIR / f"{table_name}.csv"
    dataframe[TABLE_COLUMNS[table_name]].to_csv(
        output,
        index=False,
        encoding="utf-8",
        na_rep="",
    )
    return output


def validate_point_series(series: pd.Series, column_name: str) -> None:
    extracted = clean_string(series).str.extract(POINT_PATTERN)
    if extracted.isna().any(axis=None):
        invalid = clean_string(series.loc[extracted.isna().any(axis=1)]).head(5)
        raise ValueError(
            f"{column_name} geçerli SRID=4326 POINT EWKT değil: {invalid.tolist()}"
        )
    lon = pd.to_numeric(extracted[0], errors="coerce")
    lat = pd.to_numeric(extracted[1], errors="coerce")
    if not lon.between(-180, 180).all() or not lat.between(-90, 90).all():
        raise ValueError(f"{column_name} koordinatları geçerli aralıkta değil.")


def validate_polygon(value: str, row_id: int) -> None:
    match = POLYGON_PATTERN.fullmatch(str(value).strip())
    if match is None:
        raise ValueError(f"pricing_zones id={row_id}: polygon_geom EWKT formatı hatalı.")
    points = []
    for item in match.group(1).split(","):
        parts = item.strip().split()
        if len(parts) != 2:
            raise ValueError(f"pricing_zones id={row_id}: polygon koordinatı hatalı.")
        lon, lat = float(parts[0]), float(parts[1])
        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            raise ValueError(f"pricing_zones id={row_id}: polygon koordinatı sınır dışında.")
        points.append((lon, lat))
    if len(points) < 4 or points[0] != points[-1]:
        raise ValueError(f"pricing_zones id={row_id}: polygon kapalı değil.")
    area_twice = 0.0
    for index in range(len(points) - 1):
        x1, y1 = points[index]
        x2, y2 = points[index + 1]
        area_twice += x1 * y2 - x2 * y1
    if abs(area_twice) < 1e-12:
        raise ValueError(f"pricing_zones id={row_id}: polygon alanı sıfır.")


def validate_unique_nonblank(
    dataframe: pd.DataFrame,
    column: str,
    table_name: str,
    allow_blank: bool = False,
) -> None:
    values = clean_string(dataframe[column])
    if not allow_blank and values.eq("").any():
        raise ValueError(f"{table_name}.{column} boş olamaz.")
    nonblank = values.loc[values.ne("")]
    if nonblank.duplicated().any():
        raise ValueError(f"{table_name}.{column} tekrar eden değer içeriyor.")


# =====================================================
# 5. KÜÇÜK SQL TABLOLARINI DOĞRULAMA
# =====================================================

def prepare_small_tables(
    sources: dict[str, Path | None],
    recorder: CheckRecorder,
) -> tuple[dict[str, pd.DataFrame], dict]:
    tables: dict[str, pd.DataFrame] = {}

    for table_name in [
        "users", "vehicles", "pricing_zones", "pricing_rules",
        "loyalty_tier_config", "loyalty_accounts", "translations",
        "entity_translations",
    ]:
        source = sources[table_name]
        if source is None:
            raise FileNotFoundError(f"{table_name} kaynağı bulunamadı.")
        dataframe = pd.read_csv(source, low_memory=False)
        assert_exact_columns(dataframe, table_name, recorder)
        tables[table_name] = dataframe

    campaign_source = sources["campaigns"]
    if campaign_source is None:
        tables["campaigns"] = pd.DataFrame(columns=TABLE_COLUMNS["campaigns"])
        recorder.add(
            "CAMPAIGNS",
            "empty_campaign_table_created",
            True,
            "Campaign verisi bulunmadığı için yalnızca şema başlığı olan boş campaigns.csv hazırlanacak.",
            severity="WARNING",
        )
    else:
        campaigns = pd.read_csv(campaign_source, low_memory=False)
        assert_exact_columns(campaigns, "campaigns", recorder)
        tables["campaigns"] = campaigns

    # Users
    users = tables["users"].copy()
    users["id"] = parse_integer(users["id"], "users.id", False, 1)
    validate_unique_nonblank(users, "phone_number", "users")
    validate_unique_nonblank(users, "email", "users", allow_blank=True)
    users["role"] = clean_string(users["role"]).str.upper()
    if not set(users["role"]).issubset(ALLOWED_ROLES):
        raise ValueError("users.role geçersiz enum değeri içeriyor.")
    for column in ["is_guest", "is_active", "email_verified", "phone_verified"]:
        users[column] = parse_boolean(users[column], f"users.{column}")
    created = parse_timestamp(users["created_at"], "users.created_at", False)
    updated = parse_timestamp(users["updated_at"], "users.updated_at", False)
    deleted = parse_timestamp(users["deleted_at"], "users.deleted_at", True)
    if (updated < created).any():
        raise ValueError("users.updated_at, created_at değerinden önce olamaz.")
    if ((deleted.notna()) & users["is_active"]).any():
        raise ValueError("deleted_at dolu kullanıcı aktif olamaz.")
    if users["id"].duplicated().any():
        raise ValueError("users.id tekrar ediyor.")
    if clean_string(users["phone_number"]).str.len().gt(20).any():
        raise ValueError("users.phone_number 20 karakteri aşamaz.")
    tables["users"] = users

    user_ids = set(users["id"].astype(int))
    guest_user_ids = set(users.loc[users["is_guest"], "id"].astype(int))
    registered_user_ids = user_ids - guest_user_ids

    # Vehicles
    vehicles = tables["vehicles"].copy()
    vehicles["id"] = parse_integer(vehicles["id"], "vehicles.id", False, 1)
    validate_unique_nonblank(vehicles, "plate_number", "vehicles")
    vehicles["vehicle_class"] = clean_string(vehicles["vehicle_class"]).str.upper()
    if not set(vehicles["vehicle_class"]).issubset(ALLOWED_VEHICLE_CLASSES):
        raise ValueError("vehicles.vehicle_class geçersiz enum değeri içeriyor.")
    vehicles["capacity"] = parse_integer(vehicles["capacity"], "vehicles.capacity", False, 1)
    vehicles["base_price_multiplier"] = parse_numeric(
        vehicles["base_price_multiplier"], "vehicles.base_price_multiplier", False, 0.000001
    )
    vehicles["opening_price"] = parse_numeric(
        vehicles["opening_price"], "vehicles.opening_price", False, 0
    )
    vehicles["is_active"] = parse_boolean(vehicles["is_active"], "vehicles.is_active")
    parse_timestamp(vehicles["created_at"], "vehicles.created_at", False)
    parse_timestamp(vehicles["updated_at"], "vehicles.updated_at", False)
    if vehicles["id"].duplicated().any():
        raise ValueError("vehicles.id tekrar ediyor.")
    tables["vehicles"] = vehicles
    vehicle_ids = set(vehicles["id"].astype(int))

    # Pricing zones
    zones = tables["pricing_zones"].copy()
    zones["id"] = parse_integer(zones["id"], "pricing_zones.id", False, 1)
    validate_unique_nonblank(zones, "name", "pricing_zones")
    for column in ["base_price", "min_price", "price_per_km"]:
        zones[column] = parse_numeric(zones[column], f"pricing_zones.{column}", False, 0)
    zones["is_active"] = parse_boolean(zones["is_active"], "pricing_zones.is_active")
    if not clean_string(zones["currency"]).eq(EXPECTED_CURRENCY).all():
        raise ValueError("pricing_zones.currency yalnızca TRY olmalıdır.")
    for row in zones.itertuples(index=False):
        validate_polygon(row.polygon_geom, int(row.id))
    parse_timestamp(zones["created_at"], "pricing_zones.created_at", False)
    parse_timestamp(zones["updated_at"], "pricing_zones.updated_at", False)
    if zones["id"].duplicated().any():
        raise ValueError("pricing_zones.id tekrar ediyor.")
    tables["pricing_zones"] = zones
    zone_ids = set(zones["id"].astype(int))
    active_zone_ids = set(zones.loc[zones["is_active"], "id"].astype(int))

    # Pricing rules
    rules = tables["pricing_rules"].copy()
    rules["id"] = parse_integer(rules["id"], "pricing_rules.id", False, 1)
    rules["zone_id"] = parse_integer(rules["zone_id"], "pricing_rules.zone_id", False, 1)
    if not set(rules["zone_id"].astype(int)).issubset(zone_ids):
        raise ValueError("pricing_rules.zone_id foreign key hatası var.")
    rules["day_of_week"] = parse_integer(
        rules["day_of_week"], "pricing_rules.day_of_week", True, 0
    )
    if rules["day_of_week"].dropna().gt(6).any():
        raise ValueError("pricing_rules.day_of_week 0–6 arasında olmalıdır.")
    rules["multiplier"] = parse_numeric(
        rules["multiplier"], "pricing_rules.multiplier", False, 0.000001
    )
    start_times = pd.to_datetime(rules["start_time"], errors="coerce").dt.time
    end_times = pd.to_datetime(rules["end_time"], errors="coerce").dt.time
    if start_times.isna().any() or end_times.isna().any():
        raise ValueError("pricing_rules start_time/end_time geçersiz.")
    if any(end <= start for start, end in zip(start_times, end_times)):
        raise ValueError("pricing_rules.end_time, start_time değerinden sonra olmalıdır.")
    valid_from = parse_date(rules["valid_from"], "pricing_rules.valid_from")
    valid_to = parse_date(rules["valid_to"], "pricing_rules.valid_to")
    if any(
        end is not None and not pd.isna(end) and start is not None and not pd.isna(start) and end < start
        for start, end in zip(valid_from, valid_to)
    ):
        raise ValueError("pricing_rules.valid_to, valid_from değerinden önce olamaz.")
    rules["is_active"] = parse_boolean(rules["is_active"], "pricing_rules.is_active")
    parse_timestamp(rules["created_at"], "pricing_rules.created_at", False)
    if rules["id"].duplicated().any():
        raise ValueError("pricing_rules.id tekrar ediyor.")
    tables["pricing_rules"] = rules
    pricing_rule_ids = set(rules["id"].astype(int))

    # Loyalty config
    loyalty_config = tables["loyalty_tier_config"].copy()
    loyalty_config["id"] = parse_integer(
        loyalty_config["id"], "loyalty_tier_config.id", False, 1
    )
    loyalty_config["tier"] = clean_string(loyalty_config["tier"]).str.upper()
    loyalty_config["min_points"] = parse_integer(
        loyalty_config["min_points"], "loyalty_tier_config.min_points", False, 0
    )
    loyalty_config["earn_rate"] = parse_numeric(
        loyalty_config["earn_rate"], "loyalty_tier_config.earn_rate", False, 0
    )
    loyalty_config["discount_percentage"] = parse_numeric(
        loyalty_config["discount_percentage"],
        "loyalty_tier_config.discount_percentage",
        False,
        0,
    )
    loyalty_config["priority_support"] = parse_boolean(
        loyalty_config["priority_support"], "loyalty_tier_config.priority_support"
    )
    if loyalty_config["discount_percentage"].gt(100).any():
        raise ValueError("loyalty_tier_config.discount_percentage 100'ü aşamaz.")
    actual_config = loyalty_config[EXPECTED_LOYALTY_CONFIG.columns].sort_values("id").reset_index(drop=True)
    expected_config = EXPECTED_LOYALTY_CONFIG.sort_values("id").reset_index(drop=True)
    config_matches = (
        actual_config["id"].astype(int).tolist() == expected_config["id"].astype(int).tolist()
        and actual_config["tier"].astype(str).tolist() == expected_config["tier"].astype(str).tolist()
        and actual_config["min_points"].astype(int).tolist() == expected_config["min_points"].astype(int).tolist()
        and actual_config["priority_support"].astype(bool).tolist() == expected_config["priority_support"].astype(bool).tolist()
        and actual_config["description"].astype(str).tolist() == expected_config["description"].astype(str).tolist()
        and np.allclose(actual_config["earn_rate"], expected_config["earn_rate"], atol=0.001)
        and np.allclose(
            actual_config["discount_percentage"],
            expected_config["discount_percentage"],
            atol=0.001,
        )
    )
    if not config_matches:
        raise ValueError("loyalty_tier_config scripts.sql v4.3.0 seed değerleriyle uyuşmuyor.")
    tables["loyalty_tier_config"] = loyalty_config
    loyalty_tier_ids = set(loyalty_config["id"].astype(int))

    # Campaigns
    campaigns = tables["campaigns"].copy()
    if not campaigns.empty:
        campaigns["id"] = parse_integer(campaigns["id"], "campaigns.id", False, 1)
        campaigns["created_by"] = parse_integer(
            campaigns["created_by"], "campaigns.created_by", True, 1
        )
        validate_unique_nonblank(campaigns, "code", "campaigns")
        validate_unique_nonblank(campaigns, "name", "campaigns")
        campaigns["discount_type"] = clean_string(campaigns["discount_type"]).str.upper()
        if not set(campaigns["discount_type"]).issubset(ALLOWED_DISCOUNT_TYPES):
            raise ValueError("campaigns.discount_type geçersiz.")
        for column, minimum in [
            ("discount_value", 0.000001),
            ("max_discount_amount", 0),
            ("min_order_amount", 0),
            ("max_uses", 0),
            ("used_count", 0),
            ("max_uses_per_user", 1),
        ]:
            nullable = column in {"max_discount_amount", "max_uses"}
            if column in {"max_uses", "used_count", "max_uses_per_user"}:
                campaigns[column] = parse_integer(
                    campaigns[column], f"campaigns.{column}", nullable, int(minimum)
                )
            else:
                campaigns[column] = parse_numeric(
                    campaigns[column], f"campaigns.{column}", nullable, minimum
                )
        campaigns["is_active"] = parse_boolean(campaigns["is_active"], "campaigns.is_active")
        created_by_ids = set(campaigns["created_by"].dropna().astype(int))
        if not created_by_ids.issubset(user_ids):
            raise ValueError("campaigns.created_by foreign key hatası var.")
        valid_from_ts = parse_timestamp(campaigns["valid_from"], "campaigns.valid_from", False)
        valid_to_ts = parse_timestamp(campaigns["valid_to"], "campaigns.valid_to", False)
        if (valid_to_ts <= valid_from_ts).any():
            raise ValueError("campaigns.valid_to, valid_from değerinden sonra olmalıdır.")
        parse_timestamp(campaigns["created_at"], "campaigns.created_at", False)
        parse_timestamp(campaigns["updated_at"], "campaigns.updated_at", False)
        if campaigns["id"].duplicated().any():
            raise ValueError("campaigns.id tekrar ediyor.")
        limited_campaigns = campaigns["max_uses"].notna()
        if (
            campaigns.loc[limited_campaigns, "used_count"].astype(int)
            > campaigns.loc[limited_campaigns, "max_uses"].astype(int)
        ).any():
            raise ValueError("campaigns.used_count max_uses değerini aşamaz.")
    tables["campaigns"] = campaigns
    campaign_ids = set(campaigns["id"].astype(int)) if not campaigns.empty else set()

    # Loyalty accounts
    accounts = tables["loyalty_accounts"].copy()
    accounts["user_id"] = parse_integer(accounts["user_id"], "loyalty_accounts.user_id", False, 1)
    accounts["lifetime_points"] = parse_integer(
        accounts["lifetime_points"], "loyalty_accounts.lifetime_points", False, 0
    )
    accounts["tier"] = clean_string(accounts["tier"]).str.upper()
    if not set(accounts["tier"]).issubset(ALLOWED_LOYALTY_TIERS):
        raise ValueError("loyalty_accounts.tier geçersiz.")
    parse_timestamp(accounts["updated_at"], "loyalty_accounts.updated_at", False)
    account_user_ids = set(accounts["user_id"].astype(int))
    if accounts["user_id"].duplicated().any():
        raise ValueError("loyalty_accounts.user_id tekrar ediyor.")
    if account_user_ids != registered_user_ids:
        raise ValueError(
            "loyalty_accounts kapsamı bütün ve yalnızca kayıtlı kullanıcıları içermelidir."
        )
    threshold_rows = loyalty_config.sort_values("min_points")[["tier", "min_points"]].to_dict("records")
    expected_tiers = []
    for points in accounts["lifetime_points"].astype(int):
        expected_tier = "BRONZE"
        for row in threshold_rows:
            if points >= int(row["min_points"]):
                expected_tier = str(row["tier"])
        expected_tiers.append(expected_tier)
    if not accounts["tier"].reset_index(drop=True).eq(pd.Series(expected_tiers)).all():
        raise ValueError("loyalty_accounts.tier lifetime_points ile uyuşmuyor.")
    tables["loyalty_accounts"] = accounts

    # Static translations
    translations = tables["translations"].copy()
    translations["id"] = parse_integer(translations["id"], "translations.id", False, 1)
    if blank_mask(translations["trans_key"]).any():
        raise ValueError("translations.trans_key boş olamaz.")
    if blank_mask(translations["lang_code"]).any():
        raise ValueError("translations.lang_code boş olamaz.")
    if not set(clean_string(translations["lang_code"])).issubset({"tr", "en"}):
        raise ValueError("translations.lang_code yalnızca tr/en olmalıdır.")
    if translations[["trans_key", "lang_code"]].duplicated().any():
        raise ValueError("translations unique(trans_key, lang_code) ihlali var.")
    if blank_mask(translations["value"]).any():
        raise ValueError("translations.value boş olamaz.")
    parse_timestamp(translations["created_at"], "translations.created_at", False)
    parse_timestamp(translations["updated_at"], "translations.updated_at", False)
    if translations["id"].duplicated().any():
        raise ValueError("translations.id tekrar ediyor.")
    tables["translations"] = translations

    # Entity translations
    entity = tables["entity_translations"].copy()
    entity["id"] = parse_integer(entity["id"], "entity_translations.id", False, 1)
    entity["entity_id"] = parse_integer(
        entity["entity_id"], "entity_translations.entity_id", False, 1
    )
    if entity[["entity_type", "entity_id", "field_name", "lang_code"]].duplicated().any():
        raise ValueError("entity_translations unique constraint ihlali var.")
    if blank_mask(entity["value"]).any():
        raise ValueError("entity_translations.value boş olamaz.")
    source_ids = {
        "pricing_zone": zone_ids,
        "campaign": campaign_ids,
        "pricing_rule": pricing_rule_ids,
        "loyalty_tier": loyalty_tier_ids,
        "vehicle": vehicle_ids,
    }
    for row in entity.itertuples(index=False):
        entity_type = str(row.entity_type)
        if entity_type not in ALLOWED_ENTITY_FIELDS:
            raise ValueError(f"Geçersiz entity_type: {entity_type}")
        if str(row.field_name) not in ALLOWED_ENTITY_FIELDS[entity_type]:
            raise ValueError(
                f"Geçersiz entity field: {entity_type}.{row.field_name}"
            )
        if int(row.entity_id) not in source_ids[entity_type]:
            raise ValueError(
                f"Öksüz entity translation: {entity_type}/{row.entity_id}"
            )
    parse_timestamp(entity["created_at"], "entity_translations.created_at", False)
    parse_timestamp(entity["updated_at"], "entity_translations.updated_at", False)
    if entity["id"].duplicated().any():
        raise ValueError("entity_translations.id tekrar ediyor.")
    tables["entity_translations"] = entity

    for table_name, dataframe in tables.items():
        write_small_table(dataframe, table_name)
        recorder.add(
            "SQL_IMPORT",
            f"{table_name}_prepared",
            True,
            f"{len(dataframe):,} satır",
        )

    context = {
        "user_ids": user_ids,
        "guest_user_ids": guest_user_ids,
        "registered_user_ids": registered_user_ids,
        "vehicle_ids": vehicle_ids,
        "zone_ids": zone_ids,
        "active_zone_ids": active_zone_ids,
        "campaign_ids": campaign_ids,
        "vehicle_capacity": vehicles.set_index("id")["capacity"].astype(int).to_dict(),
        "vehicle_multiplier": vehicles.set_index("id")["base_price_multiplier"].astype(float).to_dict(),
        "vehicle_opening": vehicles.set_index("id")["opening_price"].astype(float).to_dict(),
        "zone_min_price": zones.set_index("id")["min_price"].astype(float).to_dict(),
        "zone_base_price": zones.set_index("id")["base_price"].astype(float).to_dict(),
    }
    return tables, context


# =====================================================
# 6. REZERVASYONLARI PARÇA PARÇA DOĞRULAMA
# =====================================================

def initialize_validation_database(database_path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(database_path)
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = OFF")
    connection.execute("PRAGMA synchronous = OFF")
    connection.execute("PRAGMA temp_store = MEMORY")
    connection.execute(
        """
        CREATE TABLE reservation_keys (
            id INTEGER PRIMARY KEY,
            booking_reference TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE status_history_keys (
            id INTEGER PRIMARY KEY,
            reservation_id INTEGER NOT NULL REFERENCES reservation_keys(id),
            status TEXT NOT NULL,
            changed_at TEXT NOT NULL
        )
        """
    )
    return connection


def prepare_reservations(
    source_path: Path,
    context: dict,
    recorder: CheckRecorder,
    connection: sqlite3.Connection,
) -> dict:
    header = pd.read_csv(source_path, nrows=0)
    assert_exact_columns(header, "reservations", recorder)
    if header.columns.tolist() != TABLE_COLUMNS["reservations"]:
        raise ValueError("reservations.csv exact SQL şemasında değil.")

    output_path = SQL_IMPORT_DIR / "reservations.csv"
    if output_path.exists():
        output_path.unlink()

    first_chunk = True
    total_rows = 0
    status_counts: dict[str, int] = {}
    guest_reservation_count = 0
    registered_reservation_count = 0

    for chunk_number, chunk in enumerate(
        pd.read_csv(
            source_path,
            chunksize=CHUNK_SIZE,
            low_memory=False,
            dtype={
                "guest_phone": "string",
            },
        ),
        start=1,
    ):
        ids = parse_integer(chunk["id"], "reservations.id", False, 1)
        user_ids = parse_integer(chunk["user_id"], "reservations.user_id", True, 1)
        pickup_zone_ids = parse_integer(
            chunk["pickup_zone_id"], "reservations.pickup_zone_id", False, 1
        )
        dropoff_zone_ids = parse_integer(
            chunk["dropoff_zone_id"], "reservations.dropoff_zone_id", False, 1
        )
        vehicle_ids = parse_integer(
            chunk["vehicle_id"], "reservations.vehicle_id", False, 1
        )
        passenger_counts = parse_integer(
            chunk["passenger_count"], "reservations.passenger_count", False, 1
        )
        campaign_ids = parse_integer(
            chunk["campaign_id"], "reservations.campaign_id", True, 1
        )

        # 06_create_reservations.py analitik izlenebilirlik için
        # misafir kullanıcının user_id değerini de tutabilir. Backend SQL
        # sözleşmesinde ise misafir rezervasyonu guest_phone üzerinden
        # temsil edilir ve user_id boş bırakılır.
        supplied_user_ids = set(
            user_ids.dropna().astype(int)
        )

        if not supplied_user_ids.issubset(
            context["user_ids"]
        ):
            unknown_user_ids = sorted(
                supplied_user_ids
                - context["user_ids"]
            )[:10]

            raise ValueError(
                f"Reservations chunk {chunk_number}: "
                "users.csv içinde bulunmayan user_id değerleri var: "
                f"{unknown_user_ids}"
            )

        if not set(pickup_zone_ids.astype(int)).issubset(context["zone_ids"]):
            raise ValueError(f"Reservations chunk {chunk_number}: pickup_zone_id FK hatası.")
        if not set(dropoff_zone_ids.astype(int)).issubset(context["zone_ids"]):
            raise ValueError(f"Reservations chunk {chunk_number}: dropoff_zone_id FK hatası.")
        if not set(vehicle_ids.astype(int)).issubset(context["vehicle_ids"]):
            raise ValueError(f"Reservations chunk {chunk_number}: vehicle_id FK hatası.")
        if not set(campaign_ids.dropna().astype(int)).issubset(context["campaign_ids"]):
            raise ValueError(f"Reservations chunk {chunk_number}: campaign_id FK hatası.")

        booking_reference = clean_string(chunk["booking_reference"])
        if booking_reference.eq("").any() or not booking_reference.map(
            lambda value: bool(BOOKING_REFERENCE_PATTERN.fullmatch(value))
        ).all():
            raise ValueError(
                f"Reservations chunk {chunk_number}: booking_reference formatı hatalı."
            )

        guest_phone = clean_string(
            chunk["guest_phone"]
        )

        guest_user_mask = user_ids.isin(
            context["guest_user_ids"]
        )

        registered_user_mask = user_ids.isin(
            context["registered_user_ids"]
        )

        # Misafir kullanıcı ID'si varsa telefon mutlaka bulunmalıdır.
        invalid_guest_rows = (
            guest_user_mask
            & guest_phone.eq("")
        )

        if invalid_guest_rows.any():
            raise ValueError(
                f"Reservations chunk {chunk_number}: "
                "misafir kullanıcıya ait rezervasyonda guest_phone eksik. "
                f"Hatalı satır={int(invalid_guest_rows.sum()):,}"
            )

        # Kayıtlı kullanıcı rezervasyonunda guest_phone bulunmamalıdır.
        invalid_registered_rows = (
            registered_user_mask
            & guest_phone.ne("")
        )

        if invalid_registered_rows.any():
            raise ValueError(
                f"Reservations chunk {chunk_number}: "
                "kayıtlı kullanıcı rezervasyonunda guest_phone dolu. "
                f"Hatalı satır={int(invalid_registered_rows.sum()):,}"
            )

        # Backend import çıktısında misafir user_id değerlerini NULL yap.
        # Kaynak data/generated/reservations.csv değiştirilmez.
        user_ids = user_ids.mask(
            guest_user_mask,
            pd.NA,
        ).astype("Int64")

        has_user = user_ids.notna()
        has_guest_phone = guest_phone.ne("")

        if not (has_user ^ has_guest_phone).all():
            invalid_identity_count = int(
                (~(has_user ^ has_guest_phone)).sum()
            )

            raise ValueError(
                f"Reservations chunk {chunk_number}: "
                "backend dönüşümünden sonra user_id ve guest_phone "
                "alanlarından tam biri dolu olmalıdır. "
                f"Hatalı satır={invalid_identity_count:,}"
            )

        if guest_phone.loc[has_guest_phone].str.len().gt(20).any():
            raise ValueError(
                f"Reservations chunk {chunk_number}: "
                "guest_phone 20 karakteri aşamaz."
            )

        # Boş metinleri SQL NULL olarak yaz.
        chunk["guest_phone"] = guest_phone.mask(
            guest_phone.eq(""),
            pd.NA,
        )

        guest_reservation_count += int(
            has_guest_phone.sum()
        )

        registered_reservation_count += int(
            has_user.sum()
        )

        if blank_mask(chunk["pickup_address"]).any() or blank_mask(chunk["dropoff_address"]).any():
            raise ValueError(f"Reservations chunk {chunk_number}: adres alanları boş olamaz.")
        validate_point_series(chunk["pickup_point"], "reservations.pickup_point")
        validate_point_series(chunk["dropoff_point"], "reservations.dropoff_point")

        numeric_columns = {
            "distance_km": 0.0,
            "base_price": 0.0,
            "surge_multiplier": 1.0,
            "discount_amount": 0.0,
            "loyalty_discount": 0.0,
            "opening_price": 0.0,
            "calculated_price": 0.0,
        }
        parsed_numeric = {
            column: parse_numeric(
                chunk[column], f"reservations.{column}", False, minimum
            )
            for column, minimum in numeric_columns.items()
        }

        if not clean_string(chunk["currency"]).eq(EXPECTED_CURRENCY).all():
            raise ValueError(f"Reservations chunk {chunk_number}: currency TRY olmalıdır.")

        statuses = clean_string(chunk["status"]).str.upper()
        if not set(statuses).issubset(ALLOWED_RESERVATION_STATUSES):
            raise ValueError(f"Reservations chunk {chunk_number}: status enum hatası.")

        scheduled_at = parse_timestamp(chunk["scheduled_time"], "reservations.scheduled_time", False)
        created_at = parse_timestamp(chunk["created_at"], "reservations.created_at", False)
        updated_at = parse_timestamp(chunk["updated_at"], "reservations.updated_at", False)
        cancelled_at = parse_timestamp(chunk["cancelled_at"], "reservations.cancelled_at", True)
        completed_at = parse_timestamp(chunk["completed_at"], "reservations.completed_at", True)

        if (updated_at < created_at).any():
            raise ValueError(f"Reservations chunk {chunk_number}: updated_at < created_at.")
        if (scheduled_at < created_at).any():
            raise ValueError(f"Reservations chunk {chunk_number}: scheduled_time < created_at.")
        if ((statuses == "COMPLETED") & completed_at.isna()).any():
            raise ValueError(f"Reservations chunk {chunk_number}: COMPLETED için completed_at zorunlu.")
        if ((statuses == "CANCELLED") & cancelled_at.isna()).any():
            raise ValueError(f"Reservations chunk {chunk_number}: CANCELLED için cancelled_at zorunlu.")
        if ((statuses != "COMPLETED") & completed_at.notna()).any():
            raise ValueError(f"Reservations chunk {chunk_number}: yalnızca COMPLETED completed_at içerebilir.")
        if ((statuses != "CANCELLED") & cancelled_at.notna()).any():
            raise ValueError(f"Reservations chunk {chunk_number}: yalnızca CANCELLED cancelled_at içerebilir.")
        if (completed_at.dropna().reset_index(drop=True) < scheduled_at.loc[completed_at.notna()].reset_index(drop=True)).any():
            raise ValueError(f"Reservations chunk {chunk_number}: completed_at scheduled_time'dan önce.")
        if (cancelled_at.dropna().reset_index(drop=True) < created_at.loc[cancelled_at.notna()].reset_index(drop=True)).any():
            raise ValueError(f"Reservations chunk {chunk_number}: cancelled_at created_at'tan önce.")

        vehicle_capacity = vehicle_ids.astype(int).map(context["vehicle_capacity"])
        if (passenger_counts.astype(int) > vehicle_capacity.astype(int)).any():
            raise ValueError(f"Reservations chunk {chunk_number}: yolcu sayısı araç kapasitesini aşıyor.")

        vehicle_opening = vehicle_ids.astype(int).map(context["vehicle_opening"]).astype(float)
        if not np.isclose(
            parsed_numeric["opening_price"], vehicle_opening, atol=0.01, rtol=0
        ).all():
            raise ValueError(f"Reservations chunk {chunk_number}: opening_price araç snapshot değeriyle uyuşmuyor.")

        pickup_zone_base = pickup_zone_ids.astype(int).map(context["zone_base_price"]).astype(float)
        minimum_base = pickup_zone_base + parsed_numeric["opening_price"]
        if (parsed_numeric["base_price"] + 0.02 < minimum_base).any():
            raise ValueError(
                f"Reservations chunk {chunk_number}: base_price pickup flag fee değerinden küçük."
            )

        vehicle_multiplier = vehicle_ids.astype(int).map(context["vehicle_multiplier"]).astype(float)
        zone_minimum = pickup_zone_ids.astype(int).map(context["zone_min_price"]).astype(float)
        expected_price = np.maximum(
            (
                parsed_numeric["base_price"]
                * vehicle_multiplier
                * parsed_numeric["surge_multiplier"]
                - parsed_numeric["discount_amount"]
                - parsed_numeric["loyalty_discount"]
            ),
            zone_minimum,
        ).round(2)
        if not np.isclose(
            parsed_numeric["calculated_price"], expected_price, atol=0.02, rtol=0
        ).all():
            difference = np.abs(parsed_numeric["calculated_price"] - expected_price)
            raise ValueError(
                f"Reservations chunk {chunk_number}: fiyat formülü uyuşmuyor. "
                f"Maksimum fark={float(difference.max()):.4f}"
            )

        chunk["id"] = ids
        chunk["user_id"] = user_ids
        chunk["pickup_zone_id"] = pickup_zone_ids
        chunk["dropoff_zone_id"] = dropoff_zone_ids
        chunk["vehicle_id"] = vehicle_ids
        chunk["passenger_count"] = passenger_counts
        chunk["campaign_id"] = campaign_ids
        for column, values in parsed_numeric.items():
            chunk[column] = values
        chunk["status"] = statuses

        try:
            connection.executemany(
                "INSERT INTO reservation_keys(id, booking_reference, status) VALUES (?, ?, ?)",
                [
                    (int(row_id), str(reference), str(status))
                    for row_id, reference, status in zip(ids, booking_reference, statuses)
                ],
            )
            connection.commit()
        except sqlite3.IntegrityError as error:
            raise ValueError(
                f"Reservations chunk {chunk_number}: id veya booking_reference tekrar ediyor."
            ) from error

        chunk[TABLE_COLUMNS["reservations"]].to_csv(
            output_path,
            index=False,
            encoding="utf-8",
            na_rep="",
            mode="w" if first_chunk else "a",
            header=first_chunk,
        )
        first_chunk = False
        total_rows += len(chunk)
        for status, count in statuses.value_counts().items():
            status_counts[str(status)] = status_counts.get(str(status), 0) + int(count)
        print(f"✅ Reservations chunk {chunk_number}: toplam {total_rows:,} satır")

    if total_rows == 0:
        raise ValueError("reservations.csv boş olamaz.")

    recorder.add(
        "RESERVATIONS",
        "reservations_validated_and_packaged",
        True,
        f"{total_rows:,} satır; guest={guest_reservation_count:,}; registered={registered_reservation_count:,}",
    )
    return {
        "row_count": total_rows,
        "status_distribution": status_counts,
        "guest_reservation_count": guest_reservation_count,
        "registered_reservation_count": registered_reservation_count,
    }


# =====================================================
# 7. STATUS HISTORY DOĞRULAMA
# =====================================================

def prepare_status_history(
    source_path: Path,
    context: dict,
    recorder: CheckRecorder,
    connection: sqlite3.Connection,
) -> dict:
    header = pd.read_csv(source_path, nrows=0)
    assert_exact_columns(header, "reservation_status_history", recorder)
    if header.columns.tolist() != TABLE_COLUMNS["reservation_status_history"]:
        raise ValueError("reservation_status_history.csv exact SQL şemasında değil.")

    output_path = SQL_IMPORT_DIR / "reservation_status_history.csv"
    if output_path.exists():
        output_path.unlink()

    first_chunk = True
    total_rows = 0
    status_counts: dict[str, int] = {}

    for chunk_number, chunk in enumerate(
        pd.read_csv(source_path, chunksize=CHUNK_SIZE, low_memory=False),
        start=1,
    ):
        ids = parse_integer(chunk["id"], "reservation_status_history.id", False, 1)
        reservation_ids = parse_integer(
            chunk["reservation_id"], "reservation_status_history.reservation_id", False, 1
        )
        changed_by = parse_integer(
            chunk["changed_by"], "reservation_status_history.changed_by", True, 1
        )
        statuses = clean_string(chunk["status"]).str.upper()
        if not set(statuses).issubset(ALLOWED_RESERVATION_STATUSES):
            raise ValueError(f"Status history chunk {chunk_number}: status enum hatası.")
        if not set(changed_by.dropna().astype(int)).issubset(context["user_ids"]):
            raise ValueError(f"Status history chunk {chunk_number}: changed_by FK hatası.")
        changed_at = parse_timestamp(
            chunk["changed_at"], "reservation_status_history.changed_at", False
        )

        chunk["id"] = ids
        chunk["reservation_id"] = reservation_ids
        chunk["changed_by"] = changed_by
        chunk["status"] = statuses

        try:
            connection.executemany(
                """
                INSERT INTO status_history_keys(id, reservation_id, status, changed_at)
                VALUES (?, ?, ?, ?)
                """,
                [
                    (int(row_id), int(reservation_id), str(status), timestamp.isoformat())
                    for row_id, reservation_id, status, timestamp in zip(
                        ids, reservation_ids, statuses, changed_at
                    )
                ],
            )
            connection.commit()
        except sqlite3.IntegrityError as error:
            raise ValueError(
                f"Status history chunk {chunk_number}: tekrar eden id veya reservation FK hatası."
            ) from error

        chunk[TABLE_COLUMNS["reservation_status_history"]].to_csv(
            output_path,
            index=False,
            encoding="utf-8",
            na_rep="",
            mode="w" if first_chunk else "a",
            header=first_chunk,
        )
        first_chunk = False
        total_rows += len(chunk)
        for status, count in statuses.value_counts().items():
            status_counts[str(status)] = status_counts.get(str(status), 0) + int(count)
        print(f"✅ Status history chunk {chunk_number}: toplam {total_rows:,} satır")

    missing_history_count = connection.execute(
        """
        SELECT COUNT(*)
        FROM reservation_keys AS r
        LEFT JOIN status_history_keys AS h ON h.reservation_id = r.id
        WHERE h.id IS NULL
        """
    ).fetchone()[0]

    latest_status_mismatch_count = connection.execute(
        """
        WITH ranked AS (
            SELECT
                reservation_id,
                status,
                ROW_NUMBER() OVER (
                    PARTITION BY reservation_id
                    ORDER BY changed_at DESC, id DESC
                ) AS row_number
            FROM status_history_keys
        )
        SELECT COUNT(*)
        FROM reservation_keys AS r
        JOIN ranked AS h
          ON h.reservation_id = r.id
         AND h.row_number = 1
        WHERE h.status <> r.status
        """
    ).fetchone()[0]

    recorder.add(
        "STATUS_HISTORY",
        "every_reservation_has_history",
        missing_history_count == 0,
        f"History kaydı olmayan reservation={missing_history_count:,}",
    )
    recorder.add(
        "STATUS_HISTORY",
        "latest_history_matches_reservation_status",
        latest_status_mismatch_count == 0,
        f"Son status uyuşmazlığı={latest_status_mismatch_count:,}",
    )
    if missing_history_count or latest_status_mismatch_count:
        raise ValueError("reservation_status_history ile reservations status değerleri uyuşmuyor.")

    recorder.add(
        "STATUS_HISTORY",
        "status_history_validated_and_packaged",
        True,
        f"{total_rows:,} satır",
    )
    return {"row_count": total_rows, "status_distribution": status_counts}


# =====================================================
# 8. BACKEND SERVICE CONTRACT'LARI
# =====================================================

def prepare_service_contracts(
    context: dict,
    recorder: CheckRecorder,
) -> dict:
    if not MODEL_SELECTION_FILE.exists():
        raise FileNotFoundError(f"Model seçim raporu bulunamadı: {MODEL_SELECTION_FILE}")
    with open(MODEL_SELECTION_FILE, "r", encoding="utf-8") as json_file:
        model_selection = json.load(json_file)

    selected_model = str(model_selection.get("recommended_model_by_test_mae", ""))
    if selected_model == "SEASONAL_NAIVE_168H":
        raise ValueError(
            "Seasonal baseline en iyi model çıktı. Backend surge contract otomatik seçilmedi. "
            "Random Forest veya XGBoost için manuel model onayı gerekir."
        )
    if selected_model not in PRICING_CONTRACT_SOURCES:
        raise ValueError(f"Desteklenmeyen seçili model: {selected_model}")

    pricing_source = PRICING_CONTRACT_SOURCES[selected_model]
    if not pricing_source.exists():
        raise FileNotFoundError(f"Seçili model pricing contract bulunamadı: {pricing_source}")
    pricing = pd.read_csv(pricing_source, low_memory=False)
    if pricing.columns.tolist() != PRICING_CONTRACT_COLUMNS:
        raise ValueError(
            "Pricing Service contract sütunları beklenen sözleşmeyle tam uyuşmuyor."
        )
    pricing["zone_id"] = parse_integer(pricing["zone_id"], "pricing_contract.zone_id", False, 1)
    if set(pricing["zone_id"].astype(int)) != context["active_zone_ids"]:
        raise ValueError("Pricing contract bütün aktif zoneları kapsamalıdır.")
    demand_hour = parse_timestamp(
        pricing["demand_hour_utc"], "pricing_contract.demand_hour_utc", False
    )
    if pricing[["zone_id", "demand_hour_utc"]].duplicated().any():
        raise ValueError("Pricing contract zone_id + demand_hour_utc tekrarı içeriyor.")
    if demand_hour.nunique() != EXPECTED_FORECAST_HOURS:
        raise ValueError("Pricing contract tam 24 saatlik forecast içermelidir.")
    expected_rows = len(context["active_zone_ids"]) * EXPECTED_FORECAST_HOURS
    if len(pricing) != expected_rows:
        raise ValueError("Pricing contract zone × saat gridi eksik.")
    surge = parse_numeric(
        pricing["recommended_surge_multiplier"],
        "pricing_contract.recommended_surge_multiplier",
        False,
        MIN_SURGE_MULTIPLIER,
    )
    if surge.gt(MAX_SURGE_MULTIPLIER).any():
        raise ValueError("Pricing contract surge üst sınırı aşıyor.")
    if parse_boolean(pricing["auto_apply"], "pricing_contract.auto_apply").any():
        raise ValueError("Pricing contract auto_apply yalnızca false olmalıdır.")
    if not parse_boolean(
        pricing["requires_pricing_service_validation"],
        "pricing_contract.requires_pricing_service_validation",
    ).all():
        raise ValueError("Pricing Service doğrulaması bütün satırlarda zorunlu olmalıdır.")
    if not clean_string(pricing["pricing_rule_merge_strategy"]).eq("MAX").all():
        raise ValueError("pricing_rule_merge_strategy yalnızca MAX olmalıdır.")

    selected_pricing_output = SERVICE_CONTRACT_DIR / "pricing_service_surge_recommendations.csv"
    pricing.to_csv(selected_pricing_output, index=False, encoding="utf-8", na_rep="")

    if not ADMIN_RECOMMENDATIONS_SOURCE.exists() or not ADMIN_TOP_RECOMMENDATIONS_SOURCE.exists():
        raise FileNotFoundError("Admin recommendation contract dosyaları eksik.")
    admin = pd.read_csv(ADMIN_RECOMMENDATIONS_SOURCE, low_memory=False)
    top_admin = pd.read_csv(ADMIN_TOP_RECOMMENDATIONS_SOURCE, low_memory=False)
    for column in ADMIN_REQUIRED_COLUMNS:
        if column not in admin.columns or column not in top_admin.columns:
            raise ValueError(f"Admin contract zorunlu sütunu eksik: {column}")
    pii_columns = FORBIDDEN_SERVICE_CONTRACT_PII.intersection(admin.columns)
    top_pii_columns = FORBIDDEN_SERVICE_CONTRACT_PII.intersection(top_admin.columns)
    if pii_columns or top_pii_columns:
        raise ValueError(
            "Admin contract doğrudan PII içeriyor: "
            f"admin={sorted(pii_columns)}, top={sorted(top_pii_columns)}"
        )
    admin["user_id"] = parse_integer(admin["user_id"], "admin.user_id", False, 1)
    top_admin["user_id"] = parse_integer(top_admin["user_id"], "top_admin.user_id", False, 1)
    if admin["user_id"].duplicated().any() or top_admin["user_id"].duplicated().any():
        raise ValueError("Admin contract user_id tekrar ediyor.")
    if not set(admin["user_id"].astype(int)).issubset(context["user_ids"]):
        raise ValueError("Admin contract user_id FK hatası var.")
    if not set(top_admin["user_id"].astype(int)).issubset(set(admin["user_id"].astype(int))):
        raise ValueError("Top admin önerileri ana admin contract'ın alt kümesi olmalıdır.")
    if parse_boolean(admin["auto_execute"], "admin.auto_execute").any():
        raise ValueError("Admin recommendation auto_execute yalnızca false olmalıdır.")
    if parse_boolean(top_admin["auto_execute"], "top_admin.auto_execute").any():
        raise ValueError("Top admin recommendation auto_execute yalnızca false olmalıdır.")
    priority = parse_numeric(admin["priority_score"], "admin.priority_score", False, 0)
    confidence = parse_numeric(
        admin["recommendation_confidence"], "admin.recommendation_confidence", False, 0
    )
    if priority.gt(100).any() or confidence.gt(1).any():
        raise ValueError("Admin priority/confidence aralıkları geçersiz.")
    if not clean_string(admin["monetary_currency"]).eq(EXPECTED_CURRENCY).all():
        raise ValueError("Admin monetary_currency TRY olmalıdır.")
    if len(top_admin) > 1_000:
        raise ValueError("Top admin recommendation dosyası 1000 satırı aşamaz.")
    top_actionable = parse_boolean(top_admin["is_actionable"], "top_admin.is_actionable")
    if not top_actionable.all():
        raise ValueError("Top admin recommendation kayıtlarının tamamı actionable olmalıdır.")
    top_queue_rank = parse_integer(top_admin["queue_rank"], "top_admin.queue_rank", False, 1)
    if not top_queue_rank.astype(int).is_monotonic_increasing:
        raise ValueError("Top admin queue_rank artan sırada olmalıdır.")

    admin.to_csv(
        SERVICE_CONTRACT_DIR / "admin_customer_recommendations.csv",
        index=False,
        encoding="utf-8",
        na_rep="",
    )
    top_admin.to_csv(
        SERVICE_CONTRACT_DIR / "admin_top_1000_customer_recommendations.csv",
        index=False,
        encoding="utf-8",
        na_rep="",
    )
    shutil.copy2(MODEL_SELECTION_FILE, SERVICE_CONTRACT_DIR / "model_selection_recommendation.json")

    recorder.add(
        "SERVICE_CONTRACT",
        "selected_pricing_model",
        True,
        selected_model,
    )
    recorder.add(
        "SERVICE_CONTRACT",
        "pricing_contract_packaged",
        True,
        f"{len(pricing):,} satır",
    )
    recorder.add(
        "SERVICE_CONTRACT",
        "admin_contracts_packaged",
        True,
        f"admin={len(admin):,}; top={len(top_admin):,}",
    )
    return {
        "selected_model": selected_model,
        "pricing_contract_row_count": len(pricing),
        "admin_contract_row_count": len(admin),
        "top_admin_contract_row_count": len(top_admin),
    }


# =====================================================
# 9. SQL SCRIPT VE DOKÜMANTASYON
# =====================================================

def copy_columns_sql(table_name: str) -> str:
    return ", ".join(TABLE_COLUMNS[table_name])


def create_import_sql() -> str:
    return f"""\\set ON_ERROR_STOP on

-- VIP Transfer backend demo/import package
-- PostgreSQL 15+ / PostGIS 3+
-- Run from the release root with psql.
-- The target schema must be empty of demo seed rows.

BEGIN;

\\copy vehicles ({copy_columns_sql('vehicles')}) FROM 'sql_import/vehicles.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');
\\copy pricing_zones ({copy_columns_sql('pricing_zones')}) FROM 'sql_import/pricing_zones.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');
\\copy pricing_rules ({copy_columns_sql('pricing_rules')}) FROM 'sql_import/pricing_rules.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');
\\copy loyalty_tier_config ({copy_columns_sql('loyalty_tier_config')}) FROM 'sql_import/loyalty_tier_config.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');
\\copy users ({copy_columns_sql('users')}) FROM 'sql_import/users.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');
\\copy campaigns ({copy_columns_sql('campaigns')}) FROM 'sql_import/campaigns.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');
\\copy translations ({copy_columns_sql('translations')}) FROM 'sql_import/translations.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');
\\copy entity_translations ({copy_columns_sql('entity_translations')}) FROM 'sql_import/entity_translations.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');

-- users insert trigger creates BRONZE accounts. Import desired values through staging + UPSERT.
CREATE TEMP TABLE staging_loyalty_accounts (
    user_id BIGINT,
    lifetime_points INT,
    tier loyalty_tier,
    updated_at TIMESTAMPTZ
) ON COMMIT DROP;

\\copy staging_loyalty_accounts ({copy_columns_sql('loyalty_accounts')}) FROM 'sql_import/loyalty_accounts.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');

INSERT INTO loyalty_accounts (user_id, lifetime_points, tier, updated_at)
SELECT user_id, lifetime_points, tier, updated_at
FROM staging_loyalty_accounts
ON CONFLICT (user_id) DO UPDATE
SET lifetime_points = EXCLUDED.lifetime_points,
    tier = EXCLUDED.tier,
    updated_at = EXCLUDED.updated_at;

\\copy reservations ({copy_columns_sql('reservations')}) FROM 'sql_import/reservations.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');
\\copy reservation_status_history ({copy_columns_sql('reservation_status_history')}) FROM 'sql_import/reservation_status_history.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', NULL '');

COMMIT;

\\i sql/02_reset_sequences.sql
\\i sql/03_post_import_validation.sql
"""


def create_sequence_reset_sql() -> str:
    tables = [
        "users", "vehicles", "pricing_zones", "pricing_rules", "campaigns",
        "loyalty_tier_config", "translations", "entity_translations",
        "reservations", "reservation_status_history",
    ]
    statements = []
    for table_name in tables:
        statements.append(
            f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), "
            f"GREATEST(COALESCE((SELECT MAX(id) FROM {table_name}), 1), 1), "
            f"EXISTS (SELECT 1 FROM {table_name}));"
        )
    statements.append(
        """
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
""".strip()
    )
    return "-- Reset sequences after explicit-ID CSV import\n\n" + "\n".join(statements) + "\n"


def create_post_import_validation_sql() -> str:
    return """-- Post-import validation. Every query should return zero rows or zero count.

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
"""


def create_readme(metadata: dict) -> str:
    return f"""# VIP Transfer Backend-Ready Package

Schema version: `{DATABASE_SCHEMA_VERSION}`  
Package version: `{PACKAGE_VERSION}`  
Selected demand model: `{metadata['selected_model']}`  
Generated at: `{metadata['generated_at_utc']}`

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
"""


# =====================================================
# 10. MANIFEST VE RELEASE
# =====================================================

def create_manifest() -> pd.DataFrame:
    rows = []
    for file_path in sorted(STAGING_RELEASE_DIR.rglob("*")):
        if not file_path.is_file() or file_path.name in {"release_manifest.csv", "checksums.sha256"}:
            continue
        relative = file_path.relative_to(STAGING_RELEASE_DIR).as_posix()
        rows.append(
            {
                "package_path": relative,
                "file_extension": file_path.suffix.lower(),
                "size_bytes": file_path.stat().st_size,
                "size_mb": round(file_path.stat().st_size / 1024 / 1024, 4),
                "row_count": count_csv_rows(file_path) if file_path.suffix.lower() == ".csv" else pd.NA,
                "sha256": calculate_sha256(file_path),
            }
        )
    manifest = pd.DataFrame(rows)
    manifest.to_csv(
        STAGING_RELEASE_DIR / "release_manifest.csv",
        index=False,
        encoding="utf-8-sig",
    )
    return manifest


def create_checksums() -> None:
    lines = []
    for file_path in sorted(STAGING_RELEASE_DIR.rglob("*")):
        if not file_path.is_file() or file_path.name == "checksums.sha256":
            continue
        relative = file_path.relative_to(STAGING_RELEASE_DIR).as_posix()
        lines.append(f"{calculate_sha256(file_path)}  {relative}")
    (STAGING_RELEASE_DIR / "checksums.sha256").write_text(
        "\n".join(lines) + "\n",
        encoding="utf-8",
    )


def rename_directory_with_retry(
    source_directory: Path,
    target_directory: Path,
    *,
    attempts: int = 10,
    delay_seconds: float = 1.0,
) -> bool:
    """
    Windows/OneDrive geçici klasör kilitlerinde yeniden adlandırmayı
    birkaç kez dener.
    """

    last_error: Exception | None = None

    for attempt in range(1, attempts + 1):
        try:
            gc.collect()

            source_directory.rename(
                target_directory
            )

            return True

        except (PermissionError, OSError) as error:
            last_error = error

            if attempt < attempts:
                print(
                    "⚠️ Klasör yeniden adlandırılamadı; "
                    f"tekrar deneniyor ({attempt}/{attempts})..."
                )

                time.sleep(
                    delay_seconds
                )

    print(
        "⚠️ Klasör yeniden adlandırma başarısız oldu:\n"
        f"{source_directory}\n"
        f"→ {target_directory}\n"
        f"Son hata: {last_error}"
    )

    return False


def copy_release_with_retry(
    source_directory: Path,
    target_directory: Path,
    *,
    attempts: int = 3,
    delay_seconds: float = 1.5,
) -> None:
    """
    OneDrive klasör yeniden adlandırmayı engellerse release'i
    dosya bazında kopyalayarak oluşturur.
    """

    last_error: Exception | None = None

    for attempt in range(1, attempts + 1):
        try:
            if target_directory.exists():
                remove_tree_safely(
                    target_directory,
                    strict=True,
                )

            shutil.copytree(
                source_directory,
                target_directory,
                copy_function=shutil.copy2,
            )

            required_release_files = [
                target_directory
                / "release_manifest.csv",
                target_directory
                / "checksums.sha256",
                target_directory
                / "release_metadata.json",
                target_directory
                / "BACKEND_IMPORT_README.md",
            ]

            missing_release_files = [
                str(file_path)
                for file_path in required_release_files
                if not file_path.exists()
            ]

            if missing_release_files:
                raise FileNotFoundError(
                    "Kopyalanan release içinde zorunlu dosyalar eksik:\n"
                    f"{missing_release_files}"
                )

            return

        except Exception as error:
            last_error = error

            if target_directory.exists():
                remove_tree_safely(
                    target_directory,
                    strict=False,
                )

            if attempt < attempts:
                print(
                    "⚠️ Release kopyalama tamamlanamadı; "
                    f"tekrar deneniyor ({attempt}/{attempts})..."
                )

                gc.collect()
                time.sleep(
                    delay_seconds
                )

    raise PermissionError(
        "Release klasörü yeniden adlandırılamadı ve "
        "dosya bazlı kopyalama da tamamlanamadı.\n"
        f"Kaynak: {source_directory}\n"
        f"Hedef: {target_directory}\n"
        f"Son hata: {last_error}"
    ) from last_error


def finalize_release() -> None:
    """
    Staging paketini final release klasörüne taşır.

    OneDrive klasör yeniden adlandırmayı kilitlerse güvenli şekilde
    dosya bazlı kopyalama yöntemine geçer.
    """

    if not STAGING_RELEASE_DIR.exists():
        raise FileNotFoundError(
            "Final release için staging klasörü bulunamadı:\n"
            f"{STAGING_RELEASE_DIR}"
        )

    if BACKUP_RELEASE_DIR.exists():
        remove_tree_safely(
            BACKUP_RELEASE_DIR,
            strict=False,
        )

    backup_created = False

    if FINAL_RELEASE_DIR.exists():
        backup_created = rename_directory_with_retry(
            FINAL_RELEASE_DIR,
            BACKUP_RELEASE_DIR,
        )

        if not backup_created:
            # Eski final klasörü yeniden adlandırılamıyorsa doğrudan
            # güvenli biçimde kaldırılır.
            remove_tree_safely(
                FINAL_RELEASE_DIR,
                strict=True,
            )

    # Manifest/checksum yazma işlemlerinden sonra OneDrive'ın dosya
    # tanıtıcılarını serbest bırakması için kısa süre bekle.
    gc.collect()
    time.sleep(1.0)

    release_moved = rename_directory_with_retry(
        STAGING_RELEASE_DIR,
        FINAL_RELEASE_DIR,
    )

    if not release_moved:
        print(
            "⚠️ OneDrive klasör taşımasını engelledi. "
            "Release dosya bazında kopyalanıyor..."
        )

        try:
            copy_release_with_retry(
                STAGING_RELEASE_DIR,
                FINAL_RELEASE_DIR,
            )

        except Exception:
            if FINAL_RELEASE_DIR.exists():
                remove_tree_safely(
                    FINAL_RELEASE_DIR,
                    strict=False,
                )

            if (
                backup_created
                and BACKUP_RELEASE_DIR.exists()
                and not FINAL_RELEASE_DIR.exists()
            ):
                restored = rename_directory_with_retry(
                    BACKUP_RELEASE_DIR,
                    FINAL_RELEASE_DIR,
                )

                if not restored:
                    print(
                        "⚠️ Önceki release backup klasöründe kaldı:\n"
                        f"{BACKUP_RELEASE_DIR}"
                    )

            raise

        # Kopyalama başarılıysa staging temizlenemese bile final paket
        # geçerlidir; temizlik hatası başarıyı bozmamalıdır.
        remove_tree_safely(
            STAGING_RELEASE_DIR,
            strict=False,
        )

    if BACKUP_RELEASE_DIR.exists():
        remove_tree_safely(
            BACKUP_RELEASE_DIR,
            strict=False,
        )


# =====================================================
# 11. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 80)
    print("20 — BACKEND-READY SQL CSV VE SERVICE CONTRACT PAKETİ")
    print("=" * 80)

    recorder = CheckRecorder()
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    if STAGING_RELEASE_DIR.exists():
        remove_tree_safely(
            STAGING_RELEASE_DIR,
            strict=True,
        )

    SQL_IMPORT_DIR.mkdir(parents=True, exist_ok=False)
    SERVICE_CONTRACT_DIR.mkdir(parents=True, exist_ok=False)
    SQL_SCRIPTS_DIR.mkdir(parents=True, exist_ok=False)
    PACKAGE_REPORT_DIR.mkdir(parents=True, exist_ok=False)

    validation_database_path = STAGING_RELEASE_DIR / ".validation.sqlite"
    connection: sqlite3.Connection | None = None

    try:
        print("\n1/8 Kaynak dosyalar çözülüyor...")
        sources = resolve_sources(recorder)
        if recorder.failed_error_count() > 0:
            raise FileNotFoundError("Zorunlu pipeline kaynakları eksik.")

        print("\n2/8 Küçük SQL tabloları doğrulanıyor...")
        tables, context = prepare_small_tables(sources, recorder)

        print("\n3/8 Rezervasyon anahtar doğrulama veritabanı hazırlanıyor...")
        connection = initialize_validation_database(validation_database_path)

        print("\n4/8 reservations.csv parça parça doğrulanıyor...")
        reservations_result = prepare_reservations(
            sources["reservations"], context, recorder, connection
        )

        print("\n5/8 reservation_status_history.csv doğrulanıyor...")
        history_result = prepare_status_history(
            sources["reservation_status_history"], context, recorder, connection
        )

        print("\n6/8 Pricing Service ve Admin contract'ları hazırlanıyor...")
        service_result = prepare_service_contracts(context, recorder)

        if recorder.failed_error_count() > 0 and FAIL_ON_VALIDATION_ERROR:
            raise ValueError("Backend paket doğrulamasında hata bulundu.")

        print("\n7/8 SQL scriptleri ve dokümantasyon oluşturuluyor...")
        (SQL_SCRIPTS_DIR / "01_import_into_empty_schema.sql").write_text(
            create_import_sql(), encoding="utf-8"
        )
        (SQL_SCRIPTS_DIR / "02_reset_sequences.sql").write_text(
            create_sequence_reset_sql(), encoding="utf-8"
        )
        (SQL_SCRIPTS_DIR / "03_post_import_validation.sql").write_text(
            create_post_import_validation_sql(), encoding="utf-8"
        )

        source_mapping_rows = []
        for table_name, source_path in sources.items():
            source_mapping_rows.append(
                {
                    "logical_name": table_name,
                    "source_path": str(source_path) if source_path else "EMPTY_TABLE_CREATED",
                    "package_path": f"sql_import/{table_name}.csv",
                    "category": "SQL_IMPORT",
                }
            )
        source_mapping_rows.extend(
            [
                {
                    "logical_name": "selected_pricing_contract",
                    "source_path": str(PRICING_CONTRACT_SOURCES[service_result["selected_model"]]),
                    "package_path": "service_contracts/pricing_service_surge_recommendations.csv",
                    "category": "SERVICE_CONTRACT",
                },
                {
                    "logical_name": "admin_recommendations",
                    "source_path": str(ADMIN_RECOMMENDATIONS_SOURCE),
                    "package_path": "service_contracts/admin_customer_recommendations.csv",
                    "category": "SERVICE_CONTRACT",
                },
                {
                    "logical_name": "admin_top_recommendations",
                    "source_path": str(ADMIN_TOP_RECOMMENDATIONS_SOURCE),
                    "package_path": "service_contracts/admin_top_1000_customer_recommendations.csv",
                    "category": "SERVICE_CONTRACT",
                },
            ]
        )
        pd.DataFrame(source_mapping_rows).to_csv(
            PACKAGE_REPORT_DIR / "source_to_output_mapping.csv",
            index=False,
            encoding="utf-8-sig",
        )

        table_counts = {
            table_name: len(dataframe)
            for table_name, dataframe in tables.items()
        }
        table_counts["reservations"] = reservations_result["row_count"]
        table_counts["reservation_status_history"] = history_result["row_count"]
        pd.DataFrame(
            [
                {"table_name": table_name, "row_count": row_count}
                for table_name, row_count in table_counts.items()
            ]
        ).to_csv(
            PACKAGE_REPORT_DIR / "sql_table_row_counts.csv",
            index=False,
            encoding="utf-8-sig",
        )

        recorder.to_dataframe().to_csv(
            PACKAGE_REPORT_DIR / "backend_package_validation_checks.csv",
            index=False,
            encoding="utf-8-sig",
        )

        metadata = {
            "release_name": RELEASE_NAME,
            "package_version": PACKAGE_VERSION,
            "database_schema_version": DATABASE_SCHEMA_VERSION,
            "generated_at_utc": generated_at,
            "validation_passed": recorder.failed_error_count() == 0,
            "failed_error_count": recorder.failed_error_count(),
            "warning_count": recorder.warning_count(),
            "selected_model": service_result["selected_model"],
            "sql_table_row_counts": table_counts,
            "reservation_status_distribution": reservations_result["status_distribution"],
            "status_history_distribution": history_result["status_distribution"],
            "guest_reservation_count": reservations_result["guest_reservation_count"],
            "registered_reservation_count": reservations_result["registered_reservation_count"],
            "pricing_contract_row_count": service_result["pricing_contract_row_count"],
            "admin_contract_row_count": service_result["admin_contract_row_count"],
            "top_admin_contract_row_count": service_result["top_admin_contract_row_count"],
            "sql_import_and_service_contracts_are_separate": True,
            "weather_enriched_reservations_used_as_sql_table": False,
            "missing_values_fabricated": False,
            "reservation_prices_recalculated": False,
            "surge_auto_apply": False,
            "admin_auto_execute": False,
            "contains_sensitive_sql_data": True,
        }
        (STAGING_RELEASE_DIR / "release_metadata.json").write_text(
            json.dumps(json_safe(metadata), ensure_ascii=False, indent=4),
            encoding="utf-8",
        )
        (STAGING_RELEASE_DIR / "BACKEND_IMPORT_README.md").write_text(
            create_readme(metadata), encoding="utf-8"
        )
        (STAGING_RELEASE_DIR / "SENSITIVE_DATA_NOTICE.txt").write_text(
            "This package contains phone numbers, optional e-mail addresses, reservation locations and operational data.\n"
            "Do not publish it in a public repository. Restrict access and remove unnecessary copies.\n",
            encoding="utf-8",
        )

        if connection is not None:
            connection.close()
            connection = None
        if validation_database_path.exists():
            validation_database_path.unlink()

        print("\n8/8 Manifest ve checksum oluşturuluyor...")
        manifest = create_manifest()
        create_checksums()
        finalize_release()

        recorder.to_dataframe().to_csv(
            EXTERNAL_VALIDATION_FILE,
            index=False,
            encoding="utf-8-sig",
        )
        external_summary = {
            **metadata,
            "release_directory": str(FINAL_RELEASE_DIR),
            "packaged_file_count": int(len(manifest)),
        }
        EXTERNAL_SUMMARY_FILE.write_text(
            json.dumps(json_safe(external_summary), ensure_ascii=False, indent=4),
            encoding="utf-8",
        )

        print("\n" + "=" * 80)
        print("BACKEND-READY PAKET HAZIR")
        print("=" * 80)
        print(f"Paket klasörü       : {FINAL_RELEASE_DIR}")
        print(f"SQL tablo sayısı    : {len(table_counts):,}")
        print(f"Reservation satırı : {reservations_result['row_count']:,}")
        print(f"Status history      : {history_result['row_count']:,}")
        print(f"Seçili talep modeli : {service_result['selected_model']}")
        print(f"Paket dosya sayısı  : {len(manifest):,}")
        print(f"Hata                 : {recorder.failed_error_count():,}")
        print(f"Uyarı                : {recorder.warning_count():,}")
        print("\n SQL import tabloları ve Data Science service contract'ları ayrıldı.")
        print("reservations.csv yalnızca data/generated/reservations.csv kaynağından alındı.")
        print("Eksik kolon veya foreign key varsayılan değerle gizlenmedi.")
        print("Rezervasyon fiyatları yeniden hesaplanmadı; mevcut formül doğrulandı.")
        print("PostGIS POINT ve POLYGON EWKT alanları doğrulandı.")
        print("Loyalty trigger çakışması için staging + UPSERT SQL'i üretildi.")
        print("reservation_status_history son durumları reservations ile karşılaştırıldı.")
        print("Sequence reset ve post-import validation SQL'leri üretildi.")
        print("SHA-256 manifestosu oluşturuldu.")

    except Exception:
        # Önce SQLite bağlantısını tamamen kapat. Windows/OneDrive
        # açık dosya tanıtıcısı varken staging klasörünü silemez.
        if connection is not None:
            connection.close()
            connection = None

        gc.collect()

        if validation_database_path.exists():
            try:
                validation_database_path.unlink()
            except OSError:
                # Birkaç milisaniyelik OneDrive kilidi olabilir;
                # remove_tree_safely yeniden deneyecek.
                pass

        recorder.to_dataframe().to_csv(
            EXTERNAL_VALIDATION_FILE,
            index=False,
            encoding="utf-8-sig",
        )
        EXTERNAL_SUMMARY_FILE.write_text(
            json.dumps(
                {
                    "release_name": RELEASE_NAME,
                    "generated_at_utc": generated_at,
                    "validation_passed": False,
                    "failed_error_count": recorder.failed_error_count(),
                    "warning_count": recorder.warning_count(),
                    "release_created": False,
                },
                ensure_ascii=False,
                indent=4,
            ),
            encoding="utf-8",
        )

        # Temizlik başarısız olursa asıl veri doğrulama hatasını
        # PermissionError ile maskeleme.
        remove_tree_safely(
            STAGING_RELEASE_DIR,
            strict=False,
        )

        raise


if __name__ == "__main__":
    main()
