import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd


# Windows terminalinde Türkçe karakter desteği
try:
    sys.stdout.reconfigure(encoding="utf-8")
except AttributeError:
    pass


# =====================================================
# 1. SABİTLER
# =====================================================

MILES_TO_KILOMETRES = 1.609344

MORNING_PEAK_HOURS = {7, 8, 9}
EVENING_PEAK_HOURS = {17, 18, 19, 20}

PEAK_HOURS = MORNING_PEAK_HOURS.union(
    EVENING_PEAK_HOURS
)

# Veri yalnızca Ocak 2025'i kapsadığı için
# Türkiye açısından bu veri aralığındaki resmi tatil.
HOLIDAY_DATES = {
    "2025-01-01",
}


# =====================================================
# 2. PROJE KLASÖRLERİ
# =====================================================

def find_project_root() -> Path:
    """
    Python dosyasının konumuna göre proje ana klasörünü bulur.
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

PROCESSED_DATA_DIR = PROJECT_ROOT / "data" / "processed"

REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "03_feature_engineering"
)

PROCESSED_DATA_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

REPORT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

INPUT_FILE = (
    PROCESSED_DATA_DIR
    / "cleaned_taxi_data.parquet"
)

OUTPUT_FILE = (
    PROCESSED_DATA_DIR
    / "featured_taxi_data.parquet"
)


# =====================================================
# 3. GEREKLİ SÜTUNLAR
# =====================================================

REQUIRED_COLUMNS = [
    "tpep_pickup_datetime",
    "tpep_dropoff_datetime",
    "passenger_count",
    "passenger_count_was_imputed",
    "trip_distance_miles",
    "trip_duration_min",
    "PULocationID",
    "DOLocationID",
    "source_fare_amount_usd",
    "source_total_amount_usd",
]


# =====================================================
# 4. VERİ OKUMA VE KONTROL
# =====================================================

def read_cleaned_data() -> pd.DataFrame:
    """
    02_data_cleaning.py tarafından üretilen temiz veriyi okur.
    """

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            "Temizlenmiş veri dosyası bulunamadı:\n"
            f"{INPUT_FILE}\n\n"
            "Önce 02_data_cleaning.py dosyasını çalıştırmalısın."
        )

    print(f"Temiz veri okunuyor: {INPUT_FILE}")

    dataframe = pd.read_parquet(INPUT_FILE)

    missing_columns = [
        column
        for column in REQUIRED_COLUMNS
        if column not in dataframe.columns
    ]

    if missing_columns:
        raise ValueError(
            "Feature engineering için gerekli sütunlar eksik:\n"
            f"{missing_columns}\n\n"
            "02_data_cleaning.py dosyasının güncel sürümünü "
            "çalıştırdığından emin ol."
        )

    dataframe["tpep_pickup_datetime"] = pd.to_datetime(
        dataframe["tpep_pickup_datetime"],
        errors="coerce",
    )

    dataframe["tpep_dropoff_datetime"] = pd.to_datetime(
        dataframe["tpep_dropoff_datetime"],
        errors="coerce",
    )

    if dataframe[
        [
            "tpep_pickup_datetime",
            "tpep_dropoff_datetime",
        ]
    ].isna().any().any():
        raise ValueError(
            "Temizlenmiş veride geçersiz tarih değeri bulundu."
        )

    return dataframe


# =====================================================
# 5. ZAMAN DİLİMİ SINIFLANDIRMASI
# =====================================================

def assign_time_period(hour: int) -> str:
    """
    Rezervasyon saatini operasyonel zaman dilimine ayırır.
    """

    if 0 <= hour <= 5:
        return "NIGHT"

    if 6 <= hour <= 9:
        return "MORNING_PEAK"

    if 10 <= hour <= 16:
        return "DAYTIME"

    if 17 <= hour <= 20:
        return "EVENING_PEAK"

    return "LATE_EVENING"


# =====================================================
# 6. FEATURE ENGINEERING
# =====================================================

def create_features(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Temiz taksi verisinden modelleme ve rezervasyon simülasyonu
    için kullanılacak özellikleri üretir.
    """

    featured_df = dataframe.copy()

    initial_row_count = len(featured_df)

    print(f"Başlangıç satır sayısı: {initial_row_count:,}")

    # -------------------------------------------------
    # 1. Kaynak kayıt kimliği
    # -------------------------------------------------

    featured_df.insert(
        0,
        "source_trip_id",
        np.arange(
            1,
            len(featured_df) + 1,
            dtype=np.int64,
        ),
    )

    # -------------------------------------------------
    # 2. Tarih sütunlarını daha anlaşılır adlandır
    # -------------------------------------------------

    featured_df = featured_df.rename(
        columns={
            "tpep_pickup_datetime": "scheduled_time",
            "tpep_dropoff_datetime": "source_completed_time",
            "PULocationID": "source_pickup_location_id",
            "DOLocationID": "source_dropoff_location_id",
        }
    )

    # -------------------------------------------------
    # 3. Mil → kilometre dönüşümü
    # -------------------------------------------------

    featured_df["distance_km"] = (
        pd.to_numeric(
            featured_df["trip_distance_miles"],
            errors="coerce",
        )
        * MILES_TO_KILOMETRES
    )

    featured_df["distance_km"] = (
        featured_df["distance_km"]
        .round(3)
        .astype("Float32")
    )

    # -------------------------------------------------
    # 4. Temel zaman özellikleri
    # -------------------------------------------------

    featured_df["reservation_date"] = (
        featured_df["scheduled_time"].dt.normalize()
    )

    featured_df["reservation_year"] = (
        featured_df["scheduled_time"]
        .dt.year
        .astype("Int16")
    )

    featured_df["reservation_month"] = (
        featured_df["scheduled_time"]
        .dt.month
        .astype("Int8")
    )

    featured_df["reservation_day"] = (
        featured_df["scheduled_time"]
        .dt.day
        .astype("Int8")
    )

    featured_df["reservation_hour"] = (
        featured_df["scheduled_time"]
        .dt.hour
        .astype("Int8")
    )

    featured_df["day_of_week"] = (
        featured_df["scheduled_time"]
        .dt.dayofweek
        .astype("Int8")
    )

    featured_df["week_of_year"] = (
        featured_df["scheduled_time"]
        .dt.isocalendar()
        .week
        .astype("Int8")
    )

    # -------------------------------------------------
    # 5. Hafta sonu, yoğun saat ve tatil
    # -------------------------------------------------

    featured_df["is_weekend"] = (
        featured_df["day_of_week"]
        .isin([5, 6])
        .astype("Int8")
    )

    featured_df["is_peak_hour"] = (
        featured_df["reservation_hour"]
        .isin(PEAK_HOURS)
        .astype("Int8")
    )

    reservation_date_string = (
        featured_df["scheduled_time"]
        .dt.strftime("%Y-%m-%d")
    )

    featured_df["is_holiday"] = (
        reservation_date_string
        .isin(HOLIDAY_DATES)
        .astype("Int8")
    )

    featured_df["time_period"] = (
        featured_df["reservation_hour"]
        .astype(int)
        .apply(assign_time_period)
        .astype("category")
    )

    # -------------------------------------------------
    # 6. Döngüsel zaman özellikleri
    #
    # Saat 23 ile saat 0 sayısal olarak uzak görünür,
    # fakat gerçekte birbirine yakındır.
    # Sin/cos dönüşümü bu ilişkiyi modele aktarır.
    # -------------------------------------------------

    hour_angle = (
        2
        * np.pi
        * featured_df["reservation_hour"].astype(float)
        / 24
    )

    featured_df["hour_sin"] = (
        np.sin(hour_angle)
        .round(6)
        .astype("Float32")
    )

    featured_df["hour_cos"] = (
        np.cos(hour_angle)
        .round(6)
        .astype("Float32")
    )

    day_angle = (
        2
        * np.pi
        * featured_df["day_of_week"].astype(float)
        / 7
    )

    featured_df["day_of_week_sin"] = (
        np.sin(day_angle)
        .round(6)
        .astype("Float32")
    )

    featured_df["day_of_week_cos"] = (
        np.cos(day_angle)
        .round(6)
        .astype("Float32")
    )

    # -------------------------------------------------
    # 7. Veri tipleri
    # -------------------------------------------------

    featured_df["source_pickup_location_id"] = (
        pd.to_numeric(
            featured_df["source_pickup_location_id"],
            errors="raise",
        ).astype("Int16")
    )

    featured_df["source_dropoff_location_id"] = (
        pd.to_numeric(
            featured_df["source_dropoff_location_id"],
            errors="raise",
        ).astype("Int16")
    )

    featured_df["passenger_count"] = (
        pd.to_numeric(
            featured_df["passenger_count"],
            errors="raise",
        ).astype("Int8")
    )

    featured_df["passenger_count_was_imputed"] = (
        featured_df["passenger_count_was_imputed"]
        .astype(bool)
    )

    featured_df["trip_distance_miles"] = (
        pd.to_numeric(
            featured_df["trip_distance_miles"],
            errors="raise",
        ).astype("Float32")
    )

    featured_df["trip_duration_min"] = (
        pd.to_numeric(
            featured_df["trip_duration_min"],
            errors="raise",
        ).astype("Float32")
    )

    featured_df["source_fare_amount_usd"] = (
        pd.to_numeric(
            featured_df["source_fare_amount_usd"],
            errors="raise",
        ).astype("Float32")
    )

    featured_df["source_total_amount_usd"] = (
        pd.to_numeric(
            featured_df["source_total_amount_usd"],
            errors="raise",
        ).astype("Float32")
    )

    # -------------------------------------------------
    # 8. Son sütun sırası
    # -------------------------------------------------

    final_columns = [
        "source_trip_id",
        "scheduled_time",
        "source_completed_time",
        "reservation_date",
        "reservation_year",
        "reservation_month",
        "reservation_day",
        "reservation_hour",
        "day_of_week",
        "week_of_year",
        "is_weekend",
        "is_peak_hour",
        "is_holiday",
        "time_period",
        "hour_sin",
        "hour_cos",
        "day_of_week_sin",
        "day_of_week_cos",
        "source_pickup_location_id",
        "source_dropoff_location_id",
        "passenger_count",
        "passenger_count_was_imputed",
        "trip_distance_miles",
        "distance_km",
        "trip_duration_min",
        "source_fare_amount_usd",
        "source_total_amount_usd",
    ]

    featured_df = featured_df[
        final_columns
    ].reset_index(drop=True)

    if len(featured_df) != initial_row_count:
        raise ValueError(
            "Feature engineering sırasında satır sayısı değişti."
        )

    return featured_df


