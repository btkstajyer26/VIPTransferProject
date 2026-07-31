import json
import sys
from pathlib import Path

import pandas as pd


# Windows terminalinde Türkçe karakter desteği
try:
    sys.stdout.reconfigure(encoding="utf-8")
except AttributeError:
    pass


# =====================================================
# 1. TEMİZLEME AYARLARI
# =====================================================

SOURCE_COLUMNS = [
    "tpep_pickup_datetime",
    "tpep_dropoff_datetime",
    "passenger_count",
    "trip_distance",
    "PULocationID",
    "DOLocationID",
    "fare_amount",
    "total_amount",
]

EXPECTED_START_DATE = pd.Timestamp("2025-01-01 00:00:00")
EXPECTED_END_DATE = pd.Timestamp("2025-02-01 00:00:00")

MIN_TRIP_DURATION_MIN = 3
MAX_TRIP_DURATION_MIN = 180

MIN_TRIP_DISTANCE_MILES = 0
MAX_TRIP_DISTANCE_MILES = 150

MIN_FARE_AMOUNT_USD = 0
MAX_FARE_AMOUNT_USD = 1000

MIN_TOTAL_AMOUNT_USD = 0
MAX_TOTAL_AMOUNT_USD = 1500

DEFAULT_PASSENGER_COUNT = 1
MAX_PASSENGER_COUNT = 8


# =====================================================
# 2. PROJE KLASÖRLERİ
# =====================================================

