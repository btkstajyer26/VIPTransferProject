import hashlib
import json
import shutil
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

try:
    import pyarrow.parquet as pq
except ImportError as error:
    raise ImportError(
        "Parquet metadata kontrolleri için pyarrow gereklidir.\n"
        "VS Code terminalinde şu komutu çalıştır:\n\n"
        "pip install pyarrow"
    ) from error


# Windows terminalinde Türkçe karakter desteği
try:
    sys.stdout.reconfigure(encoding="utf-8")
except AttributeError:
    pass


# =====================================================
# 1. GENEL AYARLAR
# =====================================================

RELEASE_NAME = "random_forest_weather_v1"

EXPECTED_DEMAND_MODEL_VERSION = (
    "random-forest-demand-weather-v1"
)

EXPECTED_SEGMENTATION_MODEL_VERSION = (
    "kmeans-rfm-v1"
)

EXPECTED_FORECAST_HORIZON_HOURS = 24

EXPECTED_CURRENCY = "TRY"

MIN_SURGE_MULTIPLIER = 1.00
MAX_SURGE_MULTIPLIER = 1.60

HASH_CHUNK_SIZE = 8 * 1024 * 1024

FAIL_ON_VALIDATION_ERROR = True

PACKAGE_VERSION = "data-science-release-v1"


# =====================================================
# 2. PROJE KLASÖRLERİ
# =====================================================

