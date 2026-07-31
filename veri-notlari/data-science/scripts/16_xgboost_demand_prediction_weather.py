import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import xgboost

from sklearn.compose import ColumnTransformer
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBRegressor


# Windows terminalinde Türkçe karakter desteği
try:
    sys.stdout.reconfigure(encoding="utf-8")
except AttributeError:
    pass


# =====================================================
# 1. GENEL AYARLAR
# =====================================================

RANDOM_SEED = 42

MODEL_VERSION = "xgboost-demand-weather-v1"

SIMULATION_TIMEZONE = "Europe/Istanbul"

TARGET_COLUMN = "demand_count"

# Son 7 gün test dönemi
TEST_HOURS = 7 * 24

# Eğitim döneminin son 3 günü early stopping doğrulaması
EARLY_STOP_VALIDATION_HOURS = 3 * 24

MINIMUM_SUBTRAIN_HOURS = 10 * 24

FORECAST_HORIZON_HOURS = 24

LAG_HOURS = [
    1,
    2,
    3,
    24,
    168,
]

ROLLING_WINDOWS = [
    3,
    24,
    168,
]

HOLIDAY_DATES = {
    "2025-01-01",
}


# =====================================================
# 2. XGBOOST AYARLARI
# =====================================================

MAX_BOOSTING_ROUNDS = 2_000

EARLY_STOPPING_ROUNDS = 75

XGBOOST_PARAMETERS = {
    "objective": "reg:squarederror",
    "eval_metric": "mae",
    "learning_rate": 0.03,
    "max_depth": 8,
    "min_child_weight": 3,
    "subsample": 0.85,
    "colsample_bytree": 0.85,
    "reg_alpha": 0.05,
    "reg_lambda": 1.00,
    "tree_method": "hist",
    "random_state": RANDOM_SEED,
    "n_jobs": -1,
}


# =====================================================
# 3. SURGE AYARLARI
# =====================================================

MIN_SURGE_MULTIPLIER = 1.00
MAX_SURGE_MULTIPLIER = 1.60


# =====================================================
# 4. MODEL ÖZELLİKLERİ
# =====================================================

CATEGORICAL_FEATURES = [
    "zone_id_category",
    "zone_category",
    "weather_condition",
]

NUMERIC_FEATURES = [
    # Takvim
    "hour_sin",
    "hour_cos",
    "day_of_week_sin",
    "day_of_week_cos",
    "is_weekend",
    "is_peak_hour",
    "is_holiday",

    # Hava
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

    # Geçmiş talep
    "demand_lag_1h",
    "demand_lag_2h",
    "demand_lag_3h",
    "demand_lag_24h",
    "demand_lag_168h",
    "demand_rolling_mean_3h",
    "demand_rolling_mean_24h",
    "demand_rolling_mean_168h",
]

MODEL_FEATURES = (
    CATEGORICAL_FEATURES
    + NUMERIC_FEATURES
)

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


WEATHER_FORECAST_COLUMNS = [
    "demand_hour_utc",
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
]


# =====================================================
# 5. PROJE KLASÖRLERİ
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

MODEL_DIR = (
    PROJECT_ROOT
    / "models"
    / "demand_forecast"
)

REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "16_xgboost_demand_prediction_weather"
)

MODEL_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

REPORT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# =====================================================
# 6. DOSYA YOLLARI
# =====================================================

HOURLY_DEMAND_DATASET_FILE = (
    PROCESSED_DATA_DIR
    / "demand_hourly_zone_weather.parquet"
)

ZONE_CATALOG_FILE = (
    REFERENCE_DATA_DIR
    / "istanbul_zone_catalog.csv"
)

RANDOM_FOREST_BACKTEST_FILE = (
    PROCESSED_DATA_DIR
    / "demand_backtest_random_forest_weather.parquet"
)

RANDOM_FOREST_FORECAST_FILE = (
    PROCESSED_DATA_DIR
    / "demand_forecast_random_forest_weather.parquet"
)


# -----------------------------------------------------
# XGBoost ana çıktıları
# -----------------------------------------------------

XGBOOST_BACKTEST_CSV_FILE = (
    PROCESSED_DATA_DIR
    / "demand_backtest_xgboost_weather.csv"
)

XGBOOST_BACKTEST_PARQUET_FILE = (
    PROCESSED_DATA_DIR
    / "demand_backtest_xgboost_weather.parquet"
)

XGBOOST_FORECAST_CSV_FILE = (
    PROCESSED_DATA_DIR
    / "demand_forecast_xgboost_weather.csv"
)

XGBOOST_FORECAST_PARQUET_FILE = (
    PROCESSED_DATA_DIR
    / "demand_forecast_xgboost_weather.parquet"
)

PRICING_SERVICE_OUTPUT_FILE = (
    PROCESSED_DATA_DIR
    / "pricing_service_surge_xgboost_weather.csv"
)

BACKTEST_MODEL_COMPARISON_FILE = (
    PROCESSED_DATA_DIR
    / "demand_backtest_model_comparison_weather.csv"
)

FORECAST_MODEL_COMPARISON_FILE = (
    PROCESSED_DATA_DIR
    / "demand_forecast_model_comparison_weather.csv"
)


# -----------------------------------------------------
# Model dosyaları
# -----------------------------------------------------

MODEL_BUNDLE_FILE = (
    MODEL_DIR
    / "xgboost_weather_bundle.joblib"
)

NATIVE_XGBOOST_MODEL_FILE = (
    MODEL_DIR
    / "xgboost_weather_model.json"
)

MODEL_METADATA_FILE = (
    MODEL_DIR
    / "xgboost_weather_metadata.json"
)


# -----------------------------------------------------
# Raporlar
# -----------------------------------------------------

MODEL_METRICS_FILE = (
    REPORT_DIR
    / "xgboost_model_metrics.json"
)

MODEL_METRICS_COMPARISON_FILE = (
    REPORT_DIR
    / "xgboost_random_forest_baseline_comparison.csv"
)

FEATURE_IMPORTANCE_FILE = (
    REPORT_DIR
    / "xgboost_feature_importance.csv"
)

BASE_FEATURE_IMPORTANCE_FILE = (
    REPORT_DIR
    / "xgboost_base_feature_importance.csv"
)

ZONE_BACKTEST_METRICS_FILE = (
    REPORT_DIR
    / "xgboost_zone_backtest_metrics.csv"
)

TRAINING_HISTORY_FILE = (
    REPORT_DIR
    / "xgboost_training_history.csv"
)

ZONE_THRESHOLDS_FILE = (
    REPORT_DIR
    / "xgboost_zone_demand_thresholds.csv"
)

MODEL_SELECTION_FILE = (
    REPORT_DIR
    / "model_selection_recommendation.json"
)

FORECAST_SUMMARY_FILE = (
    REPORT_DIR
    / "xgboost_forecast_summary.json"
)


# =====================================================
# 7. YARDIMCI FONKSİYONLAR
# =====================================================

def require_file(file_path: Path) -> None:
    """
    Gerekli dosyanın varlığını kontrol eder.
    """

    if not file_path.exists():
        raise FileNotFoundError(
            f"Gerekli dosya bulunamadı:\n{file_path}"
        )


def validate_columns(
    dataframe: pd.DataFrame,
    required_columns: list[str],
    dataframe_name: str,
) -> None:
    """
    DataFrame içinde gerekli sütunların bulunmasını doğrular.
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


def create_one_hot_encoder() -> OneHotEncoder:
    """
    Farklı Scikit-Learn sürümleriyle uyumlu encoder oluşturur.
    """

    try:
        return OneHotEncoder(
            handle_unknown="ignore",
            sparse_output=True,
        )

    except TypeError:
        return OneHotEncoder(
            handle_unknown="ignore",
            sparse=True,
        )


def create_preprocessor() -> ColumnTransformer:
    """
    Kategorik alanları one-hot, sayısal alanları passthrough yapar.
    """

    return ColumnTransformer(
        transformers=[
            (
                "categorical",
                create_one_hot_encoder(),
                CATEGORICAL_FEATURES,
            ),
            (
                "numeric",
                "passthrough",
                NUMERIC_FEATURES,
            ),
        ],
        remainder="drop",
    )


def safe_wape(
    actual: np.ndarray,
    predicted: np.ndarray,
) -> float:
    """
    Weighted Absolute Percentage Error hesaplar.
    """

    denominator = float(
        np.abs(actual).sum()
    )

    if denominator == 0:
        return 0.0

    return float(
        np.abs(
            actual - predicted
        ).sum()
        / denominator
    )


def safe_smape(
    actual: np.ndarray,
    predicted: np.ndarray,
) -> float:
    """
    Symmetric Mean Absolute Percentage Error hesaplar.
    """

    denominator = (
        np.abs(actual)
        + np.abs(predicted)
    )

    valid_mask = denominator > 0

    if not valid_mask.any():
        return 0.0

    return float(
        np.mean(
            2
            * np.abs(
                actual[valid_mask]
                - predicted[valid_mask]
            )
            / denominator[valid_mask]
        )
    )


def calculate_metrics(
    actual: np.ndarray,
    predicted: np.ndarray,
) -> dict:
    """
    Talep tahmini performans metriklerini hesaplar.
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
        "wape": safe_wape(
            actual,
            predicted,
        ),
        "smape": safe_smape(
            actual,
            predicted,
        ),
        "actual_total": float(
            actual.sum()
        ),
        "predicted_total": float(
            predicted.sum()
        ),
    }


