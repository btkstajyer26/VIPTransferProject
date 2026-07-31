import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

try:
    import pyarrow.parquet as pq
except ImportError as error:
    raise ImportError(
        "Parquet verisini parça parça kontrol etmek için pyarrow gereklidir.\n"
        "VS Code terminalinde şu komutu çalıştır:\n\n"
        "pip install pyarrow"
    ) from error

try:
    from shapely import wkt
    from shapely.geometry import Point
except ImportError as error:
    raise ImportError(
        "PostGIS geometrilerini doğrulamak için shapely gereklidir.\n"
        "VS Code terminalinde şu komutu çalıştır:\n\n"
        "pip install shapely"
    ) from error


# Windows terminalinde Türkçe karakter desteği
try:
    sys.stdout.reconfigure(encoding="utf-8")
except AttributeError:
    pass


# =====================================================
# 1. AYARLAR
# =====================================================

CHUNK_SIZE = 200_000

EXPECTED_CURRENCY = "TRY"
EXPECTED_SRID_PREFIX = "SRID=4326;"

# Hata bulunursa pipeline durdurulsun.
FAIL_ON_VALIDATION_ERROR = True

VALIDATION_VERSION = "istanbul-location-validation-v2"


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

REFERENCE_DATA_DIR = PROJECT_ROOT / "data" / "reference"
GENERATED_DATA_DIR = PROJECT_ROOT / "data" / "generated"
PROCESSED_DATA_DIR = PROJECT_ROOT / "data" / "processed"

REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "11_validate_istanbul_locations"
)

REFERENCE_DATA_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

REPORT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


PRICING_ZONES_FILE = (
    REFERENCE_DATA_DIR
    / "pricing_zones.csv"
)

PRICING_ZONE_CENTERS_FILE = (
    REFERENCE_DATA_DIR
    / "pricing_zone_centers.csv"
)

ZONE_MAPPING_FILE = (
    REFERENCE_DATA_DIR
    / "zone_mapping_istanbul.csv"
)

ROUTE_PRICING_MATRIX_FILE = (
    REFERENCE_DATA_DIR
    / "route_pricing_matrix.csv"
)

RESERVATIONS_FILE = (
    GENERATED_DATA_DIR
    / "reservations.csv"
)

RESERVATIONS_ANALYTICS_FILE = (
    PROCESSED_DATA_DIR
    / "reservations_analytics.parquet"
)


ISTANBUL_ZONE_CATALOG_FILE = (
    REFERENCE_DATA_DIR
    / "istanbul_zone_catalog.csv"
)

INVALID_RESERVATION_LOCATIONS_FILE = (
    REPORT_DIR
    / "invalid_reservation_locations.csv"
)

INVALID_SOURCE_MAPPING_FILE = (
    REPORT_DIR
    / "invalid_source_zone_mappings.csv"
)

POLYGON_CENTER_CHECKS_FILE = (
    REPORT_DIR
    / "polygon_center_checks.csv"
)

ZONE_UTILIZATION_FILE = (
    REPORT_DIR
    / "zone_utilization.csv"
)

ROUTE_PAIR_UTILIZATION_FILE = (
    REPORT_DIR
    / "route_pair_utilization.csv"
)

LOCATION_METRICS_FILE = (
    REPORT_DIR
    / "location_validation_metrics.csv"
)

LOCATION_SUMMARY_FILE = (
    REPORT_DIR
    / "location_validation_summary.json"
)


# =====================================================
# 3. GEREKLİ SÜTUNLAR
# =====================================================

PRICING_ZONE_COLUMNS = [
    "id",
    "name",
    "description",
    "polygon_geom",
    "base_price",
    "min_price",
    "price_per_km",
    "currency",
    "is_active",
    "created_at",
    "updated_at",
]

ZONE_CENTER_COLUMNS = [
    "zone_id",
    "zone_name",
    "zone_category",
    "center_lon",
    "center_lat",
    "polygon_method",
]

ZONE_MAPPING_COLUMNS = [
    "source_location_id",
    "pricing_zone_id",
    "pricing_zone_name",
    "mapping_method",
    "is_simulated",
    "created_at",
]

ROUTE_MATRIX_COLUMNS = [
    "pickup_zone_id",
    "dropoff_zone_id",
    "route_polyline",
    "route_price_per_km",
    "crossed_zone_count",
    "crossed_zone_ids",
    "zone_segment_weights_json",
    "route_method",
]

RESERVATION_LOCATION_COLUMNS = [
    "id",
    "booking_reference",
    "pickup_zone_id",
    "dropoff_zone_id",
    "pickup_address",
    "pickup_point",
    "dropoff_address",
    "dropoff_point",
    "route_polyline",
    "currency",
]

