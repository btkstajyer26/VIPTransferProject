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
        "Parquet dosyalarını parça parça okumak için pyarrow gereklidir.\n"
        "VS Code terminalinde şu komutu çalıştır:\n\n"
        "pip install pyarrow"
    ) from error

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


# Windows terminalinde Türkçe karakter desteği
try:
    sys.stdout.reconfigure(encoding="utf-8")
except AttributeError:
    pass


# =====================================================
# 1. GENEL AYARLAR
# =====================================================

RANDOM_SEED = 42

SIMULATION_TIMEZONE = "Europe/Istanbul"

MODEL_VERSION = "random-forest-demand-weather-v1"

BATCH_SIZE = 200_000

# Son 7 gün yalnızca test için kullanılır.
TEST_HOURS = 7 * 24

# Modelin eğitilebilmesi için testten önce en az 14 günlük veri.
MINIMUM_TRAIN_HOURS = 14 * 24

# Gelecek talep tahmin ufku
FORECAST_HORIZON_HOURS = 24

# Geçmiş talep özellikleri
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

# Resmî/özel gün listesi.
# Mevcut veri seti Ocak 2025 olduğu için 1 Ocak yeterlidir.
HOLIDAY_DATES = {
    "2025-01-01",
}

# Random Forest
RF_N_ESTIMATORS = 250
RF_MAX_DEPTH = 18
RF_MIN_SAMPLES_LEAF = 3
RF_MAX_FEATURES = 0.75

# Surge simülasyon sınırları
MIN_SURGE_MULTIPLIER = 1.00
MAX_SURGE_MULTIPLIER = 1.60

# Gelecek hava tahmini dosyası bulunmazsa,
# yedi gün önceki aynı saatin hava durumu senaryo olarak kullanılır.
ALLOW_SEASONAL_WEATHER_SCENARIO = True


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

RAW_WEATHER_DIR = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "weather"
)

REFERENCE_DATA_DIR = (
    PROJECT_ROOT
    / "data"
    / "reference"
)

PROCESSED_DATA_DIR = (
    PROJECT_ROOT
    / "data"
    / "processed"
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
    / "14_demand_prediction_with_weather"
)

RAW_WEATHER_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