def json_safe(value):
    """
    NumPy ve Pandas türlerini JSON uyumlu hale getirir.
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


def predict_demand(
    preprocessor: ColumnTransformer,
    model: XGBRegressor,
    features_df: pd.DataFrame,
) -> np.ndarray:
    """
    Log1p hedefiyle eğitilen XGBoost modelinden tahmin üretir.
    """

    transformed_features = (
        preprocessor.transform(
            features_df[
                MODEL_FEATURES
            ]
        )
    )

    log_predictions = model.predict(
        transformed_features
    )

    predictions = np.expm1(
        log_predictions
    )

    return np.clip(
        predictions,
        0,
        None,
    )


# =====================================================
# 8. ZONE KATALOĞUNU OKUMA
# =====================================================

def read_zone_catalog() -> pd.DataFrame:
    """
    Aktif İstanbul fiyat bölgelerini okur.
    """

    require_file(
        ZONE_CATALOG_FILE
    )

    zones_df = pd.read_csv(
        ZONE_CATALOG_FILE,
        low_memory=False,
    )

    required_columns = [
        "zone_id",
        "zone_name",
        "zone_category",
        "is_active",
    ]

    validate_columns(
        zones_df,
        required_columns,
        "istanbul_zone_catalog.csv",
    )

    zones_df["zone_id"] = pd.to_numeric(
        zones_df["zone_id"],
        errors="raise",
    ).astype("int64")

    zones_df["is_active"] = (
        zones_df["is_active"]
        .astype("string")
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

    if zones_df["is_active"].isna().any():
        raise ValueError(
            "Zone kataloğunda geçersiz is_active değeri bulundu."
        )

    if zones_df["zone_id"].duplicated().any():
        raise ValueError(
            "Zone kataloğunda tekrar eden zone_id bulundu."
        )

    active_zones_df = zones_df.loc[
        zones_df["is_active"],
        [
            "zone_id",
            "zone_name",
            "zone_category",
        ],
    ].copy()

    if active_zones_df.empty:
        raise ValueError(
            "Aktif pricing zone bulunamadı."
        )

    active_zones_df["zone_category"] = (
        active_zones_df["zone_category"]
        .fillna("OTHER")
        .astype("string")
    )

    return (
        active_zones_df
        .sort_values("zone_id")
        .reset_index(drop=True)
    )


# =====================================================
# 9. ORTAK SAATLİK VERİ SETİNİ OKUMA
# =====================================================

def read_hourly_demand_dataset() -> pd.DataFrame:
    """
    16 numaralı dosyanın oluşturduğu ortak zone × saat veri setini okur.

    Random Forest ve XGBoost aynı veri, aynı hedef ve aynı özelliklerle
    karşılaştırılır.
    """

    require_file(
        HOURLY_DEMAND_DATASET_FILE
    )

    hourly_df = pd.read_parquet(
        HOURLY_DEMAND_DATASET_FILE
    )

    required_columns = [
        "zone_id",
        "zone_name",
        "zone_category",
        "demand_hour_utc",
        "demand_hour_local",
        "forecast_date_local",
        "reservation_hour",
        "day_of_week",
        "demand_count",
        *MODEL_FEATURES,
    ]

    validate_columns(
        hourly_df,
        required_columns,
        "demand_hourly_zone_weather.parquet",
    )

    hourly_df["zone_id"] = pd.to_numeric(
        hourly_df["zone_id"],
        errors="raise",
    ).astype("int64")

    hourly_df["demand_hour_utc"] = pd.to_datetime(
        hourly_df["demand_hour_utc"],
        errors="coerce",
        utc=True,
    )

    hourly_df["demand_hour_local"] = pd.to_datetime(
        hourly_df["demand_hour_local"],
        errors="coerce",
        utc=True,
    ).dt.tz_convert(
        SIMULATION_TIMEZONE
    )

    if hourly_df["demand_hour_utc"].isna().any():
        raise ValueError(
            "Saatlik talep veri setinde geçersiz UTC saati bulundu."
        )

    if hourly_df[
        [
            "zone_id",
            "demand_hour_utc",
        ]
    ].duplicated().any():
        raise ValueError(
            "Saatlik veri setinde tekrar eden zone-saat bulundu."
        )

    numeric_columns = [
        TARGET_COLUMN,
        *NUMERIC_FEATURES,
    ]

    for column in numeric_columns:
        hourly_df[column] = pd.to_numeric(
            hourly_df[column],
            errors="coerce",
        )

    if hourly_df[TARGET_COLUMN].isna().any():
        raise ValueError(
            "demand_count alanında eksik değer bulundu."
        )

    if not (
        hourly_df[TARGET_COLUMN] >= 0
    ).all():
        raise ValueError(
            "Negatif demand_count değeri bulundu."
        )

    hourly_df["zone_id_category"] = (
        hourly_df["zone_id"]
        .astype(str)
    )

    hourly_df["zone_category"] = (
        hourly_df["zone_category"]
        .fillna("OTHER")
        .astype("string")
    )

    hourly_df["weather_condition"] = (
        hourly_df["weather_condition"]
        .astype("string")
    )

    hourly_df = (
        hourly_df
        .sort_values(
            [
                "demand_hour_utc",
                "zone_id",
            ]
        )
        .reset_index(drop=True)
    )

    zero_demand_count = int(
        (
            hourly_df[
                TARGET_COLUMN
            ]
            == 0
        ).sum()
    )

    if zero_demand_count == 0:
        raise ValueError(
            "Saatlik veri setinde sıfır talepli zone-saat bulunmuyor. "
            "16 numaralı dosyanın güncel sürümünü çalıştır."
        )

    return hourly_df


# =====================================================
# 10. MODEL VERİSİNİ HAZIRLAMA
# =====================================================

def prepare_model_dataset(
    hourly_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Lag ve rolling alanları tamamlanmış kayıtları model için seçer.
    """

    if FORBIDDEN_LEAKAGE_FEATURES.intersection(
        MODEL_FEATURES
    ):
        raise ValueError(
            "Model özelliklerinde target leakage alanı bulundu."
        )

    model_df = hourly_df.dropna(
        subset=MODEL_FEATURES
    ).copy()

    if model_df.empty:
        raise ValueError(
            "Lag özellikleri çıkarıldıktan sonra model verisi kalmadı."
        )

    if model_df[
        MODEL_FEATURES
    ].isna().any().any():
        raise ValueError(
            "Model özelliklerinde eksik değer bulundu."
        )

    return (
        model_df
        .sort_values(
            [
                "demand_hour_utc",
                "zone_id",
            ]
        )
        .reset_index(drop=True)
    )


# =====================================================
# 11. ZAMAN BAZLI EĞİTİM / TEST AYRIMI
# =====================================================

def split_train_test(
    model_df: pd.DataFrame,
) -> tuple[
    pd.DataFrame,
    pd.DataFrame,
    pd.Timestamp,
]:
    """
    Son 168 saati test olarak ayırır.

    Random split kullanılmaz.
    """

    unique_hours = (
        model_df[
            "demand_hour_utc"
        ]
        .drop_duplicates()
        .sort_values()
        .reset_index(drop=True)
    )

    minimum_required_hours = (
        TEST_HOURS
        + EARLY_STOP_VALIDATION_HOURS
        + MINIMUM_SUBTRAIN_HOURS
    )

    if len(unique_hours) < minimum_required_hours:
        raise ValueError(
            "XGBoost zaman bazlı eğitim için yeterli saat yok.\n"
            f"Gerekli: {minimum_required_hours}\n"
            f"Bulunan: {len(unique_hours)}"
        )

    test_start_hour = unique_hours.iloc[
        -TEST_HOURS
    ]

    train_df = model_df.loc[
        model_df["demand_hour_utc"]
        < test_start_hour
    ].copy()

    test_df = model_df.loc[
        model_df["demand_hour_utc"]
        >= test_start_hour
    ].copy()

    if test_df[
        "demand_hour_utc"
    ].nunique() != TEST_HOURS:
        raise ValueError(
            "Test dönemi tam 168 saat değil."
        )

    return (
        train_df,
        test_df,
        test_start_hour,
    )


# =====================================================
# 12. EARLY STOPPING AYRIMI
# =====================================================

def split_early_stopping_validation(
    train_df: pd.DataFrame,
) -> tuple[
    pd.DataFrame,
    pd.DataFrame,
    pd.Timestamp,
]:
    """
    Ana eğitim döneminin son 72 saatini validation olarak ayırır.
    """

    train_hours = (
        train_df[
            "demand_hour_utc"
        ]
        .drop_duplicates()
        .sort_values()
        .reset_index(drop=True)
    )

    validation_start_hour = train_hours.iloc[
        -EARLY_STOP_VALIDATION_HOURS
    ]

    subtrain_df = train_df.loc[
        train_df["demand_hour_utc"]
        < validation_start_hour
    ].copy()

    validation_df = train_df.loc[
        train_df["demand_hour_utc"]
        >= validation_start_hour
    ].copy()

    if subtrain_df[
        "demand_hour_utc"
    ].nunique() < MINIMUM_SUBTRAIN_HOURS:
        raise ValueError(
            "Early stopping öncesinde yeterli subtrain saati yok."
        )

    return (
        subtrain_df,
        validation_df,
        validation_start_hour,
    )