ANALYTICS_MAPPING_COLUMNS = [
    "source_trip_id",
    "source_pickup_location_id",
    "source_dropoff_location_id",
    "pickup_zone_id",
    "dropoff_zone_id",
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
    Gerekli sütunların DataFrame içinde bulunduğunu doğrular.
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


def strip_ewkt_srid(ewkt_value: str) -> str:
    """
    SRID=4326;POLYGON(...) değerinden WKT kısmını ayırır.
    """

    text = str(ewkt_value).strip()

    if not text.startswith(EXPECTED_SRID_PREFIX):
        raise ValueError(
            "Geometri SRID=4326 ile başlamıyor:\n"
            f"{text[:150]}"
        )

    return text.split(";", 1)[1]


def normalize_text_series(
    series: pd.Series,
) -> pd.Series:
    """
    Metin karşılaştırmalarında gereksiz boşlukları temizler.
    """

    return (
        series.astype("string")
        .fillna("")
        .str.strip()
        .str.replace(
            r"\s+",
            " ",
            regex=True,
        )
    )


def expected_point_ewkt(
    longitude: float,
    latitude: float,
) -> str:
    """
    Zone merkezi için standart EWKT point değeri oluşturur.
    """

    return (
        "SRID=4326;POINT("
        f"{longitude:.6f} "
        f"{latitude:.6f}"
        ")"
    )



POINT_EWKT_PATTERN = (
    r"^\s*SRID=4326;POINT\(\s*"
    r"([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?)"
    r"\s+"
    r"([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?)"
    r"\s*\)\s*$"
)


def point_ewkt_matches(
    actual_series: pd.Series,
    expected_series: pd.Series,
    tolerance: float = 1e-6,
) -> pd.Series:
    """
    İki SRID=4326;POINT(...) serisini metin olarak değil,
    koordinat değerleri üzerinden karşılaştırır.

    Örneğin aşağıdaki iki değer aynı noktadır:
    - SRID=4326;POINT(28.98 41.01)
    - SRID=4326;POINT(28.980000 41.010000)

    Eski doğrulama bunları farklı metinler olarak görüyordu.
    """

    actual_coordinates = (
        actual_series.astype("string")
        .str.strip()
        .str.extract(
            POINT_EWKT_PATTERN,
            expand=True,
        )
    )

    expected_coordinates = (
        expected_series.astype("string")
        .str.strip()
        .str.extract(
            POINT_EWKT_PATTERN,
            expand=True,
        )
    )

    actual_lon = pd.to_numeric(
        actual_coordinates[0],
        errors="coerce",
    )

    actual_lat = pd.to_numeric(
        actual_coordinates[1],
        errors="coerce",
    )

    expected_lon = pd.to_numeric(
        expected_coordinates[0],
        errors="coerce",
    )

    expected_lat = pd.to_numeric(
        expected_coordinates[1],
        errors="coerce",
    )

    valid_format = (
        actual_lon.notna()
        & actual_lat.notna()
        & expected_lon.notna()
        & expected_lat.notna()
    )

    longitude_matches = pd.Series(
        np.isclose(
            actual_lon,
            expected_lon,
            atol=tolerance,
            rtol=0,
            equal_nan=False,
        ),
        index=actual_series.index,
    )

    latitude_matches = pd.Series(
        np.isclose(
            actual_lat,
            expected_lat,
            atol=tolerance,
            rtol=0,
            equal_nan=False,
        ),
        index=actual_series.index,
    )

    return (
        valid_format
        & longitude_matches
        & latitude_matches
    )


def append_errors(
    error_series: pd.Series,
    condition: pd.Series,
    error_code: str,
) -> pd.Series:
    """
    Bir satırdaki birden fazla hatayı | karakteriyle birleştirir.
    """

    condition = condition.fillna(True)

    current_values = (
        error_series.loc[condition]
        .fillna("")
        .astype(str)
    )

    separators = np.where(
        current_values.str.len() > 0,
        " | ",
        "",
    )

    error_series.loc[condition] = (
        current_values
        + separators
        + error_code
    )

    return error_series


# =====================================================
# 5. REFERANS DOSYALARINI OKUMA
# =====================================================

def read_reference_files():
    """
    Pricing zone, merkez, mapping ve rota matrisini okur.
    """

    required_files = [
        PRICING_ZONES_FILE,
        PRICING_ZONE_CENTERS_FILE,
        ZONE_MAPPING_FILE,
        ROUTE_PRICING_MATRIX_FILE,
    ]

    for file_path in required_files:
        require_file(file_path)

    pricing_zones_df = pd.read_csv(
        PRICING_ZONES_FILE,
        low_memory=False,
    )

    zone_centers_df = pd.read_csv(
        PRICING_ZONE_CENTERS_FILE,
        low_memory=False,
    )

    zone_mapping_df = pd.read_csv(
        ZONE_MAPPING_FILE,
        low_memory=False,
    )

    route_matrix_df = pd.read_csv(
        ROUTE_PRICING_MATRIX_FILE,
        low_memory=False,
    )

    validate_columns(
        pricing_zones_df,
        PRICING_ZONE_COLUMNS,
        "pricing_zones.csv",
    )

    validate_columns(
        zone_centers_df,
        ZONE_CENTER_COLUMNS,
        "pricing_zone_centers.csv",
    )

    validate_columns(
        zone_mapping_df,
        ZONE_MAPPING_COLUMNS,
        "zone_mapping_istanbul.csv",
    )

    validate_columns(
        route_matrix_df,
        ROUTE_MATRIX_COLUMNS,
        "route_pricing_matrix.csv",
    )

    return (
        pricing_zones_df,
        zone_centers_df,
        zone_mapping_df,
        route_matrix_df,
    )


# =====================================================
# 6. PRICING ZONE VE POLYGON DOĞRULAMA
# =====================================================

def validate_pricing_zones(
    pricing_zones_df: pd.DataFrame,
    zone_centers_df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Zone kimliği, isim, fiyat, polygon ve merkez uyumunu kontrol eder.
    """

    zones_df = pricing_zones_df.copy()
    centers_df = zone_centers_df.copy()

    zones_df["id"] = pd.to_numeric(
        zones_df["id"],
        errors="raise",
    ).astype("int64")

    centers_df["zone_id"] = pd.to_numeric(
        centers_df["zone_id"],
        errors="raise",
    ).astype("int64")

    centers_df["center_lon"] = pd.to_numeric(
        centers_df["center_lon"],
        errors="raise",
    )

    centers_df["center_lat"] = pd.to_numeric(
        centers_df["center_lat"],
        errors="raise",
    )

    zones_df["is_active"] = convert_boolean(
        zones_df["is_active"],
        "pricing_zones.is_active",
    )

    numeric_price_columns = [
        "base_price",
        "min_price",
        "price_per_km",
    ]

    for column in numeric_price_columns:
        zones_df[column] = pd.to_numeric(
            zones_df[column],
            errors="raise",
        )

    if zones_df["id"].duplicated().any():
        raise ValueError(
            "pricing_zones.id alanında tekrar bulundu."
        )

    if zones_df["name"].duplicated().any():
        duplicate_names = (
            zones_df.loc[
                zones_df["name"].duplicated(
                    keep=False
                ),
                "name",
            ]
            .drop_duplicates()
            .tolist()
        )

        raise ValueError(
            "pricing_zones.name alanında tekrar bulundu:\n"
            f"{duplicate_names}"
        )

    if centers_df["zone_id"].duplicated().any():
        raise ValueError(
            "pricing_zone_centers.zone_id alanında tekrar bulundu."
        )

    zone_ids = set(
        zones_df["id"].astype(int)
    )

    center_zone_ids = set(
        centers_df["zone_id"].astype(int)
    )

    if zone_ids != center_zone_ids:
        raise ValueError(
            "Pricing zone ve center kimlikleri uyuşmuyor.\n"
            f"Merkezi eksik zone: {sorted(zone_ids - center_zone_ids)}\n"
            f"Zone kaydı olmayan merkez: {sorted(center_zone_ids - zone_ids)}"
        )

    if not (
        zones_df["currency"]
        .astype("string")
        .str.upper()
        .eq(EXPECTED_CURRENCY)
    ).all():
        raise ValueError(
            "Bütün pricing zone para birimleri TRY olmalıdır."
        )

    for column in numeric_price_columns:
        if not (
            zones_df[column] >= 0
        ).all():
            raise ValueError(
                f"{column} alanında negatif değer bulundu."
            )

    if not (
        zones_df["min_price"]
        >= zones_df["base_price"]
    ).all():
        raise ValueError(
            "Bazı bölgelerde min_price, base_price değerinden küçük."
        )

    merged_df = zones_df.merge(
        centers_df,
        left_on="id",
        right_on="zone_id",
        how="inner",
        validate="one_to_one",
    )

    zone_name_matches = (
        normalize_text_series(
            merged_df["name"]
        )
        == normalize_text_series(
            merged_df["zone_name"]
        )
    )

    if not zone_name_matches.all():
        invalid_names = merged_df.loc[
            ~zone_name_matches,
            [
                "id",
                "name",
                "zone_name",
            ],
        ]

        raise ValueError(
            "pricing_zones ve zone_centers isimleri uyuşmuyor:\n"
            f"{invalid_names.head(20).to_string(index=False)}"
        )

    polygon_check_rows = []

    for row in merged_df.itertuples(index=False):
        polygon_valid = True
        polygon_is_empty = False
        center_inside_polygon = False
        geometry_type = None
        validation_error = ""

        try:
            polygon_text = strip_ewkt_srid(
                row.polygon_geom
            )

            polygon_geometry = wkt.loads(
                polygon_text
            )

            geometry_type = (
                polygon_geometry.geom_type
            )

            polygon_is_empty = (
                polygon_geometry.is_empty
            )

            polygon_valid = (
                polygon_geometry.is_valid
                and not polygon_is_empty
                and geometry_type
                in {
                    "Polygon",
                    "MultiPolygon",
                }
            )

            center_point = Point(
                float(row.center_lon),
                float(row.center_lat),
            )

            center_inside_polygon = (
                polygon_geometry.covers(
                    center_point
                )
            )

        except Exception as error:
            polygon_valid = False
            validation_error = str(error)

        polygon_check_rows.append(
            {
                "zone_id": int(row.id),
                "zone_name": row.name,
                "polygon_method": row.polygon_method,
                "geometry_type": geometry_type,
                "polygon_valid": polygon_valid,
                "polygon_is_empty": polygon_is_empty,
                "center_inside_polygon": (
                    center_inside_polygon
                ),
                "center_lon": float(
                    row.center_lon
                ),
                "center_lat": float(
                    row.center_lat
                ),
                "validation_error": (
                    validation_error
                ),
            }
        )

    polygon_checks_df = pd.DataFrame(
        polygon_check_rows
    )

    polygon_checks_df.to_csv(
        POLYGON_CENTER_CHECKS_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    invalid_polygon_rows = polygon_checks_df.loc[
        ~polygon_checks_df["polygon_valid"]
        | ~polygon_checks_df[
            "center_inside_polygon"
        ]
    ]

    if not invalid_polygon_rows.empty:
        raise ValueError(
            "Geçersiz polygon veya polygon dışında zone merkezi bulundu.\n"
            f"{invalid_polygon_rows.head(20).to_string(index=False)}"
        )

    zone_catalog_df = merged_df[
        [
            "id",
            "name",
            "description",
            "zone_category",
            "center_lon",
            "center_lat",
            "polygon_geom",
            "polygon_method",
            "base_price",
            "min_price",
            "price_per_km",
            "currency",
            "is_active",
            "created_at",
            "updated_at",
        ]
    ].rename(
        columns={
            "id": "zone_id",
            "name": "zone_name",
        }
    )

    zone_catalog_df["expected_point"] = (
        zone_catalog_df.apply(
            lambda row: expected_point_ewkt(
                float(row["center_lon"]),
                float(row["center_lat"]),
            ),
            axis=1,
        )
    )

    zone_catalog_df = zone_catalog_df.sort_values(
        "zone_id"
    ).reset_index(drop=True)

    return zone_catalog_df, polygon_checks_df


# =====================================================
# 7. ZONE MAPPING DOĞRULAMA
# =====================================================

def validate_zone_mapping(
    zone_mapping_df: pd.DataFrame,
    zone_catalog_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    NYC kaynak lokasyonlarının İstanbul zone eşleştirmesini doğrular.
    """

    mapping_df = zone_mapping_df.copy()

    mapping_df["source_location_id"] = pd.to_numeric(
        mapping_df["source_location_id"],
        errors="raise",
    ).astype("int64")

    mapping_df["pricing_zone_id"] = pd.to_numeric(
        mapping_df["pricing_zone_id"],
        errors="raise",
    ).astype("int64")

    mapping_df["is_simulated"] = convert_boolean(
        mapping_df["is_simulated"],
        "zone_mapping.is_simulated",
    )

    if mapping_df[
        "source_location_id"
    ].duplicated().any():
        raise ValueError(
            "Aynı source_location_id birden fazla kez eşlenmiş."
        )

    valid_zone_ids = set(
        zone_catalog_df["zone_id"].astype(int)
    )

    mapping_zone_ids = set(
        mapping_df["pricing_zone_id"].astype(int)
    )

    invalid_zone_ids = (
        mapping_zone_ids - valid_zone_ids
    )

    if invalid_zone_ids:
        raise ValueError(
            "Zone mapping içinde geçersiz pricing_zone_id bulundu:\n"
            f"{sorted(invalid_zone_ids)}"
        )

    zone_names_lookup = (
        zone_catalog_df
        .set_index("zone_id")["zone_name"]
    )

    expected_zone_names = (
        mapping_df["pricing_zone_id"]
        .map(zone_names_lookup)
    )

    zone_name_matches = (
        normalize_text_series(
            mapping_df["pricing_zone_name"]
        )
        == normalize_text_series(
            expected_zone_names
        )
    )

    if not zone_name_matches.all():
        invalid_rows = mapping_df.loc[
            ~zone_name_matches,
            [
                "source_location_id",
                "pricing_zone_id",
                "pricing_zone_name",
            ],
        ].copy()

        invalid_rows[
            "expected_zone_name"
        ] = expected_zone_names.loc[
            ~zone_name_matches
        ]

        raise ValueError(
            "Mapping içindeki zone adları pricing_zones ile uyuşmuyor:\n"
            f"{invalid_rows.head(20).to_string(index=False)}"
        )

    return mapping_df


# =====================================================
# 8. ROTA MATRİSİ DOĞRULAMA
# =====================================================

def validate_route_matrix(
    route_matrix_df: pd.DataFrame,
    zone_catalog_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Zone çiftleri için oluşturulan rota matrisini doğrular.
    """

    routes_df = route_matrix_df.copy()

    numeric_integer_columns = [
        "pickup_zone_id",
        "dropoff_zone_id",
        "crossed_zone_count",
    ]

    for column in numeric_integer_columns:
        routes_df[column] = pd.to_numeric(
            routes_df[column],
            errors="raise",
        ).astype("int64")

    routes_df["route_price_per_km"] = pd.to_numeric(
        routes_df["route_price_per_km"],
        errors="raise",
    )

    if routes_df[
        [
            "pickup_zone_id",
            "dropoff_zone_id",
        ]
    ].duplicated().any():
        raise ValueError(
            "Rota matrisinde aynı pickup/dropoff çifti "
            "birden fazla kez bulunuyor."
        )

    valid_zone_ids = set(
        zone_catalog_df["zone_id"].astype(int)
    )

    route_zone_ids = set(
        routes_df["pickup_zone_id"].astype(int)
    ).union(
        routes_df["dropoff_zone_id"].astype(int)
    )

    invalid_zone_ids = (
        route_zone_ids - valid_zone_ids
    )

    if invalid_zone_ids:
        raise ValueError(
            "Rota matrisinde geçersiz zone ID bulundu:\n"
            f"{sorted(invalid_zone_ids)}"
        )

    if not (
        routes_df["route_price_per_km"] >= 0
    ).all():
        raise ValueError(
            "Rota matrisinde negatif route_price_per_km bulundu."
        )

    if not (
        routes_df["crossed_zone_count"] >= 1
    ).all():
        raise ValueError(
            "crossed_zone_count en az 1 olmalıdır."
        )

    valid_route_format = (
        routes_df["route_polyline"]
        .astype("string")
        .str.startswith(
            "SRID=4326;LINESTRING("
        )
    )

    if not valid_route_format.all():
        raise ValueError(
            "Rota matrisinde geçersiz LINESTRING EWKT bulundu."
        )

    return routes_df


# =====================================================
# 9. RESERVATION LOKASYONLARINI DOĞRULAMA
# =====================================================

def validate_reservation_locations(
    zone_catalog_df: pd.DataFrame,
    route_matrix_df: pd.DataFrame,
) -> tuple[dict, pd.DataFrame, pd.DataFrame]:
    """
    Büyük reservations.csv dosyasını parça parça kontrol eder.
    """

    require_file(RESERVATIONS_FILE)

    if INVALID_RESERVATION_LOCATIONS_FILE.exists():
        INVALID_RESERVATION_LOCATIONS_FILE.unlink()

    invalid_file_written = False

    zone_lookup = zone_catalog_df[
        [
            "zone_id",
            "zone_name",
            "expected_point",
        ]
    ]

    pickup_lookup = zone_lookup.rename(
        columns={
            "zone_id": "pickup_zone_id",
            "zone_name": (
                "expected_pickup_zone_name"
            ),
            "expected_point": (
                "expected_pickup_point"
            ),
        }
    )

    dropoff_lookup = zone_lookup.rename(
        columns={
            "zone_id": "dropoff_zone_id",
            "zone_name": (
                "expected_dropoff_zone_name"
            ),
            "expected_point": (
                "expected_dropoff_point"
            ),
        }
    )

    route_lookup = route_matrix_df[
        [
            "pickup_zone_id",
            "dropoff_zone_id",
            "route_polyline",
        ]
    ].rename(
        columns={
            "route_polyline": (
                "expected_route_polyline"
            ),
        }
    )

    zone_usage_counts = {}
    route_pair_counts = {}

    counters = {
        "total_reservations": 0,
        "valid_reservations": 0,
        "invalid_reservations": 0,
        "unknown_pickup_zone_count": 0,
        "unknown_dropoff_zone_count": 0,
        "pickup_address_mismatch_count": 0,
        "dropoff_address_mismatch_count": 0,
        "pickup_point_mismatch_count": 0,
        "dropoff_point_mismatch_count": 0,
        "missing_route_pair_count": 0,
        "route_polyline_mismatch_count": 0,
        "invalid_currency_count": 0,
    }

    csv_iterator = pd.read_csv(
        RESERVATIONS_FILE,
        usecols=RESERVATION_LOCATION_COLUMNS,
        chunksize=CHUNK_SIZE,
        low_memory=False,
    )

    for chunk_number, chunk in enumerate(
        csv_iterator,
        start=1,
    ):
        validate_columns(
            chunk,
            RESERVATION_LOCATION_COLUMNS,
            "reservations.csv",
        )

        original_row_count = len(chunk)

        integer_columns = [
            "id",
            "pickup_zone_id",
            "dropoff_zone_id",
        ]

        for column in integer_columns:
            chunk[column] = pd.to_numeric(
                chunk[column],
                errors="coerce",
            ).astype("Int64")

        chunk = chunk.merge(
            pickup_lookup,
            on="pickup_zone_id",
            how="left",
            validate="many_to_one",
        )

        chunk = chunk.merge(
            dropoff_lookup,
            on="dropoff_zone_id",
            how="left",
            validate="many_to_one",
        )

        chunk = chunk.merge(
            route_lookup,
            on=[
                "pickup_zone_id",
                "dropoff_zone_id",
            ],
            how="left",
            validate="many_to_one",
        )

        if len(chunk) != original_row_count:
            raise ValueError(
                "Rezervasyon lokasyon birleştirmesinde "
                "satır sayısı değişti."
            )

        unknown_pickup_zone = (
            chunk[
                "expected_pickup_zone_name"
            ].isna()
        )

        unknown_dropoff_zone = (
            chunk[
                "expected_dropoff_zone_name"
            ].isna()
        )

        expected_pickup_address = (
            chunk[
                "expected_pickup_zone_name"
            ]
            + " / İstanbul"
        )

        expected_dropoff_address = (
            chunk[
                "expected_dropoff_zone_name"
            ]
            + " / İstanbul"
        )

        pickup_address_valid = (
            ~unknown_pickup_zone
            & (
                normalize_text_series(
                    chunk["pickup_address"]
                )
                == normalize_text_series(
                    expected_pickup_address
                )
            )
        )

        dropoff_address_valid = (
            ~unknown_dropoff_zone
            & (
                normalize_text_series(
                    chunk["dropoff_address"]
                )
                == normalize_text_series(
                    expected_dropoff_address
                )
            )
        )

        # POINT EWKT değerleri metin olarak değil,
        # sayısal koordinatları üzerinden karşılaştırılır.
        #
        # 06_create_reservations.py bazı koordinatlarda sondaki
        # sıfırları yazmayabilir:
        #   POINT(28.98 41.01)
        # Buradaki beklenen değer ise:
        #   POINT(28.980000 41.010000)
        # olabilir. İki değer aynı noktayı temsil eder.

        pickup_point_valid = (
            ~unknown_pickup_zone
            & point_ewkt_matches(
                chunk["pickup_point"],
                chunk["expected_pickup_point"],
            )
        )

        dropoff_point_valid = (
            ~unknown_dropoff_zone
            & point_ewkt_matches(
                chunk["dropoff_point"],
                chunk["expected_dropoff_point"],
            )
        )

        route_pair_exists = (
            chunk[
                "expected_route_polyline"
            ].notna()
        )

        route_polyline_valid = (
            route_pair_exists
            & (
                normalize_text_series(
                    chunk["route_polyline"]
                )
                == normalize_text_series(
                    chunk[
                        "expected_route_polyline"
                    ]
                )
            )
        )

        currency_valid = (
            chunk["currency"]
            .astype("string")
            .str.upper()
            .eq(EXPECTED_CURRENCY)
            .fillna(False)
        )

        row_valid = (
            ~unknown_pickup_zone
            & ~unknown_dropoff_zone
            & pickup_address_valid
            & dropoff_address_valid
            & pickup_point_valid
            & dropoff_point_valid
            & route_pair_exists
            & route_polyline_valid
            & currency_valid
        )

        validation_errors = pd.Series(
            "",
            index=chunk.index,
            dtype="string",
        )

        validation_errors = append_errors(
            validation_errors,
            unknown_pickup_zone,
            "UNKNOWN_PICKUP_ZONE",
        )

        validation_errors = append_errors(
            validation_errors,
            unknown_dropoff_zone,
            "UNKNOWN_DROPOFF_ZONE",
        )

        validation_errors = append_errors(
            validation_errors,
            ~pickup_address_valid,
            "PICKUP_ADDRESS_MISMATCH",
        )

        validation_errors = append_errors(
            validation_errors,
            ~dropoff_address_valid,
            "DROPOFF_ADDRESS_MISMATCH",
        )

        validation_errors = append_errors(
            validation_errors,
            ~pickup_point_valid,
            "PICKUP_POINT_MISMATCH",
        )

        validation_errors = append_errors(
            validation_errors,
            ~dropoff_point_valid,
            "DROPOFF_POINT_MISMATCH",
        )

        validation_errors = append_errors(
            validation_errors,
            ~route_pair_exists,
            "ROUTE_PAIR_NOT_FOUND",
        )

        validation_errors = append_errors(
            validation_errors,
            route_pair_exists
            & ~route_polyline_valid,
            "ROUTE_POLYLINE_MISMATCH",
        )

        validation_errors = append_errors(
            validation_errors,
            ~currency_valid,
            "CURRENCY_NOT_TRY",
        )

        chunk["location_validation_errors"] = (
            validation_errors
        )

        chunk["location_validation_passed"] = (
            row_valid
        )

        counters[
            "total_reservations"
        ] += len(chunk)

        counters[
            "valid_reservations"
        ] += int(row_valid.sum())

        counters[
            "invalid_reservations"
        ] += int((~row_valid).sum())

        counters[
            "unknown_pickup_zone_count"
        ] += int(unknown_pickup_zone.sum())

        counters[
            "unknown_dropoff_zone_count"
        ] += int(unknown_dropoff_zone.sum())

        counters[
            "pickup_address_mismatch_count"
        ] += int(
            (~pickup_address_valid).sum()
        )

        counters[
            "dropoff_address_mismatch_count"
        ] += int(
            (~dropoff_address_valid).sum()
        )

        counters[
            "pickup_point_mismatch_count"
        ] += int(
            (~pickup_point_valid).sum()
        )

        counters[
            "dropoff_point_mismatch_count"
        ] += int(
            (~dropoff_point_valid).sum()
        )

        counters[
            "missing_route_pair_count"
        ] += int(
            (~route_pair_exists).sum()
        )

        counters[
            "route_polyline_mismatch_count"
        ] += int(
            (
                route_pair_exists
                & ~route_polyline_valid
            ).sum()
        )

        counters[
            "invalid_currency_count"
        ] += int(
            (~currency_valid).sum()
        )

        # -------------------------------------------------
        # Zone kullanım sayılarını topla
        # -------------------------------------------------

        pickup_counts = (
            chunk["pickup_zone_id"]
            .dropna()
            .astype(int)
            .value_counts()
        )

        dropoff_counts = (
            chunk["dropoff_zone_id"]
            .dropna()
            .astype(int)
            .value_counts()
        )

        for zone_id, count in pickup_counts.items():
            zone_usage_counts.setdefault(
                int(zone_id),
                {
                    "pickup_count": 0,
                    "dropoff_count": 0,
                },
            )

            zone_usage_counts[
                int(zone_id)
            ]["pickup_count"] += int(count)

        for zone_id, count in dropoff_counts.items():
            zone_usage_counts.setdefault(
                int(zone_id),
                {
                    "pickup_count": 0,
                    "dropoff_count": 0,
                },
            )

            zone_usage_counts[
                int(zone_id)
            ]["dropoff_count"] += int(count)

        pair_counts = (
            chunk[
                [
                    "pickup_zone_id",
                    "dropoff_zone_id",
                ]
            ]
            .dropna()
            .astype(int)
            .value_counts()
        )

        for (
            pickup_zone_id,
            dropoff_zone_id,
        ), count in pair_counts.items():
            route_pair_counts[
                (
                    int(pickup_zone_id),
                    int(dropoff_zone_id),
                )
            ] = (
                route_pair_counts.get(
                    (
                        int(pickup_zone_id),
                        int(dropoff_zone_id),
                    ),
                    0,
                )
                + int(count)
            )

        # -------------------------------------------------
        # Hatalı kayıtları yaz
        # -------------------------------------------------

        invalid_columns = [
            "id",
            "booking_reference",
            "pickup_zone_id",
            "expected_pickup_zone_name",
            "pickup_address",
            "expected_pickup_point",
            "pickup_point",
            "dropoff_zone_id",
            "expected_dropoff_zone_name",
            "dropoff_address",
            "expected_dropoff_point",
            "dropoff_point",
            "route_polyline",
            "expected_route_polyline",
            "currency",
            "location_validation_errors",
        ]

        invalid_chunk = chunk.loc[
            ~row_valid,
            invalid_columns,
        ].copy()

        if not invalid_chunk.empty:
            invalid_chunk.to_csv(
                INVALID_RESERVATION_LOCATIONS_FILE,
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

        print(
            f"Parça {chunk_number}: "
            f"{counters['total_reservations']:,} rezervasyon kontrol edildi, "
            f"{counters['invalid_reservations']:,} hatalı."
        )

    if not invalid_file_written:
        pd.DataFrame(
            columns=[
                "id",
                "booking_reference",
                "pickup_zone_id",
                "expected_pickup_zone_name",
                "pickup_address",
                "expected_pickup_point",
                "pickup_point",
                "dropoff_zone_id",
                "expected_dropoff_zone_name",
                "dropoff_address",
                "expected_dropoff_point",
                "dropoff_point",
                "route_polyline",
                "expected_route_polyline",
                "currency",
                "location_validation_errors",
            ]
        ).to_csv(
            INVALID_RESERVATION_LOCATIONS_FILE,
            index=False,
            encoding="utf-8",
        )

    zone_usage_rows = []

    for row in zone_catalog_df.itertuples(
        index=False
    ):
        counts = zone_usage_counts.get(
            int(row.zone_id),
            {
                "pickup_count": 0,
                "dropoff_count": 0,
            },
        )

        zone_usage_rows.append(
            {
                "zone_id": int(row.zone_id),
                "zone_name": row.zone_name,
                "zone_category": row.zone_category,
                "pickup_count": counts[
                    "pickup_count"
                ],
                "dropoff_count": counts[
                    "dropoff_count"
                ],
                "total_location_usage": (
                    counts["pickup_count"]
                    + counts["dropoff_count"]
                ),
            }
        )

    zone_utilization_df = pd.DataFrame(
        zone_usage_rows
    ).sort_values(
        by="total_location_usage",
        ascending=False,
    )

    route_pair_rows = [
        {
            "pickup_zone_id": pickup_zone_id,
            "dropoff_zone_id": dropoff_zone_id,
            "reservation_count": count,
        }
        for (
            pickup_zone_id,
            dropoff_zone_id,
        ), count in route_pair_counts.items()
    ]

    route_pair_utilization_df = pd.DataFrame(
        route_pair_rows
    )

    if not route_pair_utilization_df.empty:
        route_pair_utilization_df = (
            route_pair_utilization_df
            .sort_values(
                by="reservation_count",
                ascending=False,
            )
            .reset_index(drop=True)
        )

    return (
        counters,
        zone_utilization_df,
        route_pair_utilization_df,
    )


# =====================================================
# 10. KAYNAK NYC → İSTANBUL MAPPING KONTROLÜ
# =====================================================

def validate_analytics_source_mapping(
    mapping_df: pd.DataFrame,
) -> dict:
    """
    reservations_analytics.parquet içindeki kaynak lokasyon
    eşleştirmelerini parça parça doğrular.
    """

    if not RESERVATIONS_ANALYTICS_FILE.exists():
        print(
            "\n⚠️ reservations_analytics.parquet bulunamadı. "
            "Kaynak NYC mapping kontrolü atlandı."
        )

        pd.DataFrame(
            columns=[
                "source_trip_id",
                "source_pickup_location_id",
                "actual_pickup_zone_id",
                "expected_pickup_zone_id",
                "source_dropoff_location_id",
                "actual_dropoff_zone_id",
                "expected_dropoff_zone_id",
                "mapping_validation_errors",
            ]
        ).to_csv(
            INVALID_SOURCE_MAPPING_FILE,
            index=False,
            encoding="utf-8",
        )

        return {
            "analytics_mapping_check_applied": False,
            "analytics_rows_checked": 0,
            "invalid_source_mapping_rows": 0,
        }

    mapping_lookup = (
        mapping_df
        .set_index(
            "source_location_id"
        )["pricing_zone_id"]
        .astype(int)
        .to_dict()
    )

    parquet_file = pq.ParquetFile(
        RESERVATIONS_ANALYTICS_FILE
    )

    available_columns = set(
        parquet_file.schema.names
    )

    missing_columns = [
        column
        for column in ANALYTICS_MAPPING_COLUMNS
        if column not in available_columns
    ]

    if missing_columns:
        raise ValueError(
            "reservations_analytics.parquet içinde mapping "
            f"sütunları eksik: {missing_columns}"
        )

    if INVALID_SOURCE_MAPPING_FILE.exists():
        INVALID_SOURCE_MAPPING_FILE.unlink()

    invalid_file_written = False
    total_rows = 0
    invalid_rows = 0

    batches = parquet_file.iter_batches(
        batch_size=CHUNK_SIZE,
        columns=ANALYTICS_MAPPING_COLUMNS,
    )

    for batch_number, batch in enumerate(
        batches,
        start=1,
    ):
        chunk = batch.to_pandas()

        integer_columns = [
            "source_trip_id",
            "source_pickup_location_id",
            "source_dropoff_location_id",
            "pickup_zone_id",
            "dropoff_zone_id",
        ]

        for column in integer_columns:
            chunk[column] = pd.to_numeric(
                chunk[column],
                errors="coerce",
            ).astype("Int64")

        expected_pickup_zone = (
            chunk[
                "source_pickup_location_id"
            ]
            .map(mapping_lookup)
        )

        expected_dropoff_zone = (
            chunk[
                "source_dropoff_location_id"
            ]
            .map(mapping_lookup)
        )

        pickup_mapping_valid = (
            expected_pickup_zone.notna()
            & (
                chunk["pickup_zone_id"]
                == expected_pickup_zone
            )
        )

        dropoff_mapping_valid = (
            expected_dropoff_zone.notna()
            & (
                chunk["dropoff_zone_id"]
                == expected_dropoff_zone
            )
        )

        row_valid = (
            pickup_mapping_valid
            & dropoff_mapping_valid
        )

        errors = pd.Series(
            "",
            index=chunk.index,
            dtype="string",
        )

        errors = append_errors(
            errors,
            expected_pickup_zone.isna(),
            "SOURCE_PICKUP_MAPPING_NOT_FOUND",
        )

        errors = append_errors(
            errors,
            expected_pickup_zone.notna()
            & ~pickup_mapping_valid,
            "SOURCE_PICKUP_MAPPING_MISMATCH",
        )

        errors = append_errors(
            errors,
            expected_dropoff_zone.isna(),
            "SOURCE_DROPOFF_MAPPING_NOT_FOUND",
        )

        errors = append_errors(
            errors,
            expected_dropoff_zone.notna()
            & ~dropoff_mapping_valid,
            "SOURCE_DROPOFF_MAPPING_MISMATCH",
        )

        invalid_chunk = pd.DataFrame(
            {
                "source_trip_id": (
                    chunk["source_trip_id"]
                ),
                "source_pickup_location_id": (
                    chunk[
                        "source_pickup_location_id"
                    ]
                ),
                "actual_pickup_zone_id": (
                    chunk["pickup_zone_id"]
                ),
                "expected_pickup_zone_id": (
                    expected_pickup_zone
                ),
                "source_dropoff_location_id": (
                    chunk[
                        "source_dropoff_location_id"
                    ]
                ),
                "actual_dropoff_zone_id": (
                    chunk["dropoff_zone_id"]
                ),
                "expected_dropoff_zone_id": (
                    expected_dropoff_zone
                ),
                "mapping_validation_errors": (
                    errors
                ),
            }
        ).loc[~row_valid]

        if not invalid_chunk.empty:
            invalid_chunk.to_csv(
                INVALID_SOURCE_MAPPING_FILE,
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

        total_rows += len(chunk)
        invalid_rows += int(
            (~row_valid).sum()
        )

        print(
            f"Mapping parçası {batch_number}: "
            f"{total_rows:,} satır kontrol edildi, "
            f"{invalid_rows:,} hatalı."
        )

    if not invalid_file_written:
        pd.DataFrame(
            columns=[
                "source_trip_id",
                "source_pickup_location_id",
                "actual_pickup_zone_id",
                "expected_pickup_zone_id",
                "source_dropoff_location_id",
                "actual_dropoff_zone_id",
                "expected_dropoff_zone_id",
                "mapping_validation_errors",
            ]
        ).to_csv(
            INVALID_SOURCE_MAPPING_FILE,
            index=False,
            encoding="utf-8",
        )

    return {
        "analytics_mapping_check_applied": True,
        "analytics_rows_checked": int(
            total_rows
        ),
        "invalid_source_mapping_rows": int(
            invalid_rows
        ),
    }


# =====================================================
# 11. DOSYALARI KAYDETME
# =====================================================

def save_location_outputs(
    zone_catalog_df: pd.DataFrame,
    zone_utilization_df: pd.DataFrame,
    route_pair_utilization_df: pd.DataFrame,
) -> None:
    """
    Model ve raporlama için zone çıktılarını kaydeder.
    """

    zone_catalog_df.to_csv(
        ISTANBUL_ZONE_CATALOG_FILE,
        index=False,
        encoding="utf-8",
    )

    zone_utilization_df.to_csv(
        ZONE_UTILIZATION_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    route_pair_utilization_df.to_csv(
        ROUTE_PAIR_UTILIZATION_FILE,
        index=False,
        encoding="utf-8-sig",
    )


# =====================================================
# 12. RAPORLAMA
# =====================================================

def create_validation_reports(
    zone_catalog_df: pd.DataFrame,
    polygon_checks_df: pd.DataFrame,
    mapping_df: pd.DataFrame,
    route_matrix_df: pd.DataFrame,
    reservation_counters: dict,
    analytics_mapping_result: dict,
) -> dict:
    """
    Lokasyon doğrulama metriklerini JSON ve CSV olarak kaydeder.
    """

    all_error_counts = {
        "invalid_reservations": (
            reservation_counters[
                "invalid_reservations"
            ]
        ),
        "invalid_source_mapping_rows": (
            analytics_mapping_result[
                "invalid_source_mapping_rows"
            ]
        ),
        "invalid_polygon_rows": int(
            (
                ~polygon_checks_df[
                    "polygon_valid"
                ]
                | ~polygon_checks_df[
                    "center_inside_polygon"
                ]
            ).sum()
        ),
    }

    validation_passed = all(
        error_count == 0
        for error_count
        in all_error_counts.values()
    )

    metrics = {
        **reservation_counters,
        **analytics_mapping_result,
        "pricing_zone_count": int(
            len(zone_catalog_df)
        ),
        "source_location_mapping_count": int(
            len(mapping_df)
        ),
        "route_pair_count": int(
            len(route_matrix_df)
        ),
        "polygon_check_count": int(
            len(polygon_checks_df)
        ),
        "validation_passed": (
            validation_passed
        ),
    }

    pd.DataFrame(
        [
            {
                "metric": metric_name,
                "value": metric_value,
            }
            for metric_name, metric_value
            in metrics.items()
        ]
    ).to_csv(
        LOCATION_METRICS_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    summary = {
        "validation_version": (
            VALIDATION_VERSION
        ),
        "generated_at_utc": (
            datetime.now(timezone.utc)
            .replace(microsecond=0)
            .isoformat()
        ),
        "pricing_zones_file": str(
            PRICING_ZONES_FILE
        ),
        "zone_centers_file": str(
            PRICING_ZONE_CENTERS_FILE
        ),
        "zone_mapping_file": str(
            ZONE_MAPPING_FILE
        ),
        "route_pricing_matrix_file": str(
            ROUTE_PRICING_MATRIX_FILE
        ),
        "reservations_file": str(
            RESERVATIONS_FILE
        ),
        "reservations_analytics_file": str(
            RESERVATIONS_ANALYTICS_FILE
        ),
        "istanbul_zone_catalog_file": str(
            ISTANBUL_ZONE_CATALOG_FILE
        ),
        "pricing_zone_count": int(
            len(zone_catalog_df)
        ),
        "active_pricing_zone_count": int(
            zone_catalog_df[
                "is_active"
            ].sum()
        ),
        "source_location_mapping_count": int(
            len(mapping_df)
        ),
        "route_pair_count": int(
            len(route_matrix_df)
        ),
        "reservation_location_results": (
            reservation_counters
        ),
        "analytics_source_mapping_results": (
            analytics_mapping_result
        ),
        "polygon_results": {
            "polygon_count": int(
                len(polygon_checks_df)
            ),
            "valid_polygon_count": int(
                polygon_checks_df[
                    "polygon_valid"
                ].sum()
            ),
            "centers_inside_polygon_count": int(
                polygon_checks_df[
                    "center_inside_polygon"
                ].sum()
            ),
            "polygon_methods": (
                polygon_checks_df[
                    "polygon_method"
                ]
                .value_counts()
                .to_dict()
            ),
        },
        "expected_currency": (
            EXPECTED_CURRENCY
        ),
        "expected_srid": 4326,
        "pricing_zone_names_modified": False,
        "reservations_file_modified": False,
        "derived_istanbul_reservations_created": False,
        "unknown_zones_replaced_with_text": False,
        "old_versions_directory_used": False,
        "demand_output_modified": False,
        "pricing_service_output_modified": False,
        "validation_passed": (
            validation_passed
        ),
        "production_warning": (
            "SIMULATED_GRID polygonlar yalnızca staj "
            "simülasyonu ve backend entegrasyon testi içindir. "
            "Gerçek sistemde admin panelinden çizilmiş "
            "doğrulanmış polygonlar kullanılmalıdır."
        ),
    }

    with open(
        LOCATION_SUMMARY_FILE,
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

    return metrics


# =====================================================
# 13. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 70)
    print("11 — İSTANBUL LOKASYONLARININ DOĞRULANMASI")
    print("=" * 70)

    print("\nReferans dosyaları okunuyor...")

    (
        pricing_zones_df,
        zone_centers_df,
        zone_mapping_df,
        route_matrix_df,
    ) = read_reference_files()

    print("\nPricing zone ve polygonlar doğrulanıyor...")

    (
        zone_catalog_df,
        polygon_checks_df,
    ) = validate_pricing_zones(
        pricing_zones_df=pricing_zones_df,
        zone_centers_df=zone_centers_df,
    )

    print(
        f"Doğrulanan pricing zone: "
        f"{len(zone_catalog_df)}"
    )

    print("\nNYC → İstanbul zone mapping doğrulanıyor...")

    validated_mapping_df = (
        validate_zone_mapping(
            zone_mapping_df=zone_mapping_df,
            zone_catalog_df=zone_catalog_df,
        )
    )

    print(
        f"Doğrulanan kaynak lokasyon mapping: "
        f"{len(validated_mapping_df)}"
    )

    print("\nRota fiyat matrisi doğrulanıyor...")

    validated_route_matrix_df = (
        validate_route_matrix(
            route_matrix_df=route_matrix_df,
            zone_catalog_df=zone_catalog_df,
        )
    )

    print(
        f"Doğrulanan rota çifti: "
        f"{len(validated_route_matrix_df)}"
    )

    print(
        "\nReservations lokasyonları "
        "parça parça doğrulanıyor..."
    )

    (
        reservation_counters,
        zone_utilization_df,
        route_pair_utilization_df,
    ) = validate_reservation_locations(
        zone_catalog_df=zone_catalog_df,
        route_matrix_df=(
            validated_route_matrix_df
        ),
    )

    print(
        "\nKaynak NYC lokasyon mapping geçmişi "
        "doğrulanıyor..."
    )

    analytics_mapping_result = (
        validate_analytics_source_mapping(
            mapping_df=validated_mapping_df,
        )
    )

    save_location_outputs(
        zone_catalog_df=zone_catalog_df,
        zone_utilization_df=zone_utilization_df,
        route_pair_utilization_df=(
            route_pair_utilization_df
        ),
    )

    metrics = create_validation_reports(
        zone_catalog_df=zone_catalog_df,
        polygon_checks_df=polygon_checks_df,
        mapping_df=validated_mapping_df,
        route_matrix_df=(
            validated_route_matrix_df
        ),
        reservation_counters=(
            reservation_counters
        ),
        analytics_mapping_result=(
            analytics_mapping_result
        ),
    )

    print("\n" + "=" * 70)
    print("İSTANBUL LOKASYON DOĞRULAMA SONUCU")
    print("=" * 70)

    print(
        f"Pricing zone             : "
        f"{metrics['pricing_zone_count']:,}"
    )

    print(
        f"Kaynak zone mapping      : "
        f"{metrics['source_location_mapping_count']:,}"
    )

    print(
        f"Rota çifti               : "
        f"{metrics['route_pair_count']:,}"
    )

    print(
        f"Kontrol edilen rezervasyon: "
        f"{metrics['total_reservations']:,}"
    )

    print(
        f"Hatalı rezervasyon       : "
        f"{metrics['invalid_reservations']:,}"
    )

    print(
        "Hatalı kaynak mapping    : "
        f"{metrics['invalid_source_mapping_rows']:,}"
    )

    print(
        f"\nZone kataloğu            : "
        f"{ISTANBUL_ZONE_CATALOG_FILE}"
    )

    print(f"Raporlar                  : {REPORT_DIR}")

    print("\nKontroller:")
    print("Pricing zone adları tekrar değiştirilmedi.")
    print("Polygon geometrileri doğrulandı.")
    print("Zone merkezlerinin polygon içinde olduğu kontrol edildi.")
    print("Pickup ve dropoff zone foreign key uyumu kontrol edildi.")
    print("Rezervasyon adresleri zone isimleriyle karşılaştırıldı.")
    print(
        "PostGIS point değerleri metin biçimi yerine "
        "sayısal koordinatlarla karşılaştırıldı."
    )
    print("Rota çiftleri route pricing matrisiyle karşılaştırıldı.")
    print("NYC kaynak lokasyon mapping geçmişi kontrol edildi.")
    print("Para birimi TRY olarak doğrulandı.")
    print("reservations.csv değiştirilmedi.")
    print("old versions klasörü kullanılmadı.")
    print("Bilinmeyen bölgeler metinle gizlenmedi.")

    if metrics["validation_passed"]:
        print(
            "\nBütün İstanbul lokasyon verileri "
            "pipeline ve SQL şemasıyla uyumludur."
        )

    elif FAIL_ON_VALIDATION_ERROR:
        raise ValueError(
            "\nİstanbul lokasyon verilerinde hata bulundu.\n"
            "Ayrıntılar için şu dosyaları kontrol et:\n"
            f"- {INVALID_RESERVATION_LOCATIONS_FILE}\n"
            f"- {INVALID_SOURCE_MAPPING_FILE}\n"
            f"- {LOCATION_SUMMARY_FILE}"
        )

    else:
        print(
            "\n Lokasyon hataları bulundu ancak "
            "FAIL_ON_VALIDATION_ERROR=False olduğu için "
            "pipeline durdurulmadı."
        )

    print(
        "\nÜretim notu: SIMULATED_GRID polygonlar yalnızca "
        "staj simülasyonu içindir. Gerçek sistemde admin "
        "panelinden çizilen polygonlar kullanılmalıdır."
    )


if __name__ == "__main__":
    main()