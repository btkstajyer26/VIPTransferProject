import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

try:
    import pyarrow as pa
    import pyarrow.parquet as pq
except ImportError as error:
    raise ImportError(
        "Parquet dosyalarını parça parça işlemek için pyarrow gereklidir.\n"
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

RANDOM_SEED = 42

SIMULATION_TIMEZONE = "Europe/Istanbul"

BATCH_SIZE = 200_000

WEATHER_FEATURE_VERSION = "weather-features-v2"

# Gerçek hava durumu dosyası yoksa sentetik senaryo üret.
ALLOW_SYNTHETIC_FALLBACK = True

ALLOWED_WEATHER_CONDITIONS = {
    "SUNNY",
    "CLOUDY",
    "RAINY",
    "FOGGY",
    "SNOWY",
}

# Kötü hava sınıflandırma sınırları
BAD_WEATHER_PRECIPITATION_MM = 1.00
BAD_WEATHER_WIND_SPEED_KMH = 40.00
FOG_VISIBILITY_THRESHOLD_M = 1_000.00

# Veri kalite sınırları
MIN_TEMPERATURE_C = -30.0
MAX_TEMPERATURE_C = 50.0

MAX_PRECIPITATION_MM = 200.0
MAX_SNOWFALL_MM = 100.0
MAX_WIND_SPEED_KMH = 200.0
MAX_VISIBILITY_M = 100_000.0


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

REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "13_add_weather_features"
)

RAW_WEATHER_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

REFERENCE_DATA_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