# =====================================================
# 13. EARLY STOPPING İLE TUR SAYISI SEÇME
# =====================================================

def select_boosting_rounds(
    subtrain_df: pd.DataFrame,
    validation_df: pd.DataFrame,
) -> tuple[
    int,
    pd.DataFrame,
]:
    """
    Validation dönemiyle en uygun boosting turu sayısını seçer.
    """

    preprocessor = create_preprocessor()

    X_subtrain = preprocessor.fit_transform(
        subtrain_df[
            MODEL_FEATURES
        ]
    )

    X_validation = preprocessor.transform(
        validation_df[
            MODEL_FEATURES
        ]
    )

    y_subtrain_log = np.log1p(
        subtrain_df[
            TARGET_COLUMN
        ].to_numpy(
            dtype=float
        )
    )

    y_validation_log = np.log1p(
        validation_df[
            TARGET_COLUMN
        ].to_numpy(
            dtype=float
        )
    )

    early_model = XGBRegressor(
        n_estimators=MAX_BOOSTING_ROUNDS,
        early_stopping_rounds=(
            EARLY_STOPPING_ROUNDS
        ),
        **XGBOOST_PARAMETERS,
    )

    early_model.fit(
        X_subtrain,
        y_subtrain_log,
        eval_set=[
            (
                X_validation,
                y_validation_log,
            )
        ],
        verbose=False,
    )

    best_iteration = getattr(
        early_model,
        "best_iteration",
        None,
    )

    if best_iteration is None:
        selected_rounds = (
            MAX_BOOSTING_ROUNDS
        )

    else:
        selected_rounds = int(
            best_iteration
        ) + 1

    selected_rounds = max(
        selected_rounds,
        50,
    )

    evaluation_result = (
        early_model.evals_result()
    )

    validation_metrics = (
        evaluation_result
        .get(
            "validation_0",
            {},
        )
        .get(
            "mae",
            [],
        )
    )

    training_history_df = pd.DataFrame(
        {
            "boosting_round": np.arange(
                1,
                len(validation_metrics) + 1,
            ),
            "validation_mae_log_scale": (
                validation_metrics
            ),
        }
    )

    training_history_df[
        "selected_round"
    ] = (
        training_history_df[
            "boosting_round"
        ]
        == selected_rounds
    )

    return (
        selected_rounds,
        training_history_df,
    )


# =====================================================
# 14. MODEL EĞİTME
# =====================================================

def train_xgboost_model(
    training_df: pd.DataFrame,
    n_estimators: int,
) -> tuple[
    ColumnTransformer,
    XGBRegressor,
]:
    """
    Preprocessor ve XGBoost modelini belirtilen veri üzerinde eğitir.
    """

    preprocessor = (
        create_preprocessor()
    )

    transformed_features = (
        preprocessor.fit_transform(
            training_df[
                MODEL_FEATURES
            ]
        )
    )

    target_log = np.log1p(
        training_df[
            TARGET_COLUMN
        ].to_numpy(
            dtype=float
        )
    )

    model = XGBRegressor(
        n_estimators=n_estimators,
        **XGBOOST_PARAMETERS,
    )

    model.fit(
        transformed_features,
        target_log,
        verbose=False,
    )

    return (
        preprocessor,
        model,
    )


# =====================================================
# 15. ZONE TALEP EŞİKLERİ
# =====================================================