def find_project_root() -> Path:
    """
    Python dosyasının bulunduğu konuma göre proje kökünü bulur.
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

PROCESSED_DATA_DIR = (
    PROJECT_ROOT
    / "data"
    / "processed"
)

REFERENCE_DATA_DIR = (
    PROJECT_ROOT
    / "data"
    / "reference"
)

DEMAND_MODEL_DIR = (
    PROJECT_ROOT
    / "models"
    / "demand_forecast"
)

SEGMENTATION_MODEL_DIR = (
    PROJECT_ROOT
    / "models"
    / "customer_segmentation"
)

WEATHER_REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "13_add_weather_features"
)

DEMAND_REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "14_demand_prediction_with_weather"
)

SEGMENTATION_REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "09_kmeans_customer_segmentation"
)

ADMIN_REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "10_create_admin_recommendations"
)

CORE_VALIDATION_REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "12_validate_core_outputs"
)

CURRENT_REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "15_prepare_random_forest_weather_outputs"
)

DELIVERABLES_DIR = (
    PROJECT_ROOT
    / "deliverables"
)

FINAL_RELEASE_DIR = (
    DELIVERABLES_DIR
    / RELEASE_NAME
)

STAGING_RELEASE_DIR = (
    DELIVERABLES_DIR
    / f".{RELEASE_NAME}_staging"
)

CURRENT_REPORT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

DELIVERABLES_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# =====================================================
# 3. RAPOR DOSYALARI
# =====================================================

EXTERNAL_VALIDATION_FILE = (
    CURRENT_REPORT_DIR
    / "release_validation_checks.csv"
)

EXTERNAL_SUMMARY_FILE = (
    CURRENT_REPORT_DIR
    / "release_preparation_summary.json"
)


# =====================================================
# 4. PAKET DOSYASI TANIMI
# =====================================================

@dataclass(frozen=True)
class PackageItem:
    """
    Teslim paketine eklenecek bir dosyayı tanımlar.
    """

    logical_name: str
    source_path: Path
    target_relative_path: Path
    category: str
    required: bool = True


PACKAGE_ITEMS = [
    # =================================================
    # RANDOM FOREST TALEP TAHMİN ÇIKTILARI
    # =================================================

    PackageItem(
        logical_name="hourly_demand_training_dataset",
        source_path=(
            PROCESSED_DATA_DIR
            / "demand_hourly_zone_weather.parquet"
        ),
        target_relative_path=Path(
            "analytics/demand/"
            "demand_hourly_zone_weather.parquet"
        ),
        category="DEMAND_ANALYTICS",
    ),

    PackageItem(
        logical_name="random_forest_backtest_csv",
        source_path=(
            PROCESSED_DATA_DIR
            / "demand_backtest_random_forest_weather.csv"
        ),
        target_relative_path=Path(
            "analytics/demand/"
            "demand_backtest_random_forest_weather.csv"
        ),
        category="DEMAND_ANALYTICS",
    ),

    PackageItem(
        logical_name="random_forest_backtest_parquet",
        source_path=(
            PROCESSED_DATA_DIR
            / "demand_backtest_random_forest_weather.parquet"
        ),
        target_relative_path=Path(
            "analytics/demand/"
            "demand_backtest_random_forest_weather.parquet"
        ),
        category="DEMAND_ANALYTICS",
    ),

    PackageItem(
        logical_name="random_forest_forecast_csv",
        source_path=(
            PROCESSED_DATA_DIR
            / "demand_forecast_random_forest_weather.csv"
        ),
        target_relative_path=Path(
            "analytics/demand/"
            "demand_forecast_random_forest_weather.csv"
        ),
        category="DEMAND_FORECAST",
    ),

    PackageItem(
        logical_name="random_forest_forecast_parquet",
        source_path=(
            PROCESSED_DATA_DIR
            / "demand_forecast_random_forest_weather.parquet"
        ),
        target_relative_path=Path(
            "analytics/demand/"
            "demand_forecast_random_forest_weather.parquet"
        ),
        category="DEMAND_FORECAST",
    ),

    # Backend/Pricing Service veri sözleşmesi
    PackageItem(
        logical_name="pricing_service_surge_contract",
        source_path=(
            PROCESSED_DATA_DIR
            / "pricing_service_surge_random_forest_weather.csv"
        ),
        target_relative_path=Path(
            "backend_contract/"
            "pricing_service_surge_recommendations.csv"
        ),
        category="BACKEND_CONTRACT",
    ),

    # =================================================
    # MÜŞTERİ ANALİTİĞİ VE ADMIN SÖZLEŞMESİ
    # =================================================

    PackageItem(
        logical_name="rfm_customer_segments_csv",
        source_path=(
            PROCESSED_DATA_DIR
            / "rfm_customer_segments.csv"
        ),
        target_relative_path=Path(
            "analytics/customers/"
            "rfm_customer_segments.csv"
        ),
        category="CUSTOMER_ANALYTICS",
    ),

    PackageItem(
        logical_name="rfm_customer_segments_parquet",
        source_path=(
            PROCESSED_DATA_DIR
            / "rfm_customer_segments.parquet"
        ),
        target_relative_path=Path(
            "analytics/customers/"
            "rfm_customer_segments.parquet"
        ),
        category="CUSTOMER_ANALYTICS",
    ),

    PackageItem(
        logical_name="customer_kmeans_segments_csv",
        source_path=(
            PROCESSED_DATA_DIR
            / "customer_kmeans_segments.csv"
        ),
        target_relative_path=Path(
            "analytics/customers/"
            "customer_kmeans_segments.csv"
        ),
        category="CUSTOMER_ANALYTICS",
    ),

    PackageItem(
        logical_name="customer_kmeans_segments_parquet",
        source_path=(
            PROCESSED_DATA_DIR
            / "customer_kmeans_segments.parquet"
        ),
        target_relative_path=Path(
            "analytics/customers/"
            "customer_kmeans_segments.parquet"
        ),
        category="CUSTOMER_ANALYTICS",
    ),

    PackageItem(
        logical_name="kmeans_cluster_summary",
        source_path=(
            PROCESSED_DATA_DIR
            / "kmeans_cluster_summary.csv"
        ),
        target_relative_path=Path(
            "analytics/customers/"
            "kmeans_cluster_summary.csv"
        ),
        category="CUSTOMER_ANALYTICS",
    ),

    PackageItem(
        logical_name="admin_customer_recommendations_csv",
        source_path=(
            PROCESSED_DATA_DIR
            / "admin_customer_recommendations.csv"
        ),
        target_relative_path=Path(
            "backend_contract/"
            "admin_customer_recommendations.csv"
        ),
        category="BACKEND_CONTRACT",
    ),

    PackageItem(
        logical_name="admin_customer_recommendations_parquet",
        source_path=(
            PROCESSED_DATA_DIR
            / "admin_customer_recommendations.parquet"
        ),
        target_relative_path=Path(
            "analytics/customers/"
            "admin_customer_recommendations.parquet"
        ),
        category="CUSTOMER_ANALYTICS",
    ),

    PackageItem(
        logical_name="admin_top_recommendations",
        source_path=(
            PROCESSED_DATA_DIR
            / "admin_top_1000_customer_recommendations.csv"
        ),
        target_relative_path=Path(
            "backend_contract/"
            "admin_top_1000_customer_recommendations.csv"
        ),
        category="BACKEND_CONTRACT",
    ),

    # =================================================
    # REFERANS DOSYALARI
    # =================================================

    PackageItem(
        logical_name="weather_reference_csv",
        source_path=(
            REFERENCE_DATA_DIR
            / "weather_hourly_istanbul_2025.csv"
        ),
        target_relative_path=Path(
            "reference/weather/"
            "weather_hourly_istanbul_2025.csv"
        ),
        category="REFERENCE_DATA",
    ),

    PackageItem(
        logical_name="weather_reference_parquet",
        source_path=(
            REFERENCE_DATA_DIR
            / "weather_hourly_istanbul_2025.parquet"
        ),
        target_relative_path=Path(
            "reference/weather/"
            "weather_hourly_istanbul_2025.parquet"
        ),
        category="REFERENCE_DATA",
    ),

    PackageItem(
        logical_name="istanbul_zone_catalog",
        source_path=(
            REFERENCE_DATA_DIR
            / "istanbul_zone_catalog.csv"
        ),
        target_relative_path=Path(
            "reference/zones/"
            "istanbul_zone_catalog.csv"
        ),
        category="REFERENCE_DATA",
    ),

    PackageItem(
        logical_name="source_zone_mapping",
        source_path=(
            REFERENCE_DATA_DIR
            / "zone_mapping_istanbul.csv"
        ),
        target_relative_path=Path(
            "reference/zones/"
            "zone_mapping_istanbul.csv"
        ),
        category="REFERENCE_DATA",
    ),

    PackageItem(
        logical_name="pricing_zones_snapshot",
        source_path=(
            REFERENCE_DATA_DIR
            / "pricing_zones.csv"
        ),
        target_relative_path=Path(
            "reference/pricing/"
            "pricing_zones.csv"
        ),
        category="REFERENCE_DATA",
    ),

    PackageItem(
        logical_name="pricing_rules_snapshot",
        source_path=(
            REFERENCE_DATA_DIR
            / "pricing_rules.csv"
        ),
        target_relative_path=Path(
            "reference/pricing/"
            "pricing_rules.csv"
        ),
        category="REFERENCE_DATA",
    ),

    PackageItem(
        logical_name="route_pricing_matrix",
        source_path=(
            REFERENCE_DATA_DIR
            / "route_pricing_matrix.csv"
        ),
        target_relative_path=Path(
            "reference/pricing/"
            "route_pricing_matrix.csv"
        ),
        category="REFERENCE_DATA",
    ),

    PackageItem(
        logical_name="loyalty_tier_config_snapshot",
        source_path=(
            REFERENCE_DATA_DIR
            / "loyalty_tier_config.csv"
        ),
        target_relative_path=Path(
            "reference/customers/"
            "loyalty_tier_config.csv"
        ),
        category="REFERENCE_DATA",
    ),

    PackageItem(
        logical_name="zone_demand_thresholds",
        source_path=(
            DEMAND_REPORT_DIR
            / "zone_demand_thresholds.csv"
        ),
        target_relative_path=Path(
            "reference/demand/"
            "zone_demand_thresholds.csv"
        ),
        category="REFERENCE_DATA",
    ),

    # =================================================
    # MODEL DOSYALARI
    # =================================================

    PackageItem(
        logical_name="random_forest_model_bundle",
        source_path=(
            DEMAND_MODEL_DIR
            / "random_forest_weather_bundle.joblib"
        ),
        target_relative_path=Path(
            "models/demand_forecast/"
            "random_forest_weather_bundle.joblib"
        ),
        category="MODEL",
    ),

    PackageItem(
        logical_name="random_forest_model_metadata",
        source_path=(
            DEMAND_MODEL_DIR
            / "random_forest_weather_metadata.json"
        ),
        target_relative_path=Path(
            "models/demand_forecast/"
            "random_forest_weather_metadata.json"
        ),
        category="MODEL",
    ),

    PackageItem(
        logical_name="kmeans_model_bundle",
        source_path=(
            SEGMENTATION_MODEL_DIR
            / "kmeans_customer_segmentation_bundle.joblib"
        ),
        target_relative_path=Path(
            "models/customer_segmentation/"
            "kmeans_customer_segmentation_bundle.joblib"
        ),
        category="MODEL",
    ),

    PackageItem(
        logical_name="kmeans_model_metadata",
        source_path=(
            SEGMENTATION_MODEL_DIR
            / "preprocessing_metadata.json"
        ),
        target_relative_path=Path(
            "models/customer_segmentation/"
            "preprocessing_metadata.json"
        ),
        category="MODEL",
    ),

    # =================================================
    # MODEL VE VERİ KALİTESİ RAPORLARI
    # =================================================

    PackageItem(
        logical_name="weather_feature_summary",
        source_path=(
            WEATHER_REPORT_DIR
            / "weather_feature_summary.json"
        ),
        target_relative_path=Path(
            "reports/weather/"
            "weather_feature_summary.json"
        ),
        category="REPORT",
    ),

    PackageItem(
        logical_name="weather_quality_metrics",
        source_path=(
            WEATHER_REPORT_DIR
            / "weather_quality_metrics.csv"
        ),
        target_relative_path=Path(
            "reports/weather/"
            "weather_quality_metrics.csv"
        ),
        category="REPORT",
    ),

    PackageItem(
        logical_name="random_forest_model_metrics",
        source_path=(
            DEMAND_REPORT_DIR
            / "random_forest_model_metrics.json"
        ),
        target_relative_path=Path(
            "reports/demand/"
            "random_forest_model_metrics.json"
        ),
        category="REPORT",
    ),

    PackageItem(
        logical_name="model_metrics_comparison",
        source_path=(
            DEMAND_REPORT_DIR
            / "model_metrics_comparison.csv"
        ),
        target_relative_path=Path(
            "reports/demand/"
            "model_metrics_comparison.csv"
        ),
        category="REPORT",
    ),

    PackageItem(
        logical_name="random_forest_feature_importance",
        source_path=(
            DEMAND_REPORT_DIR
            / "random_forest_feature_importance.csv"
        ),
        target_relative_path=Path(
            "reports/demand/"
            "random_forest_feature_importance.csv"
        ),
        category="REPORT",
    ),

    PackageItem(
        logical_name="zone_backtest_metrics",
        source_path=(
            DEMAND_REPORT_DIR
            / "zone_backtest_metrics.csv"
        ),
        target_relative_path=Path(
            "reports/demand/"
            "zone_backtest_metrics.csv"
        ),
        category="REPORT",
    ),

    PackageItem(
        logical_name="hourly_demand_dataset_summary",
        source_path=(
            DEMAND_REPORT_DIR
            / "hourly_demand_dataset_summary.json"
        ),
        target_relative_path=Path(
            "reports/demand/"
            "hourly_demand_dataset_summary.json"
        ),
        category="REPORT",
    ),

    PackageItem(
        logical_name="future_forecast_summary",
        source_path=(
            DEMAND_REPORT_DIR
            / "future_forecast_summary.json"
        ),
        target_relative_path=Path(
            "reports/demand/"
            "future_forecast_summary.json"
        ),
        category="REPORT",
    ),

    PackageItem(
        logical_name="kmeans_model_metrics",
        source_path=(
            SEGMENTATION_REPORT_DIR
            / "final_model_metrics.json"
        ),
        target_relative_path=Path(
            "reports/customer_segmentation/"
            "final_model_metrics.json"
        ),
        category="REPORT",
    ),

    PackageItem(
        logical_name="admin_recommendation_summary",
        source_path=(
            ADMIN_REPORT_DIR
            / "admin_recommendations_summary.json"
        ),
        target_relative_path=Path(
            "reports/admin/"
            "admin_recommendations_summary.json"
        ),
        category="REPORT",
    ),

    PackageItem(
        logical_name="core_output_validation_summary",
        source_path=(
            CORE_VALIDATION_REPORT_DIR
            / "core_output_validation_summary.json"
        ),
        target_relative_path=Path(
            "reports/core_validation/"
            "core_output_validation_summary.json"
        ),
        category="REPORT",
    ),
]


# =====================================================
# 5. DOĞRULAMA KAYDEDİCİ
# =====================================================

class CheckRecorder:
    """
    Bütün paket doğrulama sonuçlarını tek tabloda toplar.
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
        """
        Yeni bir doğrulama sonucu ekler.
        """

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
        """
        Kontrolleri DataFrame olarak döndürür.
        """

        return pd.DataFrame(self.rows)

    def failed_error_count(self) -> int:
        """
        Başarısız ERROR sayısını döndürür.
        """

        return sum(
            1
            for row in self.rows
            if (
                not row["passed"]
                and row["severity"] == "ERROR"
            )
        )

    def warning_count(self) -> int:
        """
        Başarısız WARNING sayısını döndürür.
        """

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