# =====================================================
# 7. SONUÇ DOĞRULAMA
# =====================================================

def validate_featured_data(
    dataframe: pd.DataFrame,
) -> None:
    """
    Üretilen özelliklerin temel kurallara uygunluğunu doğrular.
    """

    critical_columns = [
        "source_trip_id",
        "scheduled_time",
        "source_completed_time",
        "source_pickup_location_id",
        "source_dropoff_location_id",
        "passenger_count",
        "trip_distance_miles",
        "distance_km",
        "trip_duration_min",
        "reservation_hour",
        "day_of_week",
        "is_weekend",
        "is_peak_hour",
        "is_holiday",
    ]

    null_counts = (
        dataframe[critical_columns]
        .isna()
        .sum()
    )

    if int(null_counts.sum()) > 0:
        raise ValueError(
            "Feature veri setinde kritik eksik değer bulundu:\n"
            f"{null_counts[null_counts > 0]}"
        )

    if dataframe["source_trip_id"].duplicated().any():
        raise ValueError(
            "source_trip_id alanında tekrar eden değer bulundu."
        )

    if not dataframe["reservation_hour"].between(
        0,
        23,
    ).all():
        raise ValueError(
            "reservation_hour alanında 0–23 dışında değer bulundu."
        )

    if not dataframe["day_of_week"].between(
        0,
        6,
    ).all():
        raise ValueError(
            "day_of_week alanında 0–6 dışında değer bulundu."
        )

    if not (
        dataframe["distance_km"] > 0
    ).all():
        raise ValueError(
            "Sıfır veya negatif distance_km değeri bulundu."
        )

    expected_distance_km = (
        dataframe["trip_distance_miles"].astype(float)
        * MILES_TO_KILOMETRES
    )

    distance_difference = np.abs(
        dataframe["distance_km"].astype(float)
        - expected_distance_km
    )

    # distance_km üç ondalığa yuvarlandığı için küçük tolerans
    if not (distance_difference <= 0.001).all():
        raise ValueError(
            "Mil → kilometre dönüşümünde tutarsızlık bulundu."
        )

    if not (
        dataframe["source_completed_time"]
        > dataframe["scheduled_time"]
    ).all():
        raise ValueError(
            "Başlangıçtan önce tamamlanan yolculuk kaydı bulundu."
        )

    forbidden_backend_price_columns = {
        "base_price",
        "calculated_price",
        "opening_price",
        "discount_amount",
        "loyalty_discount",
        "surge_multiplier",
    }

    incorrectly_created_columns = (
        forbidden_backend_price_columns
        .intersection(dataframe.columns)
    )

    if incorrectly_created_columns:
        raise ValueError(
            "Feature engineering aşamasında oluşturulmaması gereken "
            "backend fiyat alanları bulundu: "
            f"{sorted(incorrectly_created_columns)}"
        )