def create_zone_thresholds(
    train_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Talep seviye eşiklerini yalnızca eğitim döneminden hesaplar.
    """

    thresholds_df = (
        train_df
        .groupby(
            [
                "zone_id",
                "zone_name",
            ],
            as_index=False,
        )[TARGET_COLUMN]
        .agg(
            historical_mean_demand="mean",
            historical_median_demand="median",
            low_quantile=lambda values: (
                values.quantile(0.50)
            ),
            high_quantile=lambda values: (
                values.quantile(0.85)
            ),
            historical_max_demand="max",
        )
    )

    thresholds_df[
        "low_demand_threshold"
    ] = np.maximum(
        np.ceil(
            thresholds_df[
                "low_quantile"
            ]
        ),
        1,
    ).astype(int)

    thresholds_df[
        "high_demand_threshold"
    ] = np.maximum(
        np.ceil(
            thresholds_df[
                "high_quantile"
            ]
        ),
        thresholds_df[
            "low_demand_threshold"
        ]
        + 1,
    ).astype(int)

    return thresholds_df


# =====================================================
# 16. TALEP SEVİYESİ VE SURGE
# =====================================================

def add_demand_levels_and_surge(
    dataframe: pd.DataFrame,
    zone_thresholds_df: pd.DataFrame,
    prediction_column: str,
) -> pd.DataFrame:
    """
    Zone geçmişine göre talep seviyesi ve surge önerisi oluşturur.
    """

    result_df = dataframe.merge(
        zone_thresholds_df[
            [
                "zone_id",
                "low_demand_threshold",
                "high_demand_threshold",
                "historical_mean_demand",
            ]
        ],
        on="zone_id",
        how="left",
        validate="many_to_one",
    )

    if result_df[
        "low_demand_threshold"
    ].isna().any():
        raise ValueError(
            "Talep eşiği bulunamayan zone oluştu."
        )

    predicted_demand = pd.to_numeric(
        result_df[
            prediction_column
        ],
        errors="coerce",
    ).clip(
        lower=0
    )

    low_threshold = result_df[
        "low_demand_threshold"
    ].astype(float)

    high_threshold = result_df[
        "high_demand_threshold"
    ].astype(float)

    result_df[
        "predicted_demand_level"
    ] = np.select(
        [
            predicted_demand
            >= high_threshold,

            predicted_demand
            >= low_threshold,
        ],
        [
            "HIGH",
            "MEDIUM",
        ],
        default="LOW",
    )

    medium_denominator = (
        high_threshold
        - low_threshold
    ).replace(
        0,
        1,
    )

    medium_fraction = (
        (
            predicted_demand
            - low_threshold
        )
        / medium_denominator
    ).clip(
        0,
        1,
    )

    high_excess_fraction = (
        (
            predicted_demand
            - high_threshold
        )
        / high_threshold.clip(
            lower=1
        )
    ).clip(
        0,
        2,
    )

    demand_component = np.select(
        [
            predicted_demand
            < low_threshold,

            predicted_demand
            < high_threshold,
        ],
        [
            0.00,

            (
                0.08
                + 0.12
                * medium_fraction
            ),
        ],
        default=(
            0.25
            + (
                0.10
                * high_excess_fraction
            ).clip(
                upper=0.20
            )
        ),
    )

    peak_component = (
        result_df[
            "is_peak_hour"
        ].astype(float)
        * 0.05
    )

    weather_component = (
        result_df[
            "weather_severity_score"
        ].astype(float)
        * 0.10
    ).clip(
        0,
        0.10,
    )

    result_df[
        "demand_surge_component"
    ] = demand_component

    result_df[
        "peak_hour_surge_component"
    ] = peak_component

    result_df[
        "weather_surge_component"
    ] = weather_component

    result_df[
        "recommended_surge_multiplier"
    ] = (
        1.00
        + demand_component
        + peak_component
        + weather_component
    ).clip(
        MIN_SURGE_MULTIPLIER,
        MAX_SURGE_MULTIPLIER,
    ).round(2)

    def create_reason(row) -> str:
        reasons = [
            f"{row['predicted_demand_level']}_PREDICTED_DEMAND"
        ]

        if int(
            row["is_peak_hour"]
        ) == 1:
            reasons.append(
                "PEAK_HOUR"
            )

        if float(
            row[
                "weather_severity_score"
            ]
        ) > 0:
            reasons.append(
                "WEATHER_EFFECT"
            )

        return "|".join(reasons)

    result_df["surge_reason"] = (
        result_df.apply(
            create_reason,
            axis=1,
        )
    )

    result_df[
        "pricing_rule_merge_strategy"
    ] = "MAX"

    result_df[
        "requires_pricing_service_validation"
    ] = True

    result_df["auto_apply"] = False

    return result_df


# =====================================================
# 17. BACKTEST
# =====================================================

def create_backtest(
    preprocessor: ColumnTransformer,
    model: XGBRegressor,
    test_df: pd.DataFrame,
    zone_thresholds_df: pd.DataFrame,
) -> tuple[
    pd.DataFrame,
    dict,
    dict,
]:
    """
    Son 7 günlük test verisinde XGBoost tahmini üretir.
    """

    predicted_values = predict_demand(
        preprocessor=preprocessor,
        model=model,
        features_df=test_df,
    )

    actual_values = (
        test_df[
            TARGET_COLUMN
        ].to_numpy(
            dtype=float
        )
    )

    baseline_predictions = (
        test_df[
            "demand_lag_168h"
        ].to_numpy(
            dtype=float
        )
    )

    xgboost_metrics = calculate_metrics(
        actual=actual_values,
        predicted=predicted_values,
    )

    baseline_metrics = calculate_metrics(
        actual=actual_values,
        predicted=baseline_predictions,
    )

    residuals = (
        actual_values
        - predicted_values
    )

    residual_quantiles = {
        "q10": float(
            np.quantile(
                residuals,
                0.10,
            )
        ),
        "q50": float(
            np.quantile(
                residuals,
                0.50,
            )
        ),
        "q90": float(
            np.quantile(
                residuals,
                0.90,
            )
        ),
    }

    backtest_columns = [
        "zone_id",
        "zone_name",
        "zone_category",
        "demand_hour_utc",
        "demand_hour_local",
        "forecast_date_local",
        "reservation_hour",
        "day_of_week",
        "is_weekend",
        "is_peak_hour",
        "is_holiday",
        "weather_condition",
        "temperature_c",
        "precipitation_mm",
        "snowfall_mm",
        "wind_speed_kmh",
        "relative_humidity_pct",
        "cloud_cover_pct",
        "visibility_m",
        "is_bad_weather",
        "weather_severity_score",
        "weather_data_source",
        "weather_is_synthetic",
        "demand_count",
        "demand_lag_24h",
        "demand_lag_168h",
    ]

    validate_columns(
        test_df,
        backtest_columns,
        "XGBoost test data",
    )

    backtest_df = test_df[
        backtest_columns
    ].copy()

    backtest_df[
        "predicted_demand"
    ] = predicted_values

    backtest_df[
        "seasonal_naive_prediction"
    ] = baseline_predictions

    backtest_df[
        "prediction_error"
    ] = (
        backtest_df[
            "demand_count"
        ]
        - backtest_df[
            "predicted_demand"
        ]
    )

    backtest_df[
        "absolute_prediction_error"
    ] = (
        backtest_df[
            "prediction_error"
        ].abs()
    )

    backtest_df[
        "prediction_lower_80"
    ] = np.clip(
        predicted_values
        + residual_quantiles["q10"],
        0,
        None,
    )

    backtest_df[
        "prediction_upper_80"
    ] = np.clip(
        predicted_values
        + residual_quantiles["q90"],
        0,
        None,
    )

    backtest_df = (
        add_demand_levels_and_surge(
            dataframe=backtest_df,
            zone_thresholds_df=(
                zone_thresholds_df
            ),
            prediction_column=(
                "predicted_demand"
            ),
        )
    )

    backtest_df[
        "forecast_model_version"
    ] = MODEL_VERSION

    round_columns = [
        "predicted_demand",
        "seasonal_naive_prediction",
        "prediction_error",
        "absolute_prediction_error",
        "prediction_lower_80",
        "prediction_upper_80",
    ]

    for column in round_columns:
        backtest_df[column] = (
            backtest_df[column]
            .round(3)
        )

    return (
        backtest_df,
        xgboost_metrics,
        {
            "baseline_metrics": (
                baseline_metrics
            ),
            "residual_quantiles": (
                residual_quantiles
            ),
        },
    )


# =====================================================
# 18. RANDOM FOREST İLE BACKTEST KARŞILAŞTIRMASI
# =====================================================

def compare_with_random_forest(
    xgboost_backtest_df: pd.DataFrame,
) -> tuple[
    pd.DataFrame,
    dict,
]:
    """
    XGBoost ve Random Forest sonuçlarını aynı zone-saat test
    kayıtlarında karşılaştırır.
    """

    require_file(
        RANDOM_FOREST_BACKTEST_FILE
    )

    random_forest_df = pd.read_parquet(
        RANDOM_FOREST_BACKTEST_FILE
    )

    required_columns = [
        "zone_id",
        "demand_hour_utc",
        "demand_count",
        "predicted_demand",
        "seasonal_naive_prediction",
    ]

    validate_columns(
        random_forest_df,
        required_columns,
        RANDOM_FOREST_BACKTEST_FILE.name,
    )

    random_forest_df[
        "demand_hour_utc"
    ] = pd.to_datetime(
        random_forest_df[
            "demand_hour_utc"
        ],
        errors="coerce",
        utc=True,
    )

    comparison_df = (
        xgboost_backtest_df[
            [
                "zone_id",
                "zone_name",
                "demand_hour_utc",
                "demand_count",
                "predicted_demand",
                "seasonal_naive_prediction",
            ]
        ]
        .rename(
            columns={
                "predicted_demand": (
                    "xgboost_predicted_demand"
                ),
            }
        )
        .merge(
            random_forest_df[
                [
                    "zone_id",
                    "demand_hour_utc",
                    "demand_count",
                    "predicted_demand",
                ]
            ].rename(
                columns={
                    "demand_count": (
                        "random_forest_actual_demand"
                    ),
                    "predicted_demand": (
                        "random_forest_predicted_demand"
                    ),
                }
            ),
            on=[
                "zone_id",
                "demand_hour_utc",
            ],
            how="outer",
            validate="one_to_one",
            indicator=True,
        )
    )

    if not comparison_df[
        "_merge"
    ].eq("both").all():
        raise ValueError(
            "XGBoost ve Random Forest test anahtarları uyuşmuyor."
        )

    actual_values_match = np.isclose(
        comparison_df[
            "demand_count"
        ],
        comparison_df[
            "random_forest_actual_demand"
        ],
        atol=0,
        rtol=0,
    ).all()

    if not actual_values_match:
        raise ValueError(
            "Random Forest ve XGBoost gerçek talep değerleri uyuşmuyor."
        )

    actual = comparison_df[
        "demand_count"
    ].to_numpy(
        dtype=float
    )

    random_forest_prediction = (
        comparison_df[
            "random_forest_predicted_demand"
        ].to_numpy(
            dtype=float
        )
    )

    random_forest_metrics = (
        calculate_metrics(
            actual=actual,
            predicted=(
                random_forest_prediction
            ),
        )
    )

    comparison_df[
        "xgboost_absolute_error"
    ] = (
        comparison_df[
            "demand_count"
        ]
        - comparison_df[
            "xgboost_predicted_demand"
        ]
    ).abs()

    comparison_df[
        "random_forest_absolute_error"
    ] = (
        comparison_df[
            "demand_count"
        ]
        - comparison_df[
            "random_forest_predicted_demand"
        ]
    ).abs()

    comparison_df[
        "better_model_for_row"
    ] = np.select(
        [
            comparison_df[
                "xgboost_absolute_error"
            ]
            < comparison_df[
                "random_forest_absolute_error"
            ],

            comparison_df[
                "random_forest_absolute_error"
            ]
            < comparison_df[
                "xgboost_absolute_error"
            ],
        ],
        [
            "XGBOOST",
            "RANDOM_FOREST",
        ],
        default="TIE",
    )

    comparison_df = comparison_df.drop(
        columns=[
            "_merge",
            "random_forest_actual_demand",
        ]
    )

    return (
        comparison_df,
        random_forest_metrics,
    )


# =====================================================
# 19. GELECEK HAVA SENARYOSUNU OKUMA
# =====================================================

def read_shared_future_weather() -> pd.DataFrame:
    """
    Random Forest aşamasında hazırlanmış gelecek 24 saatlik
    ortak hava senaryosunu okur.

    Böylece iki model aynı gelecek hava girdisiyle karşılaştırılır.
    """

    require_file(
        RANDOM_FOREST_FORECAST_FILE
    )

    random_forest_forecast_df = pd.read_parquet(
        RANDOM_FOREST_FORECAST_FILE
    )

    validate_columns(
        random_forest_forecast_df,
        WEATHER_FORECAST_COLUMNS,
        RANDOM_FOREST_FORECAST_FILE.name,
    )

    random_forest_forecast_df[
        "demand_hour_utc"
    ] = pd.to_datetime(
        random_forest_forecast_df[
            "demand_hour_utc"
        ],
        errors="coerce",
        utc=True,
    )

    if random_forest_forecast_df[
        "demand_hour_utc"
    ].isna().any():
        raise ValueError(
            "Random Forest forecast içinde geçersiz gelecek saati bulundu."
        )

    consistency_columns = [
        column
        for column in WEATHER_FORECAST_COLUMNS
        if column != "demand_hour_utc"
    ]

    inconsistent_hours = []

    for future_hour, group_df in (
        random_forest_forecast_df.groupby(
            "demand_hour_utc",
            observed=True,
        )
    ):
        for column in consistency_columns:
            if group_df[
                column
            ].nunique(
                dropna=False
            ) > 1:
                inconsistent_hours.append(
                    {
                        "demand_hour_utc": (
                            future_hour
                        ),
                        "column": column,
                    }
                )

    if inconsistent_hours:
        raise ValueError(
            "Aynı gelecek saat için zone'lar arasında "
            "farklı hava değerleri bulundu.\n"
            f"{inconsistent_hours[:10]}"
        )

    future_weather_df = (
        random_forest_forecast_df[
            WEATHER_FORECAST_COLUMNS
        ]
        .drop_duplicates(
            subset=[
                "demand_hour_utc",
            ]
        )
        .sort_values(
            "demand_hour_utc"
        )
        .reset_index(drop=True)
    )

    if future_weather_df[
        "demand_hour_utc"
    ].nunique() != (
        FORECAST_HORIZON_HOURS
    ):
        raise ValueError(
            "Gelecek hava senaryosu tam 24 saat değil."
        )

    return future_weather_df


# =====================================================
# 20. RECURSIVE GELECEK TAHMİNİ
# =====================================================

def create_recursive_forecast(
    preprocessor: ColumnTransformer,
    model: XGBRegressor,
    hourly_df: pd.DataFrame,
    zones_df: pd.DataFrame,
    future_weather_df: pd.DataFrame,
    residual_quantiles: dict,
    zone_thresholds_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Gelecek 24 saati saat saat recursive biçimde tahmin eder.
    """

    historical_df = (
        hourly_df
        .sort_values(
            [
                "zone_id",
                "demand_hour_utc",
            ]
        )
    )

    history_by_zone = {
        int(zone_id): (
            group_df[
                TARGET_COLUMN
            ]
            .astype(float)
            .tolist()
        )
        for zone_id, group_df
        in historical_df.groupby(
            "zone_id",
            sort=False,
        )
    }

    required_history_length = max(
        max(LAG_HOURS),
        max(ROLLING_WINDOWS),
    )

    for zone_id, values in (
        history_by_zone.items()
    ):
        if len(values) < required_history_length:
            raise ValueError(
                f"Zone {zone_id} için recursive tahmin "
                "geçmişi yetersiz."
            )

    weather_lookup = (
        future_weather_df
        .set_index(
            "demand_hour_utc"
        )
        .sort_index()
    )

    forecast_parts = []

    forecast_generated_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
    )

    for horizon_number, future_hour in enumerate(
        future_weather_df[
            "demand_hour_utc"
        ].sort_values(),
        start=1,
    ):
        weather_row = (
            weather_lookup.loc[
                future_hour
            ]
        )

        future_hour_local = (
            future_hour.tz_convert(
                SIMULATION_TIMEZONE
            )
        )

        local_hour = int(
            future_hour_local.hour
        )

        day_of_week = int(
            future_hour_local.dayofweek
        )

        local_date = (
            future_hour_local.date()
        )

        hour_rows = []

        for zone_row in zones_df.itertuples(
            index=False
        ):
            zone_id = int(
                zone_row.zone_id
            )

            history_values = (
                history_by_zone[
                    zone_id
                ]
            )

            row = {
                "zone_id": zone_id,
                "zone_id_category": str(
                    zone_id
                ),
                "zone_name": (
                    zone_row.zone_name
                ),
                "zone_category": (
                    zone_row.zone_category
                ),
                "demand_hour_utc": (
                    future_hour
                ),
                "demand_hour_local": (
                    future_hour_local
                ),
                "forecast_date_local": (
                    local_date
                ),
                "reservation_hour": (
                    local_hour
                ),
                "day_of_week": (
                    day_of_week
                ),
                "is_weekend": int(
                    day_of_week in [5, 6]
                ),
                "is_peak_hour": int(
                    local_hour
                    in [
                        7,
                        8,
                        9,
                        17,
                        18,
                        19,
                        20,
                    ]
                ),
                "is_holiday": int(
                    str(local_date)
                    in HOLIDAY_DATES
                ),
                "hour_sin": np.sin(
                    2
                    * np.pi
                    * local_hour
                    / 24
                ),
                "hour_cos": np.cos(
                    2
                    * np.pi
                    * local_hour
                    / 24
                ),
                "day_of_week_sin": np.sin(
                    2
                    * np.pi
                    * day_of_week
                    / 7
                ),
                "day_of_week_cos": np.cos(
                    2
                    * np.pi
                    * day_of_week
                    / 7
                ),
                "forecast_horizon_hour": (
                    horizon_number
                ),
            }

            for weather_column in (
                WEATHER_FORECAST_COLUMNS
            ):
                if weather_column == (
                    "demand_hour_utc"
                ):
                    continue

                row[weather_column] = (
                    weather_row[
                        weather_column
                    ]
                )

            for lag_hour in LAG_HOURS:
                row[
                    f"demand_lag_{lag_hour}h"
                ] = history_values[
                    -lag_hour
                ]

            for rolling_window in (
                ROLLING_WINDOWS
            ):
                row[
                    f"demand_rolling_mean_{rolling_window}h"
                ] = float(
                    np.mean(
                        history_values[
                            -rolling_window:
                        ]
                    )
                )

            hour_rows.append(row)

        hour_df = pd.DataFrame(
            hour_rows
        )

        predicted_demand = predict_demand(
            preprocessor=preprocessor,
            model=model,
            features_df=hour_df,
        )

        hour_df[
            "predicted_demand"
        ] = predicted_demand

        for zone_id, prediction in zip(
            hour_df["zone_id"],
            predicted_demand,
        ):
            history_by_zone[
                int(zone_id)
            ].append(
                float(prediction)
            )

        forecast_parts.append(
            hour_df
        )

    forecast_df = pd.concat(
        forecast_parts,
        ignore_index=True,
    )

    forecast_df[
        "prediction_lower_80"
    ] = np.clip(
        forecast_df[
            "predicted_demand"
        ]
        + residual_quantiles["q10"],
        0,
        None,
    )

    forecast_df[
        "prediction_upper_80"
    ] = np.clip(
        forecast_df[
            "predicted_demand"
        ]
        + residual_quantiles["q90"],
        0,
        None,
    )

    forecast_df = (
        add_demand_levels_and_surge(
            dataframe=forecast_df,
            zone_thresholds_df=(
                zone_thresholds_df
            ),
            prediction_column=(
                "predicted_demand"
            ),
        )
    )

    forecast_df[
        "predicted_demand_rounded"
    ] = (
        forecast_df[
            "predicted_demand"
        ]
        .round()
        .clip(
            lower=0
        )
        .astype("int64")
    )

    forecast_df[
        "forecast_model_version"
    ] = MODEL_VERSION

    forecast_df[
        "prediction_method"
    ] = "RECURSIVE_XGBOOST"

    forecast_df[
        "forecast_generated_at_utc"
    ] = forecast_generated_at

    for column in [
        "predicted_demand",
        "prediction_lower_80",
        "prediction_upper_80",
    ]:
        forecast_df[column] = (
            forecast_df[column]
            .round(3)
        )

    return forecast_df