def read_json(file_path: Path) -> dict:
    """
    JSON dosyasını okur.
    """

    with open(
        file_path,
        "r",
        encoding="utf-8",
    ) as json_file:
        return json.load(json_file)


def calculate_sha256(file_path: Path) -> str:
    """
    Dosyanın SHA-256 hash değerini hesaplar.
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
    CSV boolean alanlarını güvenli biçimde dönüştürür.
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
            f"{column_name} alanında geçersiz boolean "
            f"değerler bulundu: {invalid_values}"
        )

    return converted.astype(bool)


def validate_columns(
    dataframe: pd.DataFrame,
    required_columns: list[str],
    dataframe_name: str,
) -> None:
    """
    Gerekli sütunların bulunmasını doğrular.
    """

    missing_columns = [
        column
        for column in required_columns
        if column not in dataframe.columns
    ]

    if missing_columns:
        raise ValueError(
            f"{dataframe_name} içinde gerekli sütunlar eksik:\n"
            f"{missing_columns}"
        )


def count_csv_rows(file_path: Path) -> int:
    """
    CSV satır sayısını belleğe almadan yaklaşık olarak hesaplar.

    Pipeline çıktılarında alan içi satır sonu kullanılmadığı için
    fiziksel satır sayısı güvenle kullanılabilir.
    """

    with open(
        file_path,
        "rb",
    ) as file_handle:
        line_count = sum(
            1
            for _ in file_handle
        )

    return max(
        line_count - 1,
        0,
    )


def get_file_row_count(file_path: Path):
    """
    CSV veya Parquet dosyasının satır sayısını döndürür.
    """

    suffix = file_path.suffix.lower()

    if suffix == ".csv":
        return count_csv_rows(
            file_path
        )

    if suffix == ".parquet":
        return int(
            pq.ParquetFile(
                file_path
            )
            .metadata
            .num_rows
        )

    return pd.NA


def save_validation_checks(
    recorder: CheckRecorder,
) -> None:
    """
    Paket oluşturulmasa bile kontrolleri rapor klasörüne kaydeder.
    """

    recorder.to_dataframe().to_csv(
        EXTERNAL_VALIDATION_FILE,
        index=False,
        encoding="utf-8-sig",
    )


# =====================================================
# 7. KAYNAK DOSYA KONTROLLERİ
# =====================================================

def validate_package_sources(
    recorder: CheckRecorder,
) -> None:
    """
    Bütün gerekli paket kaynaklarının varlığını kontrol eder.
    """

    target_paths = [
        item.target_relative_path.as_posix()
        for item in PACKAGE_ITEMS
    ]

    duplicate_targets = {
        target
        for target in target_paths
        if target_paths.count(target) > 1
    }

    recorder.add(
        category="PACKAGE_STRUCTURE",
        check_name="target_paths_are_unique",
        passed=not duplicate_targets,
        details=(
            "Tekrar eden hedef yolu yok."
            if not duplicate_targets
            else (
                "Tekrar eden hedef yolları: "
                f"{sorted(duplicate_targets)}"
            )
        ),
    )

    for item in PACKAGE_ITEMS:
        exists = item.source_path.exists()

        recorder.add(
            category="SOURCE_FILES",
            check_name=(
                f"{item.logical_name}_exists"
            ),
            passed=exists,
            details=str(
                item.source_path
            ),
            severity=(
                "ERROR"
                if item.required
                else "WARNING"
            ),
        )

    forbidden_target_names = {
        "reservations.csv",
        "users.csv",
        "vehicles.csv",
    }

    package_target_names = {
        item.target_relative_path.name
        for item in PACKAGE_ITEMS
    }

    forbidden_targets_found = (
        forbidden_target_names
        .intersection(
            package_target_names
        )
    )

    recorder.add(
        category="PACKAGE_STRUCTURE",
        check_name=(
            "sql_core_tables_not_packaged_as_ds_outputs"
        ),
        passed=not forbidden_targets_found,
        details=(
            "Veri bilimi paketi users/reservations/vehicles "
            "SQL import dosyalarını içermez."
            if not forbidden_targets_found
            else (
                "Yanlış SQL ana tablo hedefleri bulundu: "
                f"{sorted(forbidden_targets_found)}"
            )
        ),
    )

    forbidden_source_name = (
        "reservations_istanbul_weather.csv"
    )

    forbidden_source_used = any(
        item.source_path.name
        == forbidden_source_name
        for item in PACKAGE_ITEMS
    )

    recorder.add(
        category="PACKAGE_STRUCTURE",
        check_name=(
            "weather_enriched_reservations_not_renamed_to_sql_table"
        ),
        passed=not forbidden_source_used,
        details=(
            "Hava durumlu analitik rezervasyon verisi "
            "reservations.csv adıyla paketlenmiyor."
        ),
    )


# =====================================================
# 8. FORECAST VE PRICING CONTRACT DOĞRULAMASI
# =====================================================

def validate_demand_outputs(
    recorder: CheckRecorder,
) -> dict:
    """
    Gelecek tahmin ve Pricing Service sözleşmesini doğrular.
    """

    forecast_file = (
        PROCESSED_DATA_DIR
        / "demand_forecast_random_forest_weather.csv"
    )

    pricing_file = (
        PROCESSED_DATA_DIR
        / "pricing_service_surge_random_forest_weather.csv"
    )

    zone_catalog_file = (
        REFERENCE_DATA_DIR
        / "istanbul_zone_catalog.csv"
    )

    forecast_required_columns = [
        "zone_id",
        "zone_name",
        "zone_category",
        "demand_hour_utc",
        "demand_hour_local",
        "forecast_horizon_hour",
        "predicted_demand",
        "predicted_demand_rounded",
        "prediction_lower_80",
        "prediction_upper_80",
        "predicted_demand_level",
        "weather_condition",
        "weather_severity_score",
        "weather_data_source",
        "weather_is_synthetic",
        "recommended_surge_multiplier",
        "surge_reason",
        "pricing_rule_merge_strategy",
        "requires_pricing_service_validation",
        "auto_apply",
        "forecast_model_version",
        "forecast_generated_at_utc",
    ]

    pricing_required_columns = [
        "zone_id",
        "zone_name",
        "zone_category",
        "demand_hour_utc",
        "demand_hour_local",
        "forecast_horizon_hour",
        "predicted_demand",
        "predicted_demand_rounded",
        "prediction_lower_80",
        "prediction_upper_80",
        "predicted_demand_level",
        "weather_condition",
        "weather_severity_score",
        "weather_data_source",
        "weather_is_synthetic",
        "recommended_surge_multiplier",
        "surge_reason",
        "pricing_rule_merge_strategy",
        "requires_pricing_service_validation",
        "auto_apply",
        "forecast_model_version",
        "forecast_generated_at_utc",
    ]

    forecast_df = pd.read_csv(
        forecast_file,
        low_memory=False,
    )

    pricing_df = pd.read_csv(
        pricing_file,
        low_memory=False,
    )

    zone_catalog_df = pd.read_csv(
        zone_catalog_file,
        low_memory=False,
    )

    validate_columns(
        forecast_df,
        forecast_required_columns,
        forecast_file.name,
    )

    validate_columns(
        pricing_df,
        pricing_required_columns,
        pricing_file.name,
    )

    validate_columns(
        zone_catalog_df,
        [
            "zone_id",
            "is_active",
        ],
        zone_catalog_file.name,
    )

    forecast_df["zone_id"] = pd.to_numeric(
        forecast_df["zone_id"],
        errors="raise",
    ).astype("int64")

    pricing_df["zone_id"] = pd.to_numeric(
        pricing_df["zone_id"],
        errors="raise",
    ).astype("int64")

    zone_catalog_df["zone_id"] = pd.to_numeric(
        zone_catalog_df["zone_id"],
        errors="raise",
    ).astype("int64")

    zone_catalog_df["is_active"] = (
        convert_boolean(
            zone_catalog_df["is_active"],
            "zone_catalog.is_active",
        )
    )

    forecast_df["demand_hour_utc"] = (
        pd.to_datetime(
            forecast_df["demand_hour_utc"],
            errors="coerce",
            utc=True,
        )
    )

    pricing_df["demand_hour_utc"] = (
        pd.to_datetime(
            pricing_df["demand_hour_utc"],
            errors="coerce",
            utc=True,
        )
    )

    invalid_forecast_time_count = int(
        forecast_df[
            "demand_hour_utc"
        ].isna().sum()
    )

    invalid_pricing_time_count = int(
        pricing_df[
            "demand_hour_utc"
        ].isna().sum()
    )

    recorder.add(
        category="DEMAND_FORECAST",
        check_name="forecast_timestamps_valid",
        passed=(
            invalid_forecast_time_count == 0
            and invalid_pricing_time_count == 0
        ),
        details=(
            "Forecast geçersiz saat="
            f"{invalid_forecast_time_count}; "
            "pricing geçersiz saat="
            f"{invalid_pricing_time_count}"
        ),
    )

    forecast_duplicate_count = int(
        forecast_df[
            [
                "zone_id",
                "demand_hour_utc",
            ]
        ].duplicated().sum()
    )

    pricing_duplicate_count = int(
        pricing_df[
            [
                "zone_id",
                "demand_hour_utc",
            ]
        ].duplicated().sum()
    )

    recorder.add(
        category="DEMAND_FORECAST",
        check_name="zone_hour_keys_are_unique",
        passed=(
            forecast_duplicate_count == 0
            and pricing_duplicate_count == 0
        ),
        details=(
            f"Forecast tekrar={forecast_duplicate_count}; "
            f"pricing tekrar={pricing_duplicate_count}"
        ),
    )

    forecast_hour_count = int(
        forecast_df[
            "demand_hour_utc"
        ].nunique()
    )

    recorder.add(
        category="DEMAND_FORECAST",
        check_name="forecast_horizon_is_24_hours",
        passed=(
            forecast_hour_count
            == EXPECTED_FORECAST_HORIZON_HOURS
        ),
        details=(
            f"Bulunan tahmin saati={forecast_hour_count}; "
            f"beklenen={EXPECTED_FORECAST_HORIZON_HOURS}"
        ),
    )

    active_zone_ids = set(
        zone_catalog_df.loc[
            zone_catalog_df["is_active"],
            "zone_id",
        ].astype(int)
    )

    forecast_zone_ids = set(
        forecast_df[
            "zone_id"
        ].astype(int)
    )

    recorder.add(
        category="DEMAND_FORECAST",
        check_name="forecast_covers_all_active_zones",
        passed=(
            forecast_zone_ids
            == active_zone_ids
        ),
        details=(
            f"Forecast zone={len(forecast_zone_ids)}; "
            f"aktif katalog zone={len(active_zone_ids)}"
        ),
    )

    expected_forecast_rows = (
        len(active_zone_ids)
        * EXPECTED_FORECAST_HORIZON_HOURS
    )

    recorder.add(
        category="DEMAND_FORECAST",
        check_name="forecast_grid_is_complete",
        passed=(
            len(forecast_df)
            == expected_forecast_rows
        ),
        details=(
            f"Forecast satırı={len(forecast_df):,}; "
            f"beklenen={expected_forecast_rows:,}"
        ),
    )

    forecast_df["predicted_demand"] = (
        pd.to_numeric(
            forecast_df["predicted_demand"],
            errors="coerce",
        )
    )

    forecast_df["prediction_lower_80"] = (
        pd.to_numeric(
            forecast_df["prediction_lower_80"],
            errors="coerce",
        )
    )

    forecast_df["prediction_upper_80"] = (
        pd.to_numeric(
            forecast_df["prediction_upper_80"],
            errors="coerce",
        )
    )

    forecast_df[
        "recommended_surge_multiplier"
    ] = pd.to_numeric(
        forecast_df[
            "recommended_surge_multiplier"
        ],
        errors="coerce",
    )

    prediction_values_valid = (
        forecast_df[
            [
                "predicted_demand",
                "prediction_lower_80",
                "prediction_upper_80",
                "recommended_surge_multiplier",
            ]
        ]
        .notna()
        .all()
        .all()
        and (
            forecast_df[
                "predicted_demand"
            ] >= 0
        ).all()
    )

    recorder.add(
        category="DEMAND_FORECAST",
        check_name="forecast_numeric_values_valid",
        passed=prediction_values_valid,
        details=(
            "Tahmin, aralık ve surge değerleri "
            "boş olmamalı; talep negatif olamaz."
        ),
    )

    prediction_interval_valid = (
        (
            forecast_df[
                "prediction_lower_80"
            ]
            <= forecast_df[
                "predicted_demand"
            ]
        )
        & (
            forecast_df[
                "predicted_demand"
            ]
            <= forecast_df[
                "prediction_upper_80"
            ]
        )
    ).all()

    recorder.add(
        category="DEMAND_FORECAST",
        check_name="prediction_intervals_contain_prediction",
        passed=prediction_interval_valid,
        details=(
            "lower_80 <= predicted_demand <= upper_80 "
            "olmalıdır."
        ),
    )

    surge_range_valid = forecast_df[
        "recommended_surge_multiplier"
    ].between(
        MIN_SURGE_MULTIPLIER,
        MAX_SURGE_MULTIPLIER,
    ).all()

    recorder.add(
        category="PRICING_CONTRACT",
        check_name="surge_multiplier_range",
        passed=surge_range_valid,
        details=(
            f"Surge aralığı "
            f"{MIN_SURGE_MULTIPLIER:.2f}–"
            f"{MAX_SURGE_MULTIPLIER:.2f}"
        ),
    )

    forecast_auto_apply = convert_boolean(
        forecast_df["auto_apply"],
        "forecast.auto_apply",
    )

    pricing_auto_apply = convert_boolean(
        pricing_df["auto_apply"],
        "pricing.auto_apply",
    )

    recorder.add(
        category="PRICING_CONTRACT",
        check_name="surge_is_not_automatically_applied",
        passed=(
            not forecast_auto_apply.any()
            and not pricing_auto_apply.any()
        ),
        details=(
            "Data Science çıktısında auto_apply "
            "her zaman false olmalıdır."
        ),
    )

    forecast_validation_required = (
        convert_boolean(
            forecast_df[
                "requires_pricing_service_validation"
            ],
            (
                "forecast."
                "requires_pricing_service_validation"
            ),
        )
    )

    pricing_validation_required = (
        convert_boolean(
            pricing_df[
                "requires_pricing_service_validation"
            ],
            (
                "pricing."
                "requires_pricing_service_validation"
            ),
        )
    )

    recorder.add(
        category="PRICING_CONTRACT",
        check_name="pricing_service_validation_required",
        passed=(
            forecast_validation_required.all()
            and pricing_validation_required.all()
        ),
        details=(
            "Surge önerileri Pricing Service "
            "tarafından doğrulanmalıdır."
        ),
    )

    merge_strategy_valid = (
        forecast_df[
            "pricing_rule_merge_strategy"
        ]
        .astype("string")
        .eq("MAX")
        .all()
        and pricing_df[
            "pricing_rule_merge_strategy"
        ]
        .astype("string")
        .eq("MAX")
        .all()
    )

    recorder.add(
        category="PRICING_CONTRACT",
        check_name="pricing_rule_merge_strategy_is_max",
        passed=merge_strategy_valid,
        details=(
            "Aktif pricing rule ve model önerisi "
            "MAX stratejisiyle birleştirilmelidir."
        ),
    )

    model_version_valid = forecast_df[
        "forecast_model_version"
    ].astype("string").eq(
        EXPECTED_DEMAND_MODEL_VERSION
    ).all()

    recorder.add(
        category="DEMAND_FORECAST",
        check_name="forecast_model_version_valid",
        passed=model_version_valid,
        details=(
            "Beklenen model sürümü: "
            f"{EXPECTED_DEMAND_MODEL_VERSION}"
        ),
    )

    forbidden_future_columns = {
        "demand_count",
        "actual_demand",
        "avg_price",
        "avg_distance_km",
        "cancel_rate",
        "no_show_rate",
    }

    leaked_columns = (
        forbidden_future_columns
        .intersection(
            forecast_df.columns
        )
    )

    recorder.add(
        category="DEMAND_FORECAST",
        check_name="future_forecast_has_no_actual_target_leakage",
        passed=not leaked_columns,
        details=(
            "Gelecek tahmin çıktısında gerçek hedef/leakage "
            "alanları bulunmamalıdır."
            if not leaked_columns
            else (
                "Leakage alanları: "
                f"{sorted(leaked_columns)}"
            )
        ),
    )

    forecast_contract = forecast_df[
        [
            "zone_id",
            "demand_hour_utc",
            "predicted_demand",
            "recommended_surge_multiplier",
        ]
    ].copy()

    pricing_contract = pricing_df[
        [
            "zone_id",
            "demand_hour_utc",
            "predicted_demand",
            "recommended_surge_multiplier",
        ]
    ].copy()

    contract_comparison = forecast_contract.merge(
        pricing_contract,
        on=[
            "zone_id",
            "demand_hour_utc",
        ],
        how="outer",
        suffixes=(
            "_forecast",
            "_pricing",
        ),
        indicator=True,
        validate="one_to_one",
    )

    contract_keys_valid = (
        contract_comparison[
            "_merge"
        ].eq("both").all()
    )

    demand_values_match = np.isclose(
        contract_comparison[
            "predicted_demand_forecast"
        ],
        contract_comparison[
            "predicted_demand_pricing"
        ],
        atol=0.001,
        rtol=0,
        equal_nan=False,
    ).all()

    surge_values_match = np.isclose(
        contract_comparison[
            "recommended_surge_multiplier_forecast"
        ],
        contract_comparison[
            "recommended_surge_multiplier_pricing"
        ],
        atol=0.001,
        rtol=0,
        equal_nan=False,
    ).all()

    recorder.add(
        category="PRICING_CONTRACT",
        check_name="pricing_contract_matches_forecast",
        passed=(
            contract_keys_valid
            and demand_values_match
            and surge_values_match
        ),
        details=(
            "Pricing Service sözleşmesindeki zone-saat, "
            "tahmin ve surge değerleri ana forecast ile aynı olmalıdır."
        ),
    )

    synthetic_weather_used = bool(
        pd.to_numeric(
            forecast_df[
                "weather_is_synthetic"
            ],
            errors="coerce",
        )
        .fillna(0)
        .astype(bool)
        .any()
    )

    recorder.add(
        category="WEATHER",
        check_name="future_weather_is_observed_or_external_forecast",
        passed=not synthetic_weather_used,
        details=(
            "Gerçek/harici hava tahmini kullanıldı."
            if not synthetic_weather_used
            else (
                "Sentetik veya haftalık hava senaryosu kullanıldı. "
                "Bu durum staj simülasyonu için kabul edilebilir."
            )
        ),
        severity="WARNING",
    )

    return {
        "forecast_row_count": int(
            len(forecast_df)
        ),
        "forecast_zone_count": int(
            forecast_df[
                "zone_id"
            ].nunique()
        ),
        "forecast_hour_count": int(
            forecast_hour_count
        ),
        "pricing_contract_row_count": int(
            len(pricing_df)
        ),
        "future_weather_is_synthetic": (
            synthetic_weather_used
        ),
        "forecast_start_utc": str(
            forecast_df[
                "demand_hour_utc"
            ].min()
        ),
        "forecast_end_utc": str(
            forecast_df[
                "demand_hour_utc"
            ].max()
        ),
    }


# =====================================================
# 9. MÜŞTERİ ÇIKTILARINI DOĞRULAMA
# =====================================================

def validate_customer_outputs(
    recorder: CheckRecorder,
) -> dict:
    """
    RFM, K-Means ve admin öneri sözleşmesini doğrular.
    """

    rfm_file = (
        PROCESSED_DATA_DIR
        / "rfm_customer_segments.csv"
    )

    segment_file = (
        PROCESSED_DATA_DIR
        / "customer_kmeans_segments.csv"
    )

    admin_file = (
        PROCESSED_DATA_DIR
        / "admin_customer_recommendations.csv"
    )

    top_file = (
        PROCESSED_DATA_DIR
        / "admin_top_1000_customer_recommendations.csv"
    )

    rfm_df = pd.read_csv(
        rfm_file,
        usecols=[
            "user_id",
            "monetary_currency",
        ],
        low_memory=False,
    )

    segment_df = pd.read_csv(
        segment_file,
        usecols=[
            "user_id",
            "ml_segment_code",
            "segmentation_model_version",
        ],
        low_memory=False,
    )

    admin_header = pd.read_csv(
        admin_file,
        nrows=0,
    ).columns.tolist()

    admin_required_columns = [
        "user_id",
        "monetary_currency",
        "recommendation_type",
        "priority_score",
        "recommendation_confidence",
        "is_actionable",
        "auto_execute",
        "queue_rank",
    ]

    missing_admin_columns = [
        column
        for column in admin_required_columns
        if column not in admin_header
    ]

    if missing_admin_columns:
        raise ValueError(
            "admin_customer_recommendations.csv içinde "
            f"gerekli sütunlar eksik: {missing_admin_columns}"
        )

    admin_df = pd.read_csv(
        admin_file,
        usecols=admin_required_columns,
        low_memory=False,
    )

    top_df = pd.read_csv(
        top_file,
        low_memory=False,
    )

    for dataframe in [
        rfm_df,
        segment_df,
        admin_df,
        top_df,
    ]:
        dataframe["user_id"] = pd.to_numeric(
            dataframe["user_id"],
            errors="raise",
        ).astype("int64")

    uniqueness_valid = (
        not rfm_df["user_id"].duplicated().any()
        and not segment_df["user_id"].duplicated().any()
        and not admin_df["user_id"].duplicated().any()
        and not top_df["user_id"].duplicated().any()
    )

    recorder.add(
        category="CUSTOMER_ANALYTICS",
        check_name="customer_output_user_ids_are_unique",
        passed=uniqueness_valid,
        details=(
            "RFM, K-Means, admin ve top öneri "
            "çıktılarında user_id tekrar etmemelidir."
        ),
    )

    rfm_user_ids = set(
        rfm_df["user_id"].astype(int)
    )

    segment_user_ids = set(
        segment_df["user_id"].astype(int)
    )

    admin_user_ids = set(
        admin_df["user_id"].astype(int)
    )

    coverage_valid = (
        rfm_user_ids
        == segment_user_ids
        == admin_user_ids
    )

    recorder.add(
        category="CUSTOMER_ANALYTICS",
        check_name="rfm_kmeans_admin_customer_coverage_matches",
        passed=coverage_valid,
        details=(
            f"RFM={len(rfm_user_ids):,}; "
            f"K-Means={len(segment_user_ids):,}; "
            f"admin={len(admin_user_ids):,}"
        ),
    )

    top_ids_are_subset = set(
        top_df["user_id"].astype(int)
    ).issubset(
        admin_user_ids
    )

    recorder.add(
        category="ADMIN_CONTRACT",
        check_name="top_recommendations_are_admin_subset",
        passed=top_ids_are_subset,
        details=(
            f"Top öneri sayısı={len(top_df):,}; "
            "bütün kullanıcılar ana admin çıktısında bulunmalıdır."
        ),
    )

    currency_valid = (
        rfm_df[
            "monetary_currency"
        ]
        .astype("string")
        .eq(EXPECTED_CURRENCY)
        .all()
        and admin_df[
            "monetary_currency"
        ]
        .astype("string")
        .eq(EXPECTED_CURRENCY)
        .all()
    )

    recorder.add(
        category="CUSTOMER_ANALYTICS",
        check_name="customer_monetary_currency_is_try",
        passed=currency_valid,
        details=(
            "RFM ve admin monetary para birimi TRY olmalıdır."
        ),
    )

    model_version_valid = segment_df[
        "segmentation_model_version"
    ].astype("string").eq(
        EXPECTED_SEGMENTATION_MODEL_VERSION
    ).all()

    recorder.add(
        category="CUSTOMER_ANALYTICS",
        check_name="segmentation_model_version_valid",
        passed=model_version_valid,
        details=(
            "Beklenen K-Means model sürümü: "
            f"{EXPECTED_SEGMENTATION_MODEL_VERSION}"
        ),
    )

    admin_auto_execute = convert_boolean(
        admin_df["auto_execute"],
        "admin.auto_execute",
    )

    recorder.add(
        category="ADMIN_CONTRACT",
        check_name="admin_recommendations_not_auto_executed",
        passed=not admin_auto_execute.any(),
        details=(
            "Data Science müşteri önerileri "
            "otomatik uygulanmamalıdır."
        ),
    )

    priority_scores = pd.to_numeric(
        admin_df["priority_score"],
        errors="coerce",
    )

    confidence_scores = pd.to_numeric(
        admin_df[
            "recommendation_confidence"
        ],
        errors="coerce",
    )

    recorder.add(
        category="ADMIN_CONTRACT",
        check_name="admin_score_ranges_valid",
        passed=(
            priority_scores.between(
                0,
                100,
            ).all()
            and confidence_scores.between(
                0,
                1,
            ).all()
        ),
        details=(
            "priority_score 0–100, "
            "recommendation_confidence 0–1 olmalıdır."
        ),
    )

    top_actionable = convert_boolean(
        top_df["is_actionable"],
        "top.is_actionable",
    )

    top_queue_rank = pd.to_numeric(
        top_df["queue_rank"],
        errors="coerce",
    )

    top_queue_valid = (
        len(top_df) <= 1_000
        and top_actionable.all()
        and top_queue_rank.notna().all()
        and top_queue_rank.is_monotonic_increasing
    )

    recorder.add(
        category="ADMIN_CONTRACT",
        check_name="top_1000_queue_valid",
        passed=top_queue_valid,
        details=(
            "Top öneri kuyruğu en fazla 1000 satır, "
            "actionable ve sıralı olmalıdır."
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

    direct_pii_columns = (
        forbidden_personal_columns
        .intersection(
            admin_header
        )
    )

    recorder.add(
        category="PRIVACY",
        check_name="admin_contract_has_no_direct_pii",
        passed=not direct_pii_columns,
        details=(
            "Admin veri bilimi sözleşmesinde doğrudan "
            "telefon, e-posta veya ad-soyad bulunmamalıdır."
            if not direct_pii_columns
            else (
                "Doğrudan kişisel veri alanları: "
                f"{sorted(direct_pii_columns)}"
            )
        ),
    )

    return {
        "customer_count": int(
            len(rfm_user_ids)
        ),
        "top_recommendation_count": int(
            len(top_df)
        ),
        "admin_actionable_count": int(
            convert_boolean(
                admin_df["is_actionable"],
                "admin.is_actionable",
            ).sum()
        ),
    }


# =====================================================
# 10. MODEL VE RAPOR DOĞRULAMASI
# =====================================================

def validate_models_and_reports(
    recorder: CheckRecorder,
) -> dict:
    """
    Model bundle, metadata ve backtest raporlarını doğrular.
    """

    demand_metadata_file = (
        DEMAND_MODEL_DIR
        / "random_forest_weather_metadata.json"
    )

    demand_bundle_file = (
        DEMAND_MODEL_DIR
        / "random_forest_weather_bundle.joblib"
    )

    kmeans_metadata_file = (
        SEGMENTATION_MODEL_DIR
        / "preprocessing_metadata.json"
    )

    kmeans_bundle_file = (
        SEGMENTATION_MODEL_DIR
        / "kmeans_customer_segmentation_bundle.joblib"
    )

    demand_metadata = read_json(
        demand_metadata_file
    )

    kmeans_metadata = read_json(
        kmeans_metadata_file
    )

    demand_bundle = joblib.load(
        demand_bundle_file
    )

    kmeans_bundle = joblib.load(
        kmeans_bundle_file
    )

    demand_bundle_valid = (
        isinstance(
            demand_bundle,
            dict,
        )
        and {
            "pipeline",
            "zone_demand_thresholds",
            "metadata",
        }.issubset(
            demand_bundle.keys()
        )
    )

    recorder.add(
        category="MODEL",
        check_name="demand_model_bundle_structure",
        passed=demand_bundle_valid,
        details=(
            "Demand bundle pipeline, zone_demand_thresholds "
            "ve metadata içermelidir."
        ),
    )

    kmeans_bundle_valid = (
        isinstance(
            kmeans_bundle,
            dict,
        )
        and {
            "model",
            "scaler",
            "metadata",
        }.issubset(
            kmeans_bundle.keys()
        )
    )

    recorder.add(
        category="MODEL",
        check_name="kmeans_model_bundle_structure",
        passed=kmeans_bundle_valid,
        details=(
            "K-Means bundle model, scaler ve metadata içermelidir."
        ),
    )

    demand_version_valid = (
        demand_metadata.get(
            "model_version"
        )
        == EXPECTED_DEMAND_MODEL_VERSION
    )

    recorder.add(
        category="MODEL",
        check_name="demand_metadata_version",
        passed=demand_version_valid,
        details=(
            f"Metadata model_version="
            f"{demand_metadata.get('model_version')}"
        ),
    )

    kmeans_version_valid = (
        kmeans_metadata.get(
            "model_version"
        )
        == EXPECTED_SEGMENTATION_MODEL_VERSION
    )

    recorder.add(
        category="MODEL",
        check_name="kmeans_metadata_version",
        passed=kmeans_version_valid,
        details=(
            f"Metadata model_version="
            f"{kmeans_metadata.get('model_version')}"
        ),
    )

    model_features = set(
        demand_metadata.get(
            "all_model_features",
            [],
        )
    )

    forbidden_leakage_features = {
        "avg_price",
        "avg_distance_km",
        "cancel_rate",
        "no_show_rate",
        "completed_count",
        "cancelled_count",
        "no_show_count",
    }

    leakage_features = (
        model_features
        .intersection(
            forbidden_leakage_features
        )
    )

    recorder.add(
        category="MODEL",
        check_name="demand_model_has_no_target_leakage_features",
        passed=not leakage_features,
        details=(
            "Demand model özelliklerinde gelecek zamanda "
            "bilinmeyecek alan bulunmamalıdır."
            if not leakage_features
            else (
                "Leakage özellikleri: "
                f"{sorted(leakage_features)}"
            )
        ),
    )

    metrics_file = (
        DEMAND_REPORT_DIR
        / "random_forest_model_metrics.json"
    )

    metrics_summary = read_json(
        metrics_file
    )

    random_forest_metrics = (
        metrics_summary.get(
            "random_forest_metrics",
            {},
        )
    )

    baseline_metrics = (
        metrics_summary.get(
            "seasonal_naive_168h_metrics",
            {},
        )
    )

    random_forest_mae = float(
        random_forest_metrics.get(
            "mae",
            np.inf,
        )
    )

    baseline_mae = float(
        baseline_metrics.get(
            "mae",
            np.inf,
        )
    )

    model_beats_baseline = (
        random_forest_mae
        < baseline_mae
    )

    recorder.add(
        category="MODEL_QUALITY",
        check_name="random_forest_beats_seasonal_baseline_by_mae",
        passed=model_beats_baseline,
        details=(
            f"Random Forest MAE={random_forest_mae:.6f}; "
            f"Seasonal baseline MAE={baseline_mae:.6f}"
        ),
        severity="WARNING",
    )

    core_validation_file = (
        CORE_VALIDATION_REPORT_DIR
        / "core_output_validation_summary.json"
    )

    core_validation_summary = read_json(
        core_validation_file
    )

    core_validation_passed = bool(
        core_validation_summary.get(
            "validation_passed",
            False,
        )
    )

    recorder.add(
        category="CORE_PIPELINE",
        check_name="core_pipeline_validation_passed",
        passed=core_validation_passed,
        details=(
            "12_validate_core_outputs sonucu başarılı olmalıdır."
        ),
    )

    future_forecast_summary = read_json(
        DEMAND_REPORT_DIR
        / "future_forecast_summary.json"
    )

    report_horizon = int(
        future_forecast_summary.get(
            "forecast_horizon_hours",
            -1,
        )
    )

    recorder.add(
        category="MODEL",
        check_name="forecast_report_horizon_matches",
        passed=(
            report_horizon
            == EXPECTED_FORECAST_HORIZON_HOURS
        ),
        details=(
            f"Rapor horizon={report_horizon}; "
            f"beklenen={EXPECTED_FORECAST_HORIZON_HOURS}"
        ),
    )

    return {
        "random_forest_mae": (
            random_forest_mae
        ),
        "seasonal_baseline_mae": (
            baseline_mae
        ),
        "random_forest_beats_baseline": (
            model_beats_baseline
        ),
        "core_validation_passed": (
            core_validation_passed
        ),
    }


# =====================================================
# 11. ENTEGRASYON NOTU
# =====================================================

def create_integration_readme(
    release_id: str,
) -> str:
    """
    Backend ve admin entegrasyonu için README metni oluşturur.
    """

    return f"""# Random Forest Weather Data Science Release

