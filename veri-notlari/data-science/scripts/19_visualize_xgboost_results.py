import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import matplotlib

# Sunucu, Docker veya CI/CD ortamında ekran gerektirmeden grafik üretir.
matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)


# Windows terminalinde Türkçe karakter desteği
try:
    sys.stdout.reconfigure(encoding="utf-8")
except AttributeError:
    pass


# Matplotlib Türkçe karakter ve negatif işaret ayarları
plt.rcParams["font.family"] = "DejaVu Sans"
plt.rcParams["axes.unicode_minus"] = False


# =====================================================
# 1. GENEL AYARLAR
# =====================================================

VISUALIZATION_VERSION = "xgboost-visualization-v1"

SIMULATION_TIMEZONE = "Europe/Istanbul"

EXPECTED_MODEL_VERSION = "xgboost-demand-weather-v1"

EXPECTED_FORECAST_HOURS = 24

EXPECTED_MODEL_NAMES = [
    "XGBOOST_WEATHER",
    "RANDOM_FOREST_WEATHER",
    "SEASONAL_NAIVE_168H",
]

ALLOWED_DEMAND_LEVELS = {
    "LOW",
    "MEDIUM",
    "HIGH",
}

MIN_SURGE_MULTIPLIER = 1.00
MAX_SURGE_MULTIPLIER = 1.60

SCATTER_SAMPLE_SIZE = 10_000
TOP_FEATURE_COUNT = 15
TOP_ZONE_COUNT = 15
WORST_ZONE_COUNT = 15

PNG_DPI = 300

FAIL_ON_VALIDATION_ERROR = True


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

PROCESSED_DATA_DIR = (
    PROJECT_ROOT
    / "data"
    / "processed"
)

XGBOOST_REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "16_xgboost_demand_prediction_weather"
)

VISUALIZATION_OUTPUT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "visualizations"
    / "19_xgboost_results"
)

REPORT_OUTPUT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "19_visualize_xgboost_results"
)

VISUALIZATION_OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

REPORT_OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# =====================================================
# 3. GİRDİ DOSYALARI
# =====================================================

XGBOOST_BACKTEST_FILE = (
    PROCESSED_DATA_DIR
    / "demand_backtest_xgboost_weather.parquet"
)

BACKTEST_COMPARISON_FILE = (
    PROCESSED_DATA_DIR
    / "demand_backtest_model_comparison_weather.csv"
)

XGBOOST_FORECAST_FILE = (
    PROCESSED_DATA_DIR
    / "demand_forecast_xgboost_weather.parquet"
)

FORECAST_COMPARISON_FILE = (
    PROCESSED_DATA_DIR
    / "demand_forecast_model_comparison_weather.csv"
)

PRICING_SERVICE_FILE = (
    PROCESSED_DATA_DIR
    / "pricing_service_surge_xgboost_weather.csv"
)

MODEL_METRICS_COMPARISON_FILE = (
    XGBOOST_REPORT_DIR
    / "xgboost_random_forest_baseline_comparison.csv"
)

MODEL_METRICS_JSON_FILE = (
    XGBOOST_REPORT_DIR
    / "xgboost_model_metrics.json"
)

BASE_FEATURE_IMPORTANCE_FILE = (
    XGBOOST_REPORT_DIR
    / "xgboost_base_feature_importance.csv"
)

TRAINING_HISTORY_FILE = (
    XGBOOST_REPORT_DIR
    / "xgboost_training_history.csv"
)

ZONE_BACKTEST_METRICS_FILE = (
    XGBOOST_REPORT_DIR
    / "xgboost_zone_backtest_metrics.csv"
)

MODEL_SELECTION_FILE = (
    XGBOOST_REPORT_DIR
    / "model_selection_recommendation.json"
)

FORECAST_SUMMARY_FILE = (
    XGBOOST_REPORT_DIR
    / "xgboost_forecast_summary.json"
)


REQUIRED_FILES = {
    "xgboost_backtest": XGBOOST_BACKTEST_FILE,
    "backtest_comparison": BACKTEST_COMPARISON_FILE,
    "xgboost_forecast": XGBOOST_FORECAST_FILE,
    "forecast_comparison": FORECAST_COMPARISON_FILE,
    "pricing_service": PRICING_SERVICE_FILE,
    "model_metrics_comparison": MODEL_METRICS_COMPARISON_FILE,
    "model_metrics_json": MODEL_METRICS_JSON_FILE,
    "base_feature_importance": BASE_FEATURE_IMPORTANCE_FILE,
    "training_history": TRAINING_HISTORY_FILE,
    "zone_backtest_metrics": ZONE_BACKTEST_METRICS_FILE,
    "model_selection": MODEL_SELECTION_FILE,
    "forecast_summary": FORECAST_SUMMARY_FILE,
}


# =====================================================
# 4. RAPOR ÇIKTILARI
# =====================================================

VALIDATION_CHECKS_FILE = (
    REPORT_OUTPUT_DIR
    / "visualization_validation_checks.csv"
)

METRICS_VERIFICATION_FILE = (
    REPORT_OUTPUT_DIR
    / "model_metrics_verification.csv"
)

HOURLY_BACKTEST_SUMMARY_FILE = (
    REPORT_OUTPUT_DIR
    / "hourly_backtest_summary.csv"
)

HOUR_OF_DAY_SUMMARY_FILE = (
    REPORT_OUTPUT_DIR
    / "hour_of_day_backtest_summary.csv"
)

MODEL_WIN_DISTRIBUTION_FILE = (
    REPORT_OUTPUT_DIR
    / "model_win_distribution.csv"
)

HOURLY_FORECAST_COMPARISON_FILE = (
    REPORT_OUTPUT_DIR
    / "hourly_forecast_model_comparison.csv"
)

DEMAND_LEVEL_DISTRIBUTION_FILE = (
    REPORT_OUTPUT_DIR
    / "forecast_demand_level_distribution.csv"
)

SURGE_DISTRIBUTION_FILE = (
    REPORT_OUTPUT_DIR
    / "forecast_surge_distribution.csv"
)

TOP_ZONE_FORECAST_FILE = (
    REPORT_OUTPUT_DIR
    / "top_zones_by_forecast_demand.csv"
)

WEATHER_FORECAST_SUMMARY_FILE = (
    REPORT_OUTPUT_DIR
    / "weather_forecast_demand_summary.csv"
)

TOP_FEATURES_FILE = (
    REPORT_OUTPUT_DIR
    / "top_base_feature_importance.csv"
)

WORST_ZONE_METRICS_FILE = (
    REPORT_OUTPUT_DIR
    / "worst_zone_backtest_metrics.csv"
)

CHART_MANIFEST_FILE = (
    REPORT_OUTPUT_DIR
    / "chart_manifest.csv"
)

VISUALIZATION_SUMMARY_FILE = (
    REPORT_OUTPUT_DIR
    / "visualization_summary.json"
)

VISUALIZATION_README_FILE = (
    REPORT_OUTPUT_DIR
    / "VISUALIZATION_README.md"
)


# =====================================================
# 5. DOĞRULAMA KAYDEDİCİ
# =====================================================

class CheckRecorder:
    """
    Bütün veri ve grafik doğrulamalarını tek yerde toplar.
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

def require_file(
    file_path: Path,
) -> None:
    """
    Zorunlu dosyanın varlığını kontrol eder.
    """

    if not file_path.exists():
        raise FileNotFoundError(
            f"Gerekli dosya bulunamadı:\n{file_path}"
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


def validate_columns(
    dataframe: pd.DataFrame,
    required_columns: list[str],
    dataframe_name: str,
) -> None:
    """
    DataFrame içinde gerekli sütunları kontrol eder.
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


def calculate_metrics(
    actual: np.ndarray,
    predicted: np.ndarray,
) -> dict:
    """
    Model performans metriklerini hesaplar.
    """

    actual = np.asarray(
        actual,
        dtype=float,
    )

    predicted = np.asarray(
        predicted,
        dtype=float,
    )

    predicted = np.clip(
        predicted,
        0,
        None,
    )

    denominator = float(
        np.abs(actual).sum()
    )

    if denominator == 0:
        wape = 0.0
    else:
        wape = float(
            np.abs(
                actual - predicted
            ).sum()
            / denominator
        )

    smape_denominator = (
        np.abs(actual)
        + np.abs(predicted)
    )

    smape_valid = (
        smape_denominator > 0
    )

    if not smape_valid.any():
        smape = 0.0
    else:
        smape = float(
            np.mean(
                2
                * np.abs(
                    actual[smape_valid]
                    - predicted[smape_valid]
                )
                / smape_denominator[
                    smape_valid
                ]
            )
        )

    return {
        "mae": float(
            mean_absolute_error(
                actual,
                predicted,
            )
        ),
        "rmse": float(
            np.sqrt(
                mean_squared_error(
                    actual,
                    predicted,
                )
            )
        ),
        "r2": float(
            r2_score(
                actual,
                predicted,
            )
        ),
        "wape": wape,
        "smape": smape,
        "actual_total": float(
            actual.sum()
        ),
        "predicted_total": float(
            predicted.sum()
        ),
    }


def json_safe(value):
    """
    NumPy ve Pandas veri tiplerini JSON uyumlu hale getirir.
    """

    if isinstance(value, dict):
        return {
            str(key): json_safe(item)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple)):
        return [
            json_safe(item)
            for item in value
        ]

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


def clear_output_directories() -> None:
    """
    Önceki çalıştırmadan kalan PNG dosyalarını temizler.
    """

    for image_file in (
        VISUALIZATION_OUTPUT_DIR.glob("*.png")
    ):
        image_file.unlink()


# =====================================================
# 7. GİRDİLERİ OKUMA
# =====================================================

def load_inputs() -> dict:
    """
    XGBoost model, backtest, forecast ve rapor girdilerini okur.
    """

    for file_path in REQUIRED_FILES.values():
        require_file(file_path)

    xgboost_backtest_df = pd.read_parquet(
        XGBOOST_BACKTEST_FILE
    )

    backtest_comparison_df = pd.read_csv(
        BACKTEST_COMPARISON_FILE,
        low_memory=False,
    )

    xgboost_forecast_df = pd.read_parquet(
        XGBOOST_FORECAST_FILE
    )

    forecast_comparison_df = pd.read_csv(
        FORECAST_COMPARISON_FILE,
        low_memory=False,
    )

    pricing_df = pd.read_csv(
        PRICING_SERVICE_FILE,
        low_memory=False,
    )

    metrics_df = pd.read_csv(
        MODEL_METRICS_COMPARISON_FILE,
        low_memory=False,
    )

    feature_importance_df = pd.read_csv(
        BASE_FEATURE_IMPORTANCE_FILE,
        low_memory=False,
    )

    training_history_df = pd.read_csv(
        TRAINING_HISTORY_FILE,
        low_memory=False,
    )

    zone_metrics_df = pd.read_csv(
        ZONE_BACKTEST_METRICS_FILE,
        low_memory=False,
    )

    model_metrics_json = read_json(
        MODEL_METRICS_JSON_FILE
    )

    model_selection_json = read_json(
        MODEL_SELECTION_FILE
    )

    forecast_summary_json = read_json(
        FORECAST_SUMMARY_FILE
    )

    return {
        "xgboost_backtest": xgboost_backtest_df,
        "backtest_comparison": backtest_comparison_df,
        "xgboost_forecast": xgboost_forecast_df,
        "forecast_comparison": forecast_comparison_df,
        "pricing": pricing_df,
        "metrics": metrics_df,
        "feature_importance": feature_importance_df,
        "training_history": training_history_df,
        "zone_metrics": zone_metrics_df,
        "model_metrics_json": model_metrics_json,
        "model_selection_json": model_selection_json,
        "forecast_summary_json": forecast_summary_json,
    }


