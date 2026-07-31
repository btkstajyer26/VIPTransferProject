import json
import sys
from pathlib import Path

import pandas as pd


# Windows terminalinde Türkçe karakterlerin düzgün görüntülenmesi için
try:
    sys.stdout.reconfigure(encoding="utf-8")
except AttributeError:
    pass


# =====================================================
# 1. PROJE AYARLARI
# =====================================================

REQUIRED_COLUMNS = [
    "tpep_pickup_datetime",
    "tpep_dropoff_datetime",
    "passenger_count",
    "trip_distance",
    "PULocationID",
    "DOLocationID",
    "fare_amount",
    "total_amount",
]

EXPECTED_START_DATE = pd.Timestamp("2025-01-01")
EXPECTED_END_DATE = pd.Timestamp("2025-02-01")


def find_project_root() -> Path:
    """
    Python dosyasının bulunduğu konuma göre proje ana klasörünü bulur.

    Dosya scripts veya src gibi bir klasördeyse bir üst klasörü
    proje kökü olarak kabul eder.
    """
    script_directory = Path(__file__).resolve().parent

    if script_directory.name.lower() in {
        "scripts",
        "src",
        "data-science",
        "data_science",
    }:
        return script_directory.parent

    return script_directory


PROJECT_ROOT = find_project_root()

RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"

REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "01_data_understanding"
)

REPORT_DIR.mkdir(parents=True, exist_ok=True)


# =====================================================
# 2. HAM VERİ DOSYASINI BULMA
# =====================================================

def find_input_file() -> Path:
    """
    Ham NYC Yellow Taxi dosyasını bulur.

    Önce data/raw klasörüne, sonra proje ana klasörüne bakar.
    CSV ve Parquet formatlarını destekler.
    """

    search_directories = [
        RAW_DATA_DIR,
        PROJECT_ROOT,
    ]

    exact_filenames = [
        "yellow_tripdata_2025-01.parquet",
        "yellow_tripdata_2025-01.csv",
    ]

    # Önce standart dosya adlarını kontrol et
    for directory in search_directories:
        for filename in exact_filenames:
            candidate = directory / filename

            if candidate.exists():
                return candidate

    # Dosya adında (1), (2), (3) gibi ekler varsa da bul
    patterns = [
        "yellow_tripdata_2025-01*.parquet",
        "yellow_tripdata_2025-01*.csv",
    ]

    for directory in search_directories:
        if not directory.exists():
            continue

        for pattern in patterns:
            matches = sorted(directory.glob(pattern))

            if matches:
                return matches[0]

    raise FileNotFoundError(
        "Yellow Taxi veri dosyası bulunamadı.\n"
        "Dosyayı aşağıdaki konumlardan birine koymalısın:\n"
        f"- {RAW_DATA_DIR / 'yellow_tripdata_2025-01.csv'}\n"
        f"- {RAW_DATA_DIR / 'yellow_tripdata_2025-01.parquet'}\n"
        f"- {PROJECT_ROOT / 'yellow_tripdata_2025-01.csv'}"
    )


# =====================================================
# 3. VERİYİ OKUMA
# =====================================================

def read_taxi_data(input_path: Path) -> pd.DataFrame:
    """
    CSV veya Parquet dosyasını uygun veri tipleriyle okur.
    """

    print(f"Veri dosyası okunuyor: {input_path}")

    if input_path.suffix.lower() == ".parquet":
        dataframe = pd.read_parquet(input_path)

    elif input_path.suffix.lower() == ".csv":
        header_columns = pd.read_csv(
            input_path,
            nrows=0,
        ).columns.tolist()

        dtype_map = {
            "VendorID": "Int16",
            "passenger_count": "Float32",
            "trip_distance": "Float32",
            "RatecodeID": "Float32",
            "store_and_fwd_flag": "string",
            "PULocationID": "Int16",
            "DOLocationID": "Int16",
            "payment_type": "Int8",
            "fare_amount": "Float32",
            "extra": "Float32",
            "mta_tax": "Float32",
            "tip_amount": "Float32",
            "tolls_amount": "Float32",
            "improvement_surcharge": "Float32",
            "total_amount": "Float32",
            "congestion_surcharge": "Float32",
            "Airport_fee": "Float32",
        }

        available_dtypes = {
            column: dtype
            for column, dtype in dtype_map.items()
            if column in header_columns
        }

        datetime_columns = [
            column
            for column in [
                "tpep_pickup_datetime",
                "tpep_dropoff_datetime",
            ]
            if column in header_columns
        ]

        dataframe = pd.read_csv(
            input_path,
            dtype=available_dtypes,
            parse_dates=datetime_columns,
            low_memory=False,
        )

    else:
        raise ValueError(
            f"Desteklenmeyen dosya formatı: {input_path.suffix}"
        )

    return dataframe