Release ID: `{release_id}`  
Package version: `{PACKAGE_VERSION}`  
Demand model: `{EXPECTED_DEMAND_MODEL_VERSION}`  
Customer segmentation model: `{EXPECTED_SEGMENTATION_MODEL_VERSION}`

## Package Purpose

This package contains Data Science outputs for:

1. Hourly pricing-zone demand forecasting
2. Weather-aware surge multiplier recommendations
3. RFM and K-Means customer segmentation
4. Admin customer action recommendations
5. Model files, metadata and validation reports

## Important: This Is Not a SQL Import Package

Files in this package must not be imported directly as replacements for
the main `users`, `vehicles` or `reservations` database tables.

Backend-ready SQL import files are prepared separately by:

`22_prepare_backend_ready_csvs.py`

No weather-enriched reservations file has been renamed to `reservations.csv`.

## Pricing Service Contract

File:

`backend_contract/pricing_service_surge_recommendations.csv`

Primary lookup key:

- `zone_id`
- `demand_hour_utc`

Important fields:

- `predicted_demand`
- `predicted_demand_level`
- `recommended_surge_multiplier`
- `surge_reason`
- `pricing_rule_merge_strategy`
- `requires_pricing_service_validation`
- `auto_apply`

Integration rules:

- `auto_apply` is always `false`.
- Pricing Service must validate the recommendation.
- The merge strategy is `MAX`.
- Pricing Service compares the model recommendation with applicable active
  `pricing_rules` and uses the highest valid multiplier.