PROCESSED_DATA_DIR.mkdir(
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

RESERVATIONS_ANALYTICS_FILE = (
    PROCESSED_DATA_DIR
    / "reservations_analytics.parquet"
)

# Gerçek hava durumu kullanmak için CSV bu konuma konulabilir.
OBSERVED_WEATHER_INPUT_FILE = (
    RAW_WEATHER_DIR
    / "istanbul_hourly_weather.csv"
)

WEATHER_REFERENCE_CSV_FILE = (
    REFERENCE_DATA_DIR
    / "weather_hourly_istanbul_2025.csv"
)

WEATHER_REFERENCE_PARQUET_FILE = (
    REFERENCE_DATA_DIR
    / "weather_hourly_istanbul_2025.parquet"
)

RESERVATIONS_WEATHER_OUTPUT_FILE = (
    PROCESSED_DATA_DIR
    / "reservations_weather_features.parquet"
)

WEATHER_DISTRIBUTION_FILE = (
    REPORT_DIR
    / "weather_condition_distribution.csv"
)

DAILY_WEATHER_SUMMARY_FILE = (
    REPORT_DIR
    / "daily_weather_summary.csv"
)

WEATHER_QUALITY_METRICS_FILE = (
    REPORT_DIR
    / "weather_quality_metrics.csv"
)

WEATHER_FEATURE_SUMMARY_FILE = (
    REPORT_DIR
    / "weather_feature_summary.json"
)


# =====================================================
# 4. HAVA DURUMU ÇIKTI SÜTUNLARI
# =====================================================

WEATHER_FEATURE_COLUMNS = [
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
    "weather_feature_version",
]


# =====================================================
# 5. YARDIMCI FONKSİYONLAR
# =====================================================

def require_file(file_path: Path) -> None:
    """
    Gerekli dosyanın varlığını kontrol eder.
    """

    if not file_path.exists():
        raise FileNotFoundError(
            f"Gerekli dosya bulunamadı:\n{file_path}"
        )


def find_first_existing_column(
    dataframe: pd.DataFrame,
    candidate_columns: list[str],
) -> str | None:
    """
    Aday sütun isimleri arasından ilk bulunanı döndürür.
    """

    column_lookup = {
        str(column).strip().lower(): column
        for column in dataframe.columns
    }

    for candidate in candidate_columns:
        candidate_lower = candidate.lower()

        if candidate_lower in column_lookup:
            return column_lookup[candidate_lower]

    return None


def normalize_condition_text(
    series: pd.Series,
) -> pd.Series:
    """
    Harici hava durumu açıklamalarını ortak sınıflara dönüştürür.
    """

    normalized = (
        series.astype("string")
        .fillna("")
        .str.strip()
        .str.upper()
    )

    result = pd.Series(
        pd.NA,
        index=series.index,
        dtype="string",
    )

    result.loc[
        normalized.str.contains(
            "SNOW|KAR",
            regex=True,
        )
    ] = "SNOWY"

    result.loc[
        normalized.str.contains(
            "FOG|MIST|SİS|SIS",
            regex=True,
        )
    ] = "FOGGY"

    result.loc[
        normalized.str.contains(
            "RAIN|DRIZZLE|SHOWER|YAĞMUR|YAGMUR",
            regex=True,
        )
    ] = "RAINY"

    result.loc[
        normalized.str.contains(
            "SUN|CLEAR|GÜNEŞ|GUNES|AÇIK|ACIK",
            regex=True,
        )
    ] = "SUNNY"

    result.loc[
        normalized.str.contains(
            "CLOUD|OVERCAST|BULUT",
            regex=True,
        )
    ] = "CLOUDY"

    return result


def convert_weather_timestamp_to_local(
    series: pd.Series,
) -> pd.Series:
    """
    Hava durumu saatini Europe/Istanbul zamanına dönüştürür.

    Saat timezone içermiyorsa İstanbul yerel saati kabul edilir.
    """

    parsed = pd.to_datetime(
        series,
        errors="coerce",
    )

    if parsed.isna().any():
        invalid_count = int(
            parsed.isna().sum()
        )

        raise ValueError(
            "Hava durumu zaman sütununda geçersiz değer bulundu. "
            f"Hatalı satır sayısı: {invalid_count}"
        )

    if parsed.dt.tz is None:
        parsed = parsed.dt.tz_localize(
            SIMULATION_TIMEZONE,
            nonexistent="shift_forward",
            ambiguous="NaT",
        )

        if parsed.isna().any():
            raise ValueError(
                "Hava durumu zamanında timezone belirsizliği bulundu."
            )

    else:
        parsed = parsed.dt.tz_convert(
            SIMULATION_TIMEZONE
        )

    return parsed.dt.floor("h")


# =====================================================
# 6. REZERVASYON TARİH ARALIĞINI BULMA
# =====================================================

def get_reservation_time_range() -> tuple[
    pd.Timestamp,
    pd.Timestamp,
    int,
]:
    """
    reservations_analytics.parquet dosyasından yalnızca
    scheduled_time sütununu okuyarak tarih aralığını bulur.
    """

    require_file(
        RESERVATIONS_ANALYTICS_FILE
    )

    parquet_file = pq.ParquetFile(
        RESERVATIONS_ANALYTICS_FILE
    )

    available_columns = set(
        parquet_file.schema.names
    )

    if "scheduled_time" not in available_columns:
        raise ValueError(
            "reservations_analytics.parquet içinde "
            "scheduled_time sütunu bulunamadı."
        )

    minimum_time_utc = None
    maximum_time_utc = None
    total_row_count = 0

    batches = parquet_file.iter_batches(
        batch_size=BATCH_SIZE,
        columns=["scheduled_time"],
    )

    for batch_number, batch in enumerate(
        batches,
        start=1,
    ):
        scheduled_time = pd.to_datetime(
            batch.column(
                "scheduled_time"
            ).to_pandas(),
            errors="coerce",
            utc=True,
        )

        if scheduled_time.isna().any():
            raise ValueError(
                "reservations_analytics.parquet içinde "
                "geçersiz scheduled_time değeri bulundu."
            )

        batch_minimum = scheduled_time.min()
        batch_maximum = scheduled_time.max()

        if minimum_time_utc is None:
            minimum_time_utc = batch_minimum
            maximum_time_utc = batch_maximum

        else:
            minimum_time_utc = min(
                minimum_time_utc,
                batch_minimum,
            )

            maximum_time_utc = max(
                maximum_time_utc,
                batch_maximum,
            )

        total_row_count += len(
            scheduled_time
        )

        print(
            f"Tarih aralığı taraması {batch_number}: "
            f"{total_row_count:,} satır"
        )

    if total_row_count == 0:
        raise ValueError(
            "reservations_analytics.parquet boş."
        )

    minimum_time_local = (
        minimum_time_utc
        .tz_convert(
            SIMULATION_TIMEZONE
        )
        .floor("h")
    )

    maximum_time_local = (
        maximum_time_utc
        .tz_convert(
            SIMULATION_TIMEZONE
        )
        .floor("h")
    )

    return (
        minimum_time_local,
        maximum_time_local,
        total_row_count,
    )


# =====================================================
# 7. GERÇEK HAVA DURUMU DOSYASINI OKUMA
# =====================================================

def read_observed_weather(
    minimum_time_local: pd.Timestamp,
    maximum_time_local: pd.Timestamp,
) -> pd.DataFrame:
    """
    Kullanıcı tarafından sağlanan gerçek saatlik hava durumu
    CSV dosyasını okur.

    Desteklenen yaygın sütun isimleri:
    - time / datetime / weather_hour
    - temperature_2m / temperature_c
    - precipitation / precipitation_mm
    - wind_speed_10m / wind_speed_kmh
    """

    raw_df = pd.read_csv(
        OBSERVED_WEATHER_INPUT_FILE,
        low_memory=False,
    )

    time_column = find_first_existing_column(
        raw_df,
        [
            "weather_hour",
            "time",
            "datetime",
            "date_time",
            "timestamp",
        ],
    )

    temperature_column = find_first_existing_column(
        raw_df,
        [
            "temperature_c",
            "temperature_2m",
            "temp_c",
            "temperature",
        ],
    )

    precipitation_column = find_first_existing_column(
        raw_df,
        [
            "precipitation_mm",
            "precipitation",
            "rain_mm",
            "rain",
        ],
    )

    wind_column = find_first_existing_column(
        raw_df,
        [
            "wind_speed_kmh",
            "wind_speed_10m",
            "windspeed_kmh",
            "wind_speed",
        ],
    )

    required_mapping = {
        "weather_hour": time_column,
        "temperature_c": temperature_column,
        "precipitation_mm": precipitation_column,
        "wind_speed_kmh": wind_column,
    }

    missing_required = [
        target_name
        for target_name, source_name
        in required_mapping.items()
        if source_name is None
    ]

    if missing_required:
        raise ValueError(
            "Gerçek hava durumu dosyasında gerekli sütunlar eksik:\n"
            f"{missing_required}\n\n"
            "Gerekli temel bilgiler: saat, sıcaklık, "
            "yağış ve rüzgâr hızı."
        )

    weather_df = pd.DataFrame(
        {
            target_name: raw_df[
                source_name
            ]
            for target_name, source_name
            in required_mapping.items()
        }
    )

    optional_columns = {
        "snowfall_mm": [
            "snowfall_mm",
            "snowfall",
            "snow_depth_mm",
        ],
        "relative_humidity_pct": [
            "relative_humidity_pct",
            "relative_humidity_2m",
            "humidity",
        ],
        "cloud_cover_pct": [
            "cloud_cover_pct",
            "cloud_cover",
            "cloudiness",
        ],
        "visibility_m": [
            "visibility_m",
            "visibility",
        ],
        "weather_condition_original": [
            "weather_condition",
            "condition",
            "weather",
        ],
    }

    for target_column, candidates in optional_columns.items():
        source_column = find_first_existing_column(
            raw_df,
            candidates,
        )

        if source_column is not None:
            weather_df[target_column] = (
                raw_df[source_column]
            )

    weather_df[
        "weather_hour_local"
    ] = convert_weather_timestamp_to_local(
        weather_df["weather_hour"]
    )

    weather_df[
        "weather_hour_utc"
    ] = (
        weather_df[
            "weather_hour_local"
        ]
        .dt.tz_convert("UTC")
    )

    numeric_defaults = {
        "snowfall_mm": 0.0,
        "relative_humidity_pct": 75.0,
        "cloud_cover_pct": 70.0,
        "visibility_m": 10_000.0,
    }

    numeric_columns = [
        "temperature_c",
        "precipitation_mm",
        "wind_speed_kmh",
        "snowfall_mm",
        "relative_humidity_pct",
        "cloud_cover_pct",
        "visibility_m",
    ]

    for column in numeric_columns:
        if column not in weather_df.columns:
            weather_df[column] = (
                numeric_defaults[column]
            )

        weather_df[column] = pd.to_numeric(
            weather_df[column],
            errors="coerce",
        )

    if "weather_condition_original" in weather_df.columns:
        weather_df[
            "weather_condition_original"
        ] = normalize_condition_text(
            weather_df[
                "weather_condition_original"
            ]
        )

    else:
        weather_df[
            "weather_condition_original"
        ] = pd.NA

    # Aynı saate ait birden fazla gözlem varsa ortalama alınır.
    weather_df = (
        weather_df
        .groupby(
            "weather_hour_utc",
            as_index=False,
        )
        .agg(
            temperature_c=(
                "temperature_c",
                "mean",
            ),
            precipitation_mm=(
                "precipitation_mm",
                "mean",
            ),
            snowfall_mm=(
                "snowfall_mm",
                "mean",
            ),
            wind_speed_kmh=(
                "wind_speed_kmh",
                "mean",
            ),
            relative_humidity_pct=(
                "relative_humidity_pct",
                "mean",
            ),
            cloud_cover_pct=(
                "cloud_cover_pct",
                "mean",
            ),
            visibility_m=(
                "visibility_m",
                "mean",
            ),
            weather_condition_original=(
                "weather_condition_original",
                lambda values: (
                    values.dropna().mode().iloc[0]
                    if not values.dropna().mode().empty
                    else pd.NA
                ),
            ),
        )
    )

    expected_hours_utc = pd.date_range(
        start=minimum_time_local.tz_convert(
            "UTC"
        ),
        end=maximum_time_local.tz_convert(
            "UTC"
        ),
        freq="h",
    )

    weather_df = (
        weather_df
        .set_index("weather_hour_utc")
        .reindex(expected_hours_utc)
    )

    weather_df.index.name = (
        "weather_hour_utc"
    )

    weather_df = (
        weather_df
        .reset_index()
    )

    required_numeric_columns = [
        "temperature_c",
        "precipitation_mm",
        "wind_speed_kmh",
    ]

    if weather_df[
        required_numeric_columns
    ].isna().any().any():
        missing_hours = weather_df.loc[
            weather_df[
                required_numeric_columns
            ].isna().any(axis=1),
            "weather_hour_utc",
        ]

        raise ValueError(
            "Gerçek hava durumu dosyası rezervasyonların "
            "tüm saatlerini kapsamıyor.\n"
            f"Eksik saat sayısı: {len(missing_hours)}\n"
            f"İlk eksik saatler:\n{missing_hours.head(10).to_string(index=False)}"
        )

    for column, default_value in numeric_defaults.items():
        weather_df[column] = (
            weather_df[column]
            .fillna(default_value)
        )

    weather_df[
        "weather_hour_local"
    ] = (
        weather_df[
            "weather_hour_utc"
        ]
        .dt.tz_convert(
            SIMULATION_TIMEZONE
        )
    )

    weather_df[
        "weather_data_source"
    ] = "OBSERVED_EXTERNAL"

    weather_df[
        "weather_is_synthetic"
    ] = 0

    return weather_df


# =====================================================
# 8. SENTETİK HAVA SENARYOSU OLUŞTURMA
# =====================================================

def generate_synthetic_weather(
    minimum_time_local: pd.Timestamp,
    maximum_time_local: pd.Timestamp,
) -> pd.DataFrame:
    """
    Gerçek hava durumu dosyası yoksa deterministik ve saatler
    arasında daha tutarlı bir sentetik senaryo oluşturur.

    Bu veri gerçek tarihsel hava gözlemi değildir.
    """

    rng = np.random.default_rng(
        RANDOM_SEED
    )

    daily_states = [
        "SUNNY",
        "CLOUDY",
        "RAINY",
        "FOGGY",
        "SNOWY",
    ]

    state_to_index = {
        state: index
        for index, state in enumerate(
            daily_states
        )
    }

    initial_probabilities = np.array(
        [
            0.18,
            0.42,
            0.25,
            0.10,
            0.05,
        ]
    )

    # Günlük hava koşullarının bir günden diğerine
    # aniden ve tamamen bağımsız değişmesini önler.
    transition_matrix = np.array(
        [
            [0.45, 0.35, 0.10, 0.08, 0.02],
            [0.20, 0.45, 0.22, 0.08, 0.05],
            [0.10, 0.45, 0.35, 0.06, 0.04],
            [0.15, 0.45, 0.15, 0.20, 0.05],
            [0.05, 0.45, 0.15, 0.10, 0.25],
        ]
    )

    daily_base_temperature = {
        "SUNNY": 9.0,
        "CLOUDY": 7.5,
        "RAINY": 7.0,
        "FOGGY": 5.5,
        "SNOWY": 0.5,
    }

    day_range = pd.date_range(
        start=minimum_time_local.normalize(),
        end=maximum_time_local.normalize(),
        freq="D",
    )

    previous_state = str(
        rng.choice(
            daily_states,
            p=initial_probabilities,
        )
    )

    weather_rows = []

    for day_number, day_start in enumerate(
        day_range
    ):
        if day_number == 0:
            daily_state = previous_state

        else:
            previous_index = (
                state_to_index[
                    previous_state
                ]
            )

            daily_state = str(
                rng.choice(
                    daily_states,
                    p=transition_matrix[
                        previous_index
                    ],
                )
            )

            previous_state = daily_state

        base_temperature = (
            daily_base_temperature[
                daily_state
            ]
            + rng.normal(
                0,
                1.2,
            )
        )

        if daily_state == "RAINY":
            episode_start = int(
                rng.integers(
                    0,
                    18,
                )
            )

            episode_duration = int(
                rng.integers(
                    4,
                    10,
                )
            )

        elif daily_state == "SNOWY":
            episode_start = int(
                rng.integers(
                    0,
                    20,
                )
            )

            episode_duration = int(
                rng.integers(
                    2,
                    7,
                )
            )

        else:
            episode_start = -1
            episode_duration = 0

        for hour in range(24):
            weather_hour_local = (
                day_start
                + pd.Timedelta(
                    hours=hour
                )
            )

            if (
                weather_hour_local
                < minimum_time_local
                or weather_hour_local
                > maximum_time_local
            ):
                continue

            # Sıcaklık öğleden sonra daha yüksek,
            # gece ve sabah daha düşüktür.
            diurnal_temperature_effect = (
                2.3
                * np.cos(
                    2
                    * np.pi
                    * (
                        hour - 14
                    )
                    / 24
                )
            )

            temperature = (
                base_temperature
                + diurnal_temperature_effect
                + rng.normal(
                    0,
                    0.45,
                )
            )

            precipitation = 0.0
            snowfall = 0.0

            if daily_state == "SUNNY":
                hourly_condition = "SUNNY"
                cloud_cover = rng.uniform(
                    5,
                    30,
                )
                humidity = rng.uniform(
                    50,
                    72,
                )
                visibility = rng.uniform(
                    15_000,
                    30_000,
                )
                wind_speed = rng.uniform(
                    5,
                    18,
                )

            elif daily_state == "CLOUDY":
                hourly_condition = "CLOUDY"
                cloud_cover = rng.uniform(
                    60,
                    100,
                )
                humidity = rng.uniform(
                    65,
                    88,
                )
                visibility = rng.uniform(
                    8_000,
                    20_000,
                )
                wind_speed = rng.uniform(
                    7,
                    25,
                )

            elif daily_state == "RAINY":
                within_episode = (
                    episode_start
                    <= hour
                    < (
                        episode_start
                        + episode_duration
                    )
                )

                if within_episode:
                    hourly_condition = "RAINY"

                    precipitation = float(
                        rng.gamma(
                            shape=1.8,
                            scale=1.1,
                        )
                    )

                    precipitation = min(
                        precipitation,
                        12.0,
                    )

                    cloud_cover = rng.uniform(
                        85,
                        100,
                    )
                    humidity = rng.uniform(
                        82,
                        100,
                    )
                    visibility = rng.uniform(
                        2_500,
                        10_000,
                    )
                    wind_speed = rng.uniform(
                        12,
                        38,
                    )

                else:
                    hourly_condition = "CLOUDY"
                    cloud_cover = rng.uniform(
                        70,
                        100,
                    )
                    humidity = rng.uniform(
                        72,
                        92,
                    )
                    visibility = rng.uniform(
                        7_000,
                        16_000,
                    )
                    wind_speed = rng.uniform(
                        9,
                        28,
                    )

            elif daily_state == "FOGGY":
                fog_hour = (
                    3
                    <= hour
                    <= 9
                )

                if fog_hour:
                    hourly_condition = "FOGGY"
                    cloud_cover = rng.uniform(
                        65,
                        100,
                    )
                    humidity = rng.uniform(
                        92,
                        100,
                    )
                    visibility = rng.uniform(
                        150,
                        950,
                    )
                    wind_speed = rng.uniform(
                        1,
                        10,
                    )

                else:
                    hourly_condition = "CLOUDY"
                    cloud_cover = rng.uniform(
                        55,
                        90,
                    )
                    humidity = rng.uniform(
                        72,
                        94,
                    )
                    visibility = rng.uniform(
                        5_000,
                        14_000,
                    )
                    wind_speed = rng.uniform(
                        3,
                        16,
                    )

            else:
                within_episode = (
                    episode_start
                    <= hour
                    < (
                        episode_start
                        + episode_duration
                    )
                )

                if within_episode:
                    hourly_condition = "SNOWY"

                    snowfall = float(
                        rng.uniform(
                            0.10,
                            1.50,
                        )
                    )

                    precipitation = float(
                        rng.uniform(
                            0.10,
                            1.20,
                        )
                    )

                    temperature = min(
                        temperature,
                        1.0,
                    )

                    cloud_cover = rng.uniform(
                        85,
                        100,
                    )
                    humidity = rng.uniform(
                        80,
                        100,
                    )
                    visibility = rng.uniform(
                        700,
                        6_000,
                    )
                    wind_speed = rng.uniform(
                        8,
                        30,
                    )

                else:
                    hourly_condition = "CLOUDY"
                    cloud_cover = rng.uniform(
                        70,
                        100,
                    )
                    humidity = rng.uniform(
                        70,
                        95,
                    )
                    visibility = rng.uniform(
                        5_000,
                        14_000,
                    )
                    wind_speed = rng.uniform(
                        6,
                        24,
                    )

            weather_rows.append(
                {
                    "weather_hour_local": (
                        weather_hour_local
                    ),
                    "weather_hour_utc": (
                        weather_hour_local
                        .tz_convert("UTC")
                    ),
                    "weather_condition_original": (
                        hourly_condition
                    ),
                    "temperature_c": round(
                        float(temperature),
                        2,
                    ),
                    "precipitation_mm": round(
                        float(precipitation),
                        3,
                    ),
                    "snowfall_mm": round(
                        float(snowfall),
                        3,
                    ),
                    "wind_speed_kmh": round(
                        float(wind_speed),
                        2,
                    ),
                    "relative_humidity_pct": round(
                        float(humidity),
                        2,
                    ),
                    "cloud_cover_pct": round(
                        float(cloud_cover),
                        2,
                    ),
                    "visibility_m": round(
                        float(visibility),
                        2,
                    ),
                    "weather_data_source": (
                        "SYNTHETIC_SCENARIO"
                    ),
                    "weather_is_synthetic": 1,
                }
            )

    return pd.DataFrame(
        weather_rows
    )


# =====================================================
# 9. ORTAK HAVA DURUMU ÖZELLİKLERİ
# =====================================================

def prepare_weather_features(
    weather_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Gerçek veya sentetik hava durumunu ortak formata dönüştürür.
    """

    result_df = weather_df.copy()

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

    original_condition = normalize_condition_text(
        result_df[
            "weather_condition_original"
        ]
    )

    snowy_mask = (
        result_df["snowfall_mm"] > 0
    ) | (
        (
            result_df["precipitation_mm"]
            > 0.10
        )
        & (
            result_df["temperature_c"]
            <= 1.0
        )
    )

    foggy_mask = (
        result_df["visibility_m"]
        < FOG_VISIBILITY_THRESHOLD_M
    )

    rainy_mask = (
        result_df["precipitation_mm"]
        > 0.10
    )

    sunny_mask = (
        result_df["cloud_cover_pct"]
        < 35
    )

    calculated_condition = np.select(
        [
            snowy_mask,
            foggy_mask,
            rainy_mask,
            sunny_mask,
        ],
        [
            "SNOWY",
            "FOGGY",
            "RAINY",
            "SUNNY",
        ],
        default="CLOUDY",
    )

    result_df["weather_condition"] = (
        original_condition
        .where(
            original_condition.isin(
                ALLOWED_WEATHER_CONDITIONS
            ),
            calculated_condition,
        )
    )

    # Sayısal ölçümler ciddi hava durumunu gösteriyorsa,
    # metin açıklamasının üzerine yazılır.
    result_df.loc[
        snowy_mask,
        "weather_condition",
    ] = "SNOWY"

    result_df.loc[
        ~snowy_mask
        & foggy_mask,
        "weather_condition",
    ] = "FOGGY"

    result_df.loc[
        ~snowy_mask
        & ~foggy_mask
        & rainy_mask,
        "weather_condition",
    ] = "RAINY"

    result_df["is_rainy"] = (
        result_df["weather_condition"]
        == "RAINY"
    ).astype("int8")

    result_df["is_snowy"] = (
        result_df["weather_condition"]
        == "SNOWY"
    ).astype("int8")

    result_df["is_foggy"] = (
        result_df["weather_condition"]
        == "FOGGY"
    ).astype("int8")

    result_df["is_bad_weather"] = (
        (
            result_df["precipitation_mm"]
            >= BAD_WEATHER_PRECIPITATION_MM
        )
        | (
            result_df["snowfall_mm"] > 0
        )
        | (
            result_df["visibility_m"]
            < FOG_VISIBILITY_THRESHOLD_M
        )
        | (
            result_df["wind_speed_kmh"]
            >= BAD_WEATHER_WIND_SPEED_KMH
        )
    ).astype("int8")

    precipitation_severity = (
        result_df["precipitation_mm"]
        / 10.0
    ).clip(
        0,
        1,
    )

    snowfall_severity = (
        result_df["snowfall_mm"]
        / 5.0
    ).clip(
        0,
        1,
    )

    wind_severity = (
        result_df["wind_speed_kmh"]
        / 60.0
    ).clip(
        0,
        1,
    )

    visibility_severity = (
        1
        - (
            result_df["visibility_m"]
            / 10_000.0
        ).clip(
            0,
            1,
        )
    )

    result_df[
        "weather_severity_score"
    ] = (
        0.35 * precipitation_severity
        + 0.25 * snowfall_severity
        + 0.20 * wind_severity
        + 0.20 * visibility_severity
    ).clip(
        0,
        1,
    ).round(4)

    result_df[
        "weather_feature_version"
    ] = WEATHER_FEATURE_VERSION

    result_df[
        "weather_hour_utc"
    ] = pd.to_datetime(
        result_df["weather_hour_utc"],
        errors="coerce",
        utc=True,
    )

    result_df[
        "weather_hour_local"
    ] = (
        result_df[
            "weather_hour_utc"
        ]
        .dt.tz_convert(
            SIMULATION_TIMEZONE
        )
    )

    rounding_configuration = {
        "temperature_c": 2,
        "precipitation_mm": 3,
        "snowfall_mm": 3,
        "wind_speed_kmh": 2,
        "relative_humidity_pct": 2,
        "cloud_cover_pct": 2,
        "visibility_m": 2,
    }

    for column, decimal_count in (
        rounding_configuration.items()
    ):
        result_df[column] = (
            result_df[column]
            .round(decimal_count)
        )

    result_df[
        "weather_is_synthetic"
    ] = (
        result_df[
            "weather_is_synthetic"
        ]
        .astype("int8")
    )

    return (
        result_df[
            WEATHER_FEATURE_COLUMNS
        ]
        .sort_values(
            "weather_hour_utc"
        )
        .reset_index(drop=True)
    )


# =====================================================
# 10. HAVA DURUMU DOĞRULAMA
# =====================================================

def validate_weather_data(
    weather_df: pd.DataFrame,
    minimum_time_local: pd.Timestamp,
    maximum_time_local: pd.Timestamp,
) -> dict:
    """
    Saatlik hava durumu verisinin kapsam ve kalite kontrollerini yapar.
    """

    expected_hours_utc = pd.date_range(
        start=minimum_time_local.tz_convert(
            "UTC"
        ),
        end=maximum_time_local.tz_convert(
            "UTC"
        ),
        freq="h",
    )

    actual_hours_utc = pd.DatetimeIndex(
        weather_df[
            "weather_hour_utc"
        ]
    )

    if weather_df[
        "weather_hour_utc"
    ].duplicated().any():
        raise ValueError(
            "Aynı saat için birden fazla hava durumu kaydı bulundu."
        )

    if not actual_hours_utc.equals(
        expected_hours_utc
    ):
        missing_hours = (
            expected_hours_utc
            .difference(
                actual_hours_utc
            )
        )

        extra_hours = (
            actual_hours_utc
            .difference(
                expected_hours_utc
            )
        )

        raise ValueError(
            "Hava durumu saat kapsamı rezervasyon aralığıyla uyuşmuyor.\n"
            f"Eksik saat sayısı: {len(missing_hours)}\n"
            f"Fazla saat sayısı: {len(extra_hours)}"
        )

    required_non_null_columns = [
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
        "weather_data_source",
    ]

    missing_counts = (
        weather_df[
            required_non_null_columns
        ]
        .isna()
        .sum()
    )

    if (
        missing_counts > 0
    ).any():
        raise ValueError(
            "Hava durumu alanlarında eksik değer bulundu:\n"
            f"{missing_counts[missing_counts > 0]}"
        )

    invalid_conditions = (
        set(
            weather_df[
                "weather_condition"
            ]
            .dropna()
        )
        - ALLOWED_WEATHER_CONDITIONS
    )

    if invalid_conditions:
        raise ValueError(
            "Desteklenmeyen hava durumu sınıfları bulundu:\n"
            f"{sorted(invalid_conditions)}"
        )

    range_checks = {
        "temperature_c": (
            weather_df[
                "temperature_c"
            ].between(
                MIN_TEMPERATURE_C,
                MAX_TEMPERATURE_C,
            )
        ),
        "precipitation_mm": (
            weather_df[
                "precipitation_mm"
            ].between(
                0,
                MAX_PRECIPITATION_MM,
            )
        ),
        "snowfall_mm": (
            weather_df[
                "snowfall_mm"
            ].between(
                0,
                MAX_SNOWFALL_MM,
            )
        ),
        "wind_speed_kmh": (
            weather_df[
                "wind_speed_kmh"
            ].between(
                0,
                MAX_WIND_SPEED_KMH,
            )
        ),
        "relative_humidity_pct": (
            weather_df[
                "relative_humidity_pct"
            ].between(
                0,
                100,
            )
        ),
        "cloud_cover_pct": (
            weather_df[
                "cloud_cover_pct"
            ].between(
                0,
                100,
            )
        ),
        "visibility_m": (
            weather_df[
                "visibility_m"
            ].between(
                0,
                MAX_VISIBILITY_M,
            )
        ),
        "weather_severity_score": (
            weather_df[
                "weather_severity_score"
            ].between(
                0,
                1,
            )
        ),
    }

    for field_name, check_values in (
        range_checks.items()
    ):
        if not check_values.all():
            raise ValueError(
                f"{field_name} alanında kabul edilen "
                "aralık dışında değer bulundu."
            )

    condition_flag_consistency = (
        (
            weather_df["is_rainy"]
            == (
                weather_df[
                    "weather_condition"
                ]
                == "RAINY"
            ).astype(int)
        )
        & (
            weather_df["is_snowy"]
            == (
                weather_df[
                    "weather_condition"
                ]
                == "SNOWY"
            ).astype(int)
        )
        & (
            weather_df["is_foggy"]
            == (
                weather_df[
                    "weather_condition"
                ]
                == "FOGGY"
            ).astype(int)
        )
    )

    if not condition_flag_consistency.all():
        raise ValueError(
            "weather_condition ile is_rainy/is_snowy/"
            "is_foggy alanları arasında tutarsızlık bulundu."
        )

    return {
        "weather_hour_count": int(
            len(weather_df)
        ),
        "minimum_weather_hour_utc": str(
            weather_df[
                "weather_hour_utc"
            ].min()
        ),
        "maximum_weather_hour_utc": str(
            weather_df[
                "weather_hour_utc"
            ].max()
        ),
        "bad_weather_hour_count": int(
            weather_df[
                "is_bad_weather"
            ].sum()
        ),
        "synthetic_hour_count": int(
            weather_df[
                "weather_is_synthetic"
            ].sum()
        ),
        "weather_data_sources": (
            weather_df[
                "weather_data_source"
            ]
            .value_counts()
            .to_dict()
        ),
    }


# =====================================================
# 11. HAVA DURUMU REFERANS DOSYALARINI KAYDETME
# =====================================================

def save_weather_reference(
    weather_df: pd.DataFrame,
) -> None:
    """
    Saatlik hava durumu referans verisini CSV ve Parquet kaydeder.
    """

    weather_df.to_csv(
        WEATHER_REFERENCE_CSV_FILE,
        index=False,
        encoding="utf-8",
    )

    weather_df.to_parquet(
        WEATHER_REFERENCE_PARQUET_FILE,
        index=False,
        engine="pyarrow",
        compression="snappy",
    )


# =====================================================
# 12. REZERVASYONLARA HAVA DURUMU EKLEME
# =====================================================

def enrich_reservations_with_weather(
    weather_df: pd.DataFrame,
    expected_reservation_count: int,
) -> tuple[int, dict]:
    """
    reservations_analytics.parquet dosyasına hava durumunu
    parça parça ekler.

    Ana SQL reservations.csv dosyası değiştirilmez.
    """

    input_parquet = pq.ParquetFile(
        RESERVATIONS_ANALYTICS_FILE
    )

    input_columns = set(
        input_parquet.schema.names
    )

    if "scheduled_time" not in input_columns:
        raise ValueError(
            "Rezervasyon analitik dosyasında scheduled_time eksik."
        )

    overlapping_columns = (
        input_columns
        .intersection(
            WEATHER_FEATURE_COLUMNS
        )
    )

    if overlapping_columns:
        raise ValueError(
            "Girdi dosyasında hava durumu sütunları zaten bulunuyor:\n"
            f"{sorted(overlapping_columns)}\n\n"
            "Girdi olarak temiz reservations_analytics.parquet kullanılmalıdır."
        )

    if RESERVATIONS_WEATHER_OUTPUT_FILE.exists():
        RESERVATIONS_WEATHER_OUTPUT_FILE.unlink()

    weather_lookup = (
        weather_df
        .set_index(
            "weather_hour_utc"
        )
        .sort_index()
    )

    parquet_writer = None
    total_written_rows = 0
    weather_condition_counts = {}

    try:
        batches = input_parquet.iter_batches(
            batch_size=BATCH_SIZE
        )

        for batch_number, batch in enumerate(
            batches,
            start=1,
        ):
            original_table = (
                pa.Table.from_batches(
                    [batch]
                )
            )

            scheduled_time = pd.to_datetime(
                original_table[
                    "scheduled_time"
                ].to_pandas(),
                errors="coerce",
                utc=True,
            )

            if scheduled_time.isna().any():
                raise ValueError(
                    "Hava durumu eşleştirmesinde geçersiz "
                    "scheduled_time bulundu."
                )

            weather_hour_keys = (
                scheduled_time
                .dt.floor("h")
            )

            # Reindex sırasında hedef DatetimeIndex'in adı
            # scheduled_time veya None olabildiği için reset_index()
            # sonrasında weather_hour_utc sütunu kaybolabiliyordu.
            # İndeks adı açıkça weather_hour_utc olarak atanır.
            weather_hour_index = pd.DatetimeIndex(
                weather_hour_keys,
                name="weather_hour_utc",
            )

            matched_weather = (
                weather_lookup
                .reindex(
                    weather_hour_index
                )
                .reset_index()
            )

            missing_weather_columns = [
                column
                for column in WEATHER_FEATURE_COLUMNS
                if column not in matched_weather.columns
            ]

            if missing_weather_columns:
                raise ValueError(
                    "Hava durumu eşleştirmesi sonrasında "
                    "beklenen sütunlar oluşmadı:\n"
                    f"{missing_weather_columns}\n"
                    f"Mevcut sütunlar: {matched_weather.columns.tolist()}"
                )

            if matched_weather[
                "weather_condition"
            ].isna().any():
                missing_reservation_hours = (
                    weather_hour_keys.loc[
                        matched_weather[
                            "weather_condition"
                        ].isna()
                        .to_numpy()
                    ]
                    .drop_duplicates()
                    .head(10)
                )

                raise ValueError(
                    "Bazı rezervasyon saatleri hava durumuyla eşleşmedi.\n"
                    f"Örnek saatler:\n"
                    f"{missing_reservation_hours.to_string(index=False)}"
                )

            weather_feature_table = (
                pa.Table.from_pandas(
                    matched_weather[
                        WEATHER_FEATURE_COLUMNS
                    ],
                    preserve_index=False,
                )
            )

            enriched_table = original_table

            for column_name in WEATHER_FEATURE_COLUMNS:
                enriched_table = (
                    enriched_table.append_column(
                        column_name,
                        weather_feature_table[
                            column_name
                        ],
                    )
                )

            if parquet_writer is None:
                parquet_writer = (
                    pq.ParquetWriter(
                        RESERVATIONS_WEATHER_OUTPUT_FILE,
                        enriched_table.schema,
                        compression="snappy",
                        use_dictionary=True,
                    )
                )

            parquet_writer.write_table(
                enriched_table
            )

            condition_counts = (
                matched_weather[
                    "weather_condition"
                ]
                .value_counts()
                .to_dict()
            )

            for condition, count in (
                condition_counts.items()
            ):
                weather_condition_counts[
                    condition
                ] = (
                    weather_condition_counts.get(
                        condition,
                        0,
                    )
                    + int(count)
                )

            total_written_rows += len(
                matched_weather
            )

            print(
                f"Hava durumu eşleştirme {batch_number}: "
                f"{total_written_rows:,}/"
                f"{expected_reservation_count:,} rezervasyon"
            )

    except Exception:
        if parquet_writer is not None:
            parquet_writer.close()

        if RESERVATIONS_WEATHER_OUTPUT_FILE.exists():
            RESERVATIONS_WEATHER_OUTPUT_FILE.unlink()

        raise

    else:
        if parquet_writer is not None:
            parquet_writer.close()

    if total_written_rows != (
        expected_reservation_count
    ):
        raise ValueError(
            "Hava durumu ekleme sırasında satır sayısı değişti.\n"
            f"Beklenen: {expected_reservation_count:,}\n"
            f"Yazılan: {total_written_rows:,}"
        )

    output_row_count = int(
        pq.ParquetFile(
            RESERVATIONS_WEATHER_OUTPUT_FILE
        )
        .metadata
        .num_rows
    )

    if output_row_count != (
        expected_reservation_count
    ):
        raise ValueError(
            "Yazılan Parquet satır sayısı rezervasyon "
            "sayısıyla uyuşmuyor."
        )

    return (
        total_written_rows,
        weather_condition_counts,
    )


# =====================================================
# 13. RAPORLAMA
# =====================================================

def create_reports(
    weather_df: pd.DataFrame,
    weather_quality_result: dict,
    reservation_count: int,
    reservation_weather_counts: dict,
    observed_file_used: bool,
) -> None:
    """
    Hava durumu dağılımı, günlük özet ve metadata raporu oluşturur.
    """

    weather_distribution_df = (
        weather_df[
            "weather_condition"
        ]
        .value_counts()
        .rename_axis(
            "weather_condition"
        )
        .reset_index(
            name="weather_hour_count"
        )
    )

    weather_distribution_df[
        "percentage"
    ] = (
        weather_distribution_df[
            "weather_hour_count"
        ]
        / len(weather_df)
        * 100
    ).round(4)

    weather_distribution_df.to_csv(
        WEATHER_DISTRIBUTION_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    daily_summary_df = (
        weather_df
        .assign(
            weather_date_local=(
                weather_df[
                    "weather_hour_local"
                ]
                .dt.date
            )
        )
        .groupby(
            "weather_date_local",
            observed=True,
        )
        .agg(
            minimum_temperature_c=(
                "temperature_c",
                "min",
            ),
            maximum_temperature_c=(
                "temperature_c",
                "max",
            ),
            average_temperature_c=(
                "temperature_c",
                "mean",
            ),
            total_precipitation_mm=(
                "precipitation_mm",
                "sum",
            ),
            total_snowfall_mm=(
                "snowfall_mm",
                "sum",
            ),
            average_wind_speed_kmh=(
                "wind_speed_kmh",
                "mean",
            ),
            minimum_visibility_m=(
                "visibility_m",
                "min",
            ),
            bad_weather_hour_count=(
                "is_bad_weather",
                "sum",
            ),
        )
        .reset_index()
    )

    numeric_daily_columns = [
        column
        for column in daily_summary_df.columns
        if column != "weather_date_local"
    ]

    daily_summary_df[
        numeric_daily_columns
    ] = (
        daily_summary_df[
            numeric_daily_columns
        ]
        .round(2)
    )

    daily_summary_df.to_csv(
        DAILY_WEATHER_SUMMARY_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    quality_metrics = {
        **weather_quality_result,
        "reservation_count_enriched": int(
            reservation_count
        ),
        "observed_weather_input_exists": bool(
            OBSERVED_WEATHER_INPUT_FILE.exists()
        ),
        "observed_weather_input_used": bool(
            observed_file_used
        ),
    }

    pd.DataFrame(
        [
            {
                "metric": metric_name,
                "value": metric_value,
            }
            for metric_name, metric_value
            in quality_metrics.items()
        ]
    ).to_csv(
        WEATHER_QUALITY_METRICS_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    weather_source = str(
        weather_df[
            "weather_data_source"
        ].iloc[0]
    )

    synthetic_weather_used = bool(
        weather_df[
            "weather_is_synthetic"
        ].any()
    )

    summary = {
        "weather_feature_version": (
            WEATHER_FEATURE_VERSION
        ),
        "generated_at_utc": (
            datetime.now(timezone.utc)
            .replace(microsecond=0)
            .isoformat()
        ),
        "reservations_analytics_input": str(
            RESERVATIONS_ANALYTICS_FILE
        ),
        "observed_weather_input": str(
            OBSERVED_WEATHER_INPUT_FILE
        ),
        "weather_reference_csv": str(
            WEATHER_REFERENCE_CSV_FILE
        ),
        "weather_reference_parquet": str(
            WEATHER_REFERENCE_PARQUET_FILE
        ),
        "reservations_weather_output": str(
            RESERVATIONS_WEATHER_OUTPUT_FILE
        ),
        "reservation_count": int(
            reservation_count
        ),
        "weather_hour_count": int(
            len(weather_df)
        ),
        "weather_data_source": (
            weather_source
        ),
        "synthetic_weather_used": (
            synthetic_weather_used
        ),
        "random_seed": (
            RANDOM_SEED
            if synthetic_weather_used
            else None
        ),
        "simulation_timezone": (
            SIMULATION_TIMEZONE
        ),
        "weather_condition_counts_in_reservations": (
            reservation_weather_counts
        ),
        "weather_quality": (
            weather_quality_result
        ),
        "reservations_csv_modified": False,
        "weather_columns_are_sql_reservation_columns": False,
        "weather_features_saved_as_analytics_output": True,
        "weather_can_be_used_for_pipeline_testing": True,
        "weather_can_prove_real_world_effect": (
            not synthetic_weather_used
        ),
        "model_training_warning": (
            "Sentetik hava durumu kullanıldıysa model performansı "
            "gerçek hava etkisini kanıtlamaz. Yalnızca pipeline, "
            "özellik üretimi ve entegrasyon testi için kullanılmalıdır."
        ),
        "future_prediction_requirement": (
            "Gelecek talep tahmininde tarihsel gözlem yerine "
            "aynı sütun yapısına sahip hava tahmini verisi "
            "sağlanmalıdır."
        ),
        "data_leakage_note": (
            "Hava durumu dışsal bir özelliktir. Ancak tahmin anında "
            "yalnızca o saat için erişilebilir olan hava tahmini "
            "kullanılmalıdır."
        ),
    }

    with open(
        WEATHER_FEATURE_SUMMARY_FILE,
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
# 14. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 75)
    print("13 — HAVA DURUMU ÖZELLİKLERİNİN EKLENMESİ")
    print("=" * 75)

    print(
        "\nRezervasyon tarih aralığı bulunuyor..."
    )

    (
        minimum_time_local,
        maximum_time_local,
        reservation_count,
    ) = get_reservation_time_range()

    print(
        f"Minimum İstanbul saati: "
        f"{minimum_time_local}"
    )

    print(
        f"Maksimum İstanbul saati: "
        f"{maximum_time_local}"
    )

    print(
        f"Rezervasyon sayısı      : "
        f"{reservation_count:,}"
    )

    observed_file_used = False

    if OBSERVED_WEATHER_INPUT_FILE.exists():
        print(
            "\nGerçek saatlik hava durumu dosyası bulundu."
        )

        print(
            f"Dosya: "
            f"{OBSERVED_WEATHER_INPUT_FILE}"
        )

        weather_df = read_observed_weather(
            minimum_time_local=(
                minimum_time_local
            ),
            maximum_time_local=(
                maximum_time_local
            ),
        )

        observed_file_used = True

    elif ALLOW_SYNTHETIC_FALLBACK:
        print(
            "\n⚠️ Gerçek hava durumu dosyası bulunamadı."
        )

        print(
            "Açıkça işaretlenmiş deterministik "
            "sentetik senaryo oluşturuluyor..."
        )

        weather_df = generate_synthetic_weather(
            minimum_time_local=(
                minimum_time_local
            ),
            maximum_time_local=(
                maximum_time_local
            ),
        )

    else:
        raise FileNotFoundError(
            "Gerçek hava durumu dosyası bulunamadı:\n"
            f"{OBSERVED_WEATHER_INPUT_FILE}\n\n"
            "Sentetik fallback kapalıdır."
        )

    print(
        "\nOrtak hava durumu özellikleri hazırlanıyor..."
    )

    weather_df = prepare_weather_features(
        weather_df
    )

    print(
        "Hava durumu verisi doğrulanıyor..."
    )

    weather_quality_result = (
        validate_weather_data(
            weather_df=weather_df,
            minimum_time_local=(
                minimum_time_local
            ),
            maximum_time_local=(
                maximum_time_local
            ),
        )
    )

    save_weather_reference(
        weather_df
    )

    print(
        "\nRezervasyonlara hava durumu "
        "parça parça ekleniyor..."
    )

    (
        enriched_reservation_count,
        reservation_weather_counts,
    ) = enrich_reservations_with_weather(
        weather_df=weather_df,
        expected_reservation_count=(
            reservation_count
        ),
    )

    create_reports(
        weather_df=weather_df,
        weather_quality_result=(
            weather_quality_result
        ),
        reservation_count=(
            enriched_reservation_count
        ),
        reservation_weather_counts=(
            reservation_weather_counts
        ),
        observed_file_used=(
            observed_file_used
        ),
    )

    print("\n" + "=" * 75)
    print("HAVA DURUMU ÖZELLİKLERİ HAZIRLANDI")
    print("=" * 75)

    print(
        f"Hava durumu kaynağı : "
        f"{weather_df['weather_data_source'].iloc[0]}"
    )

    print(
        f"Saatlik hava kaydı  : "
        f"{len(weather_df):,}"
    )

    print(
        f"İşlenen rezervasyon : "
        f"{enriched_reservation_count:,}"
    )

    print(
        f"\nHava CSV           : "
        f"{WEATHER_REFERENCE_CSV_FILE}"
    )

    print(
        f"Hava Parquet       : "
        f"{WEATHER_REFERENCE_PARQUET_FILE}"
    )

    print(
        f"Rezervasyon çıktı  : "
        f"{RESERVATIONS_WEATHER_OUTPUT_FILE}"
    )

    print(
        f"Raporlar            : "
        f"{REPORT_DIR}"
    )

    print("\nKontroller:")
    print(
        " old versions klasörü kullanılmadı."
    )
    print(
        " Ana reservations.csv dosyası değiştirilmedi."
    )
    print(
        " Hava durumu analitik Parquet dosyasına eklendi."
    )
    print(
        " UTC ve Europe/Istanbul saatleri ayrı tutuldu."
    )
    print(
        " Her rezervasyon saati bir hava kaydıyla eşleşti."
    )
    print(
        " Hava durumu saatlerinde boşluk ve tekrar kontrol edildi."
    )
    print(
        " Sıcaklık, yağış, rüzgâr ve görünürlük sınırları doğrulandı."
    )
    print(
        " Sentetik veri kullanımı açıkça işaretlendi."
    )
    print(
        " weather_severity_score 0–1 arasında oluşturuldu."
    )

    if weather_df[
        "weather_is_synthetic"
    ].any():
        print(
            "\n Bu çalıştırmada sentetik hava durumu kullanıldı."
        )

        print(
            "Bu veri entegrasyon ve model pipeline testi içindir; "
            "gerçek hava-talep etkisini kanıtlamaz."
        )

        print(
            "\nGerçek veri kullanmak için saatlik hava CSV'sini "
            "şu konuma koy:"
        )

        print(
            OBSERVED_WEATHER_INPUT_FILE
        )


if __name__ == "__main__":
    main()