# =====================================================
# 4. YARDIMCI FONKSİYONLAR
# =====================================================

def safe_boolean_count(condition: pd.Series) -> int:
    """
    Boolean koşul içindeki True değerlerin sayısını güvenli biçimde döndürür.
    """
    return int(condition.fillna(False).sum())


def create_column_summary(dataframe: pd.DataFrame) -> pd.DataFrame:
    """
    Her sütunun veri tipi, eksik değer ve benzersiz değer özetini oluşturur.
    """

    rows = []

    total_rows = len(dataframe)

    for column in dataframe.columns:
        null_count = int(dataframe[column].isna().sum())
        non_null_count = int(dataframe[column].notna().sum())
        unique_count = int(dataframe[column].nunique(dropna=True))

        null_percentage = (
            (null_count / total_rows) * 100
            if total_rows > 0
            else 0
        )

        rows.append(
            {
                "column_name": column,
                "data_type": str(dataframe[column].dtype),
                "non_null_count": non_null_count,
                "null_count": null_count,
                "null_percentage": round(null_percentage, 4),
                "unique_count": unique_count,
            }
        )

    return pd.DataFrame(rows)


def create_datetime_summary(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Tarih-saat sütunlarının minimum ve maksimum değerlerini raporlar.
    """

    rows = []

    datetime_columns = dataframe.select_dtypes(
        include=["datetime", "datetimetz"]
    ).columns

    for column in datetime_columns:
        rows.append(
            {
                "column_name": column,
                "minimum_datetime": dataframe[column].min(),
                "maximum_datetime": dataframe[column].max(),
                "missing_count": int(
                    dataframe[column].isna().sum()
                ),
            }
        )

    return pd.DataFrame(rows)


def create_data_quality_checks(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Ham verideki potansiyel veri kalitesi problemlerini sayar.

    Bu fonksiyon veriyi silmez veya değiştirmez.
    Yalnızca 02_data_cleaning.py için rapor üretir.
    """

    checks = []

    def add_check(
        check_name: str,
        invalid_count: int,
        description: str,
    ) -> None:
        invalid_percentage = (
            (invalid_count / len(dataframe)) * 100
            if len(dataframe) > 0
            else 0
        )

        checks.append(
            {
                "check_name": check_name,
                "invalid_row_count": int(invalid_count),
                "invalid_percentage": round(
                    invalid_percentage,
                    4,
                ),
                "description": description,
            }
        )

    duplicate_count = int(dataframe.duplicated().sum())

    add_check(
        check_name="exact_duplicate_rows",
        invalid_count=duplicate_count,
        description="Bütün sütunları tamamen aynı olan satırlar.",
    )

    if {
        "tpep_pickup_datetime",
        "tpep_dropoff_datetime",
    }.issubset(dataframe.columns):

        pickup_time = dataframe["tpep_pickup_datetime"]
        dropoff_time = dataframe["tpep_dropoff_datetime"]

        duration_minutes = (
            dropoff_time - pickup_time
        ).dt.total_seconds() / 60

        add_check(
            check_name="dropoff_not_after_pickup",
            invalid_count=safe_boolean_count(
                dropoff_time <= pickup_time
            ),
            description=(
                "Bırakma zamanı alış zamanından önce "
                "veya alış zamanına eşit olan kayıtlar."
            ),
        )

        add_check(
            check_name="duration_below_3_minutes",
            invalid_count=safe_boolean_count(
                duration_minutes < 3
            ),
            description=(
                "Yolculuk süresi 3 dakikadan kısa olan kayıtlar."
            ),
        )

        add_check(
            check_name="duration_above_180_minutes",
            invalid_count=safe_boolean_count(
                duration_minutes > 180
            ),
            description=(
                "Yolculuk süresi 180 dakikadan uzun olan kayıtlar."
            ),
        )

        add_check(
            check_name="pickup_outside_january_2025",
            invalid_count=safe_boolean_count(
                (pickup_time < EXPECTED_START_DATE)
                | (pickup_time >= EXPECTED_END_DATE)
            ),
            description=(
                "Alış tarihi Ocak 2025 dışında olan kayıtlar."
            ),
        )

    if "passenger_count" in dataframe.columns:
        passenger_count = pd.to_numeric(
            dataframe["passenger_count"],
            errors="coerce",
        )

        add_check(
            check_name="missing_passenger_count",
            invalid_count=int(passenger_count.isna().sum()),
            description="Yolcu sayısı eksik olan kayıtlar.",
        )

        add_check(
            check_name="non_positive_passenger_count",
            invalid_count=safe_boolean_count(
                passenger_count <= 0
            ),
            description=(
                "Yolcu sayısı sıfır veya negatif olan kayıtlar."
            ),
        )

        add_check(
            check_name="passenger_count_above_8",
            invalid_count=safe_boolean_count(
                passenger_count > 8
            ),
            description=(
                "Yolcu sayısı 8'den fazla olan kayıtlar."
            ),
        )

    if "trip_distance" in dataframe.columns:
        trip_distance = pd.to_numeric(
            dataframe["trip_distance"],
            errors="coerce",
        )

        add_check(
            check_name="non_positive_trip_distance_miles",
            invalid_count=safe_boolean_count(
                trip_distance <= 0
            ),
            description=(
                "Mil cinsinden yolculuk mesafesi "
                "sıfır veya negatif olan kayıtlar."
            ),
        )

        add_check(
            check_name="trip_distance_above_150_miles",
            invalid_count=safe_boolean_count(
                trip_distance > 150
            ),
            description=(
                "Yolculuk mesafesi 150 milden fazla olan kayıtlar."
            ),
        )

    if "fare_amount" in dataframe.columns:
        fare_amount = pd.to_numeric(
            dataframe["fare_amount"],
            errors="coerce",
        )

        add_check(
            check_name="non_positive_fare_amount",
            invalid_count=safe_boolean_count(
                fare_amount <= 0
            ),
            description=(
                "Fare amount değeri sıfır veya negatif olan kayıtlar."
            ),
        )

        add_check(
            check_name="fare_amount_above_1000",
            invalid_count=safe_boolean_count(
                fare_amount > 1000
            ),
            description=(
                "Fare amount değeri 1000'den fazla olan kayıtlar."
            ),
        )

    if "total_amount" in dataframe.columns:
        total_amount = pd.to_numeric(
            dataframe["total_amount"],
            errors="coerce",
        )

        add_check(
            check_name="non_positive_total_amount",
            invalid_count=safe_boolean_count(
                total_amount <= 0
            ),
            description=(
                "Total amount değeri sıfır veya negatif olan kayıtlar."
            ),
        )

        add_check(
            check_name="total_amount_above_1500",
            invalid_count=safe_boolean_count(
                total_amount > 1500
            ),
            description=(
                "Total amount değeri 1500'den fazla olan kayıtlar."
            ),
        )

    for location_column in [
        "PULocationID",
        "DOLocationID",
    ]:
        if location_column in dataframe.columns:
            location_values = pd.to_numeric(
                dataframe[location_column],
                errors="coerce",
            )

            add_check(
                check_name=f"invalid_{location_column}",
                invalid_count=safe_boolean_count(
                    location_values.isna()
                    | (location_values <= 0)
                ),
                description=(
                    f"{location_column} eksik, sıfır "
                    "veya negatif olan kayıtlar."
                ),
            )

    return pd.DataFrame(checks)


# =====================================================
# 5. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 70)
    print("01 — VERİYİ ANLAMA VE VERİ KALİTESİ ANALİZİ")
    print("=" * 70)

    input_path = find_input_file()
    dataframe = read_taxi_data(input_path)

    print("\nVeri başarıyla okundu.")

    row_count, column_count = dataframe.shape

    memory_usage_mb = (
        dataframe.memory_usage(
            deep=True
        ).sum()
        / (1024 ** 2)
    )

    missing_required_columns = [
        column
        for column in REQUIRED_COLUMNS
        if column not in dataframe.columns
    ]

    if missing_required_columns:
        raise ValueError(
            "Sonraki pipeline aşamaları için gerekli "
            f"sütunlar eksik: {missing_required_columns}"
        )

    print(f"Satır sayısı   : {row_count:,}")
    print(f"Sütun sayısı  : {column_count}")
    print(f"Bellek kullanımı: {memory_usage_mb:,.2f} MB")

    print("\nÖnemli birim bilgisi:")
    print(
        "- trip_distance sütunu mil cinsindedir."
    )
    print(
        "- Kilometre dönüşümü 03_feature_engineering.py "
        "aşamasında yapılmalıdır."
    )

    # -------------------------------------------------
    # Sütun özeti
    # -------------------------------------------------

    column_summary = create_column_summary(dataframe)

    column_summary.to_csv(
        REPORT_DIR / "column_summary.csv",
        index=False,
        encoding="utf-8-sig",
    )

    # -------------------------------------------------
    # Eksik veri özeti
    # -------------------------------------------------

    missing_values = column_summary[
        [
            "column_name",
            "null_count",
            "null_percentage",
        ]
    ].sort_values(
        by="null_count",
        ascending=False,
    )

    missing_values.to_csv(
        REPORT_DIR / "missing_values.csv",
        index=False,
        encoding="utf-8-sig",
    )

    # -------------------------------------------------
    # Sayısal özet
    # -------------------------------------------------

    numeric_dataframe = dataframe.select_dtypes(
        include="number"
    )

    if not numeric_dataframe.empty:
        numeric_summary = (
            numeric_dataframe
            .describe()
            .transpose()
            .reset_index()
            .rename(columns={"index": "column_name"})
        )
    else:
        numeric_summary = pd.DataFrame()

    numeric_summary.to_csv(
        REPORT_DIR / "numeric_summary.csv",
        index=False,
        encoding="utf-8-sig",
    )

    # -------------------------------------------------
    # Tarih özeti
    # -------------------------------------------------

    datetime_summary = create_datetime_summary(dataframe)

    datetime_summary.to_csv(
        REPORT_DIR / "datetime_summary.csv",
        index=False,
        encoding="utf-8-sig",
    )

    # -------------------------------------------------
    # Veri kalitesi kontrolleri
    # -------------------------------------------------

    data_quality_checks = create_data_quality_checks(
        dataframe
    )

    data_quality_checks.to_csv(
        REPORT_DIR / "data_quality_checks.csv",
        index=False,
        encoding="utf-8-sig",
    )

    duplicate_count = int(
        data_quality_checks.loc[
            data_quality_checks["check_name"]
            == "exact_duplicate_rows",
            "invalid_row_count",
        ].iloc[0]
    )

    # -------------------------------------------------
    # Genel JSON özeti
    # -------------------------------------------------

    dataset_summary = {
        "input_file": str(input_path),
        "row_count": int(row_count),
        "column_count": int(column_count),
        "columns": dataframe.columns.tolist(),
        "memory_usage_mb": round(
            float(memory_usage_mb),
            2,
        ),
        "duplicate_row_count": duplicate_count,
        "required_columns": REQUIRED_COLUMNS,
        "missing_required_columns": (
            missing_required_columns
        ),
        "trip_distance_source_unit": "mile",
        "trip_distance_target_unit": "kilometre",
        "kilometre_conversion_factor": 1.609344,
        "raw_data_modified": False,
    }

    with open(
        REPORT_DIR / "dataset_summary.json",
        "w",
        encoding="utf-8",
    ) as json_file:
        json.dump(
            dataset_summary,
            json_file,
            ensure_ascii=False,
            indent=4,
            default=str,
        )

    # -------------------------------------------------
    # Terminal çıktısı
    # -------------------------------------------------

    print("\n" + "=" * 70)
    print("EKSİK VERİ ÖZETİ")
    print("=" * 70)

    print(
        missing_values[
            missing_values["null_count"] > 0
        ].to_string(index=False)
    )

    print("\n" + "=" * 70)
    print("VERİ KALİTESİ KONTROLLERİ")
    print("=" * 70)

    print(
        data_quality_checks.to_string(index=False)
    )

    print("\n" + "=" * 70)
    print("RAPORLAR OLUŞTURULDU")
    print("=" * 70)

    print(f"Rapor klasörü: {REPORT_DIR}")
    print("- dataset_summary.json")
    print("- column_summary.csv")
    print("- missing_values.csv")
    print("- numeric_summary.csv")
    print("- datetime_summary.csv")
    print("- data_quality_checks.csv")

    print("\nHam veri değiştirilmedi.")
    print("01_data_understanding.py başarıyla tamamlandı.")


if __name__ == "__main__":
    main()