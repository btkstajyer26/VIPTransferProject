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
# 1. AYARLAR
# =====================================================

# SQL para alanları iki ondalıklı olduğu için 1 kuruş tolerans.
PRICE_TOLERANCE = 0.01

CHUNK_SIZE = 200_000
AUDIT_SAMPLE_SIZE = 1_000

# Hatalı fiyat bulunursa pipeline durdurulsun.
FAIL_ON_VALIDATION_ERROR = True


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

GENERATED_DATA_DIR = PROJECT_ROOT / "data" / "generated"
REFERENCE_DATA_DIR = PROJECT_ROOT / "data" / "reference"

REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "06b_validate_reservation_prices"
)

REPORT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


RESERVATIONS_FILE = (
    GENERATED_DATA_DIR
    / "reservations.csv"
)

VEHICLES_FILE = (
    REFERENCE_DATA_DIR
    / "vehicles.csv"
)

PRICING_ZONES_FILE = (
    REFERENCE_DATA_DIR
    / "pricing_zones.csv"
)

ROUTE_PRICING_MATRIX_FILE = (
    REFERENCE_DATA_DIR
    / "route_pricing_matrix.csv"
)


INVALID_PRICES_FILE = (
    REPORT_DIR
    / "invalid_reservation_prices.csv"
)

PRICE_AUDIT_SAMPLE_FILE = (
    REPORT_DIR
    / "price_audit_sample.csv"
)

VALIDATION_METRICS_FILE = (
    REPORT_DIR
    / "price_validation_metrics.csv"
)

VALIDATION_SUMMARY_FILE = (
    REPORT_DIR
    / "price_validation_summary.json"
)


# =====================================================
# 3. GEREKLİ SÜTUNLAR
# =====================================================

RESERVATION_COLUMNS = [
    "id",
    "booking_reference",
    "vehicle_id",
    "pickup_zone_id",
    "dropoff_zone_id",
    "distance_km",
    "base_price",
    "surge_multiplier",
    "discount_amount",
    "loyalty_discount",
    "opening_price",
    "calculated_price",
    "currency",
]

VEHICLE_COLUMNS = [
    "id",
    "base_price_multiplier",
    "opening_price",
]

PRICING_ZONE_COLUMNS = [
    "id",
    "base_price",
    "min_price",
    "currency",
]

ROUTE_COLUMNS = [
    "pickup_zone_id",
    "dropoff_zone_id",
    "route_price_per_km",
]


# =====================================================
# 4. YARDIMCI FONKSİYONLAR
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
    Bir DataFrame içinde gerekli sütunların bulunduğunu doğrular.
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


def add_validation_error(
    error_series: pd.Series,
    condition: pd.Series,
    error_message: str,
) -> pd.Series:
    """
    Hatalı satırlara açıklama ekler.

    Bir satırda birden fazla hata varsa açıklamalar | ile ayrılır.
    """

    condition = condition.fillna(True)

    current_values = (
        error_series.loc[condition]
        .fillna("")
        .astype(str)
    )

    separator = np.where(
        current_values.str.len() > 0,
        " | ",
        "",
    )

    error_series.loc[condition] = (
        current_values
        + separator
        + error_message
    )

    return error_series


def values_are_close(
    first_series: pd.Series,
    second_series: pd.Series,
    tolerance: float = PRICE_TOLERANCE,
) -> pd.Series:
    """
    İki sayısal sütunu verilen toleransla karşılaştırır.

    Float gösteriminden doğabilecek 0.0100000001 gibi yapay
    farkların 1 kuruşluk gerçek fark olarak değerlendirilmesini
    önlemek için fark önce 6 ondalığa yuvarlanır.
    """

    first_values = pd.to_numeric(
        first_series,
        errors="coerce",
    ).astype("float64")

    second_values = pd.to_numeric(
        second_series,
        errors="coerce",
    ).astype("float64")

    valid_values = (
        first_values.notna()
        & second_values.notna()
    )

    absolute_difference = (
        first_values
        - second_values
    ).abs().round(6)

    return (
        valid_values
        & (
            absolute_difference
            <= tolerance
        )
    )


# =====================================================
# 5. REFERANS TABLOLARI OKUMA
# =====================================================

