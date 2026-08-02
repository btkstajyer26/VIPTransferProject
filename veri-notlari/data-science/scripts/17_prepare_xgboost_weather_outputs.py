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

RELEASE_NAME = "xgboost_weather_v1"

PACKAGE_VERSION = "data-science-release-v1"

EXPECTED_XGBOOST_MODEL_VERSION = (
    "xgboost-demand-weather-v1"
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


ALLOWED_DEMAND_LEVELS = {
    "LOW",
    "MEDIUM",
    "HIGH",
}


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


ALLOWED_SELECTED_MODELS = {
    "XGBOOST_WEATHER",
    "RANDOM_FOREST_WEATHER",
    "SEASONAL_NAIVE_168H",
}


FORBIDDEN_LEAKAGE_FEATURES = {
    "avg_price",
    "avg_distance_km",
    "cancel_rate",
    "no_show_rate",
    "completed_count",
    "cancelled_count",
    "no_show_count",
    "pending_count",
    "assigned_count",
}


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

XGBOOST_REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "16_xgboost_demand_prediction_weather"
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
    / "17_prepare_xgboost_weather_outputs"
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
# 3. DIŞ RAPOR DOSYALARI
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
    # ORTAK TALEP VERİ SETİ
    # =================================================

    PackageItem(
        logical_name="hourly_zone_demand_dataset",
        source_path=(
            PROCESSED_DATA_DIR
            / "demand_hourly_zone_weather.parquet"
        ),
        target_relative_path=Path(
            "analytics/demand/common/"
            "demand_hourly_zone_weather.parquet"
        ),
        category="DEMAND_ANALYTICS",
    ),

    # =================================================
    # XGBOOST BACKTEST VE GELECEK TAHMİNİ
    # =================================================

    PackageItem(
        logical_name="xgboost_backtest_csv",
        source_path=(
            PROCESSED_DATA_DIR
            / "demand_backtest_xgboost_weather.csv"
        ),
        target_relative_path=Path(
            "analytics/demand/xgboost/"
            "demand_backtest_xgboost_weather.csv"
        ),
        category="DEMAND_ANALYTICS",
    ),

    PackageItem(
        logical_name="xgboost_backtest_parquet",
        source_path=(
            PROCESSED_DATA_DIR
            / "demand_backtest_xgboost_weather.parquet"
        ),
        target_relative_path=Path(
            "analytics/demand/xgboost/"
            "demand_backtest_xgboost_weather.parquet"
        ),
        category="DEMAND_ANALYTICS",
    ),

    PackageItem(
        logical_name="xgboost_forecast_csv",
        source_path=(
            PROCESSED_DATA_DIR
            / "demand_forecast_xgboost_weather.csv"
        ),
        target_relative_path=Path(
            "analytics/demand/xgboost/"
            "demand_forecast_xgboost_weather.csv"
        ),
        category="DEMAND_FORECAST",
    ),

    PackageItem(
        logical_name="xgboost_forecast_parquet",
        source_path=(
            PROCESSED_DATA_DIR
            / "demand_forecast_xgboost_weather.parquet"
        ),
        target_relative_path=Path(
            "analytics/demand/xgboost/"
            "demand_forecast_xgboost_weather.parquet"
        ),
        category="DEMAND_FORECAST",
    ),

    # =================================================
    # MODEL KARŞILAŞTIRMALARI
    # =================================================

    PackageItem(
        logical_name="backtest_model_comparison",
        source_path=(
            PROCESSED_DATA_DIR
            / "demand_backtest_model_comparison_weather.csv"
        ),
        target_relative_path=Path(
            "analytics/demand/comparison/"
            "demand_backtest_model_comparison_weather.csv"
        ),
        category="MODEL_COMPARISON",
    ),

    PackageItem(
        logical_name="forecast_model_comparison",
        source_path=(
            PROCESSED_DATA_DIR
            / "demand_forecast_model_comparison_weather.csv"
        ),
        target_relative_path=Path(
            "analytics/demand/comparison/"
            "demand_forecast_model_comparison_weather.csv"
        ),
        category="MODEL_COMPARISON",
    ),

    # =================================================
    # BACKEND / PRICING SERVICE SÖZLEŞMESİ
    # =================================================

    PackageItem(
        logical_name="pricing_service_surge_contract",
        source_path=(
            PROCESSED_DATA_DIR
            / "pricing_service_surge_xgboost_weather.csv"
        ),
        target_relative_path=Path(
            "backend_contract/"
            "pricing_service_surge_recommendations.csv"
        ),
        category="BACKEND_CONTRACT",
    ),

    # =================================================
    # MÜŞTERİ ANALİTİĞİ
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

    # =================================================
    # ADMIN PANELİ SÖZLEŞMESİ
    # =================================================

    PackageItem(
        logical_name="admin_recommendations_csv",
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
        logical_name="admin_recommendations_parquet",
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
        logical_name="admin_top_1000_recommendations",
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
        logical_name="loyalty_tier_config",
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
        logical_name="xgboost_zone_thresholds",
        source_path=(
            XGBOOST_REPORT_DIR
            / "xgboost_zone_demand_thresholds.csv"
        ),
        target_relative_path=Path(
            "reference/demand/"
            "xgboost_zone_demand_thresholds.csv"
        ),
        category="REFERENCE_DATA",
    ),

    # =================================================
    # XGBOOST MODEL DOSYALARI
    # =================================================

    PackageItem(
        logical_name="xgboost_model_bundle",
        source_path=(
            DEMAND_MODEL_DIR
            / "xgboost_weather_bundle.joblib"
        ),
        target_relative_path=Path(
            "models/demand_forecast/"
            "xgboost_weather_bundle.joblib"
        ),
        category="MODEL",
    ),

    PackageItem(
        logical_name="xgboost_native_model",
        source_path=(
            DEMAND_MODEL_DIR
            / "xgboost_weather_model.json"
        ),
        target_relative_path=Path(
            "models/demand_forecast/"
            "xgboost_weather_model.json"
        ),
        category="MODEL",
    ),

    PackageItem(
        logical_name="xgboost_model_metadata",
        source_path=(
            DEMAND_MODEL_DIR
            / "xgboost_weather_metadata.json"
        ),
        target_relative_path=Path(
            "models/demand_forecast/"
            "xgboost_weather_metadata.json"
        ),
        category="MODEL",
    ),

    # =================================================
    # K-MEANS MODELİ
    # =================================================

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
    # HAVA DURUMU RAPORLARI
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

    # =================================================
    # XGBOOST RAPORLARI
    # =================================================

    PackageItem(
        logical_name="xgboost_model_metrics",
        source_path=(
            XGBOOST_REPORT_DIR
            / "xgboost_model_metrics.json"
        ),
        target_relative_path=Path(
            "reports/demand/"
            "xgboost_model_metrics.json"
        ),
        category="REPORT",
    ),

    PackageItem(
        logical_name="model_metrics_comparison",
        source_path=(
            XGBOOST_REPORT_DIR
            / "xgboost_random_forest_baseline_comparison.csv"
        ),
        target_relative_path=Path(
            "reports/demand/"
            "xgboost_random_forest_baseline_comparison.csv"
        ),
        category="REPORT",
    ),

    PackageItem(
        logical_name="xgboost_feature_importance",
        source_path=(
            XGBOOST_REPORT_DIR
            / "xgboost_feature_importance.csv"
        ),
        target_relative_path=Path(
            "reports/demand/"
            "xgboost_feature_importance.csv"
        ),
        category="REPORT",
    ),

    PackageItem(
        logical_name="xgboost_base_feature_importance",
        source_path=(
            XGBOOST_REPORT_DIR
            / "xgboost_base_feature_importance.csv"
        ),
        target_relative_path=Path(
            "reports/demand/"
            "xgboost_base_feature_importance.csv"
        ),
        category="REPORT",
    ),

    PackageItem(
        logical_name="xgboost_zone_backtest_metrics",
        source_path=(
            XGBOOST_REPORT_DIR
            / "xgboost_zone_backtest_metrics.csv"
        ),
        target_relative_path=Path(
            "reports/demand/"
            "xgboost_zone_backtest_metrics.csv"
        ),
        category="REPORT",
    ),

    PackageItem(
        logical_name="xgboost_training_history",
        source_path=(
            XGBOOST_REPORT_DIR
            / "xgboost_training_history.csv"
        ),
        target_relative_path=Path(
            "reports/demand/"
            "xgboost_training_history.csv"
        ),
        category="REPORT",
    ),

    PackageItem(
        logical_name="model_selection_recommendation",
        source_path=(
            XGBOOST_REPORT_DIR
            / "model_selection_recommendation.json"
        ),
        target_relative_path=Path(
            "reports/demand/"
            "model_selection_recommendation.json"
        ),
        category="REPORT",
    ),

    PackageItem(
        logical_name="xgboost_forecast_summary",
        source_path=(
            XGBOOST_REPORT_DIR
            / "xgboost_forecast_summary.json"
        ),
        target_relative_path=Path(
            "reports/demand/"
            "xgboost_forecast_summary.json"
        ),
        category="REPORT",
    ),

    # =================================================
    # MÜŞTERİ VE CORE RAPORLARI
    # =================================================

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
        logical_name="core_validation_summary",
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
        """
        Doğrulama sonucu ekler ve terminale yazdırır.
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
        Sonuçları DataFrame olarak döndürür.
        """

        return pd.DataFrame(
            self.rows
        )

    def failed_error_count(self) -> int:
        """
        Başarısız ERROR kontrolü sayısını döndürür.
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
        return json.load(
            json_file
        )


def calculate_sha256(
    file_path: Path,
) -> str:
    """
    Dosyanın SHA-256 değerini hesaplar.
    """

    digest = hashlib.sha256()

    with open(
        file_path,
        "rb",
    ) as file_handle:
        while True:
            data = file_handle.read(
                HASH_CHUNK_SIZE
            )

            if not data:
                break

            digest.update(
                data
            )

    return digest.hexdigest()


def convert_boolean(
    series: pd.Series,
    column_name: str,
) -> pd.Series:
    """
    CSV boolean değerlerini güvenli biçimde dönüştürür.
    """

    if pd.api.types.is_bool_dtype(
        series
    ):
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


def validate_columns(
    dataframe: pd.DataFrame,
    required_columns: list[str],
    dataframe_name: str,
) -> None:
    """
    Gerekli sütunların bulunduğunu doğrular.
    """

    missing_columns = [
        column
        for column in required_columns
        if column not in dataframe.columns
    ]

    if missing_columns:
        raise ValueError(
            f"{dataframe_name} içinde gerekli "
            f"sütunlar eksik:\n{missing_columns}"
        )


def count_csv_rows(
    file_path: Path,
) -> int:
    """
    CSV satır sayısını dosyanın tamamını DataFrame'e
    almadan hesaplar.
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


def get_file_row_count(
    file_path: Path,
):
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
    Paket oluşturulmasa bile doğrulama raporunu kaydeder.
    """

    recorder.to_dataframe().to_csv(
        EXTERNAL_VALIDATION_FILE,
        index=False,
        encoding="utf-8-sig",
    )


# =====================================================
# 7. KAYNAK DOSYA KONTROLÜ
# =====================================================

def validate_package_sources(
    recorder: CheckRecorder,
) -> None:
    """
    Gerekli kaynak dosyalarını ve hedef yollarını doğrular.
    """

    target_paths = [
        item.target_relative_path.as_posix()
        for item in PACKAGE_ITEMS
    ]

    duplicate_targets = {
        target_path
        for target_path in target_paths
        if target_paths.count(
            target_path
        ) > 1
    }

    recorder.add(
        category="PACKAGE_STRUCTURE",
        check_name="target_paths_are_unique",
        passed=not duplicate_targets,
        details=(
            "Tekrar eden hedef yolu bulunmuyor."
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

    forbidden_sql_table_names = {
        "users.csv",
        "vehicles.csv",
        "reservations.csv",
        "reservation_status_history.csv",
        "loyalty_accounts.csv",
    }

    package_target_names = {
        item.target_relative_path.name
        for item in PACKAGE_ITEMS
    }

    forbidden_sql_targets = (
        forbidden_sql_table_names
        .intersection(
            package_target_names
        )
    )

    recorder.add(
        category="PACKAGE_STRUCTURE",
        check_name="sql_core_tables_not_in_ds_package",
        passed=not forbidden_sql_targets,
        details=(
            "SQL ana tabloları Data Science "
            "paketine eklenmiyor."
            if not forbidden_sql_targets
            else (
                "Yanlış SQL tablo dosyaları: "
                f"{sorted(forbidden_sql_targets)}"
            )
        ),
    )

    forbidden_old_names = {
        "reservations_istanbul_weather.csv",
        "demand_forecast_dataset_xgboost_weather.csv",
        "pricing_service_surge_output_xgboost_weather.csv",
        "xgboost_demand_model.json",
    }

    used_source_names = {
        item.source_path.name
        for item in PACKAGE_ITEMS
    }

    old_names_used = (
        forbidden_old_names
        .intersection(
            used_source_names
        )
    )

    recorder.add(
        category="PACKAGE_STRUCTURE",
        check_name="old_pipeline_file_names_not_used",
        passed=not old_names_used,
        details=(
            "Eski pipeline dosya isimleri kullanılmıyor."
            if not old_names_used
            else (
                "Kullanılan eski isimler: "
                f"{sorted(old_names_used)}"
            )
        ),
    )


# =====================================================
# 8. FORECAST VE PRICING CONTRACT DOĞRULAMA
# =====================================================

def validate_forecast_and_pricing_contract(
    recorder: CheckRecorder,
) -> dict:
    """
    XGBoost gelecek tahmini ile Pricing Service
    sözleşmesini doğrular.
    """

    forecast_file = (
        PROCESSED_DATA_DIR
        / "demand_forecast_xgboost_weather.csv"
    )

    pricing_file = (
        PROCESSED_DATA_DIR
        / "pricing_service_surge_xgboost_weather.csv"
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
        "is_peak_hour",
        "is_holiday",
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

    zones_df = pd.read_csv(
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
        zones_df,
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

    zones_df["zone_id"] = pd.to_numeric(
        zones_df["zone_id"],
        errors="raise",
    ).astype("int64")

    zones_df["is_active"] = convert_boolean(
        zones_df["is_active"],
        "zone_catalog.is_active",
    )

    for dataframe in [
        forecast_df,
        pricing_df,
    ]:
        dataframe["demand_hour_utc"] = (
            pd.to_datetime(
                dataframe[
                    "demand_hour_utc"
                ],
                errors="coerce",
                utc=True,
            )
        )

        dataframe[
            "forecast_generated_at_utc"
        ] = pd.to_datetime(
            dataframe[
                "forecast_generated_at_utc"
            ],
            errors="coerce",
            utc=True,
        )

    invalid_time_count = int(
        forecast_df[
            "demand_hour_utc"
        ].isna().sum()
        + pricing_df[
            "demand_hour_utc"
        ].isna().sum()
        + forecast_df[
            "forecast_generated_at_utc"
        ].isna().sum()
        + pricing_df[
            "forecast_generated_at_utc"
        ].isna().sum()
    )

    recorder.add(
        category="DEMAND_FORECAST",
        check_name="forecast_timestamps_valid",
        passed=(
            invalid_time_count == 0
        ),
        details=(
            "Geçersiz zaman değeri="
            f"{invalid_time_count:,}"
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
        check_name="zone_hour_keys_unique",
        passed=(
            forecast_duplicate_count == 0
            and pricing_duplicate_count == 0
        ),
        details=(
            f"Forecast tekrar={forecast_duplicate_count}; "
            f"pricing tekrar={pricing_duplicate_count}"
        ),
    )

    active_zone_ids = set(
        zones_df.loc[
            zones_df["is_active"],
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
            f"aktif zone={len(active_zone_ids)}"
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
            f"Bulunan saat={forecast_hour_count}; "
            f"beklenen={EXPECTED_FORECAST_HORIZON_HOURS}"
        ),
    )

    expected_forecast_rows = (
        len(active_zone_ids)
        * EXPECTED_FORECAST_HORIZON_HOURS
    )

    recorder.add(
        category="DEMAND_FORECAST",
        check_name="forecast_grid_complete",
        passed=(
            len(forecast_df)
            == expected_forecast_rows
        ),
        details=(
            f"Forecast satırı={len(forecast_df):,}; "
            f"beklenen={expected_forecast_rows:,}"
        ),
    )

    numeric_columns = [
        "predicted_demand",
        "predicted_demand_rounded",
        "prediction_lower_80",
        "prediction_upper_80",
        "weather_severity_score",
        "recommended_surge_multiplier",
        "forecast_horizon_hour",
    ]

    for column in numeric_columns:
        forecast_df[column] = pd.to_numeric(
            forecast_df[column],
            errors="coerce",
        )

        pricing_df[column] = pd.to_numeric(
            pricing_df[column],
            errors="coerce",
        )

    numeric_values_valid = (
        forecast_df[
            numeric_columns
        ].notna().all().all()
        and pricing_df[
            numeric_columns
        ].notna().all().all()
        and (
            forecast_df[
                "predicted_demand"
            ] >= 0
        ).all()
        and (
            pricing_df[
                "predicted_demand"
            ] >= 0
        ).all()
    )

    recorder.add(
        category="DEMAND_FORECAST",
        check_name="forecast_numeric_values_valid",
        passed=numeric_values_valid,
        details=(
            "Talep, tahmin aralığı, horizon ve surge "
            "değerleri boş veya negatif olmamalıdır."
        ),
    )

    interval_valid = (
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
        check_name="prediction_interval_valid",
        passed=interval_valid,
        details=(
            "prediction_lower_80 <= predicted_demand "
            "<= prediction_upper_80 olmalıdır."
        ),
    )

    demand_levels_valid = set(
        forecast_df[
            "predicted_demand_level"
        ].astype(str)
    ).issubset(
        ALLOWED_DEMAND_LEVELS
    )

    recorder.add(
        category="DEMAND_FORECAST",
        check_name="demand_levels_valid",
        passed=demand_levels_valid,
        details=(
            "Talep seviyeleri LOW, MEDIUM veya HIGH olmalıdır."
        ),
    )

    surge_range_valid = (
        forecast_df[
            "recommended_surge_multiplier"
        ].between(
            MIN_SURGE_MULTIPLIER,
            MAX_SURGE_MULTIPLIER,
        ).all()
        and pricing_df[
            "recommended_surge_multiplier"
        ].between(
            MIN_SURGE_MULTIPLIER,
            MAX_SURGE_MULTIPLIER,
        ).all()
    )

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
        check_name="surge_not_auto_applied",
        passed=(
            not forecast_auto_apply.any()
            and not pricing_auto_apply.any()
        ),
        details=(
            "Data Science surge önerileri "
            "otomatik uygulanmamalıdır."
        ),
    )

    forecast_validation_required = convert_boolean(
        forecast_df[
            "requires_pricing_service_validation"
        ],
        (
            "forecast."
            "requires_pricing_service_validation"
        ),
    )

    pricing_validation_required = convert_boolean(
        pricing_df[
            "requires_pricing_service_validation"
        ],
        (
            "pricing."
            "requires_pricing_service_validation"
        ),
    )

    recorder.add(
        category="PRICING_CONTRACT",
        check_name="pricing_service_validation_required",
        passed=(
            forecast_validation_required.all()
            and pricing_validation_required.all()
        ),
        details=(
            "Her surge önerisi Pricing Service "
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
        check_name="pricing_merge_strategy_is_max",
        passed=merge_strategy_valid,
        details=(
            "Aktif pricing rule ve model önerisi "
            "MAX stratejisiyle birleştirilmelidir."
        ),
    )

    model_version_valid = (
        forecast_df[
            "forecast_model_version"
        ]
        .astype("string")
        .eq(
            EXPECTED_XGBOOST_MODEL_VERSION
        )
        .all()
        and pricing_df[
            "forecast_model_version"
        ]
        .astype("string")
        .eq(
            EXPECTED_XGBOOST_MODEL_VERSION
        )
        .all()
    )

    recorder.add(
        category="DEMAND_FORECAST",
        check_name="forecast_model_version_valid",
        passed=model_version_valid,
        details=(
            "Beklenen model sürümü: "
            f"{EXPECTED_XGBOOST_MODEL_VERSION}"
        ),
    )

    forbidden_future_columns = (
        FORBIDDEN_LEAKAGE_FEATURES
        .union(
            {
                "demand_count",
                "actual_demand",
            }
        )
    )

    leakage_columns = (
        forbidden_future_columns
        .intersection(
            forecast_df.columns
        )
    )

    recorder.add(
        category="DEMAND_FORECAST",
        check_name="forecast_has_no_actual_target_leakage",
        passed=not leakage_columns,
        details=(
            "Gelecek tahmininde gerçek hedef veya "
            "sonuç alanı bulunmuyor."
            if not leakage_columns
            else (
                "Leakage alanları: "
                f"{sorted(leakage_columns)}"
            )
        ),
    )

    # -------------------------------------------------
    # Ana forecast ve Pricing Service sözleşmesi uyumu
    # -------------------------------------------------

    comparison_columns = [
        "zone_id",
        "demand_hour_utc",
        "predicted_demand",
        "predicted_demand_rounded",
        "prediction_lower_80",
        "prediction_upper_80",
        "recommended_surge_multiplier",
        "predicted_demand_level",
        "pricing_rule_merge_strategy",
        "forecast_model_version",
    ]

    contract_comparison = (
        forecast_df[
            comparison_columns
        ]
        .merge(
            pricing_df[
                comparison_columns
            ],
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
    )

    keys_match = (
        contract_comparison[
            "_merge"
        ].eq("both").all()
    )

    numeric_match_columns = [
        "predicted_demand",
        "predicted_demand_rounded",
        "prediction_lower_80",
        "prediction_upper_80",
        "recommended_surge_multiplier",
    ]

    numeric_matches = True

    for column in numeric_match_columns:
        column_matches = np.isclose(
            contract_comparison[
                f"{column}_forecast"
            ],
            contract_comparison[
                f"{column}_pricing"
            ],
            atol=0.001,
            rtol=0,
            equal_nan=False,
        ).all()

        numeric_matches = (
            numeric_matches
            and column_matches
        )

    text_match_columns = [
        "predicted_demand_level",
        "pricing_rule_merge_strategy",
        "forecast_model_version",
    ]

    text_matches = True

    for column in text_match_columns:
        column_matches = (
            contract_comparison[
                f"{column}_forecast"
            ]
            .astype("string")
            .eq(
                contract_comparison[
                    f"{column}_pricing"
                ]
                .astype("string")
            )
            .all()
        )

        text_matches = (
            text_matches
            and column_matches
        )

    recorder.add(
        category="PRICING_CONTRACT",
        check_name="pricing_contract_matches_forecast",
        passed=(
            keys_match
            and numeric_matches
            and text_matches
        ),
        details=(
            "Pricing Service sözleşmesindeki zone-saat, "
            "tahmin, seviye ve surge değerleri ana "
            "XGBoost forecast ile aynı olmalıdır."
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
        check_name="future_weather_is_external",
        passed=not synthetic_weather_used,
        details=(
            "Gerçek veya harici hava tahmini kullanıldı."
            if not synthetic_weather_used
            else (
                "Sentetik veya yedi gün önceki hava "
                "senaryosu kullanıldı. Staj simülasyonu "
                "için kabul edilebilir."
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
        "future_weather_is_synthetic": (
            synthetic_weather_used
        ),
    }


# =====================================================
# 9. MODEL KARŞILAŞTIRMA ÇIKTILARI
# =====================================================

def validate_model_comparison_outputs(
    recorder: CheckRecorder,
    expected_forecast_rows: int,
) -> dict:
    """
    Random Forest, XGBoost ve seasonal baseline
    karşılaştırma dosyalarını doğrular.
    """

    backtest_file = (
        PROCESSED_DATA_DIR
        / "demand_backtest_model_comparison_weather.csv"
    )

    forecast_comparison_file = (
        PROCESSED_DATA_DIR
        / "demand_forecast_model_comparison_weather.csv"
    )

    backtest_required_columns = [
        "zone_id",
        "zone_name",
        "demand_hour_utc",
        "demand_count",
        "xgboost_predicted_demand",
        "random_forest_predicted_demand",
        "seasonal_naive_prediction",
        "xgboost_absolute_error",
        "random_forest_absolute_error",
        "better_model_for_row",
    ]

    forecast_required_columns = [
        "zone_id",
        "zone_name",
        "demand_hour_utc",
        "xgboost_predicted_demand",
        "random_forest_predicted_demand",
        "xgboost_recommended_surge",
        "random_forest_recommended_surge",
        "prediction_difference",
        "absolute_prediction_difference",
    ]

    backtest_df = pd.read_csv(
        backtest_file,
        low_memory=False,
    )

    future_comparison_df = pd.read_csv(
        forecast_comparison_file,
        low_memory=False,
    )

    validate_columns(
        backtest_df,
        backtest_required_columns,
        backtest_file.name,
    )

    validate_columns(
        future_comparison_df,
        forecast_required_columns,
        forecast_comparison_file.name,
    )

    for dataframe in [
        backtest_df,
        future_comparison_df,
    ]:
        dataframe["zone_id"] = pd.to_numeric(
            dataframe["zone_id"],
            errors="raise",
        ).astype("int64")

        dataframe["demand_hour_utc"] = (
            pd.to_datetime(
                dataframe[
                    "demand_hour_utc"
                ],
                errors="coerce",
                utc=True,
            )
        )

    invalid_time_count = int(
        backtest_df[
            "demand_hour_utc"
        ].isna().sum()
        + future_comparison_df[
            "demand_hour_utc"
        ].isna().sum()
    )

    recorder.add(
        category="MODEL_COMPARISON",
        check_name="comparison_timestamps_valid",
        passed=(
            invalid_time_count == 0
        ),
        details=(
            "Geçersiz comparison saati="
            f"{invalid_time_count:,}"
        ),
    )

    backtest_duplicate_count = int(
        backtest_df[
            [
                "zone_id",
                "demand_hour_utc",
            ]
        ].duplicated().sum()
    )

    future_duplicate_count = int(
        future_comparison_df[
            [
                "zone_id",
                "demand_hour_utc",
            ]
        ].duplicated().sum()
    )

    recorder.add(
        category="MODEL_COMPARISON",
        check_name="comparison_keys_unique",
        passed=(
            backtest_duplicate_count == 0
            and future_duplicate_count == 0
        ),
        details=(
            f"Backtest tekrar={backtest_duplicate_count}; "
            f"gelecek tekrar={future_duplicate_count}"
        ),
    )

    backtest_numeric_columns = [
        "demand_count",
        "xgboost_predicted_demand",
        "random_forest_predicted_demand",
        "seasonal_naive_prediction",
        "xgboost_absolute_error",
        "random_forest_absolute_error",
    ]

    for column in backtest_numeric_columns:
        backtest_df[column] = pd.to_numeric(
            backtest_df[column],
            errors="coerce",
        )

    actual_xgb_error = (
        backtest_df[
            "demand_count"
        ]
        - backtest_df[
            "xgboost_predicted_demand"
        ]
    ).abs()

    actual_rf_error = (
        backtest_df[
            "demand_count"
        ]
        - backtest_df[
            "random_forest_predicted_demand"
        ]
    ).abs()

    xgb_error_matches = np.isclose(
        actual_xgb_error,
        backtest_df[
            "xgboost_absolute_error"
        ],
        atol=0.002,
        rtol=0,
        equal_nan=False,
    ).all()

    rf_error_matches = np.isclose(
        actual_rf_error,
        backtest_df[
            "random_forest_absolute_error"
        ],
        atol=0.002,
        rtol=0,
        equal_nan=False,
    ).all()

    recorder.add(
        category="MODEL_COMPARISON",
        check_name="backtest_absolute_errors_correct",
        passed=(
            xgb_error_matches
            and rf_error_matches
        ),
        details=(
            "XGBoost ve Random Forest absolute error "
            "değerleri yeniden hesaplandığında eşleşmelidir."
        ),
    )

    valid_better_model_values = {
        "XGBOOST",
        "RANDOM_FOREST",
        "TIE",
    }

    better_model_values_valid = set(
        backtest_df[
            "better_model_for_row"
        ].astype(str)
    ).issubset(
        valid_better_model_values
    )

    recorder.add(
        category="MODEL_COMPARISON",
        check_name="better_model_labels_valid",
        passed=better_model_values_valid,
        details=(
            "Satır bazlı sonuç XGBOOST, "
            "RANDOM_FOREST veya TIE olmalıdır."
        ),
    )

    future_numeric_columns = [
        "xgboost_predicted_demand",
        "random_forest_predicted_demand",
        "xgboost_recommended_surge",
        "random_forest_recommended_surge",
        "prediction_difference",
        "absolute_prediction_difference",
    ]

    for column in future_numeric_columns:
        future_comparison_df[column] = (
            pd.to_numeric(
                future_comparison_df[column],
                errors="coerce",
            )
        )

    calculated_difference = (
        future_comparison_df[
            "xgboost_predicted_demand"
        ]
        - future_comparison_df[
            "random_forest_predicted_demand"
        ]
    )

    difference_matches = np.isclose(
        calculated_difference,
        future_comparison_df[
            "prediction_difference"
        ],
        atol=0.002,
        rtol=0,
        equal_nan=False,
    ).all()

    absolute_difference_matches = np.isclose(
        calculated_difference.abs(),
        future_comparison_df[
            "absolute_prediction_difference"
        ],
        atol=0.002,
        rtol=0,
        equal_nan=False,
    ).all()

    recorder.add(
        category="MODEL_COMPARISON",
        check_name="future_prediction_differences_correct",
        passed=(
            difference_matches
            and absolute_difference_matches
        ),
        details=(
            "XGBoost ve Random Forest gelecek tahmin "
            "farkları doğru hesaplanmalıdır."
        ),
    )

    recorder.add(
        category="MODEL_COMPARISON",
        check_name="future_comparison_covers_forecast",
        passed=(
            len(future_comparison_df)
            == expected_forecast_rows
        ),
        details=(
            f"Karşılaştırma satırı="
            f"{len(future_comparison_df):,}; "
            f"beklenen={expected_forecast_rows:,}"
        ),
    )

    return {
        "backtest_comparison_row_count": int(
            len(backtest_df)
        ),
        "future_comparison_row_count": int(
            len(future_comparison_df)
        ),
        "xgboost_better_row_count": int(
            (
                backtest_df[
                    "better_model_for_row"
                ]
                == "XGBOOST"
            ).sum()
        ),
        "random_forest_better_row_count": int(
            (
                backtest_df[
                    "better_model_for_row"
                ]
                == "RANDOM_FOREST"
            ).sum()
        ),
        "tie_row_count": int(
            (
                backtest_df[
                    "better_model_for_row"
                ]
                == "TIE"
            ).sum()
        ),
    }


# =====================================================
# 10. MÜŞTERİ VE ADMIN ÇIKTILARI
# =====================================================

def validate_customer_outputs(
    recorder: CheckRecorder,
) -> dict:
    """
    RFM, K-Means ve admin paneli analitik
    çıktılarını doğrular.
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

    validate_columns(
        pd.DataFrame(
            columns=admin_header
        ),
        admin_required_columns,
        admin_file.name,
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
        not rfm_df[
            "user_id"
        ].duplicated().any()
        and not segment_df[
            "user_id"
        ].duplicated().any()
        and not admin_df[
            "user_id"
        ].duplicated().any()
        and not top_df[
            "user_id"
        ].duplicated().any()
    )

    recorder.add(
        category="CUSTOMER_ANALYTICS",
        check_name="customer_user_ids_unique",
        passed=uniqueness_valid,
        details=(
            "RFM, K-Means, admin ve top öneri "
            "çıktılarında user_id tekrar etmemelidir."
        ),
    )

    rfm_user_ids = set(
        rfm_df[
            "user_id"
        ].astype(int)
    )

    segment_user_ids = set(
        segment_df[
            "user_id"
        ].astype(int)
    )

    admin_user_ids = set(
        admin_df[
            "user_id"
        ].astype(int)
    )

    customer_coverage_valid = (
        rfm_user_ids
        == segment_user_ids
        == admin_user_ids
    )

    recorder.add(
        category="CUSTOMER_ANALYTICS",
        check_name="rfm_kmeans_admin_coverage_matches",
        passed=customer_coverage_valid,
        details=(
            f"RFM={len(rfm_user_ids):,}; "
            f"K-Means={len(segment_user_ids):,}; "
            f"admin={len(admin_user_ids):,}"
        ),
    )

    top_ids_subset = set(
        top_df[
            "user_id"
        ].astype(int)
    ).issubset(
        admin_user_ids
    )

    recorder.add(
        category="ADMIN_CONTRACT",
        check_name="top_recommendations_are_admin_subset",
        passed=top_ids_subset,
        details=(
            "Top 1000 müşterileri ana admin "
            "öneri çıktısında bulunmalıdır."
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
        check_name="customer_currency_is_try",
        passed=currency_valid,
        details=(
            "RFM ve admin monetary para birimi TRY olmalıdır."
        ),
    )

    segmentation_version_valid = (
        segment_df[
            "segmentation_model_version"
        ]
        .astype("string")
        .eq(
            EXPECTED_SEGMENTATION_MODEL_VERSION
        )
        .all()
    )

    recorder.add(
        category="CUSTOMER_ANALYTICS",
        check_name="segmentation_version_valid",
        passed=segmentation_version_valid,
        details=(
            "Beklenen segmentasyon sürümü: "
            f"{EXPECTED_SEGMENTATION_MODEL_VERSION}"
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
        category="ADMIN_CONTRACT",
        check_name="recommendation_types_valid",
        passed=recommendation_types_valid,
        details=(
            "Admin recommendation_type alanları "
            "tanımlı kodlardan oluşmalıdır."
        ),
    )

    auto_execute_values = convert_boolean(
        admin_df["auto_execute"],
        "admin.auto_execute",
    )

    recorder.add(
        category="ADMIN_CONTRACT",
        check_name="admin_recommendations_not_auto_executed",
        passed=(
            not auto_execute_values.any()
        ),
        details=(
            "Data Science müşteri önerileri "
            "otomatik uygulanmamalıdır."
        ),
    )

    priority_scores = pd.to_numeric(
        admin_df[
            "priority_score"
        ],
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
            "priority_score 0–100 ve "
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
            "Top kuyruk en fazla 1000 satır, "
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
            "Admin analitik sözleşmesinde doğrudan "
            "iletişim ve kimlik bilgisi bulunmuyor."
            if not direct_pii_columns
            else (
                "Bulunan kişisel veri sütunları: "
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
        "actionable_customer_count": int(
            convert_boolean(
                admin_df["is_actionable"],
                "admin.is_actionable",
            ).sum()
        ),
    }


# =====================================================
# 11. MODEL VE RAPOR DOĞRULAMASI
# =====================================================

def validate_models_and_reports(
    recorder: CheckRecorder,
) -> dict:
    """
    XGBoost ve K-Means model bundle'larını, metadata'yı
    ve model seçimi raporunu doğrular.
    """

    xgboost_bundle_file = (
        DEMAND_MODEL_DIR
        / "xgboost_weather_bundle.joblib"
    )

    xgboost_native_file = (
        DEMAND_MODEL_DIR
        / "xgboost_weather_model.json"
    )

    xgboost_metadata_file = (
        DEMAND_MODEL_DIR
        / "xgboost_weather_metadata.json"
    )

    kmeans_bundle_file = (
        SEGMENTATION_MODEL_DIR
        / "kmeans_customer_segmentation_bundle.joblib"
    )

    kmeans_metadata_file = (
        SEGMENTATION_MODEL_DIR
        / "preprocessing_metadata.json"
    )

    xgboost_bundle = joblib.load(
        xgboost_bundle_file
    )

    xgboost_metadata = read_json(
        xgboost_metadata_file
    )

    native_xgboost_json = read_json(
        xgboost_native_file
    )

    kmeans_bundle = joblib.load(
        kmeans_bundle_file
    )

    kmeans_metadata = read_json(
        kmeans_metadata_file
    )

    xgboost_bundle_valid = (
        isinstance(
            xgboost_bundle,
            dict,
        )
        and {
            "preprocessor",
            "model",
            "zone_demand_thresholds",
            "metadata",
        }.issubset(
            xgboost_bundle.keys()
        )
    )

    recorder.add(
        category="MODEL",
        check_name="xgboost_bundle_structure_valid",
        passed=xgboost_bundle_valid,
        details=(
            "XGBoost bundle preprocessor, model, "
            "zone thresholds ve metadata içermelidir."
        ),
    )

    native_model_valid = (
        isinstance(
            native_xgboost_json,
            dict,
        )
        and len(
            native_xgboost_json
        ) > 0
    )

    recorder.add(
        category="MODEL",
        check_name="native_xgboost_json_valid",
        passed=native_model_valid,
        details=(
            "Native XGBoost model dosyası geçerli JSON olmalıdır."
        ),
    )

    xgboost_version_valid = (
        xgboost_metadata.get(
            "model_version"
        )
        == EXPECTED_XGBOOST_MODEL_VERSION
    )

    recorder.add(
        category="MODEL",
        check_name="xgboost_metadata_version_valid",
        passed=xgboost_version_valid,
        details=(
            "Metadata model_version="
            f"{xgboost_metadata.get('model_version')}"
        ),
    )

    bundle_metadata = (
        xgboost_bundle.get(
            "metadata",
            {},
        )
        if isinstance(
            xgboost_bundle,
            dict,
        )
        else {}
    )

    bundle_version_valid = (
        bundle_metadata.get(
            "model_version"
        )
        == EXPECTED_XGBOOST_MODEL_VERSION
    )

    recorder.add(
        category="MODEL",
        check_name="bundle_metadata_version_valid",
        passed=bundle_version_valid,
        details=(
            "Bundle içindeki model_version "
            "harici metadata ile uyumlu olmalıdır."
        ),
    )

    selected_boosting_rounds = int(
        xgboost_metadata.get(
            "selected_boosting_rounds",
            0,
        )
    )

    recorder.add(
        category="MODEL",
        check_name="selected_boosting_rounds_valid",
        passed=(
            selected_boosting_rounds > 0
        ),
        details=(
            "Seçilen boosting turu="
            f"{selected_boosting_rounds}"
        ),
    )

    model_features = set(
        xgboost_metadata.get(
            "all_model_features",
            [],
        )
    )

    leakage_features = (
        model_features
        .intersection(
            FORBIDDEN_LEAKAGE_FEATURES
        )
    )

    recorder.add(
        category="MODEL",
        check_name="xgboost_model_has_no_leakage_features",
        passed=not leakage_features,
        details=(
            "XGBoost özelliklerinde target leakage bulunmuyor."
            if not leakage_features
            else (
                "Leakage özellikleri: "
                f"{sorted(leakage_features)}"
            )
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
        check_name="kmeans_bundle_structure_valid",
        passed=kmeans_bundle_valid,
        details=(
            "K-Means bundle model, scaler ve "
            "metadata içermelidir."
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
        check_name="kmeans_metadata_version_valid",
        passed=kmeans_version_valid,
        details=(
            "K-Means model_version="
            f"{kmeans_metadata.get('model_version')}"
        ),
    )

    # -------------------------------------------------
    # Model performansı ve seçim raporu
    # -------------------------------------------------

    metrics_summary = read_json(
        XGBOOST_REPORT_DIR
        / "xgboost_model_metrics.json"
    )

    model_selection = read_json(
        XGBOOST_REPORT_DIR
        / "model_selection_recommendation.json"
    )

    xgboost_metrics = metrics_summary.get(
        "xgboost_metrics",
        {}
    )

    random_forest_metrics = metrics_summary.get(
        "random_forest_metrics",
        {}
    )

    seasonal_metrics = metrics_summary.get(
        "seasonal_naive_metrics",
        {}
    )

    metric_records = [
        {
            "model": "XGBOOST_WEATHER",
            "mae": float(
                xgboost_metrics.get(
                    "mae",
                    np.inf,
                )
            ),
            "rmse": float(
                xgboost_metrics.get(
                    "rmse",
                    np.inf,
                )
            ),
        },
        {
            "model": "RANDOM_FOREST_WEATHER",
            "mae": float(
                random_forest_metrics.get(
                    "mae",
                    np.inf,
                )
            ),
            "rmse": float(
                random_forest_metrics.get(
                    "rmse",
                    np.inf,
                )
            ),
        },
        {
            "model": "SEASONAL_NAIVE_168H",
            "mae": float(
                seasonal_metrics.get(
                    "mae",
                    np.inf,
                )
            ),
            "rmse": float(
                seasonal_metrics.get(
                    "rmse",
                    np.inf,
                )
            ),
        },
    ]

    metrics_are_finite = all(
        np.isfinite(
            record["mae"]
        )
        and np.isfinite(
            record["rmse"]
        )
        for record in metric_records
    )

    recorder.add(
        category="MODEL_QUALITY",
        check_name="model_metrics_are_finite",
        passed=metrics_are_finite,
        details=(
            "XGBoost, Random Forest ve seasonal "
            "baseline MAE/RMSE değerleri sayısal olmalıdır."
        ),
    )

    calculated_best_model = sorted(
        metric_records,
        key=lambda record: (
            record["mae"],
            record["rmse"],
        ),
    )[0]["model"]

    reported_best_model = (
        model_selection.get(
            "recommended_model_by_test_mae"
        )
    )

    model_selection_valid = (
        reported_best_model
        in ALLOWED_SELECTED_MODELS
        and reported_best_model
        == calculated_best_model
    )

    recorder.add(
        category="MODEL_QUALITY",
        check_name="model_selection_matches_metrics",
        passed=model_selection_valid,
        details=(
            f"Raporlanan={reported_best_model}; "
            f"metrikten hesaplanan={calculated_best_model}"
        ),
    )

    recorder.add(
        category="MODEL_QUALITY",
        check_name="xgboost_selected_as_best_model",
        passed=(
            calculated_best_model
            == "XGBOOST_WEATHER"
        ),
        details=(
            "XGBoost test MAE/RMSE sonucunda en iyi modeldir."
            if calculated_best_model
            == "XGBOOST_WEATHER"
            else (
                "En iyi model XGBoost değil: "
                f"{calculated_best_model}. "
                "Paket karşılaştırma ve entegrasyon "
                "amacıyla yine oluşturulabilir."
            )
        ),
        severity="WARNING",
    )

    automatic_deployment_disabled = (
        model_selection.get(
            "automatic_production_deployment"
        )
        is False
    )

    recorder.add(
        category="MODEL_QUALITY",
        check_name="model_selection_does_not_auto_deploy",
        passed=automatic_deployment_disabled,
        details=(
            "Model seçimi otomatik production deployment "
            "başlatmamalıdır."
        ),
    )

    # -------------------------------------------------
    # Core pipeline raporu
    # -------------------------------------------------

    core_validation_summary = read_json(
        CORE_VALIDATION_REPORT_DIR
        / "core_output_validation_summary.json"
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
            "12_validate_core_outputs sonucu "
            "başarılı olmalıdır."
        ),
    )

    return {
        "selected_boosting_rounds": (
            selected_boosting_rounds
        ),
        "xgboost_mae": float(
            xgboost_metrics.get(
                "mae",
                np.inf,
            )
        ),
        "random_forest_mae": float(
            random_forest_metrics.get(
                "mae",
                np.inf,
            )
        ),
        "seasonal_naive_mae": float(
            seasonal_metrics.get(
                "mae",
                np.inf,
            )
        ),
        "recommended_model": (
            calculated_best_model
        ),
        "xgboost_is_recommended_model": (
            calculated_best_model
            == "XGBOOST_WEATHER"
        ),
        "core_validation_passed": (
            core_validation_passed
        ),
    }


# =====================================================
# 12. BACKEND ENTEGRASYON README
# =====================================================

def create_integration_readme(
    release_id: str,
    recommended_model: str,
) -> str:
    """
    Backend, Pricing Service ve admin paneli için
    entegrasyon notu oluşturur.
    """

    return f"""# XGBoost Weather Data Science Release

Release ID: `{release_id}`  
Package version: `{PACKAGE_VERSION}`  
XGBoost model version: `{EXPECTED_XGBOOST_MODEL_VERSION}`  
Customer segmentation model: `{EXPECTED_SEGMENTATION_MODEL_VERSION}`  
Recommended model by test metrics: `{recommended_model}`

## Package Purpose

This package contains:

1. XGBoost hourly pricing-zone demand forecasts
2. Weather-aware surge recommendations
3. Random Forest and XGBoost comparison outputs
4. RFM and K-Means customer segmentation
5. Admin customer recommendations
6. Model files, metadata and validation reports

## This Is Not a SQL Import Package

This package must not replace the main database tables.

It intentionally does not contain:

- `users.csv`
- `vehicles.csv`
- `reservations.csv`
- `reservation_status_history.csv`
- `loyalty_accounts.csv`

Backend-ready SQL import files are prepared separately by:

`22_prepare_backend_ready_csvs.py`

A weather-enriched analytics file has not been renamed to
`reservations.csv`.

## Pricing Service Contract

File:

`backend_contract/pricing_service_surge_recommendations.csv`

Primary key:

- `zone_id`
- `demand_hour_utc`

Important fields:

- `predicted_demand`
- `predicted_demand_level`
- `prediction_lower_80`
- `prediction_upper_80`
- `recommended_surge_multiplier`
- `surge_reason`
- `pricing_rule_merge_strategy`
- `requires_pricing_service_validation`
- `auto_apply`

Rules:

- `auto_apply` is always `false`.
- `requires_pricing_service_validation` is always `true`.
- `pricing_rule_merge_strategy` is `MAX`.
- Pricing Service compares the model recommendation with active
  configured pricing rules.
- The highest valid multiplier is selected.
- Minimum-price and other business rules remain authoritative.
- Data Science does not update reservation prices directly.

## Admin Contract

Files:

- `backend_contract/admin_customer_recommendations.csv`
- `backend_contract/admin_top_1000_customer_recommendations.csv`

Primary key:

- `user_id`

These outputs do not include direct:

- phone number
- e-mail
- first name
- last name
- password hash

The backend may join `user_id` with User Service data after
authorization.

Recommendations are decision-support records only:

- They do not create campaigns.
- They do not send notifications.
- They do not apply discounts.
- They do not change loyalty tiers.
- `auto_execute` is always `false`.

## XGBoost Model Files

Full inference bundle:

`models/demand_forecast/xgboost_weather_bundle.joblib`

The bundle contains:

- One-hot preprocessor
- XGBoost model
- Zone demand thresholds
- Metadata

Native XGBoost model:

`models/demand_forecast/xgboost_weather_model.json`

The native JSON contains the XGBoost tree model only. It does not
contain the one-hot encoder or original feature order. Use the joblib
bundle for complete Python inference.

## Model Selection

Report:

`reports/demand/model_selection_recommendation.json`

The package may still be generated when Random Forest or the seasonal
baseline has a lower test error. In that case, this XGBoost release
should be treated as a comparison and integration artifact rather than
the automatically selected production model.

Model deployment is never automatic.

## Weather Warning

Check:

`reports/weather/weather_feature_summary.json`

When weather data is synthetic, the outputs are suitable for internship
simulation and integration testing only. They do not prove a real-world
causal relationship between weather and demand.

## Integrity

- `release_manifest.csv` contains file paths, sizes and SHA-256 hashes.
- `checksums.sha256` can be used to verify package integrity.
- `reports/release_validation_checks.csv` contains all validation results.
"""


# =====================================================
# 13. DOSYALARI STAGING KLASÖRÜNE KOPYALAMA
# =====================================================

def copy_package_items(
    staging_directory: Path,
) -> list[dict]:
    """
    Kaynak dosyaları staging klasörüne kopyalar.
    """

    copied_rows = []

    for item in PACKAGE_ITEMS:
        if not item.source_path.exists():
            if item.required:
                raise FileNotFoundError(
                    "Gerekli paket kaynağı bulunamadı:\n"
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
            f"   → "
            f"{item.target_relative_path.as_posix()}"
        )

    return copied_rows


# =====================================================
# 14. RELEASE MANIFESTOSU
# =====================================================

def create_release_manifest(
    staging_directory: Path,
    copied_rows: list[dict],
) -> pd.DataFrame:
    """
    Paket dosyaları için boyut, satır sayısı ve SHA-256
    manifestosu oluşturur.
    """

    copied_lookup = {
        row["package_path"]: row
        for row in copied_rows
    }

    ignored_files = {
        "release_manifest.csv",
        "checksums.sha256",
    }

    manifest_rows = []

    for file_path in sorted(
        staging_directory.rglob("*")
    ):
        if not file_path.is_file():
            continue

        if file_path.name in ignored_files:
            continue

        relative_path = (
            file_path.relative_to(
                staging_directory
            ).as_posix()
        )

        source_metadata = (
            copied_lookup.get(
                relative_path,
                {},
            )
        )

        size_bytes = int(
            file_path.stat().st_size
        )

        manifest_rows.append(
            {
                "logical_name": (
                    source_metadata.get(
                        "logical_name",
                        "package_generated_file",
                    )
                ),
                "category": (
                    source_metadata.get(
                        "category",
                        "PACKAGE_METADATA",
                    )
                ),
                "source_path": (
                    source_metadata.get(
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
                "size_bytes": (
                    size_bytes
                ),
                "size_mb": round(
                    size_bytes
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
# 15. CHECKSUM DOSYASI
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

    (
        staging_directory
        / "checksums.sha256"
    ).write_text(
        "\n".join(
            checksum_rows
        ) + "\n",
        encoding="utf-8",
    )


# =====================================================
# 16. RELEASE PAKETİ OLUŞTURMA
# =====================================================

def create_release_package(
    recorder: CheckRecorder,
    validation_results: dict,
) -> tuple[
    pd.DataFrame,
    dict,
]:
    """
    Paketi önce staging klasöründe oluşturur.

    Tüm işlemler başarılı olursa final klasörüne taşır.
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

        readme_text = create_integration_readme(
            release_id=release_id,
            recommended_model=(
                validation_results[
                    "models"
                ][
                    "recommended_model"
                ]
            ),
        )

        (
            STAGING_RELEASE_DIR
            / "README_BACKEND_INTEGRATION.md"
        ).write_text(
            readme_text,
            encoding="utf-8",
        )

        # ---------------------------------------------
        # Doğrulama raporu
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
            "release_id": (
                release_id
            ),
            "release_name": (
                RELEASE_NAME
            ),
            "package_version": (
                PACKAGE_VERSION
            ),
            "created_at_utc": (
                release_created_at.isoformat()
            ),
            "xgboost_model_version": (
                EXPECTED_XGBOOST_MODEL_VERSION
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
                    "forecast"
                ]
            ),
            "model_comparison": (
                validation_results[
                    "comparison"
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
                "XGBoost Data Science analytics, "
                "model artifacts and read-only "
                "backend integration contracts."
            ),
            "is_sql_import_package": False,
            "contains_users_sql_table": False,
            "contains_vehicles_sql_table": False,
            "contains_reservations_sql_table": False,
            "contains_status_history_sql_table": False,
            "contains_weather_enriched_reservations_as_sql_table": False,
            "pricing_service_auto_apply": False,
            "pricing_service_validation_required": True,
            "pricing_rule_merge_strategy": (
                "MAX"
            ),
            "admin_recommendations_auto_execute": False,
            "recommended_model_by_test_metrics": (
                validation_results[
                    "models"
                ][
                    "recommended_model"
                ]
            ),
            "xgboost_selected_as_recommended": (
                validation_results[
                    "models"
                ][
                    "xgboost_is_recommended_model"
                ]
            ),
            "automatic_model_deployment": False,
            "currency": (
                EXPECTED_CURRENCY
            ),
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

        manifest_df = create_release_manifest(
            staging_directory=(
                STAGING_RELEASE_DIR
            ),
            copied_rows=copied_rows,
        )

        create_checksum_file(
            staging_directory=(
                STAGING_RELEASE_DIR
            )
        )

        # ---------------------------------------------
        # Final release klasörüne atomik taşıma
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
# 17. DIŞ ÖZET RAPORU
# =====================================================

def save_external_summary(
    recorder: CheckRecorder,
    manifest_df: pd.DataFrame | None,
    release_metadata: dict | None,
) -> None:
    """
    Release klasöründen bağımsız hazırlama özeti oluşturur.
    """

    save_validation_checks(
        recorder=recorder
    )

    summary = {
        "release_name": (
            RELEASE_NAME
        ),
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
            release_metadata
            is not None
        ),
        "packaged_file_count": (
            int(
                len(manifest_df)
            )
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
        "recommended_model": (
            release_metadata.get(
                "recommended_model_by_test_metrics"
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
# 18. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 78)
    print("17 — XGBOOST WEATHER ÇIKTILARININ PAKETLENMESİ")
    print("=" * 78)

    recorder = CheckRecorder()

    print(
        "\n1/6 Kaynak dosyalar kontrol ediliyor..."
    )

    validate_package_sources(
        recorder=recorder
    )

    if recorder.failed_error_count() > 0:
        save_external_summary(
            recorder=recorder,
            manifest_df=None,
            release_metadata=None,
        )

        raise FileNotFoundError(
            "XGBoost paketi için gerekli "
            "kaynak dosyalar eksik.\n\n"
            f"Kontrol raporu:\n"
            f"{EXTERNAL_VALIDATION_FILE}"
        )

    print(
        "\n2/6 XGBoost forecast ve Pricing Service "
        "sözleşmesi doğrulanıyor..."
    )

    forecast_result = (
        validate_forecast_and_pricing_contract(
            recorder=recorder
        )
    )

    print(
        "\n3/6 Random Forest ve XGBoost "
        "karşılaştırmaları doğrulanıyor..."
    )

    comparison_result = (
        validate_model_comparison_outputs(
            recorder=recorder,
            expected_forecast_rows=(
                forecast_result[
                    "forecast_row_count"
                ]
            ),
        )
    )

    print(
        "\n4/6 RFM, K-Means ve admin "
        "çıktıları doğrulanıyor..."
    )

    customer_result = (
        validate_customer_outputs(
            recorder=recorder
        )
    )

    print(
        "\n5/6 Model bundle, metadata ve "
        "model seçimi doğrulanıyor..."
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
        "forecast": (
            forecast_result
        ),
        "comparison": (
            comparison_result
        ),
        "customers": (
            customer_result
        ),
        "models": (
            model_result
        ),
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
            "XGBoost çıktılarında hata bulundu.\n"
            "Teslim paketi oluşturulmadı.\n\n"
            f"Kontrol raporu:\n"
            f"{EXTERNAL_VALIDATION_FILE}"
        )

    print(
        "\n6/6 Sürümlenmiş XGBoost "
        "teslim paketi oluşturuluyor..."
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
    print("XGBOOST WEATHER TESLİM PAKETİ HAZIR")
    print("=" * 78)

    print(
        f"Release ID         : "
        f"{release_metadata['release_id']}"
    )

    print(
        f"Paket klasörü      : "
        f"{FINAL_RELEASE_DIR}"
    )

    print(
        f"Paket dosya sayısı : "
        f"{len(manifest_df):,}"
    )

    print(
        f"Başarısız kontrol  : "
        f"{recorder.failed_error_count():,}"
    )

    print(
        f"Uyarı              : "
        f"{recorder.warning_count():,}"
    )

    print(
        "Önerilen model     : "
        f"{model_result['recommended_model']}"
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
        "\nXGBoost model dosyaları:"
    )

    print(
        "- models/demand_forecast/"
        "xgboost_weather_bundle.joblib"
    )

    print(
        "- models/demand_forecast/"
        "xgboost_weather_model.json"
    )

    print(
        "- models/demand_forecast/"
        "xgboost_weather_metadata.json"
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
        "final_outputs klasörü kullanılmadı."
    )
    print(
        "Random Forest paketi üzerine yazılmadı."
    )
    print(
        "Eski XGBoost dosya isimleri kaldırıldı."
    )
    print(
        "Hava durumlu rezervasyonlar "
        "reservations.csv olarak paketlenmedi."
    )
    print(
        "SQL ana tablolarıyla Data Science "
        "çıktıları birbirinden ayrıldı."
    )
    print(
        "Forecast aktif zone × 24 saat "
        "kapsamıyla doğrulandı."
    )
    print(
        "XGBoost forecast ve Pricing Service "
        "sözleşmesi karşılaştırıldı."
    )
    print(
        "Surge auto_apply=false olarak doğrulandı."
    )
    print(
        "Pricing Service doğrulaması zorunlu tutuldu."
    )
    print(
        "Pricing rule merge stratejisi MAX."
    )
    print(
        "XGBoost ve Random Forest karşılaştırma "
        "çıktıları doğrulandı."
    )
    print(
        "Model seçimi gerçek test metrikleriyle "
        "yeniden hesaplandı."
    )
    print(
        "XGBoost preprocessor ve model bundle eklendi."
    )
    print(
        "Native XGBoost JSON modeli eklendi."
    )
    print(
        "RFM, K-Means ve admin müşteri kapsamı "
        "karşılaştırıldı."
    )
    print(
        "Admin çıktılarında doğrudan kişisel "
        "veri bulunmadığı doğrulandı."
    )
    print(
        "SHA-256 manifestosu oluşturuldu."
    )
    print(
        "Hatalı işlemde staging klasörü siliniyor."
    )
    print(
        "Eksik dosyayla kısmi paket oluşturulmuyor."
    )

    if not model_result[
        "xgboost_is_recommended_model"
    ]:
        print(
            "\n XGBoost test metriklerine göre "
            "en başarılı model değildir."
        )

        print(
            "Paket karşılaştırma ve entegrasyon "
            "amacıyla oluşturuldu."
        )

        print(
            "Üretim için önerilen model: "
            f"{model_result['recommended_model']}"
        )

    if forecast_result[
        "future_weather_is_synthetic"
    ]:
        print(
            "\n Gelecek hava girdisi sentetik "
            "veya haftalık senaryodur."
        )

   
if __name__ == "__main__":
    main()