- The configured business limits and minimum-price rule remain authoritative.
- Data Science does not calculate or modify a final reservation price.

## Admin Contract

Files:

- `backend_contract/admin_customer_recommendations.csv`
- `backend_contract/admin_top_1000_customer_recommendations.csv`

Primary lookup key:

- `user_id`

The backend joins `user_id` with User Service data when authorized.
Direct phone, e-mail, first name and last name values are intentionally
not included in the Data Science output.

Recommendations are decision-support records only:

- They do not create campaigns.
- They do not send notifications.
- They do not apply discounts.
- They do not change loyalty tiers.
- `auto_execute` is always `false`.

## Model Files

Demand model:

`models/demand_forecast/random_forest_weather_bundle.joblib`

The bundle contains:

- Scikit-learn pipeline
- Preprocessing steps
- Random Forest model
- Zone demand thresholds
- Metadata

Customer segmentation model:

`models/customer_segmentation/kmeans_customer_segmentation_bundle.joblib`

## Weather Warning

Check:

`reports/weather/weather_feature_summary.json`

When `weather_is_synthetic=true`, results are suitable for internship
simulation and integration testing. They must not be presented as proof
of a real-world causal relationship between weather and demand.

For production forecasting, provide real historical weather observations
and real future weather forecasts using the same data contract.