def read_reference_tables():
    """
    Araç, fiyat bölgesi ve rota fiyat matrisini okur.
    """

    required_files = [
        VEHICLES_FILE,
        PRICING_ZONES_FILE,
        ROUTE_PRICING_MATRIX_FILE,
    ]

    for file_path in required_files:
        require_file(file_path)

    vehicles_df = pd.read_csv(
        VEHICLES_FILE,
        usecols=VEHICLE_COLUMNS,
        low_memory=False,
    )

    pricing_zones_df = pd.read_csv(
        PRICING_ZONES_FILE,
        usecols=PRICING_ZONE_COLUMNS,
        low_memory=False,
    )

    route_matrix_df = pd.read_csv(
        ROUTE_PRICING_MATRIX_FILE,
        usecols=ROUTE_COLUMNS,
        low_memory=False,
    )

    validate_columns(
        vehicles_df,
        VEHICLE_COLUMNS,
        "vehicles.csv",
    )

    validate_columns(
        pricing_zones_df,
        PRICING_ZONE_COLUMNS,
        "pricing_zones.csv",
    )

    validate_columns(
        route_matrix_df,
        ROUTE_COLUMNS,
        "route_pricing_matrix.csv",
    )

    # -------------------------------------------------
    # Benzersizlik kontrolleri
    # -------------------------------------------------

    if vehicles_df["id"].duplicated().any():
        raise ValueError(
            "vehicles.csv içinde tekrar eden id bulundu."
        )

    if pricing_zones_df["id"].duplicated().any():
        raise ValueError(
            "pricing_zones.csv içinde tekrar eden id bulundu."
        )

    if route_matrix_df[
        [
            "pickup_zone_id",
            "dropoff_zone_id",
        ]
    ].duplicated().any():
        raise ValueError(
            "route_pricing_matrix.csv içinde aynı bölge çifti "
            "birden fazla kez bulunuyor."
        )

    # -------------------------------------------------
    # Veri tipleri
    # -------------------------------------------------

    vehicles_df["id"] = pd.to_numeric(
        vehicles_df["id"],
        errors="raise",
    ).astype("int64")

    vehicles_df["base_price_multiplier"] = (
        pd.to_numeric(
            vehicles_df["base_price_multiplier"],
            errors="raise",
        )
        .astype("float64")
        .round(6)
    )

    vehicles_df["opening_price"] = (
        pd.to_numeric(
            vehicles_df["opening_price"],
            errors="raise",
        )
        .astype("float64")
        .round(2)
    )

    pricing_zones_df["id"] = pd.to_numeric(
        pricing_zones_df["id"],
        errors="raise",
    ).astype("int64")

    pricing_zones_df["base_price"] = (
        pd.to_numeric(
            pricing_zones_df["base_price"],
            errors="raise",
        )
        .astype("float64")
        .round(2)
    )

    pricing_zones_df["min_price"] = (
        pd.to_numeric(
            pricing_zones_df["min_price"],
            errors="raise",
        )
        .astype("float64")
        .round(2)
    )

    route_matrix_df["pickup_zone_id"] = pd.to_numeric(
        route_matrix_df["pickup_zone_id"],
        errors="raise",
    ).astype("int64")

    route_matrix_df["dropoff_zone_id"] = pd.to_numeric(
        route_matrix_df["dropoff_zone_id"],
        errors="raise",
    ).astype("int64")

    route_matrix_df["route_price_per_km"] = (
        pd.to_numeric(
            route_matrix_df["route_price_per_km"],
            errors="raise",
        )
        .astype("float64")
        .round(6)
    )

    # -------------------------------------------------
    # Referans tablo değer kontrolleri
    # -------------------------------------------------

    if not (
        vehicles_df["base_price_multiplier"] > 0
    ).all():
        raise ValueError(
            "vehicles.base_price_multiplier sıfırdan büyük olmalıdır."
        )

    if not (
        vehicles_df["opening_price"] >= 0
    ).all():
        raise ValueError(
            "vehicles.opening_price negatif olamaz."
        )

    if not (
        pricing_zones_df["base_price"] >= 0
    ).all():
        raise ValueError(
            "pricing_zones.base_price negatif olamaz."
        )

    if not (
        pricing_zones_df["min_price"] >= 0
    ).all():
        raise ValueError(
            "pricing_zones.min_price negatif olamaz."
        )

    if not (
        pricing_zones_df["currency"] == "TRY"
    ).all():
        raise ValueError(
            "Bütün pricing_zones.currency değerleri TRY olmalıdır."
        )

    if not (
        route_matrix_df["route_price_per_km"] >= 0
    ).all():
        raise ValueError(
            "route_price_per_km negatif olamaz."
        )

    # -------------------------------------------------
    # Birleştirmeye uygun isimler
    # -------------------------------------------------

    vehicles_lookup = vehicles_df.rename(
        columns={
            "id": "vehicle_id",
            "base_price_multiplier": (
                "vehicle_price_multiplier"
            ),
            "opening_price": (
                "current_vehicle_opening_price"
            ),
        }
    )

    pickup_zone_lookup = pricing_zones_df.rename(
        columns={
            "id": "pickup_zone_id",
            "base_price": "pickup_zone_base_price",
            "min_price": "pickup_zone_min_price",
            "currency": "pickup_zone_currency",
        }
    )

    return (
        vehicles_lookup,
        pickup_zone_lookup,
        route_matrix_df,
    )


# =====================================================
# 6. BİR REZERVASYON PARÇASINI DOĞRULAMA
# =====================================================