# =====================================================
# 21. RANDOM FOREST İLE GELECEK TAHMİN KARŞILAŞTIRMASI
# =====================================================

def create_future_model_comparison(
    xgboost_forecast_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    XGBoost ve Random Forest gelecek tahminlerini karşılaştırır.
    """

    random_forest_df = pd.read_parquet(
        RANDOM_FOREST_FORECAST_FILE
    )

    required_columns = [
        "zone_id",
        "zone_name",
        "demand_hour_utc",
        "predicted_demand",
        "recommended_surge_multiplier",
    ]

    validate_columns(
        random_forest_df,
        required_columns,
        RANDOM_FOREST_FORECAST_FILE.name,
    )

    random_forest_df[
        "demand_hour_utc"
    ] = pd.to_datetime(
        random_forest_df[
            "demand_hour_utc"
        ],
        errors="coerce",
        utc=True,
    )

    comparison_df = (
        xgboost_forecast_df[
            [
                "zone_id",
                "zone_name",
                "demand_hour_utc",
                "predicted_demand",
                "recommended_surge_multiplier",
            ]
        ]
        .rename(
            columns={
                "predicted_demand": (
                    "xgboost_predicted_demand"
                ),
                "recommended_surge_multiplier": (
                    "xgboost_recommended_surge"
                ),
            }
        )
        .merge(
            random_forest_df[
                [
                    "zone_id",
                    "demand_hour_utc",
                    "predicted_demand",
                    "recommended_surge_multiplier",
                ]
            ].rename(
                columns={
                    "predicted_demand": (
                        "random_forest_predicted_demand"
                    ),
                    "recommended_surge_multiplier": (
                        "random_forest_recommended_surge"
                    ),
                }
            ),
            on=[
                "zone_id",
                "demand_hour_utc",
            ],
            how="outer",
            validate="one_to_one",
            indicator=True,
        )
    )

    if not comparison_df[
        "_merge"
    ].eq("both").all():
        raise ValueError(
            "XGBoost ve Random Forest gelecek tahmin anahtarları uyuşmuyor."
        )

    comparison_df[
        "prediction_difference"
    ] = (
        comparison_df[
            "xgboost_predicted_demand"
        ]
        - comparison_df[
            "random_forest_predicted_demand"
        ]
    )

    comparison_df[
        "absolute_prediction_difference"
    ] = (
        comparison_df[
            "prediction_difference"
        ].abs()
    )

    return comparison_df.drop(
        columns=[
            "_merge",
        ]
    )


# =====================================================
# 22. FEATURE IMPORTANCE
# =====================================================

def infer_base_feature(
    transformed_feature_name: str,
) -> str:
    """
    One-hot sonrası sütun adından temel özellik adını bulur.
    """

    feature_name = transformed_feature_name

    if feature_name.startswith(
        "numeric__"
    ):
        return feature_name.replace(
            "numeric__",
            "",
            1,
        )

    if feature_name.startswith(
        "categorical__"
    ):
        encoded_name = feature_name.replace(
            "categorical__",
            "",
            1,
        )

        for original_feature in sorted(
            CATEGORICAL_FEATURES,
            key=len,
            reverse=True,
        ):
            prefix = (
                original_feature
                + "_"
            )

            if encoded_name.startswith(
                prefix
            ):
                return original_feature

        return encoded_name

    return feature_name


def create_feature_importance(
    preprocessor: ColumnTransformer,
    model: XGBRegressor,
) -> tuple[
    pd.DataFrame,
    pd.DataFrame,
]:
    """
    One-hot ve temel özellik önem tablolarını oluşturur.
    """

    transformed_feature_names = (
        preprocessor
        .get_feature_names_out()
    )

    feature_importances = (
        model.feature_importances_
    )

    if len(
        transformed_feature_names
    ) != len(
        feature_importances
    ):
        raise ValueError(
            "XGBoost feature adı ve importance sayısı uyuşmuyor."
        )

    transformed_importance_df = (
        pd.DataFrame(
            {
                "transformed_feature": (
                    transformed_feature_names
                ),
                "importance": (
                    feature_importances
                ),
            }
        )
    )

    transformed_importance_df[
        "base_feature"
    ] = (
        transformed_importance_df[
            "transformed_feature"
        ]
        .map(
            infer_base_feature
        )
    )

    transformed_importance_df[
        "importance_percentage"
    ] = (
        transformed_importance_df[
            "importance"
        ]
        * 100
    )

    transformed_importance_df = (
        transformed_importance_df
        .sort_values(
            by="importance",
            ascending=False,
        )
        .reset_index(drop=True)
    )

    base_importance_df = (
        transformed_importance_df
        .groupby(
            "base_feature",
            as_index=False,
        )
        .agg(
            importance=(
                "importance",
                "sum",
            ),
            transformed_feature_count=(
                "transformed_feature",
                "count",
            ),
        )
        .sort_values(
            by="importance",
            ascending=False,
        )
        .reset_index(drop=True)
    )

    base_importance_df[
        "importance_percentage"
    ] = (
        base_importance_df[
            "importance"
        ]
        * 100
    )

    return (
        transformed_importance_df,
        base_importance_df,
    )


# =====================================================
# 23. ZONE BACKTEST METRİKLERİ
# =====================================================

def create_zone_backtest_metrics(
    backtest_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    XGBoost performansını zone bazında hesaplar.
    """

    rows = []

    for (
        zone_id,
        zone_name,
    ), group_df in backtest_df.groupby(
        [
            "zone_id",
            "zone_name",
        ],
        observed=True,
    ):
        metrics = calculate_metrics(
            actual=group_df[
                "demand_count"
            ].to_numpy(
                dtype=float
            ),
            predicted=group_df[
                "predicted_demand"
            ].to_numpy(
                dtype=float
            ),
        )

        rows.append(
            {
                "zone_id": int(
                    zone_id
                ),
                "zone_name": (
                    zone_name
                ),
                "test_hour_count": int(
                    len(group_df)
                ),
                **metrics,
            }
        )

    return (
        pd.DataFrame(
            rows
        )
        .sort_values(
            by="mae",
            ascending=False,
        )
        .reset_index(drop=True)
    )


# =====================================================
# 24. ÇIKTI DOĞRULAMASI
# =====================================================

def validate_outputs(
    hourly_df: pd.DataFrame,
    model_df: pd.DataFrame,
    backtest_df: pd.DataFrame,
    forecast_df: pd.DataFrame,
    zones_df: pd.DataFrame,
) -> None:
    """
    XGBoost çıktılarının temel bütünlüğünü doğrular.
    """

    if FORBIDDEN_LEAKAGE_FEATURES.intersection(
        MODEL_FEATURES
    ):
        raise ValueError(
            "Model özelliklerinde leakage bulundu."
        )

    if (
        hourly_df[TARGET_COLUMN]
        == 0
    ).sum() == 0:
        raise ValueError(
            "Sıfır talepli saatler veri setine dahil edilmemiş."
        )

    if model_df[
        MODEL_FEATURES
    ].isna().any().any():
        raise ValueError(
            "Model veri setinde eksik özellik bulundu."
        )

    if not (
        backtest_df[
            "predicted_demand"
        ] >= 0
    ).all():
        raise ValueError(
            "Backtest içinde negatif tahmin bulundu."
        )

    expected_forecast_rows = (
        len(zones_df)
        * FORECAST_HORIZON_HOURS
    )

    if len(forecast_df) != (
        expected_forecast_rows
    ):
        raise ValueError(
            "Gelecek tahmin satır sayısı hatalı.\n"
            f"Beklenen: {expected_forecast_rows:,}\n"
            f"Gerçek: {len(forecast_df):,}"
        )

    if forecast_df[
        [
            "zone_id",
            "demand_hour_utc",
        ]
    ].duplicated().any():
        raise ValueError(
            "Gelecek tahmininde tekrar eden zone-saat bulundu."
        )

    if not (
        forecast_df[
            "predicted_demand"
        ] >= 0
    ).all():
        raise ValueError(
            "Negatif gelecek talep tahmini bulundu."
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

    if not interval_valid:
        raise ValueError(
            "Tahmin güven aralıkları tahmin değerini içermiyor."
        )

    if not forecast_df[
        "recommended_surge_multiplier"
    ].between(
        MIN_SURGE_MULTIPLIER,
        MAX_SURGE_MULTIPLIER,
    ).all():
        raise ValueError(
            "Surge multiplier sınırların dışında."
        )

    if forecast_df[
        "auto_apply"
    ].any():
        raise ValueError(
            "Data Science surge önerisi otomatik uygulanamaz."
        )

    if not (
        forecast_df[
            "pricing_rule_merge_strategy"
        ]
        == "MAX"
    ).all():
        raise ValueError(
            "Pricing Service merge stratejisi MAX olmalıdır."
        )

    if not forecast_df[
        "requires_pricing_service_validation"
    ].all():
        raise ValueError(
            "Pricing Service doğrulaması zorunlu olmalıdır."
        )

    forbidden_forecast_columns = (
        FORBIDDEN_LEAKAGE_FEATURES
        .union(
            {
                "demand_count",
                "actual_demand",
            }
        )
    )

    leaked_columns = (
        forbidden_forecast_columns
        .intersection(
            forecast_df.columns
        )
    )

    if leaked_columns:
        raise ValueError(
            "Gelecek tahmininde gerçek hedef veya leakage "
            f"alanları bulundu: {sorted(leaked_columns)}"
        )


# =====================================================
# 25. DOSYALARI KAYDETME
# =====================================================

def save_outputs(
    backtest_df: pd.DataFrame,
    forecast_df: pd.DataFrame,
    backtest_comparison_df: pd.DataFrame,
    forecast_comparison_df: pd.DataFrame,
    zone_metrics_df: pd.DataFrame,
    thresholds_df: pd.DataFrame,
    transformed_importance_df: pd.DataFrame,
    base_importance_df: pd.DataFrame,
    training_history_df: pd.DataFrame,
    final_preprocessor: ColumnTransformer,
    final_model: XGBRegressor,
    metadata: dict,
) -> None:
    """
    XGBoost model ve tahmin çıktılarını kaydeder.
    """

    backtest_df.to_csv(
        XGBOOST_BACKTEST_CSV_FILE,
        index=False,
        encoding="utf-8",
    )

    backtest_df.to_parquet(
        XGBOOST_BACKTEST_PARQUET_FILE,
        index=False,
        engine="pyarrow",
        compression="snappy",
    )

    forecast_df.to_csv(
        XGBOOST_FORECAST_CSV_FILE,
        index=False,
        encoding="utf-8",
    )

    forecast_df.to_parquet(
        XGBOOST_FORECAST_PARQUET_FILE,
        index=False,
        engine="pyarrow",
        compression="snappy",
    )

    pricing_columns = [
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
        "low_demand_threshold",
        "high_demand_threshold",
        "demand_surge_component",
        "peak_hour_surge_component",
        "weather_surge_component",
        "recommended_surge_multiplier",
        "surge_reason",
        "pricing_rule_merge_strategy",
        "requires_pricing_service_validation",
        "auto_apply",
        "forecast_model_version",
        "forecast_generated_at_utc",
    ]

    forecast_df[
        pricing_columns
    ].to_csv(
        PRICING_SERVICE_OUTPUT_FILE,
        index=False,
        encoding="utf-8",
    )

    backtest_comparison_df.to_csv(
        BACKTEST_MODEL_COMPARISON_FILE,
        index=False,
        encoding="utf-8",
    )

    forecast_comparison_df.to_csv(
        FORECAST_MODEL_COMPARISON_FILE,
        index=False,
        encoding="utf-8",
    )

    zone_metrics_df.to_csv(
        ZONE_BACKTEST_METRICS_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    thresholds_df.to_csv(
        ZONE_THRESHOLDS_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    transformed_importance_df.to_csv(
        FEATURE_IMPORTANCE_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    base_importance_df.to_csv(
        BASE_FEATURE_IMPORTANCE_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    training_history_df.to_csv(
        TRAINING_HISTORY_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    model_bundle = {
        "preprocessor": (
            final_preprocessor
        ),
        "model": (
            final_model
        ),
        "zone_demand_thresholds": (
            thresholds_df
        ),
        "metadata": metadata,
    }

    joblib.dump(
        model_bundle,
        MODEL_BUNDLE_FILE,
    )

    final_model.save_model(
        NATIVE_XGBOOST_MODEL_FILE
    )

    with open(
        MODEL_METADATA_FILE,
        "w",
        encoding="utf-8",
    ) as json_file:
        json.dump(
            json_safe(metadata),
            json_file,
            ensure_ascii=False,
            indent=4,
        )


# =====================================================
# 26. RAPORLAMA
# =====================================================

def create_reports(
    xgboost_metrics: dict,
    random_forest_metrics: dict,
    baseline_metrics: dict,
    residual_quantiles: dict,
    selected_rounds: int,
    test_start_hour: pd.Timestamp,
    validation_start_hour: pd.Timestamp,
    forecast_df: pd.DataFrame,
) -> None:
    """
    Model karşılaştırması ve forecast raporlarını oluşturur.
    """

    comparison_df = pd.DataFrame(
        [
            {
                "model": (
                    "XGBOOST_WEATHER"
                ),
                **xgboost_metrics,
            },
            {
                "model": (
                    "RANDOM_FOREST_WEATHER"
                ),
                **random_forest_metrics,
            },
            {
                "model": (
                    "SEASONAL_NAIVE_168H"
                ),
                **baseline_metrics,
            },
        ]
    )

    comparison_df.to_csv(
        MODEL_METRICS_COMPARISON_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    best_model_row = (
        comparison_df
        .sort_values(
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

    best_model = str(
        best_model_row[
            "model"
        ]
    )

    model_selection = {
        "recommended_model_by_test_mae": (
            best_model
        ),
        "selection_rule": (
            "Lowest MAE; RMSE used as secondary comparison."
        ),
        "xgboost_mae": (
            xgboost_metrics["mae"]
        ),
        "random_forest_mae": (
            random_forest_metrics["mae"]
        ),
        "seasonal_naive_mae": (
            baseline_metrics["mae"]
        ),
        "xgboost_selected": (
            best_model
            == "XGBOOST_WEATHER"
        ),
        "automatic_production_deployment": False,
        "reason": (
            "Model selection report is decision support. "
            "Backend or Pricing Service deployment requires review."
        ),
    }

    with open(
        MODEL_SELECTION_FILE,
        "w",
        encoding="utf-8",
    ) as json_file:
        json.dump(
            model_selection,
            json_file,
            ensure_ascii=False,
            indent=4,
        )

    model_metrics_summary = {
        "model_version": (
            MODEL_VERSION
        ),
        "xgboost_version": (
            xgboost.__version__
        ),
        "test_start_hour_utc": str(
            test_start_hour
        ),
        "early_stopping_validation_start_utc": str(
            validation_start_hour
        ),
        "selected_boosting_rounds": int(
            selected_rounds
        ),
        "early_stopping_rounds": int(
            EARLY_STOPPING_ROUNDS
        ),
        "xgboost_metrics": (
            xgboost_metrics
        ),
        "random_forest_metrics": (
            random_forest_metrics
        ),
        "seasonal_naive_metrics": (
            baseline_metrics
        ),
        "residual_quantiles": (
            residual_quantiles
        ),
        "random_split_used": False,
        "time_based_test_used": True,
        "separate_early_stopping_period_used": True,
        "target_transformation": (
            "log1p"
        ),
        "zero_demand_zone_hours_included": True,
        "leakage_features_excluded": sorted(
            FORBIDDEN_LEAKAGE_FEATURES
        ),
        "native_model_file": str(
            NATIVE_XGBOOST_MODEL_FILE
        ),
        "full_inference_bundle": str(
            MODEL_BUNDLE_FILE
        ),
        "native_json_contains_preprocessing": False,
        "joblib_bundle_contains_preprocessing": True,
    }

    with open(
        MODEL_METRICS_FILE,
        "w",
        encoding="utf-8",
    ) as json_file:
        json.dump(
            json_safe(
                model_metrics_summary
            ),
            json_file,
            ensure_ascii=False,
            indent=4,
        )

    forecast_summary = {
        "model_version": (
            MODEL_VERSION
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
        "forecast_horizon_hours": int(
            forecast_df[
                "demand_hour_utc"
            ].nunique()
        ),
        "forecast_zone_count": int(
            forecast_df[
                "zone_id"
            ].nunique()
        ),
        "forecast_row_count": int(
            len(forecast_df)
        ),
        "total_predicted_demand": float(
            forecast_df[
                "predicted_demand"
            ].sum()
        ),
        "average_recommended_surge": float(
            forecast_df[
                "recommended_surge_multiplier"
            ].mean()
        ),
        "maximum_recommended_surge": float(
            forecast_df[
                "recommended_surge_multiplier"
            ].max()
        ),
        "future_weather_sources": (
            forecast_df[
                "weather_data_source"
            ]
            .value_counts()
            .to_dict()
        ),
        "future_weather_is_synthetic": bool(
            pd.to_numeric(
                forecast_df[
                    "weather_is_synthetic"
                ],
                errors="coerce",
            )
            .fillna(0)
            .astype(bool)
            .any()
        ),
        "forecast_is_recursive": True,
        "pricing_rule_merge_strategy": (
            "MAX"
        ),
        "surge_auto_apply": False,
        "pricing_service_validation_required": True,
        "model_limit": (
            "The historical dataset covers approximately one month. "
            "The forecast is suitable for internship simulation and "
            "integration testing, not full production seasonality."
        ),
    }

    with open(
        FORECAST_SUMMARY_FILE,
        "w",
        encoding="utf-8",
    ) as json_file:
        json.dump(
            json_safe(
                forecast_summary
            ),
            json_file,
            ensure_ascii=False,
            indent=4,
        )


# =====================================================
# 27. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 78)
    print("16 — HAVA DURUMLU XGBOOST TALEP TAHMİNİ")
    print("=" * 78)

    print("\nZone kataloğu okunuyor...")

    zones_df = read_zone_catalog()

    print(
        "Ortak zone × saat talep veri seti okunuyor..."
    )

    hourly_df = (
        read_hourly_demand_dataset()
    )

    model_df = prepare_model_dataset(
        hourly_df
    )

    print(
        f"Toplam zone-saat satırı : "
        f"{len(hourly_df):,}"
    )

    print(
        f"Model hazır satır       : "
        f"{len(model_df):,}"
    )

    print(
        f"Sıfır talepli satır     : "
        f"{(hourly_df['demand_count'] == 0).sum():,}"
    )

    print(
        "\nZaman bazlı eğitim ve test ayrımı yapılıyor..."
    )

    (
        train_df,
        test_df,
        test_start_hour,
    ) = split_train_test(
        model_df
    )

    (
        subtrain_df,
        early_validation_df,
        validation_start_hour,
    ) = split_early_stopping_validation(
        train_df
    )

    print(
        f"Subtrain saat aralığı   : "
        f"{subtrain_df['demand_hour_utc'].min()} "
        f"→ {subtrain_df['demand_hour_utc'].max()}"
    )

    print(
        f"Early validation        : "
        f"{early_validation_df['demand_hour_utc'].min()} "
        f"→ {early_validation_df['demand_hour_utc'].max()}"
    )

    print(
        f"Test dönemi             : "
        f"{test_df['demand_hour_utc'].min()} "
        f"→ {test_df['demand_hour_utc'].max()}"
    )

    print(
        "\nEarly stopping ile boosting turu seçiliyor..."
    )

    (
        selected_rounds,
        training_history_df,
    ) = select_boosting_rounds(
        subtrain_df=subtrain_df,
        validation_df=(
            early_validation_df
        ),
    )

    print(
        f"Seçilen boosting turu: "
        f"{selected_rounds:,}"
    )

    print(
        "\nBacktest XGBoost modeli eğitim verisinin "
        "tamamıyla eğitiliyor..."
    )

    (
        backtest_preprocessor,
        backtest_model,
    ) = train_xgboost_model(
        training_df=train_df,
        n_estimators=selected_rounds,
    )

    zone_thresholds_df = (
        create_zone_thresholds(
            train_df
        )
    )

    (
        xgboost_backtest_df,
        xgboost_metrics,
        backtest_details,
    ) = create_backtest(
        preprocessor=(
            backtest_preprocessor
        ),
        model=backtest_model,
        test_df=test_df,
        zone_thresholds_df=(
            zone_thresholds_df
        ),
    )

    print("\nRandom Forest ile karşılaştırılıyor...")

    (
        backtest_comparison_df,
        random_forest_metrics,
    ) = compare_with_random_forest(
        xgboost_backtest_df=(
            xgboost_backtest_df
        )
    )

    baseline_metrics = (
        backtest_details[
            "baseline_metrics"
        ]
    )

    print("\nModel performansları:")

    print(
        f"XGBoost MAE         : "
        f"{xgboost_metrics['mae']:.6f}"
    )

    print(
        f"Random Forest MAE   : "
        f"{random_forest_metrics['mae']:.6f}"
    )

    print(
        f"Seasonal Naive MAE  : "
        f"{baseline_metrics['mae']:.6f}"
    )

    zone_metrics_df = (
        create_zone_backtest_metrics(
            xgboost_backtest_df
        )
    )

    # -------------------------------------------------
    # Final model bütün tarihsel model verisiyle eğitilir
    # -------------------------------------------------

    print(
        "\nFinal XGBoost modeli bütün tarihsel veriyle eğitiliyor..."
    )

    (
        final_preprocessor,
        final_model,
    ) = train_xgboost_model(
        training_df=model_df,
        n_estimators=selected_rounds,
    )

    (
        transformed_importance_df,
        base_importance_df,
    ) = create_feature_importance(
        preprocessor=(
            final_preprocessor
        ),
        model=final_model,
    )

    # -------------------------------------------------
    # Ortak gelecek hava senaryosu
    # -------------------------------------------------

    print(
        "\nRandom Forest ile ortak gelecek hava "
        "senaryosu okunuyor..."
    )

    future_weather_df = (
        read_shared_future_weather()
    )

    print(
        "Gelecek 24 saat recursive XGBoost tahmini oluşturuluyor..."
    )

    xgboost_forecast_df = (
        create_recursive_forecast(
            preprocessor=(
                final_preprocessor
            ),
            model=final_model,
            hourly_df=hourly_df,
            zones_df=zones_df,
            future_weather_df=(
                future_weather_df
            ),
            residual_quantiles=(
                backtest_details[
                    "residual_quantiles"
                ]
            ),
            zone_thresholds_df=(
                zone_thresholds_df
            ),
        )
    )

    forecast_comparison_df = (
        create_future_model_comparison(
            xgboost_forecast_df=(
                xgboost_forecast_df
            )
        )
    )

    validate_outputs(
        hourly_df=hourly_df,
        model_df=model_df,
        backtest_df=(
            xgboost_backtest_df
        ),
        forecast_df=(
            xgboost_forecast_df
        ),
        zones_df=zones_df,
    )

    metadata = {
        "model_version": (
            MODEL_VERSION
        ),
        "model_type": (
            "XGBRegressor"
        ),
        "xgboost_version": (
            xgboost.__version__
        ),
        "created_at_utc": (
            datetime.now(timezone.utc)
            .replace(microsecond=0)
            .isoformat()
        ),
        "target": (
            TARGET_COLUMN
        ),
        "target_transformation": (
            "log1p"
        ),
        "selected_boosting_rounds": int(
            selected_rounds
        ),
        "maximum_boosting_rounds": int(
            MAX_BOOSTING_ROUNDS
        ),
        "early_stopping_rounds": int(
            EARLY_STOPPING_ROUNDS
        ),
        "categorical_features": (
            CATEGORICAL_FEATURES
        ),
        "numeric_features": (
            NUMERIC_FEATURES
        ),
        "all_model_features": (
            MODEL_FEATURES
        ),
        "leakage_features_excluded": sorted(
            FORBIDDEN_LEAKAGE_FEATURES
        ),
        "xgboost_parameters": (
            XGBOOST_PARAMETERS
        ),
        "training_start_utc": str(
            model_df[
                "demand_hour_utc"
            ].min()
        ),
        "training_end_utc": str(
            model_df[
                "demand_hour_utc"
            ].max()
        ),
        "training_row_count": int(
            len(model_df)
        ),
        "active_zone_count": int(
            len(zones_df)
        ),
        "lag_hours": (
            LAG_HOURS
        ),
        "rolling_windows": (
            ROLLING_WINDOWS
        ),
        "test_hours": int(
            TEST_HOURS
        ),
        "test_start_hour_utc": str(
            test_start_hour
        ),
        "xgboost_test_metrics": (
            xgboost_metrics
        ),
        "random_forest_test_metrics": (
            random_forest_metrics
        ),
        "seasonal_naive_test_metrics": (
            baseline_metrics
        ),
        "residual_quantiles": (
            backtest_details[
                "residual_quantiles"
            ]
        ),
        "forecast_horizon_hours": (
            FORECAST_HORIZON_HOURS
        ),
        "forecast_is_recursive": True,
        "future_weather_shared_with_random_forest": True,
        "pricing_rule_merge_strategy": (
            "MAX"
        ),
        "surge_auto_apply": False,
        "native_json_model_contains_preprocessor": False,
        "joblib_bundle_contains_preprocessor": True,
    }

    save_outputs(
        backtest_df=(
            xgboost_backtest_df
        ),
        forecast_df=(
            xgboost_forecast_df
        ),
        backtest_comparison_df=(
            backtest_comparison_df
        ),
        forecast_comparison_df=(
            forecast_comparison_df
        ),
        zone_metrics_df=(
            zone_metrics_df
        ),
        thresholds_df=(
            zone_thresholds_df
        ),
        transformed_importance_df=(
            transformed_importance_df
        ),
        base_importance_df=(
            base_importance_df
        ),
        training_history_df=(
            training_history_df
        ),
        final_preprocessor=(
            final_preprocessor
        ),
        final_model=final_model,
        metadata=metadata,
    )

    create_reports(
        xgboost_metrics=(
            xgboost_metrics
        ),
        random_forest_metrics=(
            random_forest_metrics
        ),
        baseline_metrics=(
            baseline_metrics
        ),
        residual_quantiles=(
            backtest_details[
                "residual_quantiles"
            ]
        ),
        selected_rounds=(
            selected_rounds
        ),
        test_start_hour=(
            test_start_hour
        ),
        validation_start_hour=(
            validation_start_hour
        ),
        forecast_df=(
            xgboost_forecast_df
        ),
    )

    print("\n" + "=" * 78)
    print("XGBOOST TALEP TAHMİNİ TAMAMLANDI")
    print("=" * 78)

    print(
        f"Seçilen boosting turu : "
        f"{selected_rounds:,}"
    )

    print(
        f"Backtest satırı       : "
        f"{len(xgboost_backtest_df):,}"
    )

    print(
        f"Gelecek tahmin satırı : "
        f"{len(xgboost_forecast_df):,}"
    )

    print(
        f"Gelecek tahmin saati  : "
        f"{xgboost_forecast_df['demand_hour_utc'].nunique():,}"
    )

    print(
        f"Aktif zone            : "
        f"{xgboost_forecast_df['zone_id'].nunique():,}"
    )

    print(
        "\nTahmin edilen talep seviyesi:"
    )

    print(
        xgboost_forecast_df[
            "predicted_demand_level"
        ].value_counts().to_string()
    )

    print(
        "\nSurge multiplier dağılımı:"
    )

    print(
        xgboost_forecast_df[
            "recommended_surge_multiplier"
        ]
        .value_counts()
        .sort_index()
        .to_string()
    )

    print(
        f"\nBacktest CSV        : "
        f"{XGBOOST_BACKTEST_CSV_FILE}"
    )

    print(
        f"Gelecek tahmin      : "
        f"{XGBOOST_FORECAST_CSV_FILE}"
    )

    print(
        f"Pricing Service     : "
        f"{PRICING_SERVICE_OUTPUT_FILE}"
    )

    print(
        f"Model bundle        : "
        f"{MODEL_BUNDLE_FILE}"
    )

    print(
        f"Native model JSON   : "
        f"{NATIVE_XGBOOST_MODEL_FILE}"
    )

    print(
        f"Raporlar            : "
        f"{REPORT_DIR}"
    )

    print("\nKontroller:")
    print(
        "Eski reservations_istanbul_weather.csv girdisi kaldırıldı."
    )
    print(
        "Random Forest ile aynı zone × saat veri seti kullanıldı."
    )
    print(
        "Sıfır talepli zone-saatler modele dahil edildi."
    )
    print(
        "Random train_test_split kaldırıldı."
    )
    print(
        "Son 7 gün zaman bazlı test olarak ayrıldı."
    )
    print(
        "Early stopping için ayrı 72 saatlik validation dönemi kullanıldı."
    )
    print(
        "avg_price ve avg_distance_km modelden çıkarıldı."
    )
    print(
        "cancel_rate ve no_show_rate modelden çıkarıldı."
    )
    print(
        "Zone ID kategorik olarak one-hot işlendi."
    )
    print(
        "Geçmiş talep lag ve rolling özellikleri kullanıldı."
    )
    print(
        "Random Forest ve seasonal naive ile aynı testte karşılaştırıldı."
    )
    print(
        "Gelecek 24 saat recursive biçimde tahmin edildi."
    )
    print(
        "Random Forest ile aynı gelecek hava senaryosu kullanıldı."
    )
    print(
        "Surge önerileri otomatik uygulanmıyor."
    )
    print(
        "Pricing Service merge stratejisi MAX."
    )
    print(
        "Preprocessor ve model birlikte joblib bundle olarak kaydedildi."
    )
    print(
        "Native XGBoost modeli JSON olarak kaydedildi."
    )

    if xgboost_forecast_df[
        "weather_is_synthetic"
    ].astype(bool).any():
        print(
            "\n Gelecek hava girdisi sentetik veya "
            "haftalık hava senaryosudur."
        )


if __name__ == "__main__":
    main()