## Integrity

- `release_manifest.csv` lists packaged files and SHA-256 hashes.
- `checksums.sha256` can be used to verify file integrity.
- `reports/release_validation_checks.csv` contains all packaging checks.
"""


# =====================================================
# 12. PAKETİ KOPYALAMA
# =====================================================

def copy_package_items(
    staging_directory: Path,
) -> list[dict]:
    """
    Doğrulanmış kaynak dosyaları staging klasörüne kopyalar.
    """

    copied_rows = []

    for item in PACKAGE_ITEMS:
        if not item.source_path.exists():
            if item.required:
                raise FileNotFoundError(
                    f"Gerekli paket dosyası bulunamadı:\n"
                    f"{item.source_path}"
                )

            continue

        target_path = (
            staging_directory
            / item.target_relative_path
        )

        target_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        shutil.copy2(
            item.source_path,
            target_path,
        )

        copied_rows.append(
            {
                "logical_name": (
                    item.logical_name
                ),
                "category": (
                    item.category
                ),
                "source_path": str(
                    item.source_path.relative_to(
                        PROJECT_ROOT
                    )
                ),
                "package_path": (
                    item.target_relative_path.as_posix()
                ),
            }
        )

        print(
            f"✅ {item.logical_name}\n"
            f"   → {item.target_relative_path.as_posix()}"
        )

    return copied_rows


# =====================================================
# 13. MANİFESTO OLUŞTURMA
# =====================================================

def create_release_manifest(
    staging_directory: Path,
    copied_rows: list[dict],
) -> pd.DataFrame:
    """
    Paket dosyalarının boyut, satır sayısı ve SHA-256 manifestosunu
    oluşturur.
    """

    copied_lookup = {
        row["package_path"]: row
        for row in copied_rows
    }

    manifest_rows = []

    ignored_files = {
        "release_manifest.csv",
        "checksums.sha256",
    }

    for file_path in sorted(
        staging_directory.rglob("*")
    ):
        if not file_path.is_file():
            continue

        if file_path.name in ignored_files:
            continue

        relative_path = file_path.relative_to(
            staging_directory
        ).as_posix()

        copied_metadata = copied_lookup.get(
            relative_path,
            {},
        )

        file_size = file_path.stat().st_size

        manifest_rows.append(
            {
                "logical_name": (
                    copied_metadata.get(
                        "logical_name",
                        "package_generated_file",
                    )
                ),
                "category": (
                    copied_metadata.get(
                        "category",
                        "PACKAGE_METADATA",
                    )
                ),
                "source_path": (
                    copied_metadata.get(
                        "source_path",
                        "",
                    )
                ),
                "package_path": (
                    relative_path
                ),
                "file_extension": (
                    file_path.suffix.lower()
                ),
                "size_bytes": int(
                    file_size
                ),
                "size_mb": round(
                    file_size
                    / 1024
                    / 1024,
                    4,
                ),
                "row_count": (
                    get_file_row_count(
                        file_path
                    )
                ),
                "sha256": (
                    calculate_sha256(
                        file_path
                    )
                ),
            }
        )

    manifest_df = pd.DataFrame(
        manifest_rows
    )

    manifest_df.to_csv(
        staging_directory
        / "release_manifest.csv",
        index=False,
        encoding="utf-8-sig",
    )

    return manifest_df


# =====================================================
# 14. CHECKSUM DOSYASI
# =====================================================

def create_checksum_file(
    staging_directory: Path,
) -> None:
    """
    Paket içindeki bütün dosyalar için checksums.sha256 oluşturur.
    """

    checksum_rows = []

    for file_path in sorted(
        staging_directory.rglob("*")
    ):
        if not file_path.is_file():
            continue

        if file_path.name == (
            "checksums.sha256"
        ):
            continue

        relative_path = (
            file_path.relative_to(
                staging_directory
            ).as_posix()
        )

        checksum_rows.append(
            f"{calculate_sha256(file_path)}  "
            f"{relative_path}"
        )

    checksum_file = (
        staging_directory
        / "checksums.sha256"
    )

    checksum_file.write_text(
        "\n".join(checksum_rows) + "\n",
        encoding="utf-8",
    )


# =====================================================
# 15. RELEASE PAKETİNİ OLUŞTURMA
# =====================================================

def create_release_package(
    recorder: CheckRecorder,
    validation_results: dict,
) -> tuple[pd.DataFrame, dict]:
    """
    Önce staging klasörünü oluşturur, sonra başarılı paketi
    final teslim klasörüne taşır.
    """

    release_created_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
    )

    release_id = (
        f"{RELEASE_NAME}-"
        f"{release_created_at.strftime('%Y%m%dT%H%M%SZ')}"
    )

    if STAGING_RELEASE_DIR.exists():
        shutil.rmtree(
            STAGING_RELEASE_DIR
        )

    STAGING_RELEASE_DIR.mkdir(
        parents=True,
        exist_ok=False,
    )

    try:
        copied_rows = copy_package_items(
            staging_directory=(
                STAGING_RELEASE_DIR
            )
        )

        # ---------------------------------------------
        # Entegrasyon README
        # ---------------------------------------------

        readme_text = (
            create_integration_readme(
                release_id=release_id
            )
        )

        (
            STAGING_RELEASE_DIR
            / "README_BACKEND_INTEGRATION.md"
        ).write_text(
            readme_text,
            encoding="utf-8",
        )

        # ---------------------------------------------
        # Validation raporu
        # ---------------------------------------------

        package_report_directory = (
            STAGING_RELEASE_DIR
            / "reports"
        )

        package_report_directory.mkdir(
            parents=True,
            exist_ok=True,
        )

        recorder.to_dataframe().to_csv(
            package_report_directory
            / "release_validation_checks.csv",
            index=False,
            encoding="utf-8-sig",
        )

        # ---------------------------------------------
        # Release metadata
        # ---------------------------------------------

        release_metadata = {
            "release_id": release_id,
            "release_name": RELEASE_NAME,
            "package_version": (
                PACKAGE_VERSION
            ),
            "created_at_utc": (
                release_created_at.isoformat()
            ),
            "demand_model_version": (
                EXPECTED_DEMAND_MODEL_VERSION
            ),
            "segmentation_model_version": (
                EXPECTED_SEGMENTATION_MODEL_VERSION
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
            "forecast": (
                validation_results[
                    "demand"
                ]
            ),
            "customers": (
                validation_results[
                    "customers"
                ]
            ),
            "models": (
                validation_results[
                    "models"
                ]
            ),
            "package_purpose": (
                "Data Science analytics, model artifacts "
                "and backend read-only integration contracts."
            ),
            "is_sql_import_package": False,
            "contains_users_sql_table": False,
            "contains_reservations_sql_table": False,
            "contains_vehicles_sql_table": False,
            "contains_weather_enriched_reservations_as_sql_table": False,
            "pricing_service_auto_apply": False,
            "pricing_rule_merge_strategy": (
                "MAX"
            ),
            "admin_recommendations_auto_execute": False,
            "currency": EXPECTED_CURRENCY,
            "backend_ready_sql_package_stage": (
                "22_prepare_backend_ready_csvs.py"
            ),
        }

        with open(
            (
                STAGING_RELEASE_DIR
                / "release_metadata.json"
            ),
            "w",
            encoding="utf-8",
        ) as json_file:
            json.dump(
                release_metadata,
                json_file,
                ensure_ascii=False,
                indent=4,
                default=str,
            )

        manifest_df = (
            create_release_manifest(
                staging_directory=(
                    STAGING_RELEASE_DIR
                ),
                copied_rows=copied_rows,
            )
        )

        create_checksum_file(
            staging_directory=(
                STAGING_RELEASE_DIR
            )
        )

        # ---------------------------------------------
        # Eski release'i kaldır ve staging'i taşı
        # ---------------------------------------------

        if FINAL_RELEASE_DIR.exists():
            shutil.rmtree(
                FINAL_RELEASE_DIR
            )

        STAGING_RELEASE_DIR.rename(
            FINAL_RELEASE_DIR
        )

    except Exception:
        if STAGING_RELEASE_DIR.exists():
            shutil.rmtree(
                STAGING_RELEASE_DIR
            )

        raise

    return (
        manifest_df,
        release_metadata,
    )


# =====================================================
# 16. DIŞ RAPORLARI KAYDETME
# =====================================================

def save_external_summary(
    recorder: CheckRecorder,
    manifest_df: pd.DataFrame | None,
    release_metadata: dict | None,
) -> None:
    """
    Release klasöründen bağımsız kısa bir hazırlama özeti kaydeder.
    """

    save_validation_checks(
        recorder=recorder
    )

    summary = {
        "release_name": RELEASE_NAME,
        "generated_at_utc": (
            datetime.now(timezone.utc)
            .replace(microsecond=0)
            .isoformat()
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
        "release_directory": str(
            FINAL_RELEASE_DIR
        ),
        "release_created": (
            release_metadata is not None
        ),
        "packaged_file_count": (
            int(len(manifest_df))
            if manifest_df is not None
            else 0
        ),
        "release_id": (
            release_metadata.get(
                "release_id"
            )
            if release_metadata
            else None
        ),
    }

    with open(
        EXTERNAL_SUMMARY_FILE,
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


# =====================================================
# 17. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 78)
    print("15 — RANDOM FOREST WEATHER ÇIKTILARININ PAKETLENMESİ")
    print("=" * 78)

    recorder = CheckRecorder()

    print(
        "\n1/5 Kaynak dosyalar kontrol ediliyor..."
    )

    validate_package_sources(
        recorder=recorder
    )

    # Dosyalar eksikse ayrıntılı okuma aşamasına geçilmez.
    if recorder.failed_error_count() > 0:
        save_external_summary(
            recorder=recorder,
            manifest_df=None,
            release_metadata=None,
        )

        raise FileNotFoundError(
            "Paket için gerekli kaynak dosyalar eksik.\n"
            f"Kontrol raporu:\n{EXTERNAL_VALIDATION_FILE}"
        )

    print(
        "\n2/5 Talep tahmini ve Pricing Service "
        "sözleşmesi doğrulanıyor..."
    )

    demand_result = (
        validate_demand_outputs(
            recorder=recorder
        )
    )

    print(
        "\n3/5 RFM, K-Means ve admin çıktıları "
        "doğrulanıyor..."
    )

    customer_result = (
        validate_customer_outputs(
            recorder=recorder
        )
    )

    print(
        "\n4/5 Model bundle ve kalite raporları "
        "doğrulanıyor..."
    )

    model_result = (
        validate_models_and_reports(
            recorder=recorder
        )
    )

    save_validation_checks(
        recorder=recorder
    )

    validation_results = {
        "demand": demand_result,
        "customers": customer_result,
        "models": model_result,
    }

    if (
        recorder.failed_error_count() > 0
        and FAIL_ON_VALIDATION_ERROR
    ):
        save_external_summary(
            recorder=recorder,
            manifest_df=None,
            release_metadata=None,
        )

        raise ValueError(
            "Random Forest weather çıktılarında hata bulundu.\n"
            "Teslim paketi oluşturulmadı.\n\n"
            f"Kontrol raporu:\n"
            f"{EXTERNAL_VALIDATION_FILE}"
        )

    print(
        "\n5/5 Sürümlenmiş teslim paketi oluşturuluyor..."
    )

    (
        manifest_df,
        release_metadata,
    ) = create_release_package(
        recorder=recorder,
        validation_results=(
            validation_results
        ),
    )

    save_external_summary(
        recorder=recorder,
        manifest_df=manifest_df,
        release_metadata=(
            release_metadata
        ),
    )

    print("\n" + "=" * 78)
    print("RANDOM FOREST WEATHER TESLİM PAKETİ HAZIR")
    print("=" * 78)

    print(
        f"Release ID      : "
        f"{release_metadata['release_id']}"
    )

    print(
        f"Paket klasörü   : "
        f"{FINAL_RELEASE_DIR}"
    )

    print(
        f"Paket dosyası   : "
        f"{len(manifest_df):,}"
    )

    print(
        f"Başarısız kontrol: "
        f"{recorder.failed_error_count():,}"
    )

    print(
        f"Uyarı           : "
        f"{recorder.warning_count():,}"
    )

    print(
        "\nAna backend sözleşmeleri:"
    )

    print(
        "- backend_contract/"
        "pricing_service_surge_recommendations.csv"
    )

    print(
        "- backend_contract/"
        "admin_customer_recommendations.csv"
    )

    print(
        "- backend_contract/"
        "admin_top_1000_customer_recommendations.csv"
    )

    print(
        "\nModel dosyaları:"
    )

    print(
        "- models/demand_forecast/"
        "random_forest_weather_bundle.joblib"
    )

    print(
        "- models/customer_segmentation/"
        "kmeans_customer_segmentation_bundle.joblib"
    )

    print(
        "\nPaket bütünlüğü:"
    )

    print(
        "- release_manifest.csv"
    )

    print(
        "- checksums.sha256"
    )

    print(
        "- release_metadata.json"
    )

    print(
        "- README_BACKEND_INTEGRATION.md"
    )

    print("\nKontroller:")
    print(
        "Eski dosya isimleri kullanılmadı."
    )
    print(
        "Hava durumlu rezervasyonlar reservations.csv "
        "olarak paketlenmedi."
    )
    print(
        "SQL ana tablolarıyla Data Science çıktıları ayrıldı."
    )
    print(
        "Forecast zone × 24 saat kapsamı doğrulandı."
    )
    print(
        "Pricing Service sözleşmesi forecast ile karşılaştırıldı."
    )
    print(
        "Surge auto_apply=false olarak doğrulandı."
    )
    print(
        "Pricing merge stratejisi MAX olarak doğrulandı."
    )
    print(
        "RFM, K-Means ve admin kullanıcı kapsamı karşılaştırıldı."
    )
    print(
        "Admin çıktısında doğrudan kişisel veri bulunmadığı doğrulandı."
    )
    print(
        "Random Forest ve K-Means model bundle dosyaları eklendi."
    )
    print(
        "Model metadata ve kalite raporları eklendi."
    )
    print(
        "SHA-256 manifestosu oluşturuldu."
    )
    print(
        "Eksik veya hatalı dosyada kısmi paket oluşturma engellendi."
    )

    print(
        "\nNot: Bu paket SQL import paketi değildir. "
        "Backend-ready users, reservations ve diğer SQL CSV'leri "
        "22_prepare_backend_ready_csvs.py aşamasında hazırlanacaktır."
    )

    if demand_result[
        "future_weather_is_synthetic"
    ]:
        print(
            "\n Gelecek tahmininde sentetik/haftalık "
            "hava senaryosu kullanılmıştır."
        )

if __name__ == "__main__":
    main()