def validate_reservation_chunk(
    chunk: pd.DataFrame,
    vehicles_lookup: pd.DataFrame,
    pickup_zone_lookup: pd.DataFrame,
    route_matrix_df: pd.DataFrame,
    expected_first_id: int,
):
    """
    Bir reservations.csv parçasındaki fiyatları yeniden hesaplar.
    """

    validate_columns(
        chunk,
        RESERVATION_COLUMNS,
        "reservations.csv",
    )

    original_row_count = len(chunk)

    # -------------------------------------------------
    # Sütunları açık isimlere dönüştür
    # -------------------------------------------------

    work_df = chunk.rename(
        columns={
            "base_price": "stored_base_price",
            "opening_price": (
                "reservation_opening_price"
            ),
            "calculated_price": (
                "stored_calculated_price"
            ),
            "currency": "reservation_currency",
        }
    ).copy()

    # -------------------------------------------------
    # Sayısal veri tipleri
    # -------------------------------------------------

    numeric_columns = [
        "id",
        "vehicle_id",
        "pickup_zone_id",
        "dropoff_zone_id",
        "distance_km",
        "stored_base_price",
        "surge_multiplier",
        "discount_amount",
        "loyalty_discount",
        "reservation_opening_price",
        "stored_calculated_price",
    ]

    for column in numeric_columns:
        work_df[column] = pd.to_numeric(
            work_df[column],
            errors="coerce",
        )

    # -------------------------------------------------
    # 06 ile aynı fiyat hassasiyetleri
    # -------------------------------------------------
    #
    # 06_create_reservations.py fiyat hesabından önce:
    #   distance_km        -> 3 ondalık
    #   surge_multiplier   -> 2 ondalık
    #   para alanları      -> 2 ondalık
    # kullanır. Doğrulayıcı da aynı değerlerle hesap yapmalıdır.

    work_df["distance_km"] = (
        work_df["distance_km"]
        .astype("float64")
        .round(3)
    )

    work_df["surge_multiplier"] = (
        work_df["surge_multiplier"]
        .astype("float64")
        .round(2)
    )

    for money_column in [
        "stored_base_price",
        "discount_amount",
        "loyalty_discount",
        "reservation_opening_price",
        "stored_calculated_price",
    ]:
        work_df[money_column] = (
            work_df[money_column]
            .astype("float64")
            .round(2)
        )

    # -------------------------------------------------
    # ID sırası ve booking reference
    # 06 dosyası id değerlerini 1, 2, 3... oluşturuyor.
    # -------------------------------------------------

    expected_ids = np.arange(
        expected_first_id,
        expected_first_id + original_row_count,
        dtype=np.int64,
    )

    id_sequence_valid = (
        work_df["id"].notna()
        & (
            work_df["id"].to_numpy(dtype=float)
            == expected_ids
        )
    )

    booking_id_strings = (
        pd.Series(
            expected_ids,
            index=work_df.index,
        )
        .astype(str)
        .str.zfill(7)
    )

    expected_booking_reference = (
        "VIP-202501-"
        + booking_id_strings
    )

    booking_reference_valid = (
        work_df["booking_reference"]
        .astype("string")
        .eq(expected_booking_reference)
        .fillna(False)
    )

    # -------------------------------------------------
    # Referans tablolarla birleştir
    # -------------------------------------------------

    work_df = work_df.merge(
        vehicles_lookup,
        on="vehicle_id",
        how="left",
        validate="many_to_one",
    )

    work_df = work_df.merge(
        pickup_zone_lookup,
        on="pickup_zone_id",
        how="left",
        validate="many_to_one",
    )

    work_df = work_df.merge(
        route_matrix_df,
        on=[
            "pickup_zone_id",
            "dropoff_zone_id",
        ],
        how="left",
        validate="many_to_one",
    )

    if len(work_df) != original_row_count:
        raise ValueError(
            "Referans tablo birleştirmesinde satır sayısı değişti."
        )

    # Merge sonrasında index değişebileceği için yeniden hizala.
    work_df = work_df.reset_index(drop=True)

    # Referanslardan gelen alanların hassasiyetini 06 ile eşitle.
    work_df["route_price_per_km"] = (
        work_df["route_price_per_km"]
        .astype("float64")
        .round(6)
    )

    work_df["pickup_zone_base_price"] = (
        work_df["pickup_zone_base_price"]
        .astype("float64")
        .round(2)
    )

    work_df["pickup_zone_min_price"] = (
        work_df["pickup_zone_min_price"]
        .astype("float64")
        .round(2)
    )

    work_df["vehicle_price_multiplier"] = (
        work_df["vehicle_price_multiplier"]
        .astype("float64")
        .round(6)
    )

    work_df["current_vehicle_opening_price"] = (
        work_df["current_vehicle_opening_price"]
        .astype("float64")
        .round(2)
    )

    id_sequence_valid = id_sequence_valid.reset_index(drop=True)
    booking_reference_valid = (
        booking_reference_valid.reset_index(drop=True)
    )

    # -------------------------------------------------
    # Referans kayıt kontrolü
    # -------------------------------------------------

    vehicle_reference_valid = (
        work_df["vehicle_price_multiplier"].notna()
        & work_df["current_vehicle_opening_price"].notna()
    )

    zone_reference_valid = (
        work_df["pickup_zone_base_price"].notna()
        & work_df["pickup_zone_min_price"].notna()
        & work_df["pickup_zone_currency"].notna()
    )

    route_reference_valid = (
        work_df["route_price_per_km"].notna()
    )

    all_references_valid = (
        vehicle_reference_valid
        & zone_reference_valid
        & route_reference_valid
    )

    # -------------------------------------------------
    # SQL alan kuralları
    # -------------------------------------------------

    distance_valid = (
        work_df["distance_km"].notna()
        & (work_df["distance_km"] >= 0)
    )

    surge_valid = (
        work_df["surge_multiplier"].notna()
        & (work_df["surge_multiplier"] >= 1)
    )

    discount_valid = (
        work_df["discount_amount"].notna()
        & work_df["loyalty_discount"].notna()
        & (work_df["discount_amount"] >= 0)
        & (work_df["loyalty_discount"] >= 0)
    )

    opening_price_valid = (
        work_df["reservation_opening_price"].notna()
        & (
            work_df["reservation_opening_price"]
            >= 0
        )
    )

    stored_prices_valid = (
        work_df["stored_base_price"].notna()
        & work_df["stored_calculated_price"].notna()
        & (work_df["stored_base_price"] >= 0)
        & (
            work_df["stored_calculated_price"]
            >= 0
        )
    )

    currency_valid = (
        work_df["reservation_currency"]
        .astype("string")
        .eq("TRY")
        .fillna(False)
        & work_df["pickup_zone_currency"]
        .astype("string")
        .eq("TRY")
        .fillna(False)
    )

    # -------------------------------------------------
    # Fiyat formülünü yeniden hesapla
    # -------------------------------------------------

    # 1. Mesafe ücreti:
    # distance_km × rota üzerindeki ağırlıklı TL/km
    work_df["expected_distance_fee"] = (
        work_df["distance_km"]
        * work_df["route_price_per_km"]
    ).round(2)

    # 2. Flag ücreti:
    # pickup zone base_price + rezervasyondaki opening_price snapshot
    work_df["expected_flag_fee"] = (
        work_df["pickup_zone_base_price"]
        + work_df["reservation_opening_price"]
    ).round(2)

    # 3. Base price:
    # flag fee + distance fee
    work_df["expected_base_price"] = (
        work_df["expected_flag_fee"]
        + work_df["expected_distance_fee"]
    ).round(2)

    # 4. Araç sınıfı çarpanı
    work_df[
        "expected_price_after_vehicle_multiplier"
    ] = (
        work_df["expected_base_price"]
        * work_df["vehicle_price_multiplier"]
    ).round(2)

    # 5. Surge çarpanı
    work_df["expected_price_after_surge"] = (
        work_df[
            "expected_price_after_vehicle_multiplier"
        ]
        * work_df["surge_multiplier"]
    ).round(2)

    # 6. İndirimlerden sonraki net fiyat
    work_df["expected_net_price"] = (
        work_df["expected_price_after_surge"]
        - work_df["discount_amount"]
        - work_df["loyalty_discount"]
    ).round(2)

    # 7. Minimum fiyat en son uygulanır
    work_df["expected_calculated_price"] = (
        np.maximum(
            work_df["expected_net_price"],
            work_df["pickup_zone_min_price"],
        )
    ).round(2)

    # -------------------------------------------------
    # Farklar
    # -------------------------------------------------

    work_df["base_price_difference"] = (
        work_df["stored_base_price"]
        - work_df["expected_base_price"]
    ).round(4)

    work_df["calculated_price_difference"] = (
        work_df["stored_calculated_price"]
        - work_df["expected_calculated_price"]
    ).round(4)

    work_df["opening_price_snapshot_difference"] = (
        work_df["reservation_opening_price"]
        - work_df["current_vehicle_opening_price"]
    ).round(4)

    base_price_valid = values_are_close(
        work_df["stored_base_price"],
        work_df["expected_base_price"],
    )

    calculated_price_valid = values_are_close(
        work_df["stored_calculated_price"],
        work_df["expected_calculated_price"],
    )

    # opening_price tarihsel snapshot olduğu için güncel araç değeriyle
    # fark bulunması formül hatası sayılmaz; ayrı uyarı olarak raporlanır.
    opening_snapshot_matches_current_vehicle = (
        values_are_close(
            work_df["reservation_opening_price"],
            work_df["current_vehicle_opening_price"],
        )
    )

    # -------------------------------------------------
    # Satırın genel durumu
    # -------------------------------------------------

    row_valid = (
        id_sequence_valid
        & booking_reference_valid
        & all_references_valid
        & distance_valid
        & surge_valid
        & discount_valid
        & opening_price_valid
        & stored_prices_valid
        & currency_valid
        & base_price_valid
        & calculated_price_valid
    )

    # -------------------------------------------------
    # Hata açıklamaları
    # -------------------------------------------------

    validation_errors = pd.Series(
        "",
        index=work_df.index,
        dtype="string",
    )

    validation_errors = add_validation_error(
        validation_errors,
        ~id_sequence_valid,
        "RESERVATION_ID_SEQUENCE_INVALID",
    )

    validation_errors = add_validation_error(
        validation_errors,
        ~booking_reference_valid,
        "BOOKING_REFERENCE_INVALID",
    )

    validation_errors = add_validation_error(
        validation_errors,
        ~vehicle_reference_valid,
        "VEHICLE_REFERENCE_MISSING",
    )

    validation_errors = add_validation_error(
        validation_errors,
        ~zone_reference_valid,
        "PICKUP_ZONE_REFERENCE_MISSING",
    )

    validation_errors = add_validation_error(
        validation_errors,
        ~route_reference_valid,
        "ROUTE_PRICE_REFERENCE_MISSING",
    )

    validation_errors = add_validation_error(
        validation_errors,
        ~distance_valid,
        "DISTANCE_KM_INVALID",
    )

    validation_errors = add_validation_error(
        validation_errors,
        ~surge_valid,
        "SURGE_MULTIPLIER_INVALID",
    )

    validation_errors = add_validation_error(
        validation_errors,
        ~discount_valid,
        "DISCOUNT_VALUE_INVALID",
    )

    validation_errors = add_validation_error(
        validation_errors,
        ~opening_price_valid,
        "OPENING_PRICE_INVALID",
    )

    validation_errors = add_validation_error(
        validation_errors,
        ~stored_prices_valid,
        "STORED_PRICE_INVALID",
    )

    validation_errors = add_validation_error(
        validation_errors,
        ~currency_valid,
        "CURRENCY_NOT_TRY",
    )

    validation_errors = add_validation_error(
        validation_errors,
        ~base_price_valid,
        "BASE_PRICE_FORMULA_MISMATCH",
    )

    validation_errors = add_validation_error(
        validation_errors,
        ~calculated_price_valid,
        "CALCULATED_PRICE_FORMULA_MISMATCH",
    )

    work_df["validation_errors"] = validation_errors
    work_df["price_validation_passed"] = row_valid

    work_df[
        "opening_snapshot_matches_current_vehicle"
    ] = opening_snapshot_matches_current_vehicle

    validation_masks = {
        "id_sequence_valid": id_sequence_valid,
        "booking_reference_valid": (
            booking_reference_valid
        ),
        "vehicle_reference_valid": (
            vehicle_reference_valid
        ),
        "zone_reference_valid": (
            zone_reference_valid
        ),
        "route_reference_valid": (
            route_reference_valid
        ),
        "distance_valid": distance_valid,
        "surge_valid": surge_valid,
        "discount_valid": discount_valid,
        "opening_price_valid": opening_price_valid,
        "stored_prices_valid": stored_prices_valid,
        "currency_valid": currency_valid,
        "base_price_valid": base_price_valid,
        "calculated_price_valid": (
            calculated_price_valid
        ),
        "opening_snapshot_matches_current_vehicle": (
            opening_snapshot_matches_current_vehicle
        ),
        "row_valid": row_valid,
    }

    return work_df, validation_masks