# =====================================================
# 8. VERİLERİ HAZIRLAMA
# =====================================================

def prepare_inputs(
    data: dict,
) -> dict:
    """
    Veri tiplerini grafik ve doğrulama için hazırlar.
    """

    xgb_backtest = data[
        "xgboost_backtest"
    ].copy()

    backtest_comparison = data[
        "backtest_comparison"
    ].copy()

    xgb_forecast = data[
        "xgboost_forecast"
    ].copy()

    forecast_comparison = data[
        "forecast_comparison"
    ].copy()

    pricing = data[
        "pricing"
    ].copy()

    metrics = data[
        "metrics"
    ].copy()

    feature_importance = data[
        "feature_importance"
    ].copy()

    training_history = data[
        "training_history"
    ].copy()

    zone_metrics = data[
        "zone_metrics"
    ].copy()

    # -------------------------------------------------
    # Zorunlu sütunlar
    # -------------------------------------------------

    validate_columns(
        xgb_backtest,
        [
            "zone_id",
            "zone_name",
            "demand_hour_utc",
            "demand_count",
            "predicted_demand",
            "prediction_lower_80",
            "prediction_upper_80",
            "weather_condition",
            "weather_is_synthetic",
        ],
        "demand_backtest_xgboost_weather.parquet",
    )

    validate_columns(
        backtest_comparison,
        [
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
        ],
        "demand_backtest_model_comparison_weather.csv",
    )

    validate_columns(
        xgb_forecast,
        [
            "zone_id",
            "zone_name",
            "zone_category",
            "demand_hour_utc",
            "demand_hour_local",
            "forecast_horizon_hour",
            "predicted_demand",
            "prediction_lower_80",
            "prediction_upper_80",
            "predicted_demand_level",
            "weather_condition",
            "weather_is_synthetic",
            "recommended_surge_multiplier",
            "pricing_rule_merge_strategy",
            "requires_pricing_service_validation",
            "auto_apply",
            "forecast_model_version",
        ],
        "demand_forecast_xgboost_weather.parquet",
    )

    validate_columns(
        forecast_comparison,
        [
            "zone_id",
            "zone_name",
            "demand_hour_utc",
            "xgboost_predicted_demand",
            "random_forest_predicted_demand",
            "xgboost_recommended_surge",
            "random_forest_recommended_surge",
            "prediction_difference",
            "absolute_prediction_difference",
        ],
        "demand_forecast_model_comparison_weather.csv",
    )

    validate_columns(
        pricing,
        [
            "zone_id",
            "zone_name",
            "demand_hour_utc",
            "predicted_demand",
            "predicted_demand_level",
            "recommended_surge_multiplier",
            "pricing_rule_merge_strategy",
            "requires_pricing_service_validation",
            "auto_apply",
            "forecast_model_version",
        ],
        "pricing_service_surge_xgboost_weather.csv",
    )

    validate_columns(
        metrics,
        [
            "model",
            "mae",
            "rmse",
            "r2",
            "wape",
            "smape",
            "actual_total",
            "predicted_total",
        ],
        "xgboost_random_forest_baseline_comparison.csv",
    )

    validate_columns(
        feature_importance,
        [
            "base_feature",
            "importance",
            "importance_percentage",
            "transformed_feature_count",
        ],
        "xgboost_base_feature_importance.csv",
    )

    validate_columns(
        training_history,
        [
            "boosting_round",
            "validation_mae_log_scale",
            "selected_round",
        ],
        "xgboost_training_history.csv",
    )

    validate_columns(
        zone_metrics,
        [
            "zone_id",
            "zone_name",
            "test_hour_count",
            "mae",
            "rmse",
            "r2",
            "wape",
            "smape",
            "actual_total",
            "predicted_total",
        ],
        "xgboost_zone_backtest_metrics.csv",
    )

    # -------------------------------------------------
    # Tarihler
    # -------------------------------------------------

    for dataframe in [
        xgb_backtest,
        backtest_comparison,
        xgb_forecast,
        forecast_comparison,
        pricing,
    ]:
        dataframe["demand_hour_utc"] = pd.to_datetime(
            dataframe["demand_hour_utc"],
            errors="coerce",
            utc=True,
        )

    # -------------------------------------------------
    # Sayısal alanlar
    # -------------------------------------------------

    numeric_configurations = [
        (
            xgb_backtest,
            [
                "zone_id",
                "demand_count",
                "predicted_demand",
                "prediction_lower_80",
                "prediction_upper_80",
                "weather_is_synthetic",
            ],
        ),
        (
            backtest_comparison,
            [
                "zone_id",
                "demand_count",
                "xgboost_predicted_demand",
                "random_forest_predicted_demand",
                "seasonal_naive_prediction",
                "xgboost_absolute_error",
                "random_forest_absolute_error",
            ],
        ),
        (
            xgb_forecast,
            [
                "zone_id",
                "forecast_horizon_hour",
                "predicted_demand",
                "prediction_lower_80",
                "prediction_upper_80",
                "weather_is_synthetic",
                "recommended_surge_multiplier",
            ],
        ),
        (
            forecast_comparison,
            [
                "zone_id",
                "xgboost_predicted_demand",
                "random_forest_predicted_demand",
                "xgboost_recommended_surge",
                "random_forest_recommended_surge",
                "prediction_difference",
                "absolute_prediction_difference",
            ],
        ),
        (
            pricing,
            [
                "zone_id",
                "predicted_demand",
                "recommended_surge_multiplier",
            ],
        ),
        (
            metrics,
            [
                "mae",
                "rmse",
                "r2",
                "wape",
                "smape",
                "actual_total",
                "predicted_total",
            ],
        ),
        (
            feature_importance,
            [
                "importance",
                "importance_percentage",
                "transformed_feature_count",
            ],
        ),
        (
            training_history,
            [
                "boosting_round",
                "validation_mae_log_scale",
            ],
        ),
        (
            zone_metrics,
            [
                "zone_id",
                "test_hour_count",
                "mae",
                "rmse",
                "r2",
                "wape",
                "smape",
                "actual_total",
                "predicted_total",
            ],
        ),
    ]

    for dataframe, columns in numeric_configurations:
        for column in columns:
            dataframe[column] = pd.to_numeric(
                dataframe[column],
                errors="coerce",
            )

    # -------------------------------------------------
    # Boolean alanlar
    # -------------------------------------------------

    xgb_forecast[
        "requires_pricing_service_validation"
    ] = convert_boolean(
        xgb_forecast[
            "requires_pricing_service_validation"
        ],
        (
            "forecast."
            "requires_pricing_service_validation"
        ),
    )

    xgb_forecast["auto_apply"] = convert_boolean(
        xgb_forecast["auto_apply"],
        "forecast.auto_apply",
    )

    pricing[
        "requires_pricing_service_validation"
    ] = convert_boolean(
        pricing[
            "requires_pricing_service_validation"
        ],
        (
            "pricing."
            "requires_pricing_service_validation"
        ),
    )

    pricing["auto_apply"] = convert_boolean(
        pricing["auto_apply"],
        "pricing.auto_apply",
    )

    training_history[
        "selected_round"
    ] = convert_boolean(
        training_history[
            "selected_round"
        ],
        "training_history.selected_round",
    )

    # -------------------------------------------------
    # Yerel saatler
    # -------------------------------------------------

    backtest_comparison[
        "demand_hour_local"
    ] = (
        backtest_comparison[
            "demand_hour_utc"
        ]
        .dt.tz_convert(
            SIMULATION_TIMEZONE
        )
    )

    xgb_forecast[
        "demand_hour_local"
    ] = (
        xgb_forecast[
            "demand_hour_utc"
        ]
        .dt.tz_convert(
            SIMULATION_TIMEZONE
        )
    )

    forecast_comparison[
        "demand_hour_local"
    ] = (
        forecast_comparison[
            "demand_hour_utc"
        ]
        .dt.tz_convert(
            SIMULATION_TIMEZONE
        )
    )

    # -------------------------------------------------
    # Model sırası
    # -------------------------------------------------

    metrics["model"] = (
        metrics["model"]
        .astype("string")
    )

    metrics["model_order"] = (
        metrics["model"]
        .map(
            {
                model_name: index
                for index, model_name
                in enumerate(
                    EXPECTED_MODEL_NAMES
                )
            }
        )
    )

    metrics = (
        metrics
        .sort_values(
            "model_order"
        )
        .drop(
            columns=["model_order"]
        )
        .reset_index(drop=True)
    )

    data["xgboost_backtest"] = (
        xgb_backtest
    )

    data["backtest_comparison"] = (
        backtest_comparison
    )

    data["xgboost_forecast"] = (
        xgb_forecast
    )

    data["forecast_comparison"] = (
        forecast_comparison
    )

    data["pricing"] = pricing
    data["metrics"] = metrics

    data["feature_importance"] = (
        feature_importance
    )

    data["training_history"] = (
        training_history
    )

    data["zone_metrics"] = (
        zone_metrics
    )

    return data


# =====================================================
# 9. GİRDİ DOĞRULAMASI
# =====================================================