# =====================================================
# 8. RAPORLAMA
# =====================================================

def create_feature_dictionary() -> pd.DataFrame:
    """
    Üretilen sütunların açıklamalarını oluşturur.
    """

    feature_descriptions = [
        {
            "column_name": "source_trip_id",
            "description": "İşlenmiş kaynak yolculuk için geçici ve benzersiz kimlik.",
            "usage": "Traceability",
        },
        {
            "column_name": "scheduled_time",
            "description": "Simülasyonda rezervasyon zamanı olarak kullanılacak kaynak alış zamanı.",
            "usage": "Reservation and demand modelling",
        },
        {
            "column_name": "source_completed_time",
            "description": "Kaynak taksi yolculuğunun bırakma zamanı.",
            "usage": "Trip duration and completed reservation simulation",
        },
        {
            "column_name": "source_pickup_location_id",
            "description": "NYC kaynak alış lokasyon kimliği; backend pricing zone değildir.",
            "usage": "Source-to-Istanbul zone mapping",
        },
        {
            "column_name": "source_dropoff_location_id",
            "description": "NYC kaynak varış lokasyon kimliği; backend pricing zone değildir.",
            "usage": "Source-to-Istanbul zone mapping",
        },
        {
            "column_name": "trip_distance_miles",
            "description": "Kaynak veri setindeki mil cinsinden mesafe.",
            "usage": "Source traceability",
        },
        {
            "column_name": "distance_km",
            "description": "trip_distance_miles × 1.609344 ile hesaplanan kilometre.",
            "usage": "Backend reservation and pricing",
        },
        {
            "column_name": "reservation_hour",
            "description": "Rezervasyon saatinin 0–23 arasındaki değeri.",
            "usage": "Demand modelling",
        },
        {
            "column_name": "day_of_week",
            "description": "Pazartesi 0, pazar 6 olacak biçimde haftanın günü.",
            "usage": "Demand modelling and pricing rules",
        },
        {
            "column_name": "is_peak_hour",
            "description": "Sabah veya akşam yoğun saat göstergesi.",
            "usage": "Demand modelling",
        },
        {
            "column_name": "is_holiday",
            "description": "Simülasyon tarihinin resmi tatil olup olmadığını gösterir.",
            "usage": "Demand modelling",
        },
        {
            "column_name": "hour_sin/hour_cos",
            "description": "Saat bilgisinin döngüsel sinüs ve kosinüs gösterimi.",
            "usage": "Machine learning",
        },
        {
            "column_name": "day_of_week_sin/day_of_week_cos",
            "description": "Haftanın gününün döngüsel sinüs ve kosinüs gösterimi.",
            "usage": "Machine learning",
        },
        {
            "column_name": "source_fare_amount_usd",
            "description": "Kaynak NYC ücret alanı; backend base_price değildir.",
            "usage": "Source analysis only",
        },
        {
            "column_name": "source_total_amount_usd",
            "description": "Kaynak NYC toplam tutarı; backend calculated_price değildir.",
            "usage": "Source analysis only",
        },
    ]

    return pd.DataFrame(feature_descriptions)