# =====================================================
# 7. INVALID RAPOR SÜTUNLARI
# =====================================================

INVALID_REPORT_COLUMNS = [
    "id",
    "booking_reference",
    "vehicle_id",
    "pickup_zone_id",
    "dropoff_zone_id",
    "distance_km",
    "route_price_per_km",
    "expected_distance_fee",
    "pickup_zone_base_price",
    "reservation_opening_price",
    "current_vehicle_opening_price",
    "expected_flag_fee",
    "stored_base_price",
    "expected_base_price",
    "base_price_difference",
    "vehicle_price_multiplier",
    "surge_multiplier",
    "expected_price_after_vehicle_multiplier",
    "expected_price_after_surge",
    "discount_amount",
    "loyalty_discount",
    "expected_net_price",
    "pickup_zone_min_price",
    "stored_calculated_price",
    "expected_calculated_price",
    "calculated_price_difference",
    "reservation_currency",
    "validation_errors",
]


AUDIT_SAMPLE_COLUMNS = [
    "id",
    "booking_reference",
    "pickup_zone_id",
    "dropoff_zone_id",
    "distance_km",
    "route_price_per_km",
    "expected_distance_fee",
    "pickup_zone_base_price",
    "reservation_opening_price",
    "expected_flag_fee",
    "stored_base_price",
    "expected_base_price",
    "vehicle_price_multiplier",
    "surge_multiplier",
    "expected_price_after_surge",
    "discount_amount",
    "loyalty_discount",
    "expected_net_price",
    "pickup_zone_min_price",
    "stored_calculated_price",
    "expected_calculated_price",
    "price_validation_passed",
]