PROCESSED_DATA_DIR.mkdir(
    parents=True,
    exist_ok=True,
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
# 3. DOSYA YOLLARI
# =====================================================

RESERVATIONS_WEATHER_FILE = (
    PROCESSED_DATA_DIR
    / "reservations_weather_features.parquet"
)

WEATHER_HISTORY_FILE = (
    REFERENCE_DATA_DIR
    / "weather_hourly_istanbul_2025.parquet"
)

ZONE_CATALOG_FILE = (
    REFERENCE_DATA_DIR
    / "istanbul_zone_catalog.csv"
)

# Opsiyonel gelecek hava tahmini
FUTURE_WEATHER_FORECAST_FILE = (
    RAW_WEATHER_DIR
    / "istanbul_hourly_weather_forecast.csv"
)

HOURLY_DEMAND_DATASET_FILE = (
    PROCESSED_DATA_DIR
    / "demand_hourly_zone_weather.parquet"
)

BACKTEST_CSV_FILE = (
    PROCESSED_DATA_DIR
    / "demand_backtest_random_forest_weather.csv"
)

BACKTEST_PARQUET_FILE = (
    PROCESSED_DATA_DIR
    / "demand_backtest_random_forest_weather.parquet"
)

FORECAST_CSV_FILE = (
    PROCESSED_DATA_DIR
    / "demand_forecast_random_forest_weather.csv"
)

FORECAST_PARQUET_FILE = (
    PROCESSED_DATA_DIR
    / "demand_forecast_random_forest_weather.parquet"
)

PRICING_SERVICE_OUTPUT_FILE = (
    PROCESSED_DATA_DIR
    / "pricing_service_surge_random_forest_weather.csv"
)

MODEL_BUNDLE_FILE = (
    MODEL_DIR
    / "random_forest_weather_bundle.joblib"
)

MODEL_METADATA_FILE = (
    MODEL_DIR
    / "random_forest_weather_metadata.json"
)

MODEL_METRICS_FILE = (
    REPORT_DIR
    / "random_forest_model_metrics.json"
)

MODEL_METRICS_CSV_FILE = (
    REPORT_DIR
    / "model_metrics_comparison.csv"
)

FEATURE_IMPORTANCE_FILE = (
    REPORT_DIR
    / "random_forest_feature_importance.csv"
)

ZONE_BACKTEST_METRICS_FILE = (
    REPORT_DIR
    / "zone_backtest_metrics.csv"
)

ZONE_THRESHOLDS_FILE = (
    REPORT_DIR
    / "zone_demand_thresholds.csv"
)

DATASET_SUMMARY_FILE = (
    REPORT_DIR
    / "hourly_demand_dataset_summary.json"
)

FORECAST_SUMMARY_FILE = (
    REPORT_DIR
    / "future_forecast_summary.json"
)


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

    # Hava durumu
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

    # Yalnızca geçmiş talepten üretilen özellikler
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

TARGET_COLUMN = "demand_count"


# =====================================================
# 5. HAVA DURUMU SÜTUNLARI
# =====================================================

WEATHER_MODEL_COLUMNS = [
    "weather_hour_utc",
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
# 6. YARDIMCI FONKSİYONLAR
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
    DataFrame içinde gerekli sütunların bulunduğunu doğrular.
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
            f"{column_name} alanında geçersiz boolean "
            f"değerler bulundu: {invalid_values}"
        )

    return converted.astype(bool)


def create_one_hot_encoder() -> OneHotEncoder:
    """
    Farklı scikit-learn sürümleriyle uyumlu encoder oluşturur.
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

    rmse = float(
        np.sqrt(
            mean_squared_error(
                actual,
                predicted,
            )
        )
    )

    return {
        "mae": float(
            mean_absolute_error(
                actual,
                predicted,
            )
        ),
        "rmse": rmse,
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


def predict_demand(
    pipeline: Pipeline,
    features_df: pd.DataFrame,
) -> np.ndarray:
    """
    Log1p hedefi üzerinden eğitilen modelden talep tahmini üretir.
    """

    log_predictions = pipeline.predict(
        features_df[MODEL_FEATURES]
    )

    predictions = np.expm1(
        log_predictions
    )

    return np.clip(
        predictions,
        0,
        None,
    )


def json_safe(value):
    """
    NumPy ve Pandas değerlerini JSON uyumlu hale getirir.
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


# =====================================================
# 7. ZONE KATALOĞUNU OKUMA
# =====================================================

def read_zone_catalog() -> pd.DataFrame:
    """
    İstanbul zone kataloğunu okur.
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

    zones_df["is_active"] = convert_boolean(
        zones_df["is_active"],
        "istanbul_zone_catalog.is_active",
    )

    if zones_df["zone_id"].duplicated().any():
        raise ValueError(
            "Zone kataloğunda tekrar eden zone_id bulundu."
        )

    if zones_df["zone_name"].duplicated().any():
        raise ValueError(
            "Zone kataloğunda tekrar eden zone_name bulundu."
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
            "Talep tahmini için aktif pricing zone bulunamadı."
        )

    active_zones_df["zone_category"] = (
        active_zones_df["zone_category"]
        .fillna("OTHER")
        .astype("string")
    )

    print(
        f"Aktif zone sayısı: "
        f"{len(active_zones_df):,}"
    )

    return (
        active_zones_df
        .sort_values("zone_id")
        .reset_index(drop=True)
    )


# =====================================================
# 8. TARİHSEL HAVA DURUMUNU OKUMA
# =====================================================

def read_weather_history() -> pd.DataFrame:
    """
    13_add_weather_features.py tarafından oluşturulan saatlik
    hava durumu referansını okur.
    """

    require_file(
        WEATHER_HISTORY_FILE
    )

    weather_df = pd.read_parquet(
        WEATHER_HISTORY_FILE
    )

    validate_columns(
        weather_df,
        WEATHER_MODEL_COLUMNS,
        "weather_hourly_istanbul_2025.parquet",
    )

    weather_df["weather_hour_utc"] = pd.to_datetime(
        weather_df["weather_hour_utc"],
        errors="coerce",
        utc=True,
    )

    if weather_df["weather_hour_utc"].isna().any():
        raise ValueError(
            "Tarihsel hava durumunda geçersiz saat bulundu."
        )

    if weather_df["weather_hour_utc"].duplicated().any():
        raise ValueError(
            "Tarihsel hava durumunda tekrar eden saat bulundu."
        )

    numeric_columns = [
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
        "weather_is_synthetic",
    ]

    for column in numeric_columns:
        weather_df[column] = pd.to_numeric(
            weather_df[column],
            errors="coerce",
        )

    if weather_df[
        numeric_columns
    ].isna().any().any():
        raise ValueError(
            "Tarihsel hava durumunda eksik sayısal değer bulundu."
        )

    if not weather_df[
        "weather_severity_score"
    ].between(
        0,
        1,
    ).all():
        raise ValueError(
            "weather_severity_score 0–1 arasında olmalıdır."
        )

    return (
        weather_df[
            WEATHER_MODEL_COLUMNS
        ]
        .sort_values(
            "weather_hour_utc"
        )
        .reset_index(drop=True)
    )


# =====================================================
# 9. REZERVASYON TALEBİNİ PARÇA PARÇA TOPLAMA
# =====================================================

def aggregate_reservation_demand() -> tuple[
    pd.DataFrame,
    int,
]:
    """
    Hava durumlu rezervasyon Parquet dosyasını parça parça okur.

    Talep hedefi:
    Bir zone ve hizmet saati için oluşturulmuş tüm rezervasyon
    isteklerinin sayısıdır.

    CANCELLED ve NO_SHOW kayıtları da talep isteği olduğu için
    demand_count içine dahildir.
    """

    require_file(
        RESERVATIONS_WEATHER_FILE
    )

    parquet_file = pq.ParquetFile(
        RESERVATIONS_WEATHER_FILE
    )

    required_columns = [
        "id",
        "pickup_zone_id",
        "scheduled_time",
        "status",
    ]

    available_columns = set(
        parquet_file.schema.names
    )

    missing_columns = [
        column
        for column in required_columns
        if column not in available_columns
    ]

    if missing_columns:
        raise ValueError(
            "reservations_weather_features.parquet içinde "
            f"gerekli sütunlar eksik: {missing_columns}"
        )

    aggregated_parts = []
    total_reservation_count = 0

    batches = parquet_file.iter_batches(
        batch_size=BATCH_SIZE,
        columns=required_columns,
    )

    for batch_number, batch in enumerate(
        batches,
        start=1,
    ):
        batch_df = batch.to_pandas()

        batch_df["id"] = pd.to_numeric(
            batch_df["id"],
            errors="raise",
        ).astype("int64")

        batch_df["pickup_zone_id"] = pd.to_numeric(
            batch_df["pickup_zone_id"],
            errors="raise",
        ).astype("int64")

        batch_df["scheduled_time"] = pd.to_datetime(
            batch_df["scheduled_time"],
            errors="coerce",
            utc=True,
        )

        if batch_df["scheduled_time"].isna().any():
            raise ValueError(
                "Talep toplama sırasında geçersiz scheduled_time bulundu."
            )

        batch_df["status"] = (
            batch_df["status"]
            .astype("string")
            .str.upper()
        )

        batch_df["demand_hour_utc"] = (
            batch_df["scheduled_time"]
            .dt.floor("h")
        )

        batch_aggregate = (
            batch_df
            .groupby(
                [
                    "pickup_zone_id",
                    "demand_hour_utc",
                ],
                as_index=False,
            )
            .agg(
                demand_count=(
                    "id",
                    "count",
                ),
                completed_count=(
                    "status",
                    lambda values: (
                        values == "COMPLETED"
                    ).sum(),
                ),
                cancelled_count=(
                    "status",
                    lambda values: (
                        values == "CANCELLED"
                    ).sum(),
                ),
                no_show_count=(
                    "status",
                    lambda values: (
                        values == "NO_SHOW"
                    ).sum(),
                ),
                pending_count=(
                    "status",
                    lambda values: (
                        values == "PENDING"
                    ).sum(),
                ),
                assigned_count=(
                    "status",
                    lambda values: (
                        values == "ASSIGNED"
                    ).sum(),
                ),
            )
        )

        aggregated_parts.append(
            batch_aggregate
        )

        total_reservation_count += len(
            batch_df
        )

        print(
            f"Rezervasyon toplama {batch_number}: "
            f"{total_reservation_count:,} satır"
        )

    if total_reservation_count == 0:
        raise ValueError(
            "Talep tahmini için rezervasyon bulunamadı."
        )

    combined_df = (
        pd.concat(
            aggregated_parts,
            ignore_index=True,
        )
        .groupby(
            [
                "pickup_zone_id",
                "demand_hour_utc",
            ],
            as_index=False,
        )[
            [
                "demand_count",
                "completed_count",
                "cancelled_count",
                "no_show_count",
                "pending_count",
                "assigned_count",
            ]
        ]
        .sum()
    )

    return (
        combined_df,
        total_reservation_count,
    )


# =====================================================
# 10. ZONE × SAAT TAM GRID OLUŞTURMA
# =====================================================

def create_complete_hourly_grid(
    aggregated_demand_df: pd.DataFrame,
    zones_df: pd.DataFrame,
    weather_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Bütün aktif zone ve bütün saat kombinasyonlarını oluşturur.

    Rezervasyon bulunmayan saatlerin demand_count değeri 0 olur.
    """

    valid_zone_ids = set(
        zones_df["zone_id"].astype(int)
    )

    reservation_zone_ids = set(
        aggregated_demand_df[
            "pickup_zone_id"
        ].astype(int)
    )

    unknown_zone_ids = (
        reservation_zone_ids
        - valid_zone_ids
    )

    if unknown_zone_ids:
        raise ValueError(
            "Zone kataloğunda bulunmayan rezervasyon zone ID'leri var:\n"
            f"{sorted(unknown_zone_ids)}"
        )

    minimum_hour = (
        aggregated_demand_df[
            "demand_hour_utc"
        ].min()
    )

    maximum_hour = (
        aggregated_demand_df[
            "demand_hour_utc"
        ].max()
    )

    hour_range = pd.date_range(
        start=minimum_hour,
        end=maximum_hour,
        freq="h",
        tz="UTC",
    )

    complete_index = pd.MultiIndex.from_product(
        [
            zones_df["zone_id"].tolist(),
            hour_range,
        ],
        names=[
            "zone_id",
            "demand_hour_utc",
        ],
    )

    hourly_df = (
        complete_index
        .to_frame(index=False)
    )

    hourly_df = hourly_df.merge(
        zones_df,
        on="zone_id",
        how="left",
        validate="many_to_one",
    )

    demand_for_merge = (
        aggregated_demand_df
        .rename(
            columns={
                "pickup_zone_id": "zone_id",
            }
        )
    )

    hourly_df = hourly_df.merge(
        demand_for_merge,
        on=[
            "zone_id",
            "demand_hour_utc",
        ],
        how="left",
        validate="one_to_one",
    )

    count_columns = [
        "demand_count",
        "completed_count",
        "cancelled_count",
        "no_show_count",
        "pending_count",
        "assigned_count",
    ]

    for column in count_columns:
        hourly_df[column] = (
            hourly_df[column]
            .fillna(0)
            .astype("int64")
        )

    weather_for_merge = weather_df.rename(
        columns={
            "weather_hour_utc": (
                "demand_hour_utc"
            ),
        }
    )

    hourly_df = hourly_df.merge(
        weather_for_merge,
        on="demand_hour_utc",
        how="left",
        validate="many_to_one",
    )

    missing_weather_count = int(
        hourly_df[
            "weather_condition"
        ].isna().sum()
    )

    if missing_weather_count > 0:
        missing_hours = (
            hourly_df.loc[
                hourly_df[
                    "weather_condition"
                ].isna(),
                "demand_hour_utc",
            ]
            .drop_duplicates()
            .head(10)
        )

        raise ValueError(
            "Bazı zone-saat kayıtları hava durumuyla eşleşmedi.\n"
            f"Eksik satır sayısı: {missing_weather_count:,}\n"
            f"Örnek saatler:\n{missing_hours.to_string(index=False)}"
        )

    expected_row_count = (
        len(zones_df)
        * len(hour_range)
    )

    if len(hourly_df) != expected_row_count:
        raise ValueError(
            "Zone × saat tam grid satır sayısı hatalı.\n"
            f"Beklenen: {expected_row_count:,}\n"
            f"Gerçek: {len(hourly_df):,}"
        )

    return (
        hourly_df
        .sort_values(
            [
                "zone_id",
                "demand_hour_utc",
            ]
        )
        .reset_index(drop=True)
    )


# =====================================================
# 11. TAKVİM ÖZELLİKLERİ
# =====================================================

def add_time_features(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    UTC saatten İstanbul yerel zaman özelliklerini oluşturur.
    """

    result_df = dataframe.copy()

    result_df["demand_hour_utc"] = pd.to_datetime(
        result_df["demand_hour_utc"],
        errors="coerce",
        utc=True,
    )

    if result_df["demand_hour_utc"].isna().any():
        raise ValueError(
            "demand_hour_utc alanında geçersiz saat bulundu."
        )

    result_df["demand_hour_local"] = (
        result_df["demand_hour_utc"]
        .dt.tz_convert(
            SIMULATION_TIMEZONE
        )
    )

    result_df["forecast_date_local"] = (
        result_df["demand_hour_local"]
        .dt.date
    )

    result_df["reservation_hour"] = (
        result_df["demand_hour_local"]
        .dt.hour
        .astype("int8")
    )

    result_df["day_of_week"] = (
        result_df["demand_hour_local"]
        .dt.dayofweek
        .astype("int8")
    )

    result_df["is_weekend"] = (
        result_df["day_of_week"]
        .isin([5, 6])
        .astype("int8")
    )

    result_df["is_peak_hour"] = (
        result_df["reservation_hour"]
        .isin(
            [
                7,
                8,
                9,
                17,
                18,
                19,
                20,
            ]
        )
        .astype("int8")
    )

    local_date_text = (
        result_df[
            "forecast_date_local"
        ]
        .astype(str)
    )

    result_df["is_holiday"] = (
        local_date_text
        .isin(HOLIDAY_DATES)
        .astype("int8")
    )

    result_df["hour_sin"] = np.sin(
        2
        * np.pi
        * result_df["reservation_hour"]
        / 24
    )

    result_df["hour_cos"] = np.cos(
        2
        * np.pi
        * result_df["reservation_hour"]
        / 24
    )

    result_df["day_of_week_sin"] = np.sin(
        2
        * np.pi
        * result_df["day_of_week"]
        / 7
    )

    result_df["day_of_week_cos"] = np.cos(
        2
        * np.pi
        * result_df["day_of_week"]
        / 7
    )

    result_df["zone_id_category"] = (
        result_df["zone_id"]
        .astype(str)
    )

    result_df["zone_category"] = (
        result_df["zone_category"]
        .fillna("OTHER")
        .astype("string")
    )

    result_df["weather_condition"] = (
        result_df["weather_condition"]
        .astype("string")
    )

    return result_df


# =====================================================
# 12. GEÇMİŞ TALEP ÖZELLİKLERİ
# =====================================================

def add_historical_demand_features(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Her zone için yalnızca geçmiş saatleri kullanarak lag ve
    rolling özelliklerini oluşturur.
    """

    result_df = (
        dataframe
        .sort_values(
            [
                "zone_id",
                "demand_hour_utc",
            ]
        )
        .reset_index(drop=True)
    )

    grouped_demand = result_df.groupby(
        "zone_id",
        sort=False,
    )[TARGET_COLUMN]

    for lag_hour in LAG_HOURS:
        result_df[
            f"demand_lag_{lag_hour}h"
        ] = grouped_demand.shift(
            lag_hour
        )

    for window_size in ROLLING_WINDOWS:
        result_df[
            f"demand_rolling_mean_{window_size}h"
        ] = (
            result_df
            .groupby(
                "zone_id",
                sort=False,
            )[TARGET_COLUMN]
            .transform(
                lambda values: (
                    values
                    .shift(1)
                    .rolling(
                        window=window_size,
                        min_periods=window_size,
                    )
                    .mean()
                )
            )
        )

    return result_df


# =====================================================
# 13. MODEL VERİ SETİNİ HAZIRLAMA
# =====================================================

def prepare_model_dataset(
    hourly_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Lag alanları tamamlanmış model veri setini hazırlar.
    """

    required_columns = (
        MODEL_FEATURES
        + [TARGET_COLUMN]
    )

    validate_columns(
        hourly_df,
        required_columns,
        "hourly demand dataset",
    )

    model_df = hourly_df.dropna(
        subset=MODEL_FEATURES
    ).copy()

    if model_df.empty:
        raise ValueError(
            "Lag özelliklerinden sonra model için veri kalmadı."
        )

    if model_df[
        MODEL_FEATURES
    ].isna().any().any():
        raise ValueError(
            "Model özelliklerinde eksik değer bulundu."
        )

    if not (
        model_df[TARGET_COLUMN] >= 0
    ).all():
        raise ValueError(
            "Negatif demand_count değeri bulundu."
        )

    model_df["zone_id_category"] = (
        model_df["zone_id_category"]
        .astype("string")
    )

    model_df["zone_category"] = (
        model_df["zone_category"]
        .astype("string")
    )

    model_df["weather_condition"] = (
        model_df["weather_condition"]
        .astype("string")
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
# 14. ZAMAN BAZLI EĞİTİM / TEST AYRIMI
# =====================================================

def split_train_test(
    model_df: pd.DataFrame,
) -> tuple[
    pd.DataFrame,
    pd.DataFrame,
    pd.Timestamp,
]:
    """
    Son 7 günü test olarak ayırır.

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

    required_hour_count = (
        MINIMUM_TRAIN_HOURS
        + TEST_HOURS
    )

    if len(unique_hours) < required_hour_count:
        raise ValueError(
            "Zaman bazlı eğitim ve test için yeterli saat yok.\n"
            f"Gerekli en az saat: {required_hour_count}\n"
            f"Bulunan saat: {len(unique_hours)}"
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

    train_hour_count = (
        train_df[
            "demand_hour_utc"
        ]
        .nunique()
    )

    test_hour_count = (
        test_df[
            "demand_hour_utc"
        ]
        .nunique()
    )

    if train_hour_count < MINIMUM_TRAIN_HOURS:
        raise ValueError(
            "Eğitim döneminde yeterli saat bulunmuyor."
        )

    if test_hour_count != TEST_HOURS:
        raise ValueError(
            "Test dönemi tam 7 gün değil.\n"
            f"Test saat sayısı: {test_hour_count}"
        )

    print(
        f"Eğitim başlangıcı: "
        f"{train_df['demand_hour_utc'].min()}"
    )

    print(
        f"Eğitim bitişi    : "
        f"{train_df['demand_hour_utc'].max()}"
    )

    print(
        f"Test başlangıcı  : "
        f"{test_df['demand_hour_utc'].min()}"
    )

    print(
        f"Test bitişi      : "
        f"{test_df['demand_hour_utc'].max()}"
    )

    print(
        f"Eğitim satırı    : "
        f"{len(train_df):,}"
    )

    print(
        f"Test satırı      : "
        f"{len(test_df):,}"
    )

    return (
        train_df,
        test_df,
        test_start_hour,
    )


# =====================================================
# 15. RANDOM FOREST PIPELINE
# =====================================================

def create_random_forest_pipeline() -> Pipeline:
    """
    Kategorik alanları one-hot yapan Random Forest pipeline oluşturur.
    """

    preprocessor = ColumnTransformer(
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

    regressor = RandomForestRegressor(
        n_estimators=RF_N_ESTIMATORS,
        max_depth=RF_MAX_DEPTH,
        min_samples_leaf=RF_MIN_SAMPLES_LEAF,
        max_features=RF_MAX_FEATURES,
        random_state=RANDOM_SEED,
        n_jobs=-1,
    )

    return Pipeline(
        steps=[
            (
                "preprocessor",
                preprocessor,
            ),
            (
                "model",
                regressor,
            ),
        ]
    )


# =====================================================
# 16. BACKTEST MODELİ
# =====================================================

def train_and_evaluate_backtest(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> tuple[
    Pipeline,
    pd.DataFrame,
    dict,
    dict,
]:
    """
    Eğitim döneminde modeli eğitir ve son 7 gün üzerinde test eder.
    """

    pipeline = (
        create_random_forest_pipeline()
    )

    X_train = train_df[
        MODEL_FEATURES
    ]

    y_train_log = np.log1p(
        train_df[TARGET_COLUMN]
        .to_numpy(dtype=float)
    )

    print(
        "\nRandom Forest backtest modeli eğitiliyor..."
    )

    pipeline.fit(
        X_train,
        y_train_log,
    )

    model_predictions = predict_demand(
        pipeline=pipeline,
        features_df=test_df,
    )

    actual_values = (
        test_df[TARGET_COLUMN]
        .to_numpy(dtype=float)
    )

    # Haftalık mevsimsel referans:
    # Aynı zone için 168 saat önceki talep.
    baseline_predictions = (
        test_df["demand_lag_168h"]
        .to_numpy(dtype=float)
    )

    model_metrics = calculate_metrics(
        actual=actual_values,
        predicted=model_predictions,
    )

    baseline_metrics = calculate_metrics(
        actual=actual_values,
        predicted=baseline_predictions,
    )

    residuals = (
        actual_values
        - model_predictions
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

    backtest_df = test_df[
        [
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
            "completed_count",
            "cancelled_count",
            "no_show_count",
            "pending_count",
            "assigned_count",
            "demand_lag_24h",
            "demand_lag_168h",
        ]
    ].copy()

    backtest_df["predicted_demand"] = (
        model_predictions
    )

    backtest_df[
        "seasonal_naive_prediction"
    ] = baseline_predictions

    backtest_df["prediction_error"] = (
        backtest_df["demand_count"]
        - backtest_df["predicted_demand"]
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
        model_predictions
        + residual_quantiles["q10"],
        0,
        None,
    )

    backtest_df[
        "prediction_upper_80"
    ] = np.clip(
        model_predictions
        + residual_quantiles["q90"],
        0,
        None,
    )

    numeric_round_columns = [
        "predicted_demand",
        "seasonal_naive_prediction",
        "prediction_error",
        "absolute_prediction_error",
        "prediction_lower_80",
        "prediction_upper_80",
    ]

    for column in numeric_round_columns:
        backtest_df[column] = (
            backtest_df[column]
            .round(3)
        )

    return (
        pipeline,
        backtest_df,
        model_metrics,
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
# 17. ZONE BAZLI TALEP EŞİKLERİ
# =====================================================

def create_zone_thresholds(
    train_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    LOW / MEDIUM / HIGH talep sınırlarını yalnızca eğitim
    döneminden ve zone bazında hesaplar.
    """

    quantile_df = (
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

    quantile_df[
        "low_demand_threshold"
    ] = np.maximum(
        np.ceil(
            quantile_df[
                "low_quantile"
            ]
        ),
        1,
    ).astype(int)

    quantile_df[
        "high_demand_threshold"
    ] = np.maximum(
        np.ceil(
            quantile_df[
                "high_quantile"
            ]
        ),
        quantile_df[
            "low_demand_threshold"
        ]
        + 1,
    ).astype(int)

    round_columns = [
        "historical_mean_demand",
        "historical_median_demand",
        "low_quantile",
        "high_quantile",
        "historical_max_demand",
    ]

    for column in round_columns:
        quantile_df[column] = (
            quantile_df[column]
            .round(3)
        )

    return (
        quantile_df
        .sort_values("zone_id")
        .reset_index(drop=True)
    )


# =====================================================
# 18. TALEP SEVİYESİ VE SURGE ÖNERİSİ
# =====================================================

def add_demand_levels_and_surge(
    dataframe: pd.DataFrame,
    zone_thresholds_df: pd.DataFrame,
    prediction_column: str,
) -> pd.DataFrame:
    """
    Tahmini talebi zone geçmişine göre seviyelendirir ve
    Pricing Service için öneri çarpanı üretir.

    Çarpan otomatik uygulanmaz.
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

    predicted_demand = (
        pd.to_numeric(
            result_df[
                prediction_column
            ],
            errors="coerce",
        )
        .clip(lower=0)
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
        lower=0,
        upper=1,
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
        lower=0,
        upper=2,
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

    peak_bonus = (
        result_df[
            "is_peak_hour"
        ].astype(float)
        * 0.05
    )

    weather_bonus = (
        result_df[
            "weather_severity_score"
        ].astype(float)
        * 0.10
    ).clip(
        lower=0,
        upper=0.10,
    )

    result_df[
        "demand_surge_component"
    ] = demand_component

    result_df[
        "peak_hour_surge_component"
    ] = peak_bonus

    result_df[
        "weather_surge_component"
    ] = weather_bonus

    result_df[
        "recommended_surge_multiplier"
    ] = (
        1.00
        + demand_component
        + peak_bonus
        + weather_bonus
    ).clip(
        lower=MIN_SURGE_MULTIPLIER,
        upper=MAX_SURGE_MULTIPLIER,
    ).round(2)

    def create_surge_reason(row) -> str:
        reasons = []

        if (
            row[
                "predicted_demand_level"
            ]
            == "HIGH"
        ):
            reasons.append(
                "HIGH_PREDICTED_DEMAND"
            )

        elif (
            row[
                "predicted_demand_level"
            ]
            == "MEDIUM"
        ):
            reasons.append(
                "MEDIUM_PREDICTED_DEMAND"
            )

        else:
            reasons.append(
                "LOW_PREDICTED_DEMAND"
            )

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
            create_surge_reason,
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

    component_columns = [
        "demand_surge_component",
        "peak_hour_surge_component",
        "weather_surge_component",
    ]

    for column in component_columns:
        result_df[column] = (
            result_df[column]
            .round(4)
        )

    return result_df


# =====================================================
# 19. ZONE BAZLI BACKTEST METRİKLERİ
# =====================================================

def create_zone_backtest_metrics(
    backtest_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Her zone için ayrı tahmin hata metrikleri oluşturur.
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
        actual = group_df[
            "demand_count"
        ].to_numpy(dtype=float)

        predicted = group_df[
            "predicted_demand"
        ].to_numpy(dtype=float)

        metrics = calculate_metrics(
            actual=actual,
            predicted=predicted,
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

    zone_metrics_df = pd.DataFrame(
        rows
    )

    numeric_columns = [
        "mae",
        "rmse",
        "r2",
        "wape",
        "smape",
        "actual_total",
        "predicted_total",
    ]

    for column in numeric_columns:
        zone_metrics_df[column] = (
            zone_metrics_df[column]
            .round(6)
        )

    return (
        zone_metrics_df
        .sort_values(
            by="mae",
            ascending=False,
        )
        .reset_index(drop=True)
    )


# =====================================================
# 20. GELECEK HAVA TAHMİNİNİ HAZIRLAMA
# =====================================================

def ensure_future_weather_features(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Gelecek hava tahminini modelde kullanılacak ortak formata getirir.
    """

    result_df = dataframe.copy()

    required_base_columns = [
        "weather_hour_utc",
        "weather_condition",
        "temperature_c",
        "precipitation_mm",
        "snowfall_mm",
        "wind_speed_kmh",
        "relative_humidity_pct",
        "cloud_cover_pct",
        "visibility_m",
    ]

    validate_columns(
        result_df,
        required_base_columns,
        "future weather forecast",
    )

    result_df["weather_hour_utc"] = pd.to_datetime(
        result_df["weather_hour_utc"],
        errors="coerce",
        utc=True,
    )

    if result_df["weather_hour_utc"].isna().any():
        raise ValueError(
            "Gelecek hava tahmininde geçersiz saat bulundu."
        )

    numeric_columns = [
        "temperature_c",
        "precipitation_mm",
        "snowfall_mm",
        "wind_speed_kmh",
        "relative_humidity_pct",
        "cloud_cover_pct",
        "visibility_m",
    ]

    for column in numeric_columns:
        result_df[column] = pd.to_numeric(
            result_df[column],
            errors="coerce",
        )

    if result_df[numeric_columns].isna().any().any():
        raise ValueError(
            "Gelecek hava tahmininde eksik sayısal değer bulundu."
        )

    result_df["weather_condition"] = (
        result_df["weather_condition"]
        .astype("string")
        .str.upper()
    )

    result_df["is_rainy"] = (
        result_df["weather_condition"]
        .eq("RAINY")
        .astype("int8")
    )

    result_df["is_snowy"] = (
        result_df["weather_condition"]
        .eq("SNOWY")
        .astype("int8")
    )

    result_df["is_foggy"] = (
        result_df["weather_condition"]
        .eq("FOGGY")
        .astype("int8")
    )

    result_df["is_bad_weather"] = (
        (
            result_df[
                "precipitation_mm"
            ] >= 1.0
        )
        | (
            result_df[
                "snowfall_mm"
            ] > 0
        )
        | (
            result_df[
                "visibility_m"
            ] < 1_000
        )
        | (
            result_df[
                "wind_speed_kmh"
            ] >= 40
        )
    ).astype("int8")

    precipitation_severity = (
        result_df[
            "precipitation_mm"
        ]
        / 10
    ).clip(
        0,
        1,
    )

    snowfall_severity = (
        result_df[
            "snowfall_mm"
        ]
        / 5
    ).clip(
        0,
        1,
    )

    wind_severity = (
        result_df[
            "wind_speed_kmh"
        ]
        / 60
    ).clip(
        0,
        1,
    )

    visibility_severity = (
        1
        - (
            result_df[
                "visibility_m"
            ]
            / 10_000
        ).clip(
            0,
            1,
        )
    )

    result_df[
        "weather_severity_score"
    ] = (
        0.35
        * precipitation_severity

        + 0.25
        * snowfall_severity

        + 0.20
        * wind_severity

        + 0.20
        * visibility_severity
    ).clip(
        0,
        1,
    ).round(4)

    if "weather_data_source" not in result_df.columns:
        result_df[
            "weather_data_source"
        ] = "FORECAST_EXTERNAL"

    if "weather_is_synthetic" not in result_df.columns:
        result_df[
            "weather_is_synthetic"
        ] = 0

    result_df[
        "weather_is_synthetic"
    ] = pd.to_numeric(
        result_df[
            "weather_is_synthetic"
        ],
        errors="coerce",
    ).fillna(0).astype("int8")

    return result_df[
        WEATHER_MODEL_COLUMNS
    ]


def create_future_weather(
    weather_history_df: pd.DataFrame,
    last_historical_hour: pd.Timestamp,
) -> tuple[
    pd.DataFrame,
    str,
]:
    """
    Gelecek 24 saatlik hava verisini hazırlar.

    Öncelik:
    1. Harici hava tahmini CSV'si
    2. Yedi gün önceki aynı saatlerden oluşturulan senaryo
    """

    future_hours = pd.date_range(
        start=(
            last_historical_hour
            + pd.Timedelta(hours=1)
        ),
        periods=FORECAST_HORIZON_HOURS,
        freq="h",
        tz="UTC",
    )

    if FUTURE_WEATHER_FORECAST_FILE.exists():
        future_weather_df = pd.read_csv(
            FUTURE_WEATHER_FORECAST_FILE,
            low_memory=False,
        )

        future_weather_df = (
            ensure_future_weather_features(
                future_weather_df
            )
        )

        future_weather_df = (
            future_weather_df
            .set_index(
                "weather_hour_utc"
            )
            .reindex(
                future_hours
            )
        )

        future_weather_df.index.name = (
            "weather_hour_utc"
        )

        future_weather_df = (
            future_weather_df
            .reset_index()
        )

        if future_weather_df[
            "weather_condition"
        ].isna().any():
            missing_hours = future_weather_df.loc[
                future_weather_df[
                    "weather_condition"
                ].isna(),
                "weather_hour_utc",
            ]

            raise ValueError(
                "Harici hava tahmini gelecek 24 saatin "
                "tamamını kapsamıyor.\n"
                f"Eksik saatler:\n"
                f"{missing_hours.to_string(index=False)}"
            )

        future_weather_df[
            "weather_data_source"
        ] = "FORECAST_EXTERNAL"

        future_weather_df[
            "weather_is_synthetic"
        ] = 0

        return (
            future_weather_df,
            "FORECAST_EXTERNAL",
        )

    if not ALLOW_SEASONAL_WEATHER_SCENARIO:
        raise FileNotFoundError(
            "Gelecek hava tahmini dosyası bulunamadı:\n"
            f"{FUTURE_WEATHER_FORECAST_FILE}"
        )

    history_lookup = (
        weather_history_df
        .set_index(
            "weather_hour_utc"
        )
    )

    scenario_rows = []

    for future_hour in future_hours:
        source_hour = (
            future_hour
            - pd.Timedelta(days=7)
        )

        if source_hour not in history_lookup.index:
            raise ValueError(
                "Haftalık hava senaryosu için yedi gün "
                f"önceki saat bulunamadı: {source_hour}"
            )

        source_row = (
            history_lookup.loc[
                source_hour
            ]
        )

        if isinstance(
            source_row,
            pd.DataFrame,
        ):
            source_row = source_row.iloc[0]

        scenario_row = {
            column: source_row[column]
            for column in WEATHER_MODEL_COLUMNS
            if column != "weather_hour_utc"
        }

        scenario_row[
            "weather_hour_utc"
        ] = future_hour

        scenario_row[
            "weather_data_source"
        ] = (
            "SEASONAL_WEEK_AGO_SCENARIO"
        )

        scenario_row[
            "weather_is_synthetic"
        ] = 1

        scenario_rows.append(
            scenario_row
        )

    future_weather_df = pd.DataFrame(
        scenario_rows
    )

    future_weather_df[
        "weather_hour_utc"
    ] = pd.to_datetime(
        future_weather_df[
            "weather_hour_utc"
        ],
        utc=True,
    )

    return (
        future_weather_df[
            WEATHER_MODEL_COLUMNS
        ],
        "SEASONAL_WEEK_AGO_SCENARIO",
    )


# =====================================================
# 21. GELECEK 24 SAAT RECURSIVE TAHMİN
# =====================================================

def create_recursive_forecast(
    pipeline: Pipeline,
    historical_hourly_df: pd.DataFrame,
    zones_df: pd.DataFrame,
    future_weather_df: pd.DataFrame,
    residual_quantiles: dict,
    zone_thresholds_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Gelecekte gerçek talep henüz bilinmediği için tahminleri
    saat saat recursive biçimde üretir.
    """

    historical_sorted = (
        historical_hourly_df
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
        in historical_sorted.groupby(
            "zone_id",
            sort=False,
        )
    }

    for zone_id, values in history_by_zone.items():
        if len(values) < max(
            max(LAG_HOURS),
            max(ROLLING_WINDOWS),
        ):
            raise ValueError(
                f"Zone {zone_id} için recursive tahmin "
                "geçmişi yeterli değil."
            )

    weather_lookup = (
        future_weather_df
        .set_index(
            "weather_hour_utc"
        )
        .sort_index()
    )

    forecast_parts = []

    future_hours = (
        future_weather_df[
            "weather_hour_utc"
        ]
        .sort_values()
        .tolist()
    )

    zone_rows = zones_df.to_dict(
        "records"
    )

    for horizon_number, future_hour in enumerate(
        future_hours,
        start=1,
    ):
        weather_row = weather_lookup.loc[
            future_hour
        ]

        if isinstance(
            weather_row,
            pd.DataFrame,
        ):
            weather_row = weather_row.iloc[0]

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

        is_weekend = int(
            day_of_week in [5, 6]
        )

        is_peak_hour = int(
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
        )

        is_holiday = int(
            str(local_date)
            in HOLIDAY_DATES
        )

        hour_rows = []

        for zone_row in zone_rows:
            zone_id = int(
                zone_row["zone_id"]
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
                    zone_row["zone_name"]
                ),
                "zone_category": (
                    zone_row[
                        "zone_category"
                    ]
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
                "is_weekend": (
                    is_weekend
                ),
                "is_peak_hour": (
                    is_peak_hour
                ),
                "is_holiday": (
                    is_holiday
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
                WEATHER_MODEL_COLUMNS
            ):
                if weather_column == (
                    "weather_hour_utc"
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

            for window_size in (
                ROLLING_WINDOWS
            ):
                row[
                    f"demand_rolling_mean_{window_size}h"
                ] = float(
                    np.mean(
                        history_values[
                            -window_size:
                        ]
                    )
                )

            hour_rows.append(row)

        hour_df = pd.DataFrame(
            hour_rows
        )

        hour_predictions = predict_demand(
            pipeline=pipeline,
            features_df=hour_df,
        )

        hour_df[
            "predicted_demand"
        ] = hour_predictions

        for zone_id, prediction in zip(
            hour_df["zone_id"],
            hour_predictions,
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
        + residual_quantiles[
            "q10"
        ],
        0,
        None,
    )

    forecast_df[
        "prediction_upper_80"
    ] = np.clip(
        forecast_df[
            "predicted_demand"
        ]
        + residual_quantiles[
            "q90"
        ],
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
        .clip(lower=0)
        .astype("int64")
    )

    forecast_df[
        "forecast_generated_at_utc"
    ] = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
    )

    forecast_df[
        "forecast_model_version"
    ] = MODEL_VERSION

    forecast_df[
        "prediction_method"
    ] = "RECURSIVE_RANDOM_FOREST"

    round_columns = [
        "predicted_demand",
        "prediction_lower_80",
        "prediction_upper_80",
    ]

    for column in round_columns:
        forecast_df[column] = (
            forecast_df[column]
            .round(3)
        )

    return forecast_df


# =====================================================
# 22. FEATURE IMPORTANCE
# =====================================================

def create_feature_importance(
    fitted_pipeline: Pipeline,
) -> pd.DataFrame:
    """
    One-hot sonrası Random Forest özellik önemlerini çıkarır.
    """

    preprocessor = (
        fitted_pipeline.named_steps[
            "preprocessor"
        ]
    )

    model = (
        fitted_pipeline.named_steps[
            "model"
        ]
    )

    feature_names = (
        preprocessor
        .get_feature_names_out()
    )

    importances = (
        model.feature_importances_
    )

    if len(feature_names) != len(
        importances
    ):
        raise ValueError(
            "Feature name ve feature importance sayıları uyuşmuyor."
        )

    importance_df = pd.DataFrame(
        {
            "feature": feature_names,
            "importance": importances,
        }
    )

    importance_df[
        "importance_percentage"
    ] = (
        importance_df[
            "importance"
        ]
        * 100
    )

    return (
        importance_df
        .sort_values(
            by="importance",
            ascending=False,
        )
        .reset_index(drop=True)
    )


# =====================================================
# 23. ÇIKTI DOĞRULAMALARI
# =====================================================

def validate_outputs(
    hourly_df: pd.DataFrame,
    backtest_df: pd.DataFrame,
    forecast_df: pd.DataFrame,
    zones_df: pd.DataFrame,
) -> None:
    """
    Talep tahmin çıktılarının temel bütünlüğünü doğrular.
    """

    expected_grid_rows = (
        hourly_df[
            "demand_hour_utc"
        ].nunique()
        * len(zones_df)
    )

    if len(hourly_df) != expected_grid_rows:
        raise ValueError(
            "Tarihsel zone-saat gridinde eksik satır bulundu."
        )

    duplicate_hourly = hourly_df[
        [
            "zone_id",
            "demand_hour_utc",
        ]
    ].duplicated().any()

    if duplicate_hourly:
        raise ValueError(
            "Tarihsel gridde tekrar eden zone-saat bulundu."
        )

    if not (
        hourly_df["demand_count"] >= 0
    ).all():
        raise ValueError(
            "Tarihsel gridde negatif talep bulundu."
        )

    expected_forecast_rows = (
        len(zones_df)
        * FORECAST_HORIZON_HOURS
    )

    if len(forecast_df) != expected_forecast_rows:
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

    if not forecast_df[
        "recommended_surge_multiplier"
    ].between(
        MIN_SURGE_MULTIPLIER,
        MAX_SURGE_MULTIPLIER,
    ).all():
        raise ValueError(
            "Surge multiplier belirlenen sınırların dışında."
        )

    if forecast_df[
        "auto_apply"
    ].any():
        raise ValueError(
            "Data Science surge önerileri otomatik uygulanmamalıdır."
        )

    if not (
        forecast_df[
            "pricing_rule_merge_strategy"
        ]
        == "MAX"
    ).all():
        raise ValueError(
            "Pricing rule birleştirme stratejisi MAX olmalıdır."
        )

    if backtest_df[
        "predicted_demand"
    ].isna().any():
        raise ValueError(
            "Backtest tahminlerinde eksik değer bulundu."
        )

    if (
        "avg_price"
        in MODEL_FEATURES
        or "avg_distance_km"
        in MODEL_FEATURES
        or "cancel_rate"
        in MODEL_FEATURES
        or "no_show_rate"
        in MODEL_FEATURES
    ):
        raise ValueError(
            "Gelecekte bilinmeyen leakage alanı model özelliklerinde bulundu."
        )


# =====================================================
# 24. DOSYALARI KAYDETME
# =====================================================

def save_outputs(
    hourly_df: pd.DataFrame,
    backtest_df: pd.DataFrame,
    forecast_df: pd.DataFrame,
    zone_thresholds_df: pd.DataFrame,
    zone_metrics_df: pd.DataFrame,
    feature_importance_df: pd.DataFrame,
    final_pipeline: Pipeline,
    metadata: dict,
) -> None:
    """
    Model, tahmin ve rapor çıktılarını kaydeder.
    """

    hourly_df.to_parquet(
        HOURLY_DEMAND_DATASET_FILE,
        index=False,
        engine="pyarrow",
        compression="snappy",
    )

    backtest_df.to_csv(
        BACKTEST_CSV_FILE,
        index=False,
        encoding="utf-8",
    )

    backtest_df.to_parquet(
        BACKTEST_PARQUET_FILE,
        index=False,
        engine="pyarrow",
        compression="snappy",
    )

    forecast_df.to_csv(
        FORECAST_CSV_FILE,
        index=False,
        encoding="utf-8",
    )

    forecast_df.to_parquet(
        FORECAST_PARQUET_FILE,
        index=False,
        engine="pyarrow",
        compression="snappy",
    )

    pricing_output_columns = [
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
        pricing_output_columns
    ].to_csv(
        PRICING_SERVICE_OUTPUT_FILE,
        index=False,
        encoding="utf-8",
    )

    zone_thresholds_df.to_csv(
        ZONE_THRESHOLDS_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    zone_metrics_df.to_csv(
        ZONE_BACKTEST_METRICS_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    feature_importance_df.to_csv(
        FEATURE_IMPORTANCE_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    model_bundle = {
        "pipeline": final_pipeline,
        "zone_demand_thresholds": (
            zone_thresholds_df
        ),
        "metadata": metadata,
    }

    joblib.dump(
        model_bundle,
        MODEL_BUNDLE_FILE,
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
# 25. RAPORLAMA
# =====================================================

def create_reports(
    hourly_df: pd.DataFrame,
    model_df: pd.DataFrame,
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    forecast_df: pd.DataFrame,
    model_metrics: dict,
    baseline_metrics: dict,
    residual_quantiles: dict,
    total_reservation_count: int,
    test_start_hour: pd.Timestamp,
    future_weather_source: str,
) -> None:
    """
    Veri seti, model karşılaştırması ve gelecek tahmin raporları oluşturur.
    """

    comparison_df = pd.DataFrame(
        [
            {
                "model": (
                    "RANDOM_FOREST_WEATHER"
                ),
                **model_metrics,
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
        MODEL_METRICS_CSV_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    random_forest_better_than_baseline = (
        model_metrics["mae"]
        < baseline_metrics["mae"]
    )

    metrics_summary = {
        "model_version": MODEL_VERSION,
        "target": TARGET_COLUMN,
        "target_definition": (
            "Number of reservation requests scheduled "
            "for each active pricing zone and hour."
        ),
        "random_forest_metrics": (
            model_metrics
        ),
        "seasonal_naive_168h_metrics": (
            baseline_metrics
        ),
        "random_forest_better_than_baseline_by_mae": (
            random_forest_better_than_baseline
        ),
        "residual_quantiles": (
            residual_quantiles
        ),
        "test_start_hour_utc": str(
            test_start_hour
        ),
        "test_hour_count": int(
            test_df[
                "demand_hour_utc"
            ].nunique()
        ),
        "test_row_count": int(
            len(test_df)
        ),
        "random_split_used": False,
        "temporal_split_used": True,
        "target_log_transformation": (
            "log1p"
        ),
        "negative_predictions_clipped": True,
        "leakage_features_excluded": [
            "avg_distance_km",
            "avg_price",
            "cancel_rate",
            "no_show_rate",
            "completed_count",
            "cancelled_count",
            "no_show_count",
        ],
    }

    with open(
        MODEL_METRICS_FILE,
        "w",
        encoding="utf-8",
    ) as json_file:
        json.dump(
            json_safe(metrics_summary),
            json_file,
            ensure_ascii=False,
            indent=4,
        )

    zero_demand_row_count = int(
        (
            hourly_df[
                "demand_count"
            ]
            == 0
        ).sum()
    )

    synthetic_weather_used = bool(
        hourly_df[
            "weather_is_synthetic"
        ]
        .astype(bool)
        .any()
    )

    dataset_summary = {
        "reservations_weather_input": str(
            RESERVATIONS_WEATHER_FILE
        ),
        "weather_history_input": str(
            WEATHER_HISTORY_FILE
        ),
        "zone_catalog_input": str(
            ZONE_CATALOG_FILE
        ),
        "hourly_dataset_output": str(
            HOURLY_DEMAND_DATASET_FILE
        ),
        "source_reservation_count": int(
            total_reservation_count
        ),
        "active_zone_count": int(
            hourly_df["zone_id"].nunique()
        ),
        "historical_hour_count": int(
            hourly_df[
                "demand_hour_utc"
            ].nunique()
        ),
        "complete_zone_hour_row_count": int(
            len(hourly_df)
        ),
        "zero_demand_zone_hour_count": (
            zero_demand_row_count
        ),
        "zero_demand_zone_hours_included": True,
        "model_ready_row_count": int(
            len(model_df)
        ),
        "training_row_count": int(
            len(train_df)
        ),
        "test_row_count": int(
            len(test_df)
        ),
        "minimum_historical_lag_hours": int(
            max(LAG_HOURS)
        ),
        "target_includes_cancelled_and_no_show_requests": True,
        "reason": (
            "Cancelled and no-show reservations still represent "
            "a customer demand request made to the system."
        ),
        "synthetic_historical_weather_used": (
            synthetic_weather_used
        ),
        "weather_effect_interpretation_warning": (
            "Sentetik hava kullanıldıysa model performansı "
            "gerçek hava-talep ilişkisini kanıtlamaz."
        ),
    }

    with open(
        DATASET_SUMMARY_FILE,
        "w",
        encoding="utf-8",
    ) as json_file:
        json.dump(
            json_safe(dataset_summary),
            json_file,
            ensure_ascii=False,
            indent=4,
        )

    forecast_summary = {
        "forecast_model_version": (
            MODEL_VERSION
        ),
        "forecast_generated_at_utc": (
            forecast_df[
                "forecast_generated_at_utc"
            ].iloc[0]
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
        "forecast_horizon_hours": (
            FORECAST_HORIZON_HOURS
        ),
        "forecast_zone_count": int(
            forecast_df[
                "zone_id"
            ].nunique()
        ),
        "forecast_row_count": int(
            len(forecast_df)
        ),
        "future_weather_source": (
            future_weather_source
        ),
        "future_weather_is_synthetic": bool(
            forecast_df[
                "weather_is_synthetic"
            ].astype(bool).any()
        ),
        "total_predicted_demand": round(
            float(
                forecast_df[
                    "predicted_demand"
                ].sum()
            ),
            3,
        ),
        "average_recommended_surge": round(
            float(
                forecast_df[
                    "recommended_surge_multiplier"
                ].mean()
            ),
            4,
        ),
        "maximum_recommended_surge": round(
            float(
                forecast_df[
                    "recommended_surge_multiplier"
                ].max()
            ),
            2,
        ),
        "demand_level_distribution": (
            forecast_df[
                "predicted_demand_level"
            ]
            .value_counts()
            .to_dict()
        ),
        "surge_is_automatically_applied": False,
        "pricing_service_validation_required": True,
        "pricing_rule_merge_strategy": (
            "MAX"
        ),
        "pricing_service_explanation": (
            "Pricing Service should compare the Data Science "
            "recommendation with active configured pricing rules "
            "and use the highest valid multiplier."
        ),
        "production_limitation": (
            "The current historical dataset covers approximately "
            "one month. This model is suitable for internship "
            "simulation and integration testing, not full seasonal "
            "production forecasting."
        ),
    }

    with open(
        FORECAST_SUMMARY_FILE,
        "w",
        encoding="utf-8",
    ) as json_file:
        json.dump(
            json_safe(forecast_summary),
            json_file,
            ensure_ascii=False,
            indent=4,
        )


# =====================================================
# 26. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 75)
    print("14 — HAVA DURUMLU RANDOM FOREST TALEP TAHMİNİ")
    print("=" * 75)

    print("\nZone kataloğu okunuyor...")

    zones_df = read_zone_catalog()

    print("Tarihsel hava durumu okunuyor...")

    weather_history_df = (
        read_weather_history()
    )

    print(
        "Rezervasyon talepleri parça parça toplanıyor..."
    )

    (
        aggregated_demand_df,
        total_reservation_count,
    ) = aggregate_reservation_demand()

    print(
        "\nAktif zone × saat tam grid oluşturuluyor..."
    )

    hourly_df = create_complete_hourly_grid(
        aggregated_demand_df=(
            aggregated_demand_df
        ),
        zones_df=zones_df,
        weather_df=weather_history_df,
    )

    hourly_df = add_time_features(
        hourly_df
    )

    print(
        "Geçmiş talep lag ve rolling özellikleri oluşturuluyor..."
    )

    hourly_df = (
        add_historical_demand_features(
            hourly_df
        )
    )

    model_df = prepare_model_dataset(
        hourly_df
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

    zone_thresholds_df = (
        create_zone_thresholds(
            train_df
        )
    )

    (
        backtest_pipeline,
        backtest_df,
        model_metrics,
        evaluation_details,
    ) = train_and_evaluate_backtest(
        train_df=train_df,
        test_df=test_df,
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

    print("\nModel performansı:")

    print(
        "Random Forest MAE : "
        f"{model_metrics['mae']:.4f}"
    )

    print(
        "Random Forest RMSE: "
        f"{model_metrics['rmse']:.4f}"
    )

    print(
        "Random Forest R²  : "
        f"{model_metrics['r2']:.4f}"
    )

    print(
        "Seasonal Naive MAE: "
        f"{evaluation_details['baseline_metrics']['mae']:.4f}"
    )

    zone_metrics_df = (
        create_zone_backtest_metrics(
            backtest_df
        )
    )

    # -------------------------------------------------
    # Bütün tarihsel veriyle final modeli yeniden eğit
    # -------------------------------------------------

    print(
        "\nFinal model bütün tarihsel model verisiyle eğitiliyor..."
    )

    final_pipeline = (
        create_random_forest_pipeline()
    )

    final_pipeline.fit(
        model_df[
            MODEL_FEATURES
        ],
        np.log1p(
            model_df[
                TARGET_COLUMN
            ].to_numpy(
                dtype=float
            )
        ),
    )

    feature_importance_df = (
        create_feature_importance(
            final_pipeline
        )
    )

    # -------------------------------------------------
    # Gelecek hava tahmini ve recursive demand forecast
    # -------------------------------------------------

    print(
        "\nGelecek hava tahmini hazırlanıyor..."
    )

    (
        future_weather_df,
        future_weather_source,
    ) = create_future_weather(
        weather_history_df=(
            weather_history_df
        ),
        last_historical_hour=(
            hourly_df[
                "demand_hour_utc"
            ].max()
        ),
    )

    print(
        f"Gelecek hava kaynağı: "
        f"{future_weather_source}"
    )

    print(
        "Gelecek 24 saatlik recursive talep tahmini üretiliyor..."
    )

    forecast_df = create_recursive_forecast(
        pipeline=final_pipeline,
        historical_hourly_df=hourly_df,
        zones_df=zones_df,
        future_weather_df=(
            future_weather_df
        ),
        residual_quantiles=(
            evaluation_details[
                "residual_quantiles"
            ]
        ),
        zone_thresholds_df=(
            zone_thresholds_df
        ),
    )

    validate_outputs(
        hourly_df=hourly_df,
        backtest_df=backtest_df,
        forecast_df=forecast_df,
        zones_df=zones_df,
    )

    metadata = {
        "model_version": MODEL_VERSION,
        "model_type": (
            "RandomForestRegressor"
        ),
        "created_at_utc": (
            datetime.now(timezone.utc)
            .replace(microsecond=0)
            .isoformat()
        ),
        "target": TARGET_COLUMN,
        "target_transformation": (
            "log1p"
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
        "lag_hours": LAG_HOURS,
        "rolling_windows": (
            ROLLING_WINDOWS
        ),
        "simulation_timezone": (
            SIMULATION_TIMEZONE
        ),
        "holiday_dates": sorted(
            HOLIDAY_DATES
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
        "random_forest_parameters": {
            "n_estimators": (
                RF_N_ESTIMATORS
            ),
            "max_depth": (
                RF_MAX_DEPTH
            ),
            "min_samples_leaf": (
                RF_MIN_SAMPLES_LEAF
            ),
            "max_features": (
                RF_MAX_FEATURES
            ),
            "random_state": (
                RANDOM_SEED
            ),
        },
        "backtest_metrics": (
            model_metrics
        ),
        "seasonal_naive_metrics": (
            evaluation_details[
                "baseline_metrics"
            ]
        ),
        "residual_quantiles": (
            evaluation_details[
                "residual_quantiles"
            ]
        ),
        "future_forecast_horizon_hours": (
            FORECAST_HORIZON_HOURS
        ),
        "future_weather_source": (
            future_weather_source
        ),
        "leakage_features_excluded": [
            "avg_distance_km",
            "avg_price",
            "cancel_rate",
            "no_show_rate",
            "status outcome counts",
        ],
        "forecast_is_recursive": True,
        "surge_auto_apply": False,
        "pricing_rule_merge_strategy": (
            "MAX"
        ),
    }

    save_outputs(
        hourly_df=hourly_df,
        backtest_df=backtest_df,
        forecast_df=forecast_df,
        zone_thresholds_df=(
            zone_thresholds_df
        ),
        zone_metrics_df=(
            zone_metrics_df
        ),
        feature_importance_df=(
            feature_importance_df
        ),
        final_pipeline=(
            final_pipeline
        ),
        metadata=metadata,
    )

    create_reports(
        hourly_df=hourly_df,
        model_df=model_df,
        train_df=train_df,
        test_df=test_df,
        forecast_df=forecast_df,
        model_metrics=model_metrics,
        baseline_metrics=(
            evaluation_details[
                "baseline_metrics"
            ]
        ),
        residual_quantiles=(
            evaluation_details[
                "residual_quantiles"
            ]
        ),
        total_reservation_count=(
            total_reservation_count
        ),
        test_start_hour=(
            test_start_hour
        ),
        future_weather_source=(
            future_weather_source
        ),
    )

    print("\n" + "=" * 75)
    print("RANDOM FOREST TALEP TAHMİNİ TAMAMLANDI")
    print("=" * 75)

    print(
        f"Kaynak rezervasyon : "
        f"{total_reservation_count:,}"
    )

    print(
        f"Zone-saat grid     : "
        f"{len(hourly_df):,}"
    )

    print(
        f"Model eğitim satırı: "
        f"{len(model_df):,}"
    )

    print(
        f"Backtest satırı    : "
        f"{len(backtest_df):,}"
    )

    print(
        f"Gelecek tahmin     : "
        f"{len(forecast_df):,}"
    )

    print(
        "\nTahmin edilen talep seviyesi:"
    )

    print(
        forecast_df[
            "predicted_demand_level"
        ].value_counts().to_string()
    )

    print(
        "\nSurge multiplier dağılımı:"
    )

    print(
        forecast_df[
            "recommended_surge_multiplier"
        ].value_counts().sort_index().to_string()
    )

    print(
        f"\nSaatlik model verisi : "
        f"{HOURLY_DEMAND_DATASET_FILE}"
    )

    print(
        f"Backtest çıktısı     : "
        f"{BACKTEST_CSV_FILE}"
    )

    print(
        f"Gelecek tahmin       : "
        f"{FORECAST_CSV_FILE}"
    )

    print(
        f"Pricing Service      : "
        f"{PRICING_SERVICE_OUTPUT_FILE}"
    )

    print(
        f"Model bundle         : "
        f"{MODEL_BUNDLE_FILE}"
    )

    print(
        f"Raporlar             : "
        f"{REPORT_DIR}"
    )

    print("\nKontroller:")
    print(
        "reservations_istanbul_weather.csv kullanımı kaldırıldı."
    )
    print(
        "Zone × saat tam grid oluşturuldu."
    )
    print(
        "Sıfır talepli saatler modele dahil edildi."
    )
    print(
        "Random train_test_split kaldırıldı."
    )
    print(
        "Son 7 gün zaman bazlı test olarak ayrıldı."
    )
    print(
        "avg_price ve avg_distance_km leakage özellikleri kaldırıldı."
    )
    print(
        "cancel_rate ve no_show_rate modelden kaldırıldı."
    )
    print(
        "Zone ID kategorik olarak işlendi."
    )
    print(
        "Random Forest, 168 saatlik seasonal naive modelle karşılaştırıldı."
    )
    print(
        "Gelecek 24 saat recursive olarak tahmin edildi."
    )
    print(
        "Talep eşikleri yalnızca eğitim döneminden hesaplandı."
    )
    print(
        "Surge önerisi tahmini talepten oluşturuldu."
    )
    print(
        "Surge önerileri otomatik uygulanmıyor."
    )
    print(
        "Pricing Service merge stratejisi MAX olarak belirlendi."
    )
    print(
        "Model, preprocessing ve metadata kaydedildi."
    )

    if (
        forecast_df[
            "weather_is_synthetic"
        ]
        .astype(bool)
        .any()
    ):
        print(
            "\n Gelecek hava tahmini yerine "
            "SEASONAL_WEEK_AGO_SCENARIO kullanıldı."
        )

        print(
            "Gerçek tahmin kullanılacaksa aşağıdaki dosya "
            "gelecek 24 saati kapsayacak şekilde hazırlanmalıdır:"
        )

        print(
            FUTURE_WEATHER_FORECAST_FILE
        )


if __name__ == "__main__":
    main()