def save_reports(
    dataframe: pd.DataFrame,
) -> None:
    """
    Feature engineering raporlarını kaydeder.
    """

    feature_dictionary = create_feature_dictionary()

    feature_dictionary.to_csv(
        REPORT_DIR / "feature_dictionary.csv",
        index=False,
        encoding="utf-8-sig",
    )

    dataframe.head(1000).to_csv(
        REPORT_DIR / "featured_data_sample.csv",
        index=False,
        encoding="utf-8-sig",
    )

    summary = {
        "input_file": str(INPUT_FILE),
        "output_file": str(OUTPUT_FILE),
        "row_count": int(len(dataframe)),
        "column_count": int(len(dataframe.columns)),
        "distance_source_column": "trip_distance_miles",
        "distance_target_column": "distance_km",
        "miles_to_kilometres_factor": MILES_TO_KILOMETRES,
        "source_location_columns": [
            "source_pickup_location_id",
            "source_dropoff_location_id",
        ],
        "backend_zone_mapping_applied": False,
        "source_price_currency": "USD",
        "backend_price_calculation_applied": False,
        "random_surge_generated": False,
        "surge_multiplier_created": False,
        "simulation_city": "İstanbul",
        "backend_timezone_to_apply_later": "Europe/Istanbul",
        "peak_hours": sorted(PEAK_HOURS),
        "holiday_dates": sorted(HOLIDAY_DATES),
        "created_features": dataframe.columns.tolist(),
    }

    with open(
        REPORT_DIR / "feature_engineering_summary.json",
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
# 9. KAYDETME
# =====================================================

def save_featured_data(
    dataframe: pd.DataFrame,
) -> None:
    """
    Feature veri setini sıkıştırılmış Parquet olarak kaydeder.
    """

    try:
        dataframe.to_parquet(
            OUTPUT_FILE,
            index=False,
            engine="pyarrow",
            compression="snappy",
        )

    except ImportError as error:
        raise ImportError(
            "Parquet dosyası oluşturmak için pyarrow gereklidir.\n"
            "VS Code terminalinde şu komutu çalıştır:\n\n"
            "pip install pyarrow"
        ) from error


# =====================================================
# 10. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 70)
    print("03 — FEATURE ENGINEERING")
    print("=" * 70)

    cleaned_df = read_cleaned_data()

    featured_df = create_features(cleaned_df)

    validate_featured_data(featured_df)

    save_featured_data(featured_df)

    save_reports(featured_df)

    print("\n" + "=" * 70)
    print("FEATURE ENGINEERING TAMAMLANDI")
    print("=" * 70)

    print(f"Satır sayısı : {len(featured_df):,}")
    print(f"Sütun sayısı: {len(featured_df.columns)}")
    print(f"Çıktı       : {OUTPUT_FILE}")
    print(f"Raporlar    : {REPORT_DIR}")

    print("\nÖnemli kontroller:")
    print("Mil değerleri gerçek biçimde kilometreye çevrildi.")
    print("NYC lokasyon kimlikleri kaynak kimlik olarak korundu.")
    print("Zaman ve döngüsel model özellikleri oluşturuldu.")
    print("Kaynak USD ücretleri backend fiyatına dönüştürülmedi.")
    print(" Rastgele surge multiplier oluşturulmadı.")

    print(
        "\nBackend pricing zone eşleştirmesi "
        "04_create_reference_tables.py içinde yapılacaktır."
    )


if __name__ == "__main__":
    main()