# =====================================================
# 8. TÜM RESERVATIONS DOSYASINI DOĞRULAMA
# =====================================================

def validate_all_reservations(
    vehicles_lookup: pd.DataFrame,
    pickup_zone_lookup: pd.DataFrame,
    route_matrix_df: pd.DataFrame,
) -> dict:
    """
    Büyük reservations.csv dosyasını parça parça doğrular.
    """

    require_file(RESERVATIONS_FILE)

    if INVALID_PRICES_FILE.exists():
        INVALID_PRICES_FILE.unlink()

    invalid_file_written = False

    audit_sample_frames = []
    remaining_sample_rows = AUDIT_SAMPLE_SIZE

    counters = {
        "total_rows": 0,
        "valid_rows": 0,
        "invalid_rows": 0,
        "id_sequence_error_count": 0,
        "booking_reference_error_count": 0,
        "missing_vehicle_count": 0,
        "missing_zone_count": 0,
        "missing_route_count": 0,
        "invalid_distance_count": 0,
        "invalid_surge_count": 0,
        "invalid_discount_count": 0,
        "invalid_opening_price_count": 0,
        "invalid_stored_price_count": 0,
        "invalid_currency_count": 0,
        "base_price_mismatch_count": 0,
        "calculated_price_mismatch_count": 0,
        "opening_snapshot_warning_count": 0,
    }

    base_absolute_difference_sum = 0.0
    base_absolute_difference_max = 0.0

    final_absolute_difference_sum = 0.0
    final_absolute_difference_max = 0.0

    expected_first_id = 1

    csv_iterator = pd.read_csv(
        RESERVATIONS_FILE,
        usecols=RESERVATION_COLUMNS,
        chunksize=CHUNK_SIZE,
        low_memory=False,
    )

    for chunk_number, chunk in enumerate(
        csv_iterator,
        start=1,
    ):
        validated_chunk, masks = (
            validate_reservation_chunk(
                chunk=chunk,
                vehicles_lookup=vehicles_lookup,
                pickup_zone_lookup=pickup_zone_lookup,
                route_matrix_df=route_matrix_df,
                expected_first_id=expected_first_id,
            )
        )

        chunk_row_count = len(validated_chunk)

        expected_first_id += chunk_row_count

        counters["total_rows"] += chunk_row_count
        counters["valid_rows"] += int(
            masks["row_valid"].sum()
        )
        counters["invalid_rows"] += int(
            (~masks["row_valid"]).sum()
        )

        counters["id_sequence_error_count"] += int(
            (~masks["id_sequence_valid"]).sum()
        )

        counters[
            "booking_reference_error_count"
        ] += int(
            (~masks["booking_reference_valid"]).sum()
        )

        counters["missing_vehicle_count"] += int(
            (~masks["vehicle_reference_valid"]).sum()
        )

        counters["missing_zone_count"] += int(
            (~masks["zone_reference_valid"]).sum()
        )

        counters["missing_route_count"] += int(
            (~masks["route_reference_valid"]).sum()
        )

        counters["invalid_distance_count"] += int(
            (~masks["distance_valid"]).sum()
        )

        counters["invalid_surge_count"] += int(
            (~masks["surge_valid"]).sum()
        )

        counters["invalid_discount_count"] += int(
            (~masks["discount_valid"]).sum()
        )

        counters[
            "invalid_opening_price_count"
        ] += int(
            (~masks["opening_price_valid"]).sum()
        )

        counters[
            "invalid_stored_price_count"
        ] += int(
            (~masks["stored_prices_valid"]).sum()
        )

        counters["invalid_currency_count"] += int(
            (~masks["currency_valid"]).sum()
        )

        counters[
            "base_price_mismatch_count"
        ] += int(
            (~masks["base_price_valid"]).sum()
        )

        counters[
            "calculated_price_mismatch_count"
        ] += int(
            (~masks["calculated_price_valid"]).sum()
        )

        counters[
            "opening_snapshot_warning_count"
        ] += int(
            (
                ~masks[
                    "opening_snapshot_matches_current_vehicle"
                ]
            ).sum()
        )

        # -------------------------------------------------
        # Fiyat farkı istatistikleri
        # -------------------------------------------------

        base_absolute_differences = (
            validated_chunk[
                "base_price_difference"
            ]
            .abs()
            .dropna()
        )

        if not base_absolute_differences.empty:
            base_absolute_difference_sum += float(
                base_absolute_differences.sum()
            )

            base_absolute_difference_max = max(
                base_absolute_difference_max,
                float(
                    base_absolute_differences.max()
                ),
            )

        final_absolute_differences = (
            validated_chunk[
                "calculated_price_difference"
            ]
            .abs()
            .dropna()
        )

        if not final_absolute_differences.empty:
            final_absolute_difference_sum += float(
                final_absolute_differences.sum()
            )

            final_absolute_difference_max = max(
                final_absolute_difference_max,
                float(
                    final_absolute_differences.max()
                ),
            )

        # -------------------------------------------------
        # Hatalı satırları yaz
        # -------------------------------------------------

        invalid_chunk = validated_chunk.loc[
            ~masks["row_valid"],
            INVALID_REPORT_COLUMNS,
        ].copy()

        if not invalid_chunk.empty:
            invalid_chunk.to_csv(
                INVALID_PRICES_FILE,
                index=False,
                encoding="utf-8",
                na_rep="",
                mode=(
                    "a"
                    if invalid_file_written
                    else "w"
                ),
                header=not invalid_file_written,
            )

            invalid_file_written = True

        # -------------------------------------------------
        # Küçük denetim örneği
        # -------------------------------------------------

        if remaining_sample_rows > 0:
            sample_part = validated_chunk[
                AUDIT_SAMPLE_COLUMNS
            ].head(remaining_sample_rows)

            audit_sample_frames.append(
                sample_part
            )

            remaining_sample_rows -= len(
                sample_part
            )

        print(
            f"Parça {chunk_number}: "
            f"{counters['total_rows']:,} rezervasyon kontrol edildi, "
            f"{counters['invalid_rows']:,} hatalı."
        )

    # Hiç hata yoksa yine de başlıklı boş dosya oluştur.
    if not invalid_file_written:
        pd.DataFrame(
            columns=INVALID_REPORT_COLUMNS
        ).to_csv(
            INVALID_PRICES_FILE,
            index=False,
            encoding="utf-8",
        )

    if audit_sample_frames:
        audit_sample_df = pd.concat(
            audit_sample_frames,
            ignore_index=True,
        )
    else:
        audit_sample_df = pd.DataFrame(
            columns=AUDIT_SAMPLE_COLUMNS
        )

    audit_sample_df.to_csv(
        PRICE_AUDIT_SAMPLE_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    total_rows = counters["total_rows"]

    counters[
        "average_absolute_base_price_difference"
    ] = (
        base_absolute_difference_sum / total_rows
        if total_rows > 0
        else 0.0
    )

    counters[
        "maximum_absolute_base_price_difference"
    ] = base_absolute_difference_max

    counters[
        "average_absolute_calculated_price_difference"
    ] = (
        final_absolute_difference_sum / total_rows
        if total_rows > 0
        else 0.0
    )

    counters[
        "maximum_absolute_calculated_price_difference"
    ] = final_absolute_difference_max

    counters["validation_passed"] = (
        counters["invalid_rows"] == 0
    )

    return counters


# =====================================================
# 9. RAPORLAMA
# =====================================================

def save_validation_reports(
    counters: dict,
) -> None:
    """
    Fiyat doğrulama özetini JSON ve CSV olarak kaydeder.
    """

    metrics_rows = [
        {
            "metric": metric_name,
            "value": metric_value,
        }
        for metric_name, metric_value
        in counters.items()
    ]

    pd.DataFrame(metrics_rows).to_csv(
        VALIDATION_METRICS_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    total_rows = counters["total_rows"]

    validation_rate = (
        counters["valid_rows"]
        / total_rows
        * 100
        if total_rows > 0
        else 0
    )

    summary = {
        "reservations_file": str(
            RESERVATIONS_FILE
        ),
        "vehicles_file": str(
            VEHICLES_FILE
        ),
        "pricing_zones_file": str(
            PRICING_ZONES_FILE
        ),
        "route_pricing_matrix_file": str(
            ROUTE_PRICING_MATRIX_FILE
        ),
        "total_reservations": int(
            counters["total_rows"]
        ),
        "valid_reservations": int(
            counters["valid_rows"]
        ),
        "invalid_reservations": int(
            counters["invalid_rows"]
        ),
        "validation_rate_percentage": round(
            validation_rate,
            6,
        ),
        "validation_passed": bool(
            counters["validation_passed"]
        ),
        "currency_expected": "TRY",
        "price_tolerance_try": (
            PRICE_TOLERANCE
        ),
        "pricing_precision": {
            "distance_km_decimals": 3,
            "route_price_per_km_decimals": 6,
            "money_decimals": 2,
            "surge_multiplier_decimals": 2,
            "matches_06_create_reservations": True,
        },
        "formula": {
            "distance_fee": (
                "distance_km × route_price_per_km"
            ),
            "flag_fee": (
                "pickup_zone.base_price "
                "+ reservation.opening_price"
            ),
            "base_price": (
                "flag_fee + distance_fee"
            ),
            "vehicle_adjusted_price": (
                "base_price "
                "× vehicle.base_price_multiplier"
            ),
            "surge_price": (
                "vehicle_adjusted_price "
                "× reservation.surge_multiplier"
            ),
            "net_price": (
                "surge_price "
                "- discount_amount "
                "- loyalty_discount"
            ),
            "calculated_price": (
                "MAX(net_price, pickup_zone.min_price)"
            ),
        },
        "error_counts": {
            "id_sequence": int(
                counters[
                    "id_sequence_error_count"
                ]
            ),
            "booking_reference": int(
                counters[
                    "booking_reference_error_count"
                ]
            ),
            "missing_vehicle": int(
                counters[
                    "missing_vehicle_count"
                ]
            ),
            "missing_pickup_zone": int(
                counters[
                    "missing_zone_count"
                ]
            ),
            "missing_route": int(
                counters[
                    "missing_route_count"
                ]
            ),
            "invalid_distance": int(
                counters[
                    "invalid_distance_count"
                ]
            ),
            "invalid_surge": int(
                counters[
                    "invalid_surge_count"
                ]
            ),
            "invalid_discount": int(
                counters[
                    "invalid_discount_count"
                ]
            ),
            "invalid_opening_price": int(
                counters[
                    "invalid_opening_price_count"
                ]
            ),
            "invalid_stored_price": int(
                counters[
                    "invalid_stored_price_count"
                ]
            ),
            "invalid_currency": int(
                counters[
                    "invalid_currency_count"
                ]
            ),
            "base_price_formula_mismatch": int(
                counters[
                    "base_price_mismatch_count"
                ]
            ),
            "calculated_price_formula_mismatch": int(
                counters[
                    "calculated_price_mismatch_count"
                ]
            ),
        },
        "warnings": {
            "opening_price_snapshot_differs_from_current_vehicle": int(
                counters[
                    "opening_snapshot_warning_count"
                ]
            ),
            "explanation": (
                "reservations.opening_price tarihsel snapshot alanıdır. "
                "Araç fiyatı daha sonra değişirse bu fark normal olabilir. "
                "Aynı pipeline çalıştırmasında fark beklenmez."
            ),
        },
        "price_difference_statistics": {
            "average_absolute_base_price_difference": round(
                float(
                    counters[
                        "average_absolute_base_price_difference"
                    ]
                ),
                6,
            ),
            "maximum_absolute_base_price_difference": round(
                float(
                    counters[
                        "maximum_absolute_base_price_difference"
                    ]
                ),
                6,
            ),
            "average_absolute_calculated_price_difference": round(
                float(
                    counters[
                        "average_absolute_calculated_price_difference"
                    ]
                ),
                6,
            ),
            "maximum_absolute_calculated_price_difference": round(
                float(
                    counters[
                        "maximum_absolute_calculated_price_difference"
                    ]
                ),
                6,
            ),
        },
        "source_usd_price_used": False,
        "usd_to_try_conversion_applied": False,
        "reservations_file_modified": False,
        "invalid_rows_file": str(
            INVALID_PRICES_FILE
        ),
        "audit_sample_file": str(
            PRICE_AUDIT_SAMPLE_FILE
        ),
    }

    with open(
        VALIDATION_SUMMARY_FILE,
        "w",
        encoding="utf-8",
    ) as json_file:
        json.dump(
            summary,
            json_file,
            ensure_ascii=False,
            indent=4,
        )


# =====================================================
# 10. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 70)
    print("06B — REZERVASYON FİYATLARININ DOĞRULANMASI")
    print("=" * 70)

    require_file(RESERVATIONS_FILE)

    print(f"Rezervasyon dosyası: {RESERVATIONS_FILE}")

    (
        vehicles_lookup,
        pickup_zone_lookup,
        route_matrix_df,
    ) = read_reference_tables()

    print("\nFiyatlar parça parça doğrulanıyor...")

    counters = validate_all_reservations(
        vehicles_lookup=vehicles_lookup,
        pickup_zone_lookup=pickup_zone_lookup,
        route_matrix_df=route_matrix_df,
    )

    save_validation_reports(counters)

    print("\n" + "=" * 70)
    print("FİYAT DOĞRULAMA SONUCU")
    print("=" * 70)

    print(
        f"Toplam rezervasyon : "
        f"{counters['total_rows']:,}"
    )

    print(
        f"Geçerli fiyat      : "
        f"{counters['valid_rows']:,}"
    )

    print(
        f"Hatalı fiyat       : "
        f"{counters['invalid_rows']:,}"
    )

    print(
        "Base price uyuşmazlığı: "
        f"{counters['base_price_mismatch_count']:,}"
    )

    print(
        "Final fiyat uyuşmazlığı: "
        f"{counters['calculated_price_mismatch_count']:,}"
    )

    print(
        "Opening price snapshot uyarısı: "
        f"{counters['opening_snapshot_warning_count']:,}"
    )

    print(f"\nRapor klasörü: {REPORT_DIR}")
    print(f"- {INVALID_PRICES_FILE.name}")
    print(f"- {PRICE_AUDIT_SAMPLE_FILE.name}")
    print(f"- {VALIDATION_METRICS_FILE.name}")
    print(f"- {VALIDATION_SUMMARY_FILE.name}")

    print("\nKontroller:")
    print("USD/TL dönüşümü yapılmadı.")
    print("reservations.csv değiştirilmedi.")
    print("Bölge bazlı rota ücreti yeniden hesaplandı.")
    print("Araç açılış ücreti base_price içine dahil edildi.")
    print("Araç sınıfı çarpanı kontrol edildi.")
    print("Surge multiplier kontrol edildi.")
    print("Kampanya ve sadakat indirimleri dikkate alındı.")
    print("Bölge minimum fiyatı en son uygulandı.")
    print("Para biriminin TRY olduğu kontrol edildi.")

    if counters["validation_passed"]:
        print(
            "\nBütün rezervasyon fiyatları "
            "sistem mimarisiyle uyumludur."
        )

    elif FAIL_ON_VALIDATION_ERROR:
        raise ValueError(
            "\nRezervasyon fiyatlarında hata bulundu. "
            "Ayrıntılar için şu dosyayı kontrol et:\n"
            f"{INVALID_PRICES_FILE}"
        )

    else:
        print(
            "\nFiyat hataları bulundu ancak "
            "FAIL_ON_VALIDATION_ERROR=False olduğu için "
            "pipeline durdurulmadı."
        )


if __name__ == "__main__":
    main()