def validate_inputs(
    recorder: CheckRecorder,
    data: dict,
) -> pd.DataFrame:
    """
    Grafiklerin yanlış veya uyumsuz veriden üretilmesini engeller.
    """

    xgb_backtest = data[
        "xgboost_backtest"
    ]

    backtest_comparison = data[
        "backtest_comparison"
    ]

    xgb_forecast = data[
        "xgboost_forecast"
    ]

    forecast_comparison = data[
        "forecast_comparison"
    ]

    pricing = data["pricing"]
    metrics = data["metrics"]

    feature_importance = data[
        "feature_importance"
    ]

    training_history = data[
        "training_history"
    ]

    zone_metrics = data[
        "zone_metrics"
    ]

    model_metrics_json = data[
        "model_metrics_json"
    ]

    model_selection_json = data[
        "model_selection_json"
    ]

    forecast_summary_json = data[
        "forecast_summary_json"
    ]

    # -------------------------------------------------
    # Eksik değerler ve zamanlar
    # -------------------------------------------------

    timestamp_frames = {
        "xgboost_backtest": (
            xgb_backtest
        ),
        "backtest_comparison": (
            backtest_comparison
        ),
        "xgboost_forecast": (
            xgb_forecast
        ),
        "forecast_comparison": (
            forecast_comparison
        ),
        "pricing": pricing,
    }

    for frame_name, dataframe in (
        timestamp_frames.items()
    ):
        invalid_count = int(
            dataframe[
                "demand_hour_utc"
            ].isna().sum()
        )

        recorder.add(
            category="TIMESTAMP",
            check_name=(
                f"{frame_name}_timestamps_valid"
            ),
            passed=(
                invalid_count == 0
            ),
            details=(
                f"Geçersiz saat="
                f"{invalid_count:,}"
            ),
        )

    # -------------------------------------------------
    # Unique zone-saat anahtarları
    # -------------------------------------------------

    key_frames = {
        "xgboost_backtest": (
            xgb_backtest
        ),
        "backtest_comparison": (
            backtest_comparison
        ),
        "xgboost_forecast": (
            xgb_forecast
        ),
        "forecast_comparison": (
            forecast_comparison
        ),
        "pricing": pricing,
    }

    for frame_name, dataframe in (
        key_frames.items()
    ):
        duplicate_count = int(
            dataframe[
                [
                    "zone_id",
                    "demand_hour_utc",
                ]
            ].duplicated().sum()
        )

        recorder.add(
            category="KEYS",
            check_name=(
                f"{frame_name}_zone_hour_unique"
            ),
            passed=(
                duplicate_count == 0
            ),
            details=(
                f"Tekrar eden zone-saat="
                f"{duplicate_count:,}"
            ),
        )

    # -------------------------------------------------
    # XGBoost backtest ile comparison uyumu
    # -------------------------------------------------

    backtest_key_comparison = (
        xgb_backtest[
            [
                "zone_id",
                "demand_hour_utc",
                "demand_count",
                "predicted_demand",
            ]
        ]
        .merge(
            backtest_comparison[
                [
                    "zone_id",
                    "demand_hour_utc",
                    "demand_count",
                    "xgboost_predicted_demand",
                ]
            ],
            on=[
                "zone_id",
                "demand_hour_utc",
            ],
            how="outer",
            suffixes=(
                "_backtest",
                "_comparison",
            ),
            indicator=True,
            validate="one_to_one",
        )
    )

    backtest_keys_match = (
        backtest_key_comparison[
            "_merge"
        ].eq("both").all()
    )

    actual_values_match = np.isclose(
        backtest_key_comparison[
            "demand_count_backtest"
        ],
        backtest_key_comparison[
            "demand_count_comparison"
        ],
        atol=0,
        rtol=0,
        equal_nan=False,
    ).all()

    xgb_predictions_match = np.isclose(
        backtest_key_comparison[
            "predicted_demand"
        ],
        backtest_key_comparison[
            "xgboost_predicted_demand"
        ],
        atol=0.002,
        rtol=0,
        equal_nan=False,
    ).all()

    recorder.add(
        category="BACKTEST",
        check_name=(
            "xgboost_backtest_matches_comparison"
        ),
        passed=(
            backtest_keys_match
            and actual_values_match
            and xgb_predictions_match
        ),
        details=(
            "XGBoost backtest ve model comparison "
            "zone-saat, gerçek talep ve tahmin değerleri "
            "aynı olmalıdır."
        ),
    )

    # -------------------------------------------------
    # Forecast ile Pricing Service uyumu
    # -------------------------------------------------

    forecast_pricing_comparison = (
        xgb_forecast[
            [
                "zone_id",
                "demand_hour_utc",
                "predicted_demand",
                "predicted_demand_level",
                "recommended_surge_multiplier",
            ]
        ]
        .merge(
            pricing[
                [
                    "zone_id",
                    "demand_hour_utc",
                    "predicted_demand",
                    "predicted_demand_level",
                    "recommended_surge_multiplier",
                ]
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

    pricing_keys_match = (
        forecast_pricing_comparison[
            "_merge"
        ].eq("both").all()
    )

    pricing_demand_matches = np.isclose(
        forecast_pricing_comparison[
            "predicted_demand_forecast"
        ],
        forecast_pricing_comparison[
            "predicted_demand_pricing"
        ],
        atol=0.002,
        rtol=0,
        equal_nan=False,
    ).all()

    pricing_surge_matches = np.isclose(
        forecast_pricing_comparison[
            "recommended_surge_multiplier_forecast"
        ],
        forecast_pricing_comparison[
            "recommended_surge_multiplier_pricing"
        ],
        atol=0.001,
        rtol=0,
        equal_nan=False,
    ).all()

    pricing_level_matches = (
        forecast_pricing_comparison[
            "predicted_demand_level_forecast"
        ]
        .astype("string")
        .eq(
            forecast_pricing_comparison[
                "predicted_demand_level_pricing"
            ]
            .astype("string")
        )
        .all()
    )

    recorder.add(
        category="PRICING",
        check_name=(
            "forecast_matches_pricing_contract"
        ),
        passed=(
            pricing_keys_match
            and pricing_demand_matches
            and pricing_surge_matches
            and pricing_level_matches
        ),
        details=(
            "Forecast ve Pricing Service sözleşmesi "
            "aynı zone-saat, tahmin, seviye ve surge "
            "değerlerini içermelidir."
        ),
    )

    # -------------------------------------------------
    # Forecast kapsamı
    # -------------------------------------------------

    forecast_hour_count = int(
        xgb_forecast[
            "demand_hour_utc"
        ].nunique()
    )

    forecast_zone_count = int(
        xgb_forecast[
            "zone_id"
        ].nunique()
    )

    expected_forecast_rows = (
        forecast_hour_count
        * forecast_zone_count
    )

    recorder.add(
        category="FORECAST",
        check_name="forecast_horizon_is_24_hours",
        passed=(
            forecast_hour_count
            == EXPECTED_FORECAST_HOURS
        ),
        details=(
            f"Forecast saati={forecast_hour_count}; "
            f"beklenen={EXPECTED_FORECAST_HOURS}"
        ),
    )

    recorder.add(
        category="FORECAST",
        check_name="forecast_grid_complete",
        passed=(
            len(xgb_forecast)
            == expected_forecast_rows
        ),
        details=(
            f"Forecast satırı={len(xgb_forecast):,}; "
            f"zone={forecast_zone_count:,}; "
            f"saat={forecast_hour_count:,}"
        ),
    )

    # -------------------------------------------------
    # Forecast değerleri
    # -------------------------------------------------

    forecast_values_valid = (
        xgb_forecast[
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
            xgb_forecast[
                "predicted_demand"
            ] >= 0
        ).all()
    )

    recorder.add(
        category="FORECAST",
        check_name="forecast_numeric_values_valid",
        passed=forecast_values_valid,
        details=(
            "Forecast talep, tahmin aralığı ve surge "
            "alanları boş veya negatif olmamalıdır."
        ),
    )

    interval_valid = (
        (
            xgb_forecast[
                "prediction_lower_80"
            ]
            <= xgb_forecast[
                "predicted_demand"
            ]
        )
        & (
            xgb_forecast[
                "predicted_demand"
            ]
            <= xgb_forecast[
                "prediction_upper_80"
            ]
        )
    ).all()

    recorder.add(
        category="FORECAST",
        check_name="forecast_intervals_valid",
        passed=interval_valid,
        details=(
            "Alt sınır <= tahmin <= üst sınır olmalıdır."
        ),
    )

    demand_levels_valid = set(
        xgb_forecast[
            "predicted_demand_level"
        ].astype(str)
    ).issubset(
        ALLOWED_DEMAND_LEVELS
    )

    recorder.add(
        category="FORECAST",
        check_name="demand_levels_valid",
        passed=demand_levels_valid,
        details=(
            "Talep seviyeleri LOW, MEDIUM veya HIGH olmalıdır."
        ),
    )

    surge_range_valid = (
        xgb_forecast[
            "recommended_surge_multiplier"
        ].between(
            MIN_SURGE_MULTIPLIER,
            MAX_SURGE_MULTIPLIER,
        ).all()
    )

    recorder.add(
        category="PRICING",
        check_name="surge_multiplier_range_valid",
        passed=surge_range_valid,
        details=(
            f"Surge aralığı "
            f"{MIN_SURGE_MULTIPLIER:.2f}–"
            f"{MAX_SURGE_MULTIPLIER:.2f}"
        ),
    )

    recorder.add(
        category="PRICING",
        check_name="surge_not_auto_applied",
        passed=(
            not xgb_forecast[
                "auto_apply"
            ].any()
            and not pricing[
                "auto_apply"
            ].any()
        ),
        details=(
            "Data Science surge önerileri otomatik "
            "uygulanmamalıdır."
        ),
    )

    recorder.add(
        category="PRICING",
        check_name="pricing_validation_required",
        passed=(
            xgb_forecast[
                "requires_pricing_service_validation"
            ].all()
            and pricing[
                "requires_pricing_service_validation"
            ].all()
        ),
        details=(
            "Pricing Service doğrulaması zorunlu olmalıdır."
        ),
    )

    recorder.add(
        category="PRICING",
        check_name="pricing_merge_strategy_is_max",
        passed=(
            xgb_forecast[
                "pricing_rule_merge_strategy"
            ]
            .astype("string")
            .eq("MAX")
            .all()
            and pricing[
                "pricing_rule_merge_strategy"
            ]
            .astype("string")
            .eq("MAX")
            .all()
        ),
        details=(
            "Pricing rule ve model önerisi MAX "
            "stratejisiyle birleştirilmelidir."
        ),
    )

    model_version_valid = (
        xgb_forecast[
            "forecast_model_version"
        ]
        .astype("string")
        .eq(
            EXPECTED_MODEL_VERSION
        )
        .all()
    )

    recorder.add(
        category="MODEL",
        check_name="forecast_model_version_valid",
        passed=model_version_valid,
        details=(
            f"Beklenen sürüm={EXPECTED_MODEL_VERSION}"
        ),
    )

    # -------------------------------------------------
    # Model metrikleri
    # -------------------------------------------------

    metric_model_names = set(
        metrics["model"].astype(str)
    )

    recorder.add(
        category="METRICS",
        check_name="all_comparison_models_present",
        passed=(
            metric_model_names
            == set(
                EXPECTED_MODEL_NAMES
            )
        ),
        details=(
            f"Bulunan modeller="
            f"{sorted(metric_model_names)}"
        ),
    )

    finite_metrics = np.isfinite(
        metrics[
            [
                "mae",
                "rmse",
                "r2",
                "wape",
                "smape",
            ]
        ].to_numpy(
            dtype=float
        )
    ).all()

    recorder.add(
        category="METRICS",
        check_name="model_metrics_are_finite",
        passed=finite_metrics,
        details=(
            "MAE, RMSE, R², WAPE ve SMAPE "
            "sayısal olmalıdır."
        ),
    )

    # -------------------------------------------------
    # Backtest üzerinden metrikleri yeniden doğrula
    # -------------------------------------------------

    actual = (
        backtest_comparison[
            "demand_count"
        ].to_numpy(dtype=float)
    )

    recalculated_metrics = {
        "XGBOOST_WEATHER": calculate_metrics(
            actual=actual,
            predicted=(
                backtest_comparison[
                    "xgboost_predicted_demand"
                ].to_numpy(dtype=float)
            ),
        ),
        "RANDOM_FOREST_WEATHER": calculate_metrics(
            actual=actual,
            predicted=(
                backtest_comparison[
                    "random_forest_predicted_demand"
                ].to_numpy(dtype=float)
            ),
        ),
        "SEASONAL_NAIVE_168H": calculate_metrics(
            actual=actual,
            predicted=(
                backtest_comparison[
                    "seasonal_naive_prediction"
                ].to_numpy(dtype=float)
            ),
        ),
    }

    verification_rows = []

    verification_passed = True

    metric_tolerances = {
        "mae": 0.01,
        "rmse": 0.01,
        "r2": 0.001,
        "wape": 0.001,
        "smape": 0.001,
        "actual_total": 0.01,
        "predicted_total": 1.00,
    }

    for model_name in EXPECTED_MODEL_NAMES:
        reported_row = (
            metrics.loc[
                metrics["model"]
                == model_name
            ]
            .iloc[0]
        )

        for metric_name, tolerance in (
            metric_tolerances.items()
        ):
            reported_value = float(
                reported_row[
                    metric_name
                ]
            )

            recalculated_value = float(
                recalculated_metrics[
                    model_name
                ][metric_name]
            )

            difference = abs(
                reported_value
                - recalculated_value
            )

            matches = (
                difference <= tolerance
            )

            verification_passed = (
                verification_passed
                and matches
            )

            verification_rows.append(
                {
                    "model": model_name,
                    "metric": metric_name,
                    "reported_value": (
                        reported_value
                    ),
                    "recalculated_value": (
                        recalculated_value
                    ),
                    "absolute_difference": (
                        difference
                    ),
                    "tolerance": tolerance,
                    "matches": matches,
                }
            )

    metrics_verification_df = pd.DataFrame(
        verification_rows
    )

    recorder.add(
        category="METRICS",
        check_name="reported_metrics_match_backtest",
        passed=verification_passed,
        details=(
            "Raporlanan metrikler yalnızca zaman bazlı "
            "backtest verisiyle yeniden hesaplandığında "
            "uyuşmalıdır."
        ),
    )

    # -------------------------------------------------
    # Model seçimi
    # -------------------------------------------------

    calculated_best_model = (
        metrics.sort_values(
            by=[
                "mae",
                "rmse",
            ],
            ascending=[
                True,
                True,
            ],
        )
        .iloc[0]["model"]
    )

    reported_best_model = (
        model_selection_json.get(
            "recommended_model_by_test_mae"
        )
    )

    recorder.add(
        category="MODEL_SELECTION",
        check_name="selected_model_matches_metrics",
        passed=(
            reported_best_model
            == calculated_best_model
        ),
        details=(
            f"Raporlanan={reported_best_model}; "
            f"hesaplanan={calculated_best_model}"
        ),
    )

    recorder.add(
        category="MODEL_SELECTION",
        check_name="xgboost_is_selected_model",
        passed=(
            calculated_best_model
            == "XGBOOST_WEATHER"
        ),
        details=(
            "XGBoost test metriklerine göre en iyi modeldir."
            if calculated_best_model
            == "XGBOOST_WEATHER"
            else (
                "XGBoost en iyi model değildir. "
                f"Önerilen model: {calculated_best_model}"
            )
        ),
        severity="WARNING",
    )

    # -------------------------------------------------
    # Feature importance
    # -------------------------------------------------

    importance_sum = float(
        feature_importance[
            "importance"
        ].sum()
    )

    recorder.add(
        category="FEATURE_IMPORTANCE",
        check_name="importance_values_valid",
        passed=(
            feature_importance[
                "importance"
            ].notna().all()
            and (
                feature_importance[
                    "importance"
                ] >= 0
            ).all()
            and np.isclose(
                importance_sum,
                1.0,
                atol=0.02,
            )
        ),
        details=(
            f"Toplam importance="
            f"{importance_sum:.6f}"
        ),
    )

    # -------------------------------------------------
    # Training history
    # -------------------------------------------------

    selected_boosting_rounds = int(
        model_metrics_json.get(
            "selected_boosting_rounds",
            0,
        )
    )

    training_history_valid = (
        training_history[
            "boosting_round"
        ].notna().all()
        and training_history[
            "validation_mae_log_scale"
        ].notna().all()
        and selected_boosting_rounds > 0
    )

    recorder.add(
        category="TRAINING",
        check_name="training_history_valid",
        passed=training_history_valid,
        details=(
            f"History satırı={len(training_history):,}; "
            f"seçilen tur={selected_boosting_rounds:,}"
        ),
    )

    # -------------------------------------------------
    # Zone metrikleri
    # -------------------------------------------------

    zone_metrics_valid = (
        not zone_metrics[
            "zone_id"
        ].duplicated().any()
        and zone_metrics[
            [
                "mae",
                "rmse",
                "wape",
                "smape",
            ]
        ].notna().all().all()
        and (
            zone_metrics["mae"] >= 0
        ).all()
        and (
            zone_metrics["rmse"] >= 0
        ).all()
    )

    recorder.add(
        category="ZONE_METRICS",
        check_name="zone_metrics_valid",
        passed=zone_metrics_valid,
        details=(
            f"Zone metriği="
            f"{len(zone_metrics):,}"
        ),
    )

    # -------------------------------------------------
    # Sentetik hava uyarısı
    # -------------------------------------------------

    synthetic_weather_used = bool(
        pd.to_numeric(
            xgb_forecast[
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
            "Harici hava tahmini kullanıldı."
            if not synthetic_weather_used
            else (
                "Sentetik veya haftalık hava senaryosu "
                "kullanıldı. Hava grafikleri nedensellik "
                "kanıtı olarak yorumlanmamalıdır."
            )
        ),
        severity="WARNING",
    )

    # JSON forecast özeti ile temel kapsam kontrolü
    reported_forecast_hours = int(
        forecast_summary_json.get(
            "forecast_horizon_hours",
            -1,
        )
    )

    recorder.add(
        category="FORECAST",
        check_name="forecast_summary_matches_data",
        passed=(
            reported_forecast_hours
            == forecast_hour_count
        ),
        details=(
            f"JSON horizon={reported_forecast_hours}; "
            f"veri horizon={forecast_hour_count}"
        ),
    )

    return metrics_verification_df


# =====================================================
# 10. GRAFİK MANİFESTOSU
# =====================================================

class ChartRegistry:
    """
    Oluşturulan grafiklerin manifestosunu tutar.
    """

    def __init__(self) -> None:
        self.rows = []

    def save(
        self,
        filename: str,
        chart_title: str,
        category: str,
        source_data: str,
        description: str,
    ) -> None:
        """
        Açık olan Matplotlib grafiğini kaydeder.
        """

        output_path = (
            VISUALIZATION_OUTPUT_DIR
            / filename
        )

        plt.tight_layout()

        plt.savefig(
            output_path,
            dpi=PNG_DPI,
            bbox_inches="tight",
        )

        plt.close()

        self.rows.append(
            {
                "chart_order": (
                    len(self.rows) + 1
                ),
                "filename": filename,
                "chart_title": chart_title,
                "category": category,
                "source_data": source_data,
                "description": description,
                "output_path": str(
                    output_path
                ),
            }
        )

        print(
            f"✅ Grafik oluşturuldu: "
            f"{filename}"
        )

    def to_dataframe(self) -> pd.DataFrame:
        return pd.DataFrame(self.rows)


# =====================================================
# 11. ÖZET TABLOLARI
# =====================================================

def create_summary_tables(
    data: dict,
) -> dict:
    """
    Grafiklerde kullanılacak özet tabloları oluşturur.
    """

    backtest = data[
        "backtest_comparison"
    ].copy()

    forecast = data[
        "xgboost_forecast"
    ].copy()

    forecast_comparison = data[
        "forecast_comparison"
    ].copy()

    feature_importance = data[
        "feature_importance"
    ].copy()

    zone_metrics = data[
        "zone_metrics"
    ].copy()

    # -------------------------------------------------
    # Saatlik backtest toplamları
    # -------------------------------------------------

    hourly_backtest = (
        backtest
        .groupby(
            "demand_hour_local",
            as_index=False,
        )
        .agg(
            actual_demand=(
                "demand_count",
                "sum",
            ),
            xgboost_predicted_demand=(
                "xgboost_predicted_demand",
                "sum",
            ),
            random_forest_predicted_demand=(
                "random_forest_predicted_demand",
                "sum",
            ),
            seasonal_naive_prediction=(
                "seasonal_naive_prediction",
                "sum",
            ),
        )
        .sort_values(
            "demand_hour_local"
        )
        .reset_index(drop=True)
    )

    # -------------------------------------------------
    # Günün saatine göre profil
    # -------------------------------------------------

    backtest["local_hour"] = (
        backtest[
            "demand_hour_local"
        ].dt.hour
    )

    hour_of_day = (
        backtest
        .groupby(
            "local_hour",
            as_index=False,
        )
        .agg(
            avg_actual_demand=(
                "demand_count",
                "mean",
            ),
            avg_xgboost_prediction=(
                "xgboost_predicted_demand",
                "mean",
            ),
            avg_random_forest_prediction=(
                "random_forest_predicted_demand",
                "mean",
            ),
            avg_seasonal_naive_prediction=(
                "seasonal_naive_prediction",
                "mean",
            ),
        )
        .sort_values(
            "local_hour"
        )
        .reset_index(drop=True)
    )

    # -------------------------------------------------
    # Satır bazlı model kazanma dağılımı
    # -------------------------------------------------

    model_win_distribution = (
        backtest[
            "better_model_for_row"
        ]
        .value_counts()
        .rename_axis(
            "better_model_for_row"
        )
        .reset_index(
            name="row_count"
        )
    )

    model_win_distribution[
        "percentage"
    ] = (
        model_win_distribution[
            "row_count"
        ]
        / len(backtest)
        * 100
    ).round(4)

    # -------------------------------------------------
    # Gelecek saatlik model karşılaştırması
    # -------------------------------------------------

    hourly_forecast_comparison = (
        forecast_comparison
        .groupby(
            "demand_hour_local",
            as_index=False,
        )
        .agg(
            xgboost_predicted_demand=(
                "xgboost_predicted_demand",
                "sum",
            ),
            random_forest_predicted_demand=(
                "random_forest_predicted_demand",
                "sum",
            ),
            average_absolute_difference=(
                "absolute_prediction_difference",
                "mean",
            ),
        )
        .sort_values(
            "demand_hour_local"
        )
        .reset_index(drop=True)
    )

    # -------------------------------------------------
    # Talep seviyesi dağılımı
    # -------------------------------------------------

    demand_level_distribution = (
        forecast[
            "predicted_demand_level"
        ]
        .value_counts()
        .reindex(
            [
                "LOW",
                "MEDIUM",
                "HIGH",
            ],
            fill_value=0,
        )
        .rename_axis(
            "predicted_demand_level"
        )
        .reset_index(
            name="zone_hour_count"
        )
    )

    demand_level_distribution[
        "percentage"
    ] = (
        demand_level_distribution[
            "zone_hour_count"
        ]
        / len(forecast)
        * 100
    ).round(4)

    # -------------------------------------------------
    # Surge dağılımı
    # -------------------------------------------------

    surge_distribution = (
        forecast[
            "recommended_surge_multiplier"
        ]
        .value_counts()
        .sort_index()
        .rename_axis(
            "recommended_surge_multiplier"
        )
        .reset_index(
            name="zone_hour_count"
        )
    )

    surge_distribution[
        "percentage"
    ] = (
        surge_distribution[
            "zone_hour_count"
        ]
        / len(forecast)
        * 100
    ).round(4)

    # -------------------------------------------------
    # En yüksek talep beklenen zonelar
    # -------------------------------------------------

    top_zones = (
        forecast
        .groupby(
            [
                "zone_id",
                "zone_name",
                "zone_category",
            ],
            as_index=False,
        )
        .agg(
            average_predicted_demand=(
                "predicted_demand",
                "mean",
            ),
            total_predicted_demand=(
                "predicted_demand",
                "sum",
            ),
            maximum_predicted_demand=(
                "predicted_demand",
                "max",
            ),
            average_recommended_surge=(
                "recommended_surge_multiplier",
                "mean",
            ),
            maximum_recommended_surge=(
                "recommended_surge_multiplier",
                "max",
            ),
        )
        .sort_values(
            "total_predicted_demand",
            ascending=False,
        )
        .head(
            TOP_ZONE_COUNT
        )
        .reset_index(drop=True)
    )

    # -------------------------------------------------
    # Hava durumu ve tahmini talep
    # -------------------------------------------------

    weather_summary = (
        forecast
        .groupby(
            "weather_condition",
            as_index=False,
        )
        .agg(
            average_predicted_demand=(
                "predicted_demand",
                "mean",
            ),
            total_predicted_demand=(
                "predicted_demand",
                "sum",
            ),
            average_recommended_surge=(
                "recommended_surge_multiplier",
                "mean",
            ),
            zone_hour_count=(
                "zone_id",
                "count",
            ),
        )
        .sort_values(
            "average_predicted_demand",
            ascending=False,
        )
        .reset_index(drop=True)
    )

    # -------------------------------------------------
    # En önemli temel özellikler
    # -------------------------------------------------

    top_features = (
        feature_importance
        .sort_values(
            "importance",
            ascending=False,
        )
        .head(
            TOP_FEATURE_COUNT
        )
        .reset_index(drop=True)
    )

    # -------------------------------------------------
    # En yüksek hata alınan zonelar
    # -------------------------------------------------

    worst_zones = (
        zone_metrics
        .sort_values(
            "mae",
            ascending=False,
        )
        .head(
            WORST_ZONE_COUNT
        )
        .reset_index(drop=True)
    )

    return {
        "hourly_backtest": (
            hourly_backtest
        ),
        "hour_of_day": (
            hour_of_day
        ),
        "model_win_distribution": (
            model_win_distribution
        ),
        "hourly_forecast_comparison": (
            hourly_forecast_comparison
        ),
        "demand_level_distribution": (
            demand_level_distribution
        ),
        "surge_distribution": (
            surge_distribution
        ),
        "top_zones": top_zones,
        "weather_summary": (
            weather_summary
        ),
        "top_features": (
            top_features
        ),
        "worst_zones": (
            worst_zones
        ),
    }


# =====================================================
# 12. MODEL METRİK GRAFİKLERİ
# =====================================================

def create_metric_charts(
    registry: ChartRegistry,
    metrics_df: pd.DataFrame,
) -> None:
    """
    MAE, RMSE ve R² karşılaştırma grafiklerini oluşturur.
    """

    # -------------------------------------------------
    # MAE
    # -------------------------------------------------

    plt.figure(
        figsize=(10, 6)
    )

    plt.bar(
        metrics_df["model"],
        metrics_df["mae"],
    )

    plt.title(
        "Model Karşılaştırması — MAE"
    )

    plt.xlabel("Model")
    plt.ylabel("MAE")

    plt.xticks(
        rotation=20,
        ha="right",
    )

    registry.save(
        filename=(
            "01_model_comparison_mae.png"
        ),
        chart_title=(
            "Model Karşılaştırması — MAE"
        ),
        category="MODEL_PERFORMANCE",
        source_data=(
            MODEL_METRICS_COMPARISON_FILE.name
        ),
        description=(
            "Düşük MAE daha iyi performansı gösterir. "
            "Yalnızca zaman bazlı backtest dönemini kullanır."
        ),
    )

    # -------------------------------------------------
    # RMSE
    # -------------------------------------------------

    plt.figure(
        figsize=(10, 6)
    )

    plt.bar(
        metrics_df["model"],
        metrics_df["rmse"],
    )

    plt.title(
        "Model Karşılaştırması — RMSE"
    )

    plt.xlabel("Model")
    plt.ylabel("RMSE")

    plt.xticks(
        rotation=20,
        ha="right",
    )

    registry.save(
        filename=(
            "02_model_comparison_rmse.png"
        ),
        chart_title=(
            "Model Karşılaştırması — RMSE"
        ),
        category="MODEL_PERFORMANCE",
        source_data=(
            MODEL_METRICS_COMPARISON_FILE.name
        ),
        description=(
            "RMSE büyük tahmin hatalarına daha fazla ağırlık verir."
        ),
    )

    # -------------------------------------------------
    # R²
    # -------------------------------------------------

    plt.figure(
        figsize=(10, 6)
    )

    plt.bar(
        metrics_df["model"],
        metrics_df["r2"],
    )

    plt.axhline(
        y=0,
        linestyle="--",
    )

    plt.title(
        "Model Karşılaştırması — R²"
    )

    plt.xlabel("Model")
    plt.ylabel("R²")

    plt.xticks(
        rotation=20,
        ha="right",
    )

    registry.save(
        filename=(
            "03_model_comparison_r2.png"
        ),
        chart_title=(
            "Model Karşılaştırması — R²"
        ),
        category="MODEL_PERFORMANCE",
        source_data=(
            MODEL_METRICS_COMPARISON_FILE.name
        ),
        description=(
            "R² negatif olabilir; bu nedenle grafik ekseni "
            "zorla 0–1 aralığına sabitlenmez."
        ),
    )


# =====================================================
# 13. BACKTEST GRAFİKLERİ
# =====================================================

def create_backtest_charts(
    registry: ChartRegistry,
    data: dict,
    summaries: dict,
) -> None:
    """
    Gerçek talep ve test tahminlerini görselleştirir.
    """

    backtest = data[
        "backtest_comparison"
    ]

    hourly_backtest = summaries[
        "hourly_backtest"
    ]

    hour_of_day = summaries[
        "hour_of_day"
    ]

    model_win_distribution = summaries[
        "model_win_distribution"
    ]

    # -------------------------------------------------
    # Gerçek vs XGBoost scatter
    # -------------------------------------------------

    sample_size = min(
        SCATTER_SAMPLE_SIZE,
        len(backtest),
    )

    scatter_sample = (
        backtest.sample(
            n=sample_size,
            random_state=42,
        )
    )

    minimum_value = float(
        min(
            scatter_sample[
                "demand_count"
            ].min(),
            scatter_sample[
                "xgboost_predicted_demand"
            ].min(),
        )
    )

    maximum_value = float(
        max(
            scatter_sample[
                "demand_count"
            ].max(),
            scatter_sample[
                "xgboost_predicted_demand"
            ].max(),
        )
    )

    plt.figure(
        figsize=(8, 8)
    )

    plt.scatter(
        scatter_sample[
            "demand_count"
        ],
        scatter_sample[
            "xgboost_predicted_demand"
        ],
        alpha=0.35,
    )

    plt.plot(
        [
            minimum_value,
            maximum_value,
        ],
        [
            minimum_value,
            maximum_value,
        ],
        linestyle="--",
        label="İdeal tahmin çizgisi",
    )

    plt.title(
        "Backtest — Gerçek Talep ve XGBoost Tahmini"
    )

    plt.xlabel("Gerçek Talep")
    plt.ylabel("XGBoost Tahmini")
    plt.legend()

    registry.save(
        filename=(
            "04_backtest_actual_vs_xgboost.png"
        ),
        chart_title=(
            "Backtest — Gerçek Talep ve XGBoost Tahmini"
        ),
        category="BACKTEST",
        source_data=(
            BACKTEST_COMPARISON_FILE.name
        ),
        description=(
            f"Zaman bazlı test döneminden rastgele "
            f"{sample_size:,} zone-saat örneği."
        ),
    )

    # -------------------------------------------------
    # Saatlik toplam test talebi
    # -------------------------------------------------

    plt.figure(
        figsize=(15, 6)
    )

    plt.plot(
        hourly_backtest[
            "demand_hour_local"
        ],
        hourly_backtest[
            "actual_demand"
        ],
        label="Gerçek talep",
    )

    plt.plot(
        hourly_backtest[
            "demand_hour_local"
        ],
        hourly_backtest[
            "xgboost_predicted_demand"
        ],
        label="XGBoost",
    )

    plt.plot(
        hourly_backtest[
            "demand_hour_local"
        ],
        hourly_backtest[
            "random_forest_predicted_demand"
        ],
        label="Random Forest",
    )

    plt.plot(
        hourly_backtest[
            "demand_hour_local"
        ],
        hourly_backtest[
            "seasonal_naive_prediction"
        ],
        label="168 saatlik baseline",
    )

    plt.title(
        "Backtest — Saatlik Toplam Talep"
    )

    plt.xlabel(
        "İstanbul Yerel Saati"
    )

    plt.ylabel(
        "Bütün Zoneların Toplam Talebi"
    )

    plt.xticks(
        rotation=30,
        ha="right",
    )

    plt.legend()

    registry.save(
        filename=(
            "05_backtest_hourly_total_demand.png"
        ),
        chart_title=(
            "Backtest — Saatlik Toplam Talep"
        ),
        category="BACKTEST",
        source_data=(
            BACKTEST_COMPARISON_FILE.name
        ),
        description=(
            "Gerçek talep, XGBoost, Random Forest ve "
            "168 saatlik seasonal baseline karşılaştırması."
        ),
    )

    # -------------------------------------------------
    # Günün saatine göre talep profili
    # -------------------------------------------------

    plt.figure(
        figsize=(12, 6)
    )

    plt.plot(
        hour_of_day[
            "local_hour"
        ],
        hour_of_day[
            "avg_actual_demand"
        ],
        marker="o",
        label="Gerçek talep",
    )

    plt.plot(
        hour_of_day[
            "local_hour"
        ],
        hour_of_day[
            "avg_xgboost_prediction"
        ],
        marker="o",
        label="XGBoost",
    )

    plt.plot(
        hour_of_day[
            "local_hour"
        ],
        hour_of_day[
            "avg_random_forest_prediction"
        ],
        marker="o",
        label="Random Forest",
    )

    plt.plot(
        hour_of_day[
            "local_hour"
        ],
        hour_of_day[
            "avg_seasonal_naive_prediction"
        ],
        marker="o",
        label="Seasonal baseline",
    )

    plt.title(
        "Backtest — Günün Saatine Göre Ortalama Talep"
    )

    plt.xlabel(
        "İstanbul Yerel Saati"
    )

    plt.ylabel(
        "Ortalama Zone Talebi"
    )

    plt.xticks(
        range(0, 24)
    )

    plt.legend()

    registry.save(
        filename=(
            "06_backtest_hour_of_day_profile.png"
        ),
        chart_title=(
            "Backtest — Günün Saatine Göre Ortalama Talep"
        ),
        category="BACKTEST",
        source_data=(
            BACKTEST_COMPARISON_FILE.name
        ),
        description=(
            "Modelin sabah ve akşam yoğunluklarını "
            "yakalama başarısını gösterir."
        ),
    )

    # -------------------------------------------------
    # Satır bazlı daha iyi model
    # -------------------------------------------------

    plt.figure(
        figsize=(9, 6)
    )

    plt.bar(
        model_win_distribution[
            "better_model_for_row"
        ],
        model_win_distribution[
            "percentage"
        ],
    )

    plt.title(
        "Backtest — Satır Bazında Daha Düşük Hata Veren Model"
    )

    plt.xlabel("Model")
    plt.ylabel("Test Satırlarının Yüzdesi")

    registry.save(
        filename=(
            "07_backtest_model_win_distribution.png"
        ),
        chart_title=(
            "Backtest — Satır Bazında Daha Düşük Hata Veren Model"
        ),
        category="MODEL_COMPARISON",
        source_data=(
            BACKTEST_COMPARISON_FILE.name
        ),
        description=(
            "Her zone-saat kaydında XGBoost ve Random Forest "
            "mutlak hataları karşılaştırılır."
        ),
    )


# =====================================================
# 14. MODEL AÇIKLANABİLİRLİK GRAFİKLERİ
# =====================================================

def create_model_explanation_charts(
    registry: ChartRegistry,
    data: dict,
    summaries: dict,
) -> None:
    """
    Feature importance, eğitim geçmişi ve zone hata grafiklerini üretir.
    """

    training_history = data[
        "training_history"
    ]

    model_metrics_json = data[
        "model_metrics_json"
    ]

    top_features = summaries[
        "top_features"
    ]

    worst_zones = summaries[
        "worst_zones"
    ]

    selected_round = int(
        model_metrics_json.get(
            "selected_boosting_rounds",
            0,
        )
    )

    # -------------------------------------------------
    # Temel feature importance
    # -------------------------------------------------

    plt.figure(
        figsize=(
            12,
            max(
                7,
                TOP_FEATURE_COUNT * 0.45,
            ),
        )
    )

    plt.barh(
        top_features[
            "base_feature"
        ][::-1],
        top_features[
            "importance_percentage"
        ][::-1],
    )

    plt.title(
        f"XGBoost — En Önemli "
        f"{len(top_features)} Temel Özellik"
    )

    plt.xlabel(
        "Toplam Özellik Önemi (%)"
    )

    plt.ylabel("Temel Özellik")

    registry.save(
        filename=(
            "08_xgboost_base_feature_importance.png"
        ),
        chart_title=(
            "XGBoost Temel Özellik Önemleri"
        ),
        category="MODEL_EXPLAINABILITY",
        source_data=(
            BASE_FEATURE_IMPORTANCE_FILE.name
        ),
        description=(
            "One-hot sütunları temel özellik altında "
            "birleştirilmiştir. Özellik önemi nedensellik göstermez."
        ),
    )

    # -------------------------------------------------
    # Early stopping geçmişi
    # -------------------------------------------------

    plt.figure(
        figsize=(12, 6)
    )

    plt.plot(
        training_history[
            "boosting_round"
        ],
        training_history[
            "validation_mae_log_scale"
        ],
        label="Validation MAE — log ölçeği",
    )

    if selected_round > 0:
        plt.axvline(
            x=selected_round,
            linestyle="--",
            label=(
                f"Seçilen tur: "
                f"{selected_round}"
            ),
        )

    plt.title(
        "XGBoost — Early Stopping Eğitim Geçmişi"
    )

    plt.xlabel("Boosting Turu")

    plt.ylabel(
        "Validation MAE — log1p hedef ölçeği"
    )

    plt.legend()

    registry.save(
        filename=(
            "09_xgboost_training_history.png"
        ),
        chart_title=(
            "XGBoost Early Stopping Eğitim Geçmişi"
        ),
        category="TRAINING",
        source_data=(
            TRAINING_HISTORY_FILE.name
        ),
        description=(
            "Seçilen boosting turu, test verisine bakılmadan "
            "ayrı validation döneminde belirlenmiştir."
        ),
    )

    # -------------------------------------------------
    # En yüksek MAE alınan zonelar
    # -------------------------------------------------

    plt.figure(
        figsize=(
            12,
            max(
                7,
                WORST_ZONE_COUNT * 0.45,
            ),
        )
    )

    plt.barh(
        worst_zones[
            "zone_name"
        ][::-1],
        worst_zones[
            "mae"
        ][::-1],
    )

    plt.title(
        f"Backtest — MAE Değeri En Yüksek "
        f"{len(worst_zones)} Zone"
    )

    plt.xlabel("MAE")
    plt.ylabel("Zone")

    registry.save(
        filename=(
            "10_worst_zones_by_backtest_mae.png"
        ),
        chart_title=(
            "MAE Değeri En Yüksek Zonelar"
        ),
        category="ZONE_PERFORMANCE",
        source_data=(
            ZONE_BACKTEST_METRICS_FILE.name
        ),
        description=(
            "Admin ve veri bilimi ekibinin ek veri veya "
            "zone bazlı model iyileştirmesi yapması gereken bölgeler."
        ),
    )


# =====================================================
# 15. GELECEK TAHMİN GRAFİKLERİ
# =====================================================

def create_forecast_charts(
    registry: ChartRegistry,
    data: dict,
    summaries: dict,
) -> None:
    """
    Gelecek 24 saatlik tahmin ve Pricing Service grafiklerini üretir.
    """

    forecast = data[
        "xgboost_forecast"
    ]

    hourly_forecast = summaries[
        "hourly_forecast_comparison"
    ]

    demand_levels = summaries[
        "demand_level_distribution"
    ]

    surge_distribution = summaries[
        "surge_distribution"
    ]

    top_zones = summaries[
        "top_zones"
    ]

    weather_summary = summaries[
        "weather_summary"
    ]

    synthetic_weather_used = bool(
        pd.to_numeric(
            forecast[
                "weather_is_synthetic"
            ],
            errors="coerce",
        )
        .fillna(0)
        .astype(bool)
        .any()
    )

    # -------------------------------------------------
    # XGBoost ve Random Forest gelecek tahmini
    # -------------------------------------------------

    plt.figure(
        figsize=(14, 6)
    )

    plt.plot(
        hourly_forecast[
            "demand_hour_local"
        ],
        hourly_forecast[
            "xgboost_predicted_demand"
        ],
        marker="o",
        label="XGBoost",
    )

    plt.plot(
        hourly_forecast[
            "demand_hour_local"
        ],
        hourly_forecast[
            "random_forest_predicted_demand"
        ],
        marker="o",
        label="Random Forest",
    )

    plt.title(
        "Gelecek 24 Saat — Toplam Talep Tahmini"
    )

    plt.xlabel(
        "İstanbul Yerel Saati"
    )

    plt.ylabel(
        "Bütün Zoneların Tahmini Toplam Talebi"
    )

    plt.xticks(
        rotation=30,
        ha="right",
    )

    plt.legend()

    registry.save(
        filename=(
            "11_future_24h_model_comparison.png"
        ),
        chart_title=(
            "Gelecek 24 Saat Model Karşılaştırması"
        ),
        category="FORECAST",
        source_data=(
            FORECAST_COMPARISON_FILE.name
        ),
        description=(
            "XGBoost ve Random Forest aynı gelecek hava "
            "girdisi altında karşılaştırılır."
        ),
    )

    # -------------------------------------------------
    # Talep seviyesi dağılımı
    # -------------------------------------------------

    plt.figure(
        figsize=(9, 6)
    )

    plt.bar(
        demand_levels[
            "predicted_demand_level"
        ],
        demand_levels[
            "zone_hour_count"
        ],
    )

    plt.title(
        "Gelecek 24 Saat — Talep Seviyesi Dağılımı"
    )

    plt.xlabel("Tahmini Talep Seviyesi")
    plt.ylabel("Zone-Saat Sayısı")

    registry.save(
        filename=(
            "12_forecast_demand_level_distribution.png"
        ),
        chart_title=(
            "Forecast Talep Seviyesi Dağılımı"
        ),
        category="FORECAST",
        source_data=(
            XGBOOST_FORECAST_FILE.name
        ),
        description=(
            "LOW, MEDIUM ve HIGH olarak sınıflanan "
            "zone-saat kayıtlarının dağılımı."
        ),
    )

    # -------------------------------------------------
    # Surge dağılımı
    # -------------------------------------------------

    unique_surge_count = int(
        surge_distribution[
            "recommended_surge_multiplier"
        ].nunique()
    )

    plt.figure(
        figsize=(12, 6)
    )

    if unique_surge_count <= 20:
        plt.bar(
            surge_distribution[
                "recommended_surge_multiplier"
            ].astype(str),
            surge_distribution[
                "zone_hour_count"
            ],
        )

        plt.xlabel(
            "Önerilen Surge Multiplier"
        )

    else:
        plt.hist(
            forecast[
                "recommended_surge_multiplier"
            ],
            bins=25,
        )

        plt.xlabel(
            "Önerilen Surge Multiplier"
        )

    plt.title(
        "Gelecek 24 Saat — Surge Önerisi Dağılımı"
    )

    plt.ylabel("Zone-Saat Sayısı")

    plt.xticks(
        rotation=30,
        ha="right",
    )

    registry.save(
        filename=(
            "13_forecast_surge_distribution.png"
        ),
        chart_title=(
            "Forecast Surge Önerisi Dağılımı"
        ),
        category="PRICING",
        source_data=(
            PRICING_SERVICE_FILE.name
        ),
        description=(
            "Data Science tarafından önerilen çarpanlardır. "
            "Final fiyat değildir ve otomatik uygulanmaz."
        ),
    )

    # -------------------------------------------------
    # En yüksek talep beklenen zonelar
    # -------------------------------------------------

    plt.figure(
        figsize=(
            12,
            max(
                7,
                len(top_zones) * 0.45,
            ),
        )
    )

    plt.barh(
        top_zones[
            "zone_name"
        ][::-1],
        top_zones[
            "total_predicted_demand"
        ][::-1],
    )

    plt.title(
        f"Gelecek 24 Saat — En Yüksek Talep "
        f"Beklenen {len(top_zones)} Zone"
    )

    plt.xlabel(
        "24 Saatlik Toplam Tahmini Talep"
    )

    plt.ylabel("Zone")

    registry.save(
        filename=(
            "14_top_zones_by_forecast_demand.png"
        ),
        chart_title=(
            "En Yüksek Tahminli Zonelar"
        ),
        category="FORECAST",
        source_data=(
            XGBOOST_FORECAST_FILE.name
        ),
        description=(
            "Operasyon ekibinin araç konumlandırma "
            "kararlarına destek verebilir."
        ),
    )

    # -------------------------------------------------
    # Hava durumuna göre tahmini talep
    # -------------------------------------------------

    if synthetic_weather_used:
        weather_title = (
            "Hava Senaryosuna Göre Ortalama Tahmini Talep"
        )

        weather_description = (
            "Hava verisi sentetiktir veya haftalık senaryodur. "
            "Grafik yalnızca model davranışını gösterir; "
            "gerçek hava etkisini veya nedenselliği kanıtlamaz."
        )

    else:
        weather_title = (
            "Hava Tahminine Göre Ortalama Tahmini Talep"
        )

        weather_description = (
            "Harici hava tahmini altında oluşan ortalama "
            "zone talebini gösterir. Korelasyon nedensellik değildir."
        )

    plt.figure(
        figsize=(10, 6)
    )

    plt.bar(
        weather_summary[
            "weather_condition"
        ],
        weather_summary[
            "average_predicted_demand"
        ],
    )

    plt.title(weather_title)

    plt.xlabel("Hava Durumu")
    plt.ylabel("Ortalama Tahmini Zone Talebi")

    plt.xticks(
        rotation=20,
        ha="right",
    )

    registry.save(
        filename=(
            "15_weather_scenario_predicted_demand.png"
        ),
        chart_title=weather_title,
        category="WEATHER",
        source_data=(
            XGBOOST_FORECAST_FILE.name
        ),
        description=weather_description,
    )

    # -------------------------------------------------
    # En yüksek tahminli zone için belirsizlik aralığı
    # -------------------------------------------------

    highest_demand_zone_id = int(
        top_zones.iloc[0][
            "zone_id"
        ]
    )

    highest_zone_df = (
        forecast.loc[
            forecast["zone_id"]
            == highest_demand_zone_id
        ]
        .sort_values(
            "demand_hour_local"
        )
        .reset_index(drop=True)
    )

    highest_zone_name = str(
        highest_zone_df.iloc[0][
            "zone_name"
        ]
    )

    x_values = highest_zone_df[
        "demand_hour_local"
    ]

    predicted_values = highest_zone_df[
        "predicted_demand"
    ].to_numpy(dtype=float)

    lower_values = highest_zone_df[
        "prediction_lower_80"
    ].to_numpy(dtype=float)

    upper_values = highest_zone_df[
        "prediction_upper_80"
    ].to_numpy(dtype=float)

    plt.figure(
        figsize=(14, 6)
    )

    plt.plot(
        x_values,
        predicted_values,
        marker="o",
        label="Tahmini talep",
    )

    plt.fill_between(
        x_values,
        lower_values,
        upper_values,
        alpha=0.25,
        label="Yaklaşık %80 tahmin aralığı",
    )

    plt.title(
        f"{highest_zone_name} — Gelecek 24 Saat "
        "Talep ve Tahmin Aralığı"
    )

    plt.xlabel(
        "İstanbul Yerel Saati"
    )

    plt.ylabel("Tahmini Talep")

    plt.xticks(
        rotation=30,
        ha="right",
    )

    plt.legend()

    registry.save(
        filename=(
            "16_top_zone_forecast_interval.png"
        ),
        chart_title=(
            f"{highest_zone_name} Forecast Aralığı"
        ),
        category="FORECAST_UNCERTAINTY",
        source_data=(
            XGBOOST_FORECAST_FILE.name
        ),
        description=(
            "Tahmin aralığı backtest residual dağılımından "
            "üretilmiştir; kesin güven aralığı olarak "
            "yorumlanmamalıdır."
        ),
    )


# =====================================================
# 16. ÖZET TABLOLARI KAYDETME
# =====================================================

def save_summary_tables(
    summaries: dict,
    metrics_verification_df: pd.DataFrame,
) -> None:
    """
    Grafiklerin dayandığı özet tabloları CSV olarak kaydeder.
    """

    metrics_verification_df.to_csv(
        METRICS_VERIFICATION_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    summaries[
        "hourly_backtest"
    ].to_csv(
        HOURLY_BACKTEST_SUMMARY_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    summaries[
        "hour_of_day"
    ].to_csv(
        HOUR_OF_DAY_SUMMARY_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    summaries[
        "model_win_distribution"
    ].to_csv(
        MODEL_WIN_DISTRIBUTION_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    summaries[
        "hourly_forecast_comparison"
    ].to_csv(
        HOURLY_FORECAST_COMPARISON_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    summaries[
        "demand_level_distribution"
    ].to_csv(
        DEMAND_LEVEL_DISTRIBUTION_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    summaries[
        "surge_distribution"
    ].to_csv(
        SURGE_DISTRIBUTION_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    summaries[
        "top_zones"
    ].to_csv(
        TOP_ZONE_FORECAST_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    summaries[
        "weather_summary"
    ].to_csv(
        WEATHER_FORECAST_SUMMARY_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    summaries[
        "top_features"
    ].to_csv(
        TOP_FEATURES_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    summaries[
        "worst_zones"
    ].to_csv(
        WORST_ZONE_METRICS_FILE,
        index=False,
        encoding="utf-8-sig",
    )


# =====================================================
# 17. README VE SON RAPOR
# =====================================================

def create_readme(
    chart_manifest_df: pd.DataFrame,
    selected_model: str,
    synthetic_weather_used: bool,
) -> str:
    """
    Grafiklerin nasıl yorumlanacağını açıklayan Markdown metni oluşturur.
    """

    chart_lines = []

    for row in chart_manifest_df.itertuples(
        index=False
    ):
        chart_lines.append(
            f"{int(row.chart_order)}. "
            f"`{row.filename}` — "
            f"{row.chart_title}"
        )

    weather_note = (
        "Gelecek hava verisi sentetik veya haftalık senaryodur. "
        "Hava grafikleri gerçek hava-talep ilişkisini kanıtlamaz."
        if synthetic_weather_used
        else (
            "Gelecek hava girdisi harici tahmin verisidir. "
            "Yine de grafikler nedensellik değil model çıktısı gösterir."
        )
    )

    return f"""# XGBoost Visualization Outputs

Visualization version: `{VISUALIZATION_VERSION}`  
Demand model: `{EXPECTED_MODEL_VERSION}`  
Selected model by backtest metrics: `{selected_model}`

## Temel yorumlama kuralları

- MAE ve RMSE yalnızca zaman bazlı ayrılmış backtest döneminden hesaplanır.
- Gelecek 24 saat dosyasında gerçek talep bulunmadığı için forecast
  üzerinden model performans metriği hesaplanmaz.
- Düşük MAE ve RMSE daha iyi sonucu gösterir.
- R² negatif olabilir; bu durum modelin ortalama tahminden daha kötü
  performans göstermesi anlamına gelebilir.
- Feature importance nedensellik göstermez.
- Surge multiplier yalnızca Data Science önerisidir.
- Pricing Service kontrolü olmadan otomatik uygulanamaz.
- Pricing rule birleştirme stratejisi `MAX` değeridir.
- Tahmin aralıkları backtest residual dağılımına dayanır ve kesin
  istatistiksel güven aralığı değildir.

## Hava durumu uyarısı

{weather_note}

## Grafikler

{chr(10).join(chart_lines)}

## Dosya konumları

Grafikler:

`outputs/visualizations/19_xgboost_results/`

Grafiklere ait tablolar ve doğrulamalar:

`outputs/reports/19_visualize_xgboost_results/`
"""


def save_final_reports(
    recorder: CheckRecorder,
    registry: ChartRegistry,
    data: dict,
    summaries: dict,
) -> dict:
    """
    Doğrulama, manifest, JSON özet ve README dosyalarını kaydeder.
    """

    checks_df = recorder.to_dataframe()

    checks_df.to_csv(
        VALIDATION_CHECKS_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    chart_manifest_df = (
        registry.to_dataframe()
    )

    chart_manifest_df.to_csv(
        CHART_MANIFEST_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    metrics_df = data["metrics"]

    selected_model = str(
        data[
            "model_selection_json"
        ].get(
            "recommended_model_by_test_mae",
            "",
        )
    )

    synthetic_weather_used = bool(
        pd.to_numeric(
            data[
                "xgboost_forecast"
            ][
                "weather_is_synthetic"
            ],
            errors="coerce",
        )
        .fillna(0)
        .astype(bool)
        .any()
    )

    readme_text = create_readme(
        chart_manifest_df=(
            chart_manifest_df
        ),
        selected_model=(
            selected_model
        ),
        synthetic_weather_used=(
            synthetic_weather_used
        ),
    )

    VISUALIZATION_README_FILE.write_text(
        readme_text,
        encoding="utf-8",
    )

    best_metric_row = (
        metrics_df.sort_values(
            by=[
                "mae",
                "rmse",
            ],
            ascending=[
                True,
                True,
            ],
        )
        .iloc[0]
    )

    summary = {
        "visualization_version": (
            VISUALIZATION_VERSION
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
        "chart_count": int(
            len(chart_manifest_df)
        ),
        "chart_output_directory": str(
            VISUALIZATION_OUTPUT_DIR
        ),
        "report_output_directory": str(
            REPORT_OUTPUT_DIR
        ),
        "model_version": (
            EXPECTED_MODEL_VERSION
        ),
        "recommended_model": (
            selected_model
        ),
        "best_model_from_metrics": str(
            best_metric_row["model"]
        ),
        "best_model_mae": float(
            best_metric_row["mae"]
        ),
        "best_model_rmse": float(
            best_metric_row["rmse"]
        ),
        "xgboost_is_recommended_model": (
            selected_model
            == "XGBOOST_WEATHER"
        ),
        "backtest_row_count": int(
            len(
                data[
                    "backtest_comparison"
                ]
            )
        ),
        "backtest_hour_count": int(
            data[
                "backtest_comparison"
            ][
                "demand_hour_utc"
            ].nunique()
        ),
        "forecast_row_count": int(
            len(
                data[
                    "xgboost_forecast"
                ]
            )
        ),
        "forecast_hour_count": int(
            data[
                "xgboost_forecast"
            ][
                "demand_hour_utc"
            ].nunique()
        ),
        "forecast_zone_count": int(
            data[
                "xgboost_forecast"
            ][
                "zone_id"
            ].nunique()
        ),
        "future_weather_is_synthetic": (
            synthetic_weather_used
        ),
        "surge_auto_apply": False,
        "pricing_service_validation_required": True,
        "pricing_rule_merge_strategy": (
            "MAX"
        ),
        "metrics_calculated_from_future_forecast": False,
        "metrics_source": (
            "Time-based backtest only"
        ),
        "feature_importance_is_causal": False,
        "weather_chart_is_causal_evidence": False,
        "top_forecast_zones": (
            summaries[
                "top_zones"
            ][
                [
                    "zone_id",
                    "zone_name",
                    "total_predicted_demand",
                    "average_recommended_surge",
                ]
            ]
            .head(5)
            .to_dict("records")
        ),
        "chart_manifest": str(
            CHART_MANIFEST_FILE
        ),
        "validation_checks": str(
            VALIDATION_CHECKS_FILE
        ),
        "readme": str(
            VISUALIZATION_README_FILE
        ),
    }

    with open(
        VISUALIZATION_SUMMARY_FILE,
        "w",
        encoding="utf-8",
    ) as json_file:
        json.dump(
            json_safe(summary),
            json_file,
            ensure_ascii=False,
            indent=4,
        )

    return summary


# =====================================================
# 18. ÇIKTI DOSYALARINI DOĞRULAMA
# =====================================================

def validate_generated_charts(
    recorder: CheckRecorder,
    registry: ChartRegistry,
) -> None:
    """
    Manifestteki bütün grafik dosyalarının başarıyla yazıldığını kontrol eder.
    """

    manifest_df = registry.to_dataframe()

    expected_chart_count = 16

    recorder.add(
        category="CHART_OUTPUT",
        check_name="expected_chart_count_created",
        passed=(
            len(manifest_df)
            == expected_chart_count
        ),
        details=(
            f"Oluşturulan grafik={len(manifest_df)}; "
            f"beklenen={expected_chart_count}"
        ),
    )

    missing_chart_files = []

    empty_chart_files = []

    for row in manifest_df.itertuples(
        index=False
    ):
        chart_path = Path(
            row.output_path
        )

        if not chart_path.exists():
            missing_chart_files.append(
                row.filename
            )

        elif chart_path.stat().st_size == 0:
            empty_chart_files.append(
                row.filename
            )

    recorder.add(
        category="CHART_OUTPUT",
        check_name="all_chart_files_exist",
        passed=(
            len(missing_chart_files)
            == 0
        ),
        details=(
            "Eksik grafik yok."
            if not missing_chart_files
            else (
                f"Eksik grafikler: "
                f"{missing_chart_files}"
            )
        ),
    )

    recorder.add(
        category="CHART_OUTPUT",
        check_name="chart_files_are_not_empty",
        passed=(
            len(empty_chart_files)
            == 0
        ),
        details=(
            "Boş grafik dosyası yok."
            if not empty_chart_files
            else (
                f"Boş grafikler: "
                f"{empty_chart_files}"
            )
        ),
    )


# =====================================================
# 19. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 78)
    print("19 — XGBOOST SONUÇLARININ GÖRSELLEŞTİRİLMESİ")
    print("=" * 78)

    recorder = CheckRecorder()
    registry = ChartRegistry()

    clear_output_directories()

    print(
        "\n1/7 Girdi dosyaları kontrol ediliyor..."
    )

    for logical_name, file_path in (
        REQUIRED_FILES.items()
    ):
        exists = file_path.exists()

        recorder.add(
            category="SOURCE_FILES",
            check_name=(
                f"{logical_name}_exists"
            ),
            passed=exists,
            details=str(file_path),
        )

    if recorder.failed_error_count() > 0:
        recorder.to_dataframe().to_csv(
            VALIDATION_CHECKS_FILE,
            index=False,
            encoding="utf-8-sig",
        )

        raise FileNotFoundError(
            "Görselleştirme için gerekli dosyalar eksik.\n"
            f"Kontrol raporu:\n"
            f"{VALIDATION_CHECKS_FILE}"
        )

    print(
        "\n2/7 Veriler okunuyor ve hazırlanıyor..."
    )

    data = load_inputs()

    data = prepare_inputs(
        data
    )

    print(
        "\n3/7 Backtest, forecast ve Pricing "
        "Service verileri doğrulanıyor..."
    )

    metrics_verification_df = (
        validate_inputs(
            recorder=recorder,
            data=data,
        )
    )

    if (
        recorder.failed_error_count() > 0
        and FAIL_ON_VALIDATION_ERROR
    ):
        recorder.to_dataframe().to_csv(
            VALIDATION_CHECKS_FILE,
            index=False,
            encoding="utf-8-sig",
        )

        metrics_verification_df.to_csv(
            METRICS_VERIFICATION_FILE,
            index=False,
            encoding="utf-8-sig",
        )

        raise ValueError(
            "Görselleştirme girdilerinde hata bulundu.\n"
            "Yanlış grafik üretilmesini önlemek için işlem durduruldu.\n\n"
            f"Kontrol raporu:\n"
            f"{VALIDATION_CHECKS_FILE}"
        )

    print(
        "\n4/7 Grafik özet tabloları hazırlanıyor..."
    )

    summaries = create_summary_tables(
        data=data
    )

    save_summary_tables(
        summaries=summaries,
        metrics_verification_df=(
            metrics_verification_df
        ),
    )

    print(
        "\n5/7 Model performans ve backtest "
        "grafikleri oluşturuluyor..."
    )

    create_metric_charts(
        registry=registry,
        metrics_df=data["metrics"],
    )

    create_backtest_charts(
        registry=registry,
        data=data,
        summaries=summaries,
    )

    print(
        "\n6/7 Model açıklanabilirlik ve forecast "
        "grafikleri oluşturuluyor..."
    )

    create_model_explanation_charts(
        registry=registry,
        data=data,
        summaries=summaries,
    )

    create_forecast_charts(
        registry=registry,
        data=data,
        summaries=summaries,
    )

    validate_generated_charts(
        recorder=recorder,
        registry=registry,
    )

    print(
        "\n7/7 Manifest, README ve özet rapor "
        "oluşturuluyor..."
    )

    summary = save_final_reports(
        recorder=recorder,
        registry=registry,
        data=data,
        summaries=summaries,
    )

    # save_final_reports öncesinde eklenen chart kontrollerini de
    # doğrulama CSV'sine son kez yazar.
    recorder.to_dataframe().to_csv(
        VALIDATION_CHECKS_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    print("\n" + "=" * 78)
    print("XGBOOST GÖRSELLEŞTİRMELERİ HAZIR")
    print("=" * 78)

    print(
        f"Grafik sayısı       : "
        f"{summary['chart_count']:,}"
    )

    print(
        f"Backtest satırı     : "
        f"{summary['backtest_row_count']:,}"
    )

    print(
        f"Forecast satırı     : "
        f"{summary['forecast_row_count']:,}"
    )

    print(
        f"Forecast saati      : "
        f"{summary['forecast_hour_count']:,}"
    )

    print(
        f"Forecast zone       : "
        f"{summary['forecast_zone_count']:,}"
    )

    print(
        f"Önerilen model      : "
        f"{summary['recommended_model']}"
    )

    print(
        f"Başarısız kontrol   : "
        f"{summary['failed_error_count']:,}"
    )

    print(
        f"Uyarı               : "
        f"{summary['warning_count']:,}"
    )

    print(
        f"\nGrafik klasörü:"
        f"\n{VISUALIZATION_OUTPUT_DIR}"
    )

    print(
        f"\nRapor klasörü:"
        f"\n{REPORT_OUTPUT_DIR}"
    )

    print("\nOluşturulan grafikler:")

    for row in (
        registry.to_dataframe()
        .itertuples(
            index=False
        )
    ):
        print(
            f"{int(row.chart_order):02d}. "
            f"{row.filename}"
        )

    print("\nKontroller:")
    print(
        "Eski XGBoost dosya isimleri kullanılmadı."
    )
    print(
        "Model metrikleri gelecek forecast üzerinden hesaplanmadı."
    )
    print(
        "MAE, RMSE ve R² zaman bazlı backtest verisinden doğrulandı."
    )
    print(
        "XGBoost, Random Forest ve seasonal baseline karşılaştırıldı."
    )
    print(
        "Gerçek talep ve tahmin aynı zone-saat anahtarlarıyla eşleştirildi."
    )
    print(
        "Early stopping eğitim geçmişi görselleştirildi."
    )
    print(
        "Temel feature importance değerleri görselleştirildi."
    )
    print(
        "Zone bazlı hata grafiği oluşturuldu."
    )
    print(
        "Gelecek 24 saatlik forecast ayrı gösterildi."
    )
    print(
        "XGBoost ve Random Forest gelecek tahminleri karşılaştırıldı."
    )
    print(
        "Forecast ile Pricing Service sözleşmesi doğrulandı."
    )
    print(
        "Surge önerisinin otomatik uygulanmadığı doğrulandı."
    )
    print(
        "Talep tahmin aralığı yalnızca zone bazında gösterildi."
    )
    print(
        "Sentetik hava durumu grafiklerde uyarıyla belirtildi."
    )
    print(
        "Grafik manifestosu ve kaynak tablolar oluşturuldu."
    )

    if not summary[
        "xgboost_is_recommended_model"
    ]:
        print(
            "\n⚠️ XGBoost test metriklerine göre "
            "en iyi model değildir."
        )

        print(
            "Grafikler karşılaştırma ve model analizi "
            "amacıyla oluşturulmuştur."
        )


if __name__ == "__main__":
    main()