def find_project_root() -> Path:
    """
    Python dosyasının konumuna göre veri bilimi proje kökünü bulur.
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

RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"
PROCESSED_DATA_DIR = PROJECT_ROOT / "data" / "processed"

REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "02_data_cleaning"
)

PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = PROCESSED_DATA_DIR / "cleaned_taxi_data.parquet"


# =====================================================
# 3. GİRDİ DOSYASINI BULMA
# =====================================================

def find_input_file() -> Path:
    """
    Ham Yellow Taxi dosyasını bulur.

    CSV ve Parquet formatlarını destekler.
    Dosya adında (1), (2), (3) gibi ekler bulunabilir.
    """

    search_directories = [
        RAW_DATA_DIR,
        PROJECT_ROOT,
    ]

    exact_filenames = [
        "yellow_tripdata_2025-01.parquet",
        "yellow_tripdata_2025-01.csv",
    ]

    for directory in search_directories:
        for filename in exact_filenames:
            candidate = directory / filename

            if candidate.exists():
                return candidate

    filename_patterns = [
        "yellow_tripdata_2025-01*.parquet",
        "yellow_tripdata_2025-01*.csv",
    ]

    for directory in search_directories:
        if not directory.exists():
            continue

        for pattern in filename_patterns:
            matched_files = sorted(directory.glob(pattern))

            if matched_files:
                return matched_files[0]

    raise FileNotFoundError(
        "Yellow Taxi ham veri dosyası bulunamadı.\n"
        "Dosyayı aşağıdaki klasöre koymalısın:\n"
        f"{RAW_DATA_DIR}\n\n"
        "Desteklenen örnek adlar:\n"
        "- yellow_tripdata_2025-01.csv\n"
        "- yellow_tripdata_2025-01.parquet"
    )


# =====================================================
# 4. VERİ OKUMA
# =====================================================

def validate_source_columns(columns: list[str]) -> None:
    """
    Gerekli kaynak sütunlarının varlığını kontrol eder.
    """

    missing_columns = [
        column
        for column in SOURCE_COLUMNS
        if column not in columns
    ]

    if missing_columns:
        raise ValueError(
            "Ham veri dosyasında gerekli sütunlar eksik: "
            f"{missing_columns}"
        )


def read_source_data(input_path: Path) -> pd.DataFrame:
    """
    Ham CSV veya Parquet dosyasını yalnızca gerekli sütunlarla okur.
    """

    print(f"Ham veri okunuyor: {input_path}")

    if input_path.suffix.lower() == ".csv":
        header_columns = pd.read_csv(
            input_path,
            nrows=0,
        ).columns.tolist()

        validate_source_columns(header_columns)

        dtype_map = {
            "passenger_count": "Float32",
            "trip_distance": "Float32",
            "PULocationID": "Int16",
            "DOLocationID": "Int16",
            "fare_amount": "Float32",
            "total_amount": "Float32",
        }

        dataframe = pd.read_csv(
            input_path,
            usecols=SOURCE_COLUMNS,
            dtype=dtype_map,
            parse_dates=[
                "tpep_pickup_datetime",
                "tpep_dropoff_datetime",
            ],
            low_memory=False,
        )

    elif input_path.suffix.lower() == ".parquet":
        parquet_columns = pd.read_parquet(
            input_path,
            columns=None,
        ).columns.tolist()

        validate_source_columns(parquet_columns)

        dataframe = pd.read_parquet(
            input_path,
            columns=SOURCE_COLUMNS,
        )

    else:
        raise ValueError(
            f"Desteklenmeyen dosya formatı: {input_path.suffix}"
        )

    # Tarih sütunları bozuk gelirse NaT olacak
    dataframe["tpep_pickup_datetime"] = pd.to_datetime(
        dataframe["tpep_pickup_datetime"],
        errors="coerce",
    )

    dataframe["tpep_dropoff_datetime"] = pd.to_datetime(
        dataframe["tpep_dropoff_datetime"],
        errors="coerce",
    )

    return dataframe


# =====================================================
# 5. RAPORLAMA YARDIMCILARI
# =====================================================

def apply_filter(
    dataframe: pd.DataFrame,
    condition: pd.Series,
    step_name: str,
    description: str,
    cleaning_steps: list[dict],
) -> pd.DataFrame:
    """
    Verilen filtreyi uygular ve kaç satır silindiğini rapor listesine ekler.
    """

    before_count = len(dataframe)

    safe_condition = condition.fillna(False)

    filtered_dataframe = dataframe.loc[
        safe_condition
    ].copy()

    after_count = len(filtered_dataframe)
    removed_count = before_count - after_count

    cleaning_steps.append(
        {
            "step": step_name,
            "action": "FILTER",
            "rows_before": before_count,
            "affected_rows": removed_count,
            "rows_removed": removed_count,
            "rows_after": after_count,
            "description": description,
        }
    )

    print(
        f"{step_name}: "
        f"{removed_count:,} satır çıkarıldı, "
        f"{after_count:,} satır kaldı."
    )

    return filtered_dataframe


def add_imputation_step(
    cleaning_steps: list[dict],
    step_name: str,
    row_count: int,
    affected_rows: int,
    description: str,
) -> None:
    """
    Veri doldurma işlemini temizleme raporuna ekler.
    """

    cleaning_steps.append(
        {
            "step": step_name,
            "action": "IMPUTATION",
            "rows_before": row_count,
            "affected_rows": affected_rows,
            "rows_removed": 0,
            "rows_after": row_count,
            "description": description,
        }
    )

    print(
        f"{step_name}: "
        f"{affected_rows:,} kayıt dolduruldu."
    )


# =====================================================
# 6. VERİ TEMİZLEME
# =====================================================

def clean_data(
    dataframe: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Veri kalitesi kurallarını uygular.
    """

    cleaning_steps: list[dict] = []

    initial_row_count = len(dataframe)

    print("\n" + "=" * 70)
    print("TEMİZLEME BAŞLIYOR")
    print("=" * 70)

    print(f"Başlangıç satır sayısı: {initial_row_count:,}")

    # -------------------------------------------------
    # 1. Tamamen aynı satırları kaldır
    # -------------------------------------------------

    before_duplicates = len(dataframe)

    dataframe = dataframe.drop_duplicates().copy()

    duplicate_count = before_duplicates - len(dataframe)

    cleaning_steps.append(
        {
            "step": "remove_exact_duplicates",
            "action": "FILTER",
            "rows_before": before_duplicates,
            "affected_rows": duplicate_count,
            "rows_removed": duplicate_count,
            "rows_after": len(dataframe),
            "description": (
                "Seçili kaynak sütunlarının tamamı aynı olan "
                "tekrarlı satırlar kaldırıldı."
            ),
        }
    )

    print(
        "remove_exact_duplicates: "
        f"{duplicate_count:,} tekrar kaldırıldı."
    )

    # -------------------------------------------------
    # 2. Tarih değerleri geçerli olmalı
    # -------------------------------------------------

    dataframe = apply_filter(
        dataframe=dataframe,
        condition=(
            dataframe["tpep_pickup_datetime"].notna()
            & dataframe["tpep_dropoff_datetime"].notna()
        ),
        step_name="valid_datetimes",
        description=(
            "Alış veya bırakma zamanı okunamayan kayıtlar çıkarıldı."
        ),
        cleaning_steps=cleaning_steps,
    )

    # -------------------------------------------------
    # 3. Yalnızca Ocak 2025 alış kayıtlarını koru
    # -------------------------------------------------

    dataframe = apply_filter(
        dataframe=dataframe,
        condition=(
            (
                dataframe["tpep_pickup_datetime"]
                >= EXPECTED_START_DATE
            )
            & (
                dataframe["tpep_pickup_datetime"]
                < EXPECTED_END_DATE
            )
        ),
        step_name="january_2025_pickups",
        description=(
            "Alış zamanı Ocak 2025 dışında olan kayıtlar çıkarıldı."
        ),
        cleaning_steps=cleaning_steps,
    )

    # -------------------------------------------------
    # 4. Yolculuk süresini hesapla
    # -------------------------------------------------

    dataframe["trip_duration_min"] = (
        (
            dataframe["tpep_dropoff_datetime"]
            - dataframe["tpep_pickup_datetime"]
        )
        .dt.total_seconds()
        .div(60)
    )

    dataframe = apply_filter(
        dataframe=dataframe,
        condition=(
            dataframe["trip_duration_min"].between(
                MIN_TRIP_DURATION_MIN,
                MAX_TRIP_DURATION_MIN,
                inclusive="both",
            )
        ),
        step_name="valid_trip_duration",
        description=(
            f"Yolculuk süresi "
            f"{MIN_TRIP_DURATION_MIN}–"
            f"{MAX_TRIP_DURATION_MIN} dakika "
            "aralığında olmayan kayıtlar çıkarıldı."
        ),
        cleaning_steps=cleaning_steps,
    )

    # -------------------------------------------------
    # 5. Mesafe kontrolü
    # trip_distance şu an mil cinsindedir
    # -------------------------------------------------

    dataframe = apply_filter(
        dataframe=dataframe,
        condition=(
            (
                dataframe["trip_distance"]
                > MIN_TRIP_DISTANCE_MILES
            )
            & (
                dataframe["trip_distance"]
                <= MAX_TRIP_DISTANCE_MILES
            )
        ),
        step_name="valid_trip_distance_miles",
        description=(
            "Mil cinsinden mesafesi sıfır, negatif veya "
            f"{MAX_TRIP_DISTANCE_MILES} milden büyük "
            "olan kayıtlar çıkarıldı."
        ),
        cleaning_steps=cleaning_steps,
    )

    # -------------------------------------------------
    # 6. Kaynak fare tutarı kontrolü
    # -------------------------------------------------

    dataframe = apply_filter(
        dataframe=dataframe,
        condition=(
            (
                dataframe["fare_amount"]
                > MIN_FARE_AMOUNT_USD
            )
            & (
                dataframe["fare_amount"]
                <= MAX_FARE_AMOUNT_USD
            )
        ),
        step_name="valid_source_fare_amount",
        description=(
            "Kaynak fare tutarı sıfır, negatif veya "
            f"{MAX_FARE_AMOUNT_USD} değerinden büyük "
            "olan kayıtlar çıkarıldı."
        ),
        cleaning_steps=cleaning_steps,
    )

    # -------------------------------------------------
    # 7. Kaynak toplam tutar kontrolü
    # -------------------------------------------------

    dataframe = apply_filter(
        dataframe=dataframe,
        condition=(
            (
                dataframe["total_amount"]
                > MIN_TOTAL_AMOUNT_USD
            )
            & (
                dataframe["total_amount"]
                <= MAX_TOTAL_AMOUNT_USD
            )
            & (
                dataframe["total_amount"]
                >= dataframe["fare_amount"]
            )
        ),
        step_name="valid_source_total_amount",
        description=(
            "Kaynak toplam tutarı geçersiz olan veya "
            "fare tutarından düşük olan kayıtlar çıkarıldı."
        ),
        cleaning_steps=cleaning_steps,
    )

    # -------------------------------------------------
    # 8. Lokasyon kimlikleri kontrolü
    # -------------------------------------------------

    dataframe = apply_filter(
        dataframe=dataframe,
        condition=(
            dataframe["PULocationID"].notna()
            & dataframe["DOLocationID"].notna()
            & (dataframe["PULocationID"] > 0)
            & (dataframe["DOLocationID"] > 0)
        ),
        step_name="valid_location_ids",
        description=(
            "Alış veya varış lokasyon kimliği eksik, "
            "sıfır ya da negatif olan kayıtlar çıkarıldı."
        ),
        cleaning_steps=cleaning_steps,
    )

    # -------------------------------------------------
    # 9. Yolcu sayısını düzenle
    # -------------------------------------------------

    passenger_count_numeric = pd.to_numeric(
        dataframe["passenger_count"],
        errors="coerce",
    )

    passenger_imputation_mask = (
        passenger_count_numeric.isna()
        | (passenger_count_numeric <= 0)
    )

    dataframe["passenger_count_was_imputed"] = (
        passenger_imputation_mask
    )

    passenger_imputation_count = int(
        passenger_imputation_mask.sum()
    )

    dataframe.loc[
        passenger_imputation_mask,
        "passenger_count",
    ] = DEFAULT_PASSENGER_COUNT

    add_imputation_step(
        cleaning_steps=cleaning_steps,
        step_name="impute_passenger_count",
        row_count=len(dataframe),
        affected_rows=passenger_imputation_count,
        description=(
            "Eksik, sıfır veya negatif yolcu sayıları "
            f"{DEFAULT_PASSENGER_COUNT} olarak dolduruldu."
        ),
    )

    dataframe["passenger_count"] = pd.to_numeric(
        dataframe["passenger_count"],
        errors="coerce",
    )

    dataframe = apply_filter(
        dataframe=dataframe,
        condition=(
            dataframe["passenger_count"].between(
                1,
                MAX_PASSENGER_COUNT,
                inclusive="both",
            )
        ),
        step_name="valid_passenger_count",
        description=(
            "Yolcu sayısı 1–"
            f"{MAX_PASSENGER_COUNT} aralığında "
            "olmayan kayıtlar çıkarıldı."
        ),
        cleaning_steps=cleaning_steps,
    )

    # -------------------------------------------------
    # 10. Kaynak sütun adlarını açık hale getir
    # -------------------------------------------------

    dataframe = dataframe.rename(
        columns={
            "trip_distance": "trip_distance_miles",
            "fare_amount": "source_fare_amount_usd",
            "total_amount": "source_total_amount_usd",
        }
    )

    # -------------------------------------------------
    # 11. Veri tipleri
    # -------------------------------------------------

    dataframe["passenger_count"] = (
        dataframe["passenger_count"]
        .round()
        .astype("Int8")
    )

    dataframe["PULocationID"] = (
        dataframe["PULocationID"]
        .astype("Int16")
    )

    dataframe["DOLocationID"] = (
        dataframe["DOLocationID"]
        .astype("Int16")
    )

    dataframe["trip_distance_miles"] = (
        dataframe["trip_distance_miles"]
        .astype("Float32")
    )

    dataframe["trip_duration_min"] = (
        dataframe["trip_duration_min"]
        .round(4)
        .astype("Float32")
    )

    dataframe["source_fare_amount_usd"] = (
        dataframe["source_fare_amount_usd"]
        .round(2)
        .astype("Float32")
    )

    dataframe["source_total_amount_usd"] = (
        dataframe["source_total_amount_usd"]
        .round(2)
        .astype("Float32")
    )

    dataframe["passenger_count_was_imputed"] = (
        dataframe["passenger_count_was_imputed"]
        .astype(bool)
    )

    # -------------------------------------------------
    # 12. Sütun sırası
    # -------------------------------------------------

    final_columns = [
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

    dataframe = dataframe[
        final_columns
    ].reset_index(drop=True)

    cleaning_steps_df = pd.DataFrame(cleaning_steps)

    return dataframe, cleaning_steps_df


# =====================================================
# 7. SON KONTROLLER
# =====================================================

def validate_cleaned_data(
    dataframe: pd.DataFrame,
) -> None:
    """
    Temizlenmiş verinin temel kalite kurallarını doğrular.
    """

    required_columns = [
        "tpep_pickup_datetime",
        "tpep_dropoff_datetime",
        "passenger_count",
        "trip_distance_miles",
        "trip_duration_min",
        "PULocationID",
        "DOLocationID",
    ]

    null_counts = (
        dataframe[required_columns]
        .isna()
        .sum()
    )

    if int(null_counts.sum()) > 0:
        raise ValueError(
            "Temizlenmiş veride kritik eksik değer bulundu:\n"
            f"{null_counts[null_counts > 0]}"
        )

    if not dataframe["passenger_count"].between(
        1,
        MAX_PASSENGER_COUNT,
    ).all():
        raise ValueError(
            "Geçersiz passenger_count değeri bulundu."
        )

    if not dataframe["trip_duration_min"].between(
        MIN_TRIP_DURATION_MIN,
        MAX_TRIP_DURATION_MIN,
    ).all():
        raise ValueError(
            "Geçersiz trip_duration_min değeri bulundu."
        )

    if not (
        dataframe["trip_distance_miles"] > 0
    ).all():
        raise ValueError(
            "Sıfır veya negatif mesafe bulundu."
        )

    if not (
        dataframe["tpep_dropoff_datetime"]
        > dataframe["tpep_pickup_datetime"]
    ).all():
        raise ValueError(
            "Bırakma zamanı alış zamanından önce olan kayıt bulundu."
        )


# =====================================================
# 8. KAYDETME
# =====================================================

def save_cleaned_data(
    dataframe: pd.DataFrame,
) -> None:
    """
    Temizlenmiş veriyi Parquet formatında kaydeder.
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
# 9. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 70)
    print("02 — VERİ TEMİZLEME")
    print("=" * 70)

    input_path = find_input_file()
    source_dataframe = read_source_data(input_path)

    initial_row_count = len(source_dataframe)

    print(f"Okunan satır sayısı: {initial_row_count:,}")

    cleaned_dataframe, cleaning_steps_df = clean_data(
        source_dataframe
    )

    validate_cleaned_data(cleaned_dataframe)

    final_row_count = len(cleaned_dataframe)
    removed_row_count = initial_row_count - final_row_count

    retention_rate = (
        final_row_count / initial_row_count * 100
        if initial_row_count > 0
        else 0
    )

    # -------------------------------------------------
    # Temiz veriyi kaydet
    # -------------------------------------------------

    save_cleaned_data(cleaned_dataframe)

    # -------------------------------------------------
    # Temizleme adımlarını kaydet
    # -------------------------------------------------

    cleaning_steps_df.to_csv(
        REPORT_DIR / "cleaning_steps.csv",
        index=False,
        encoding="utf-8-sig",
    )

    # İnceleme amacıyla küçük örnek
    cleaned_dataframe.head(1000).to_csv(
        REPORT_DIR / "cleaned_data_sample.csv",
        index=False,
        encoding="utf-8-sig",
    )

    # -------------------------------------------------
    # Genel temizleme özeti
    # -------------------------------------------------

    imputed_passenger_count = int(
        cleaned_dataframe[
            "passenger_count_was_imputed"
        ].sum()
    )

    cleaning_summary = {
        "input_file": str(input_path),
        "output_file": str(OUTPUT_FILE),
        "initial_row_count": int(initial_row_count),
        "final_row_count": int(final_row_count),
        "removed_row_count": int(removed_row_count),
        "retention_rate_percentage": round(
            retention_rate,
            4,
        ),
        "imputed_passenger_count": (
            imputed_passenger_count
        ),
        "pickup_date_start_inclusive": str(
            EXPECTED_START_DATE
        ),
        "pickup_date_end_exclusive": str(
            EXPECTED_END_DATE
        ),
        "trip_duration_minimum_minutes": (
            MIN_TRIP_DURATION_MIN
        ),
        "trip_duration_maximum_minutes": (
            MAX_TRIP_DURATION_MIN
        ),
        "trip_distance_source_unit": "mile",
        "fare_source_currency": "USD",
        "kilometre_conversion_applied": False,
        "backend_price_calculation_applied": False,
    }

    with open(
        REPORT_DIR / "cleaning_summary.json",
        "w",
        encoding="utf-8",
    ) as json_file:
        json.dump(
            cleaning_summary,
            json_file,
            ensure_ascii=False,
            indent=4,
        )

    print("\n" + "=" * 70)
    print("TEMİZLEME TAMAMLANDI")
    print("=" * 70)

    print(f"İlk satır sayısı   : {initial_row_count:,}")
    print(f"Son satır sayısı   : {final_row_count:,}")
    print(f"Çıkarılan satır    : {removed_row_count:,}")
    print(f"Korunan veri oranı : %{retention_rate:.2f}")

    print(
        "Yolcu sayısı doldurulan kayıt: "
        f"{imputed_passenger_count:,}"
    )

    print(f"\nTemiz veri: {OUTPUT_FILE}")
    print(f"Rapor klasörü: {REPORT_DIR}")

    print("\nÖnemli:")
    print("- trip_distance_miles hâlâ mil cinsindedir.")
    print("- Kaynak fiyat sütunları USD kaynağını temsil eder.")
    print("- Backend VIP Transfer fiyatı henüz hesaplanmamıştır.")
    print(
        "- Kilometre dönüşümü "
        "03_feature_engineering.py içinde yapılacaktır."
    )


if __name__ == "__main__":
    main()