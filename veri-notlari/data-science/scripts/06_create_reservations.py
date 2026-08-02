import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd


try:
    from shapely import wkt
    from shapely.geometry import LineString
except ImportError as error:
    raise ImportError(
        "Rota ve polygon kesişimi için shapely gereklidir.\n"
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

RANDOM_SEED = 42

SIMULATION_TIMEZONE = "Europe/Istanbul"

# Veri setinin son kısmı devam eden rezervasyonları temsil edecek.
ACTIVE_RESERVATION_WINDOW_HOURS = 6

HISTORICAL_STATUS_VALUES = [
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
]

HISTORICAL_STATUS_PROBABILITIES = [
    0.87,
    0.09,
    0.04,
]

ACTIVE_STATUS_VALUES = [
    "PENDING",
    "ASSIGNED",
]

ACTIVE_STATUS_PROBABILITIES = [
    0.55,
    0.45,
]

ALLOWED_STATUSES = {
    "PENDING",
    "ASSIGNED",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
}

CANCELLATION_REASONS = [
    "Müşteri iptal etti",
    "Plan değişikliği",
    "Yanlış rezervasyon",
    "Fiyat yüksek bulundu",
    "Alternatif ulaşım tercih edildi",
]

AIRPORT_ZONE_NAMES = {
    "İstanbul Havalimanı",
    "Sabiha Gökçen Havalimanı",
}


# =====================================================
# 2. PROJE KLASÖRLERİ
# =====================================================

def find_project_root() -> Path:
    """
    Python dosyasının konumuna göre proje kökünü bulur.
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
REFERENCE_DATA_DIR = PROJECT_ROOT / "data" / "reference"
GENERATED_DATA_DIR = PROJECT_ROOT / "data" / "generated"

REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "06_create_reservations"
)

GENERATED_DATA_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

PROCESSED_DATA_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

REFERENCE_DATA_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

REPORT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


TRIPS_INPUT_FILE = (
    PROCESSED_DATA_DIR
    / "taxi_with_users.parquet"
)

USERS_FILE = (
    GENERATED_DATA_DIR
    / "users.csv"
)

VEHICLES_FILE = (
    REFERENCE_DATA_DIR
    / "vehicles.csv"
)

PRICING_ZONES_FILE = (
    REFERENCE_DATA_DIR
    / "pricing_zones.csv"
)

PRICING_ZONE_CENTERS_FILE = (
    REFERENCE_DATA_DIR
    / "pricing_zone_centers.csv"
)

PRICING_RULES_FILE = (
    REFERENCE_DATA_DIR
    / "pricing_rules.csv"
)

ROUTE_PRICING_MATRIX_FILE = (
    REFERENCE_DATA_DIR
    / "route_pricing_matrix.csv"
)

RESERVATIONS_OUTPUT_FILE = (
    GENERATED_DATA_DIR
    / "reservations.csv"
)

STATUS_HISTORY_OUTPUT_FILE = (
    GENERATED_DATA_DIR
    / "reservation_status_history.csv"
)

ANALYTICS_OUTPUT_FILE = (
    PROCESSED_DATA_DIR
    / "reservations_analytics.parquet"
)


# =====================================================
# 3. YARDIMCI FONKSİYONLAR
# =====================================================

def require_file(file_path: Path) -> None:
    """
    Gerekli dosyanın mevcut olup olmadığını kontrol eder.
    """

    if not file_path.exists():
        raise FileNotFoundError(
            f"Gerekli dosya bulunamadı:\n{file_path}"
        )


def convert_boolean(series: pd.Series) -> pd.Series:
    """
    CSV dosyasından okunan boolean sütununu güvenli şekilde dönüştürür.
    """

    if pd.api.types.is_bool_dtype(series):
        return series.astype(bool)

    converted = (
        series.astype(str)
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
        raise ValueError(
            "Boolean sütununda dönüştürülemeyen değer bulundu."
        )

    return converted.astype(bool)


def convert_to_utc(
    datetime_series: pd.Series,
) -> pd.Series:
    """
    İstanbul yerel zamanlarını timezone-aware UTC değerine dönüştürür.
    """

    converted = pd.to_datetime(
        datetime_series,
        errors="coerce",
    )

    if converted.isna().any():
        raise ValueError(
            "Tarih sütununda geçersiz değer bulundu."
        )

    if converted.dt.tz is None:
        converted = converted.dt.tz_localize(
            SIMULATION_TIMEZONE,
            nonexistent="shift_forward",
            ambiguous="NaT",
        )

        if converted.isna().any():
            raise ValueError(
                "Timezone dönüşümünde belirsiz tarih bulundu."
            )

    return converted.dt.tz_convert("UTC")


def parse_time_value(value) -> pd.Timestamp:
    """
    pricing_rules içindeki saat değerini okunabilir hale getirir.
    """

    parsed = pd.to_datetime(
        str(value),
        errors="coerce",
    )

    if pd.isna(parsed):
        raise ValueError(
            f"Geçersiz pricing rule saati: {value}"
        )

    return parsed


# =====================================================
# 4. GİRDİ DOSYALARINI OKUMA
# =====================================================

def read_inputs():
    """
    Pipeline girdilerini okur ve temel kontrolleri yapar.
    """

    required_files = [
        TRIPS_INPUT_FILE,
        USERS_FILE,
        VEHICLES_FILE,
        PRICING_ZONES_FILE,
        PRICING_ZONE_CENTERS_FILE,
        PRICING_RULES_FILE,
    ]

    for file_path in required_files:
        require_file(file_path)

    trips_df = pd.read_parquet(
        TRIPS_INPUT_FILE
    )

    users_df = pd.read_csv(
        USERS_FILE,
        low_memory=False,
    )

    vehicles_df = pd.read_csv(
        VEHICLES_FILE,
        low_memory=False,
    )

    pricing_zones_df = pd.read_csv(
        PRICING_ZONES_FILE,
        low_memory=False,
    )

    zone_centers_df = pd.read_csv(
        PRICING_ZONE_CENTERS_FILE,
        low_memory=False,
    )

    pricing_rules_df = pd.read_csv(
        PRICING_RULES_FILE,
        low_memory=False,
    )

    required_trip_columns = [
        "source_trip_id",
        "scheduled_time",
        "source_completed_time",
        "user_id",
        "pickup_zone_id",
        "dropoff_zone_id",
        "pickup_zone_name",
        "dropoff_zone_name",
        "passenger_count",
        "distance_km",
        "reservation_hour",
        "day_of_week",
    ]

    missing_trip_columns = [
        column
        for column in required_trip_columns
        if column not in trips_df.columns
    ]

    if missing_trip_columns:
        raise ValueError(
            "taxi_with_users.parquet içinde gerekli sütunlar eksik:\n"
            f"{missing_trip_columns}"
        )

    required_user_columns = [
        "id",
        "phone_number",
        "is_guest",
        "created_at",
    ]

    missing_user_columns = [
        column
        for column in required_user_columns
        if column not in users_df.columns
    ]

    if missing_user_columns:
        raise ValueError(
            "users.csv içinde gerekli sütunlar eksik:\n"
            f"{missing_user_columns}"
        )

    required_vehicle_columns = [
        "id",
        "capacity",
        "base_price_multiplier",
        "opening_price",
        "is_active",
    ]

    missing_vehicle_columns = [
        column
        for column in required_vehicle_columns
        if column not in vehicles_df.columns
    ]

    if missing_vehicle_columns:
        raise ValueError(
            "vehicles.csv içinde gerekli sütunlar eksik:\n"
            f"{missing_vehicle_columns}"
        )

    required_zone_columns = [
        "id",
        "name",
        "polygon_geom",
        "base_price",
        "min_price",
        "price_per_km",
        "currency",
        "is_active",
    ]

    missing_zone_columns = [
        column
        for column in required_zone_columns
        if column not in pricing_zones_df.columns
    ]

    if missing_zone_columns:
        raise ValueError(
            "pricing_zones.csv içinde gerekli sütunlar eksik:\n"
            f"{missing_zone_columns}"
        )

    required_center_columns = [
        "zone_id",
        "center_lon",
        "center_lat",
    ]

    missing_center_columns = [
        column
        for column in required_center_columns
        if column not in zone_centers_df.columns
    ]

    if missing_center_columns:
        raise ValueError(
            "pricing_zone_centers.csv içinde gerekli sütunlar eksik:\n"
            f"{missing_center_columns}"
        )

    users_df["is_guest"] = convert_boolean(
        users_df["is_guest"]
    )

    vehicles_df["is_active"] = convert_boolean(
        vehicles_df["is_active"]
    )

    pricing_zones_df["is_active"] = convert_boolean(
        pricing_zones_df["is_active"]
    )

    if "is_active" in pricing_rules_df.columns:
        pricing_rules_df["is_active"] = convert_boolean(
            pricing_rules_df["is_active"]
        )
    else:
        pricing_rules_df["is_active"] = True

    trips_df["scheduled_time"] = pd.to_datetime(
        trips_df["scheduled_time"],
        errors="coerce",
    )

    trips_df["source_completed_time"] = pd.to_datetime(
        trips_df["source_completed_time"],
        errors="coerce",
    )

    if trips_df[
        [
            "scheduled_time",
            "source_completed_time",
        ]
    ].isna().any().any():
        raise ValueError(
            "Rezervasyon girdisinde geçersiz tarih bulundu."
        )

    print(f"Yolculuk sayısı : {len(trips_df):,}")
    print(f"Kullanıcı sayısı: {len(users_df):,}")
    print(f"Araç sayısı     : {len(vehicles_df):,}")
    print(f"Bölge sayısı    : {len(pricing_zones_df):,}")

    return (
        trips_df,
        users_df,
        vehicles_df,
        pricing_zones_df,
        zone_centers_df,
        pricing_rules_df,
    )


# =====================================================
# 5. ROTA VE POLYGON KESİŞİM MATRİSİ
# =====================================================

def create_route_pricing_matrix(
    trips_df: pd.DataFrame,
    pricing_zones_df: pd.DataFrame,
    zone_centers_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Kullanılan her pickup/dropoff bölge çifti için düz rota oluşturur.

    Rota simülasyon polygonlarıyla kesiştirilir. Her bölgede
    geçilen rota oranına göre ağırlıklı TL/km değeri hesaplanır.

    Bu yöntem Maps API bulunmadığı durumdaki simülasyon fallback'idir.
    """

    active_zones = pricing_zones_df[
        pricing_zones_df["is_active"]
    ].copy()

    zone_price_lookup = (
        active_zones
        .set_index("id")["price_per_km"]
        .astype(float)
        .to_dict()
    )

    zone_geometry_rows = []

    for _, row in active_zones.iterrows():
        ewkt_value = str(row["polygon_geom"])

        if ";" not in ewkt_value:
            raise ValueError(
                f"Geçersiz polygon EWKT değeri: {ewkt_value}"
            )

        geometry_text = ewkt_value.split(";", 1)[1]
        polygon_geometry = wkt.loads(geometry_text)

        zone_geometry_rows.append(
            (
                int(row["id"]),
                polygon_geometry,
                float(row["price_per_km"]),
            )
        )

    center_lookup = (
        zone_centers_df
        .set_index("zone_id")[
            [
                "center_lon",
                "center_lat",
            ]
        ]
        .astype(float)
        .to_dict("index")
    )

    unique_pairs = (
        trips_df[
            [
                "pickup_zone_id",
                "dropoff_zone_id",
            ]
        ]
        .drop_duplicates()
        .sort_values(
            [
                "pickup_zone_id",
                "dropoff_zone_id",
            ]
        )
    )

    route_rows = []

    print(
        "Rota bölge kesişimleri hesaplanıyor. "
        f"Benzersiz rota çifti: {len(unique_pairs):,}"
    )

    for pair in unique_pairs.itertuples(index=False):
        pickup_zone_id = int(pair.pickup_zone_id)
        dropoff_zone_id = int(pair.dropoff_zone_id)

        if pickup_zone_id not in center_lookup:
            raise ValueError(
                f"Pickup zone merkezi bulunamadı: {pickup_zone_id}"
            )

        if dropoff_zone_id not in center_lookup:
            raise ValueError(
                f"Dropoff zone merkezi bulunamadı: {dropoff_zone_id}"
            )

        pickup_center = center_lookup[pickup_zone_id]
        dropoff_center = center_lookup[dropoff_zone_id]

        pickup_coordinate = (
            float(pickup_center["center_lon"]),
            float(pickup_center["center_lat"]),
        )

        dropoff_coordinate = (
            float(dropoff_center["center_lon"]),
            float(dropoff_center["center_lat"]),
        )

        route_ewkt = (
            "SRID=4326;LINESTRING("
            f"{pickup_coordinate[0]:.6f} "
            f"{pickup_coordinate[1]:.6f}, "
            f"{dropoff_coordinate[0]:.6f} "
            f"{dropoff_coordinate[1]:.6f}"
            ")"
        )

        if pickup_zone_id == dropoff_zone_id:
            segment_weights = {
                pickup_zone_id: 1.0
            }

        else:
            route_line = LineString(
                [
                    pickup_coordinate,
                    dropoff_coordinate,
                ]
            )

            segment_lengths = {}

            for (
                zone_id,
                polygon_geometry,
                _,
            ) in zone_geometry_rows:
                intersection = route_line.intersection(
                    polygon_geometry
                )

                intersection_length = float(
                    intersection.length
                )

                if intersection_length > 0:
                    segment_lengths[zone_id] = (
                        intersection_length
                    )

            total_intersection_length = sum(
                segment_lengths.values()
            )

            if total_intersection_length <= 0:
                # Beklenmeyen geometri problemi için güvenli fallback
                segment_weights = {
                    pickup_zone_id: 0.50,
                    dropoff_zone_id: 0.50,
                }

            else:
                segment_weights = {
                    zone_id: (
                        segment_length
                        / total_intersection_length
                    )
                    for zone_id, segment_length
                    in segment_lengths.items()
                }

        weighted_price_per_km = sum(
            weight * zone_price_lookup[zone_id]
            for zone_id, weight
            in segment_weights.items()
        )

        route_rows.append(
            {
                "pickup_zone_id": pickup_zone_id,
                "dropoff_zone_id": dropoff_zone_id,
                "route_polyline": route_ewkt,
                "route_price_per_km": round(
                    weighted_price_per_km,
                    6,
                ),
                "crossed_zone_count": len(
                    segment_weights
                ),
                "crossed_zone_ids": ",".join(
                    str(zone_id)
                    for zone_id
                    in sorted(segment_weights)
                ),
                "zone_segment_weights_json": json.dumps(
                    {
                        str(zone_id): round(
                            weight,
                            8,
                        )
                        for zone_id, weight
                        in segment_weights.items()
                    },
                    ensure_ascii=False,
                    separators=(",", ":"),
                ),
                "route_method": (
                    "STRAIGHT_LINE_POLYGON_INTERSECTION"
                ),
            }
        )

    route_matrix_df = pd.DataFrame(
        route_rows
    )

    route_matrix_df.to_csv(
        ROUTE_PRICING_MATRIX_FILE,
        index=False,
        encoding="utf-8",
    )

    print(
        "Rota fiyat matrisi oluşturuldu: "
        f"{ROUTE_PRICING_MATRIX_FILE}"
    )

    return route_matrix_df


# =====================================================
# 6. SURGE KURALLARINI REZERVASYONLARA HAZIRLAMA
# =====================================================

def create_surge_lookup(
    pricing_rules_df: pd.DataFrame,
    reservation_dates: pd.Series,
) -> pd.DataFrame:
    """
    Aktif pricing rule kayıtlarını tarih ve saat bazında açar.

    Aynı anda birden fazla kural aktifse en yüksek çarpan tutulur.
    """

    unique_dates = sorted(
        pd.to_datetime(
            reservation_dates
        )
        .dt.date
        .unique()
    )

    active_rules = pricing_rules_df[
        pricing_rules_df["is_active"]
    ].copy()

    lookup_rows = []

    for rule in active_rules.itertuples(index=False):
        start_timestamp = parse_time_value(
            rule.start_time
        )

        end_timestamp = parse_time_value(
            rule.end_time
        )

        valid_from = pd.to_datetime(
            getattr(rule, "valid_from", None),
            errors="coerce",
        )

        valid_to = pd.to_datetime(
            getattr(rule, "valid_to", None),
            errors="coerce",
        )

        rule_day = getattr(
            rule,
            "day_of_week",
            None,
        )

        rule_day_is_missing = pd.isna(
            rule_day
        )

        active_hours = []

        for hour in range(24):
            hour_timestamp = pd.Timestamp(
                year=2000,
                month=1,
                day=1,
                hour=hour,
            )

            start_comparison = pd.Timestamp(
                year=2000,
                month=1,
                day=1,
                hour=start_timestamp.hour,
                minute=start_timestamp.minute,
                second=start_timestamp.second,
            )

            end_comparison = pd.Timestamp(
                year=2000,
                month=1,
                day=1,
                hour=end_timestamp.hour,
                minute=end_timestamp.minute,
                second=end_timestamp.second,
            )

            if (
                hour_timestamp >= start_comparison
                and hour_timestamp < end_comparison
            ):
                active_hours.append(hour)

        for reservation_date in unique_dates:
            reservation_timestamp = pd.Timestamp(
                reservation_date
            )

            if (
                not pd.isna(valid_from)
                and reservation_timestamp.normalize()
                < valid_from.normalize()
            ):
                continue

            if (
                not pd.isna(valid_to)
                and reservation_timestamp.normalize()
                > valid_to.normalize()
            ):
                continue

            if (
                not rule_day_is_missing
                and reservation_date.weekday()
                != int(rule_day)
            ):
                continue

            for hour in active_hours:
                lookup_rows.append(
                    {
                        "pickup_zone_id": int(
                            rule.zone_id
                        ),
                        "reservation_date_key": (
                            reservation_date
                        ),
                        "reservation_hour": hour,
                        "surge_multiplier": float(
                            rule.multiplier
                        ),
                    }
                )

    if not lookup_rows:
        return pd.DataFrame(
            columns=[
                "pickup_zone_id",
                "reservation_date_key",
                "reservation_hour",
                "surge_multiplier",
            ]
        )

    surge_lookup_df = (
        pd.DataFrame(lookup_rows)
        .groupby(
            [
                "pickup_zone_id",
                "reservation_date_key",
                "reservation_hour",
            ],
            as_index=False,
        )["surge_multiplier"]
        .max()
    )

    return surge_lookup_df


# =====================================================
# 7. ARAÇ ATAMA
# =====================================================

def assign_vehicles(
    dataframe: pd.DataFrame,
    vehicles_df: pd.DataFrame,
    rng: np.random.Generator,
) -> pd.DataFrame:
    """
    Araçları yolcu kapasitesine göre atar.
    """

    active_vehicles = vehicles_df[
        vehicles_df["is_active"]
    ].copy()

    if active_vehicles.empty:
        raise ValueError(
            "Aktif araç bulunamadı."
        )

    assigned_vehicle_ids = np.empty(
        len(dataframe),
        dtype=np.int64,
    )

    passenger_values = (
        dataframe["passenger_count"]
        .astype(int)
    )

    for passenger_count in sorted(
        passenger_values.unique()
    ):
        row_mask = (
            passenger_values == passenger_count
        )

        eligible_vehicle_ids = (
            active_vehicles.loc[
                active_vehicles["capacity"]
                >= passenger_count,
                "id",
            ]
            .astype(int)
            .to_numpy()
        )

        if len(eligible_vehicle_ids) == 0:
            raise ValueError(
                f"{passenger_count} yolcu için uygun araç bulunamadı."
            )

        assigned_vehicle_ids[row_mask] = rng.choice(
            eligible_vehicle_ids,
            size=int(row_mask.sum()),
            replace=True,
        )

    result_df = dataframe.copy()

    result_df["vehicle_id"] = (
        assigned_vehicle_ids
    )

    vehicle_lookup = active_vehicles[
        [
            "id",
            "capacity",
            "base_price_multiplier",
            "opening_price",
            "vehicle_class",
        ]
    ].rename(
        columns={
            "id": "vehicle_id",
            "capacity": "_vehicle_capacity",
            "base_price_multiplier": (
                "_vehicle_price_multiplier"
            ),
            "opening_price": "opening_price",
            "vehicle_class": "_vehicle_class",
        }
    )

    result_df = result_df.merge(
        vehicle_lookup,
        on="vehicle_id",
        how="left",
        validate="many_to_one",
    )

    return result_df


# =====================================================
# 8. REZERVASYON DURUMLARI VE TARİHLER
# =====================================================

def add_status_and_timestamps(
    dataframe: pd.DataFrame,
    rng: np.random.Generator,
):
    """
    Zaman açısından tutarlı rezervasyon durumlarını oluşturur.
    """

    result_df = dataframe.copy()

    scheduled_time_utc = convert_to_utc(
        result_df["scheduled_time"]
    )

    source_completed_time_utc = convert_to_utc(
        result_df["source_completed_time"]
    )

    snapshot_time = (
        scheduled_time_utc.max()
        - pd.Timedelta(
            hours=ACTIVE_RESERVATION_WINDOW_HOURS
        )
    )

    active_mask = (
        scheduled_time_utc > snapshot_time
    )

    statuses = np.empty(
        len(result_df),
        dtype=object,
    )

    statuses[~active_mask] = rng.choice(
        HISTORICAL_STATUS_VALUES,
        size=int((~active_mask).sum()),
        p=HISTORICAL_STATUS_PROBABILITIES,
    )

    statuses[active_mask] = rng.choice(
        ACTIVE_STATUS_VALUES,
        size=int(active_mask.sum()),
        p=ACTIVE_STATUS_PROBABILITIES,
    )

    result_df["status"] = pd.Series(
        statuses,
        index=result_df.index,
        dtype="string",
    )

    creation_lead_minutes = rng.integers(
        24 * 60,
        30 * 24 * 60 + 1,
        size=len(result_df),
    )

    created_at = (
        scheduled_time_utc
        - pd.to_timedelta(
            creation_lead_minutes,
            unit="m",
        )
    )

    assignment_lead_minutes = rng.integers(
        30,
        241,
        size=len(result_df),
    )

    assigned_candidate = (
        scheduled_time_utc
        - pd.to_timedelta(
            assignment_lead_minutes,
            unit="m",
        )
    )

    earliest_assignment = (
        created_at
        + pd.Timedelta(minutes=5)
    )

    assigned_at = pd.concat(
        [
            assigned_candidate.rename("candidate"),
            earliest_assignment.rename("earliest"),
        ],
        axis=1,
    ).max(axis=1)

    assigned_at = assigned_at.where(
        assigned_at < scheduled_time_utc,
        scheduled_time_utc
        - pd.Timedelta(minutes=1),
    )

    completed_at = pd.Series(
        pd.NaT,
        index=result_df.index,
        dtype="datetime64[ns, UTC]",
    )

    completed_mask = (
        result_df["status"] == "COMPLETED"
    )

    completed_at.loc[completed_mask] = (
        source_completed_time_utc.loc[
            completed_mask
        ]
    )

    cancelled_at = pd.Series(
        pd.NaT,
        index=result_df.index,
        dtype="datetime64[ns, UTC]",
    )

    cancelled_mask = (
        result_df["status"] == "CANCELLED"
    )

    cancellation_fractions = rng.uniform(
        0.10,
        0.90,
        size=int(cancelled_mask.sum()),
    )

    cancelled_at.loc[cancelled_mask] = (
        created_at.loc[cancelled_mask]
        + (
            scheduled_time_utc.loc[cancelled_mask]
            - created_at.loc[cancelled_mask]
        )
        * cancellation_fractions
    )

    no_show_at = (
        scheduled_time_utc
        + pd.Timedelta(minutes=20)
    )

    cancellation_reason = pd.Series(
        pd.NA,
        index=result_df.index,
        dtype="string",
    )

    cancellation_reason.loc[cancelled_mask] = rng.choice(
        CANCELLATION_REASONS,
        size=int(cancelled_mask.sum()),
    )

    updated_at = created_at.copy()

    assigned_or_later_mask = result_df[
        "status"
    ].isin(
        [
            "ASSIGNED",
            "COMPLETED",
            "NO_SHOW",
        ]
    )

    updated_at.loc[assigned_or_later_mask] = (
        assigned_at.loc[
            assigned_or_later_mask
        ]
    )

    updated_at.loc[completed_mask] = (
        completed_at.loc[completed_mask]
    )

    updated_at.loc[cancelled_mask] = (
        cancelled_at.loc[cancelled_mask]
    )

    no_show_mask = (
        result_df["status"] == "NO_SHOW"
    )

    updated_at.loc[no_show_mask] = (
        no_show_at.loc[no_show_mask]
    )

    result_df["scheduled_time"] = (
        scheduled_time_utc
    )

    result_df["created_at"] = created_at
    result_df["updated_at"] = updated_at
    result_df["completed_at"] = completed_at
    result_df["cancelled_at"] = cancelled_at

    result_df["cancellation_reason"] = (
        cancellation_reason
    )

    result_df["_assigned_at"] = assigned_at
    result_df["_no_show_at"] = no_show_at

    return result_df, snapshot_time


# =====================================================
# 9. REZERVASYON TABLOSU OLUŞTURMA
# =====================================================

def create_reservations(
    trips_df: pd.DataFrame,
    users_df: pd.DataFrame,
    vehicles_df: pd.DataFrame,
    pricing_zones_df: pd.DataFrame,
    zone_centers_df: pd.DataFrame,
    pricing_rules_df: pd.DataFrame,
    route_matrix_df: pd.DataFrame,
    rng: np.random.Generator,
):
    """
    SQL reservations tablosuna uygun rezervasyon verisi oluşturur.
    """

    reservations_df = trips_df.copy()

    # -------------------------------------------------
    # Kullanıcı bilgileri
    # -------------------------------------------------

    user_lookup = users_df[
        [
            "id",
            "phone_number",
            "is_guest",
        ]
    ].rename(
        columns={
            "id": "user_id",
            "phone_number": "_user_phone_number",
            "is_guest": "_is_guest",
        }
    )

    reservations_df = reservations_df.merge(
        user_lookup,
        on="user_id",
        how="left",
        validate="many_to_one",
    )

    if reservations_df["_is_guest"].isna().any():
        raise ValueError(
            "users.csv ile eşleşmeyen user_id bulundu."
        )

    reservations_df["guest_phone"] = pd.Series(
        pd.NA,
        index=reservations_df.index,
        dtype="string",
    )

    guest_mask = reservations_df[
        "_is_guest"
    ].astype(bool)

    reservations_df.loc[
        guest_mask,
        "guest_phone",
    ] = reservations_df.loc[
        guest_mask,
        "_user_phone_number",
    ].astype("string")

    # -------------------------------------------------
    # Araç atama
    # -------------------------------------------------

    reservations_df = assign_vehicles(
        dataframe=reservations_df,
        vehicles_df=vehicles_df,
        rng=rng,
    )

    # -------------------------------------------------
    # Bölge fiyatları
    # -------------------------------------------------

    active_zones = pricing_zones_df[
        pricing_zones_df["is_active"]
    ].copy()

    pickup_zone_lookup = active_zones[
        [
            "id",
            "name",
            "base_price",
            "min_price",
            "currency",
        ]
    ].rename(
        columns={
            "id": "pickup_zone_id",
            "name": "_pickup_zone_name",
            "base_price": "_pickup_zone_base_price",
            "min_price": "_pickup_zone_min_price",
            "currency": "_pickup_zone_currency",
        }
    )

    dropoff_zone_lookup = active_zones[
        [
            "id",
            "name",
        ]
    ].rename(
        columns={
            "id": "dropoff_zone_id",
            "name": "_dropoff_zone_name",
        }
    )

    reservations_df = reservations_df.merge(
        pickup_zone_lookup,
        on="pickup_zone_id",
        how="left",
        validate="many_to_one",
    )

    reservations_df = reservations_df.merge(
        dropoff_zone_lookup,
        on="dropoff_zone_id",
        how="left",
        validate="many_to_one",
    )

    if reservations_df[
        [
            "_pickup_zone_name",
            "_dropoff_zone_name",
        ]
    ].isna().any().any():
        raise ValueError(
            "pricing_zones.csv ile eşleşmeyen zone ID bulundu."
        )

    # -------------------------------------------------
    # Koordinatlar
    # -------------------------------------------------

    pickup_centers = zone_centers_df[
        [
            "zone_id",
            "center_lon",
            "center_lat",
        ]
    ].rename(
        columns={
            "zone_id": "pickup_zone_id",
            "center_lon": "_pickup_lon",
            "center_lat": "_pickup_lat",
        }
    )

    dropoff_centers = zone_centers_df[
        [
            "zone_id",
            "center_lon",
            "center_lat",
        ]
    ].rename(
        columns={
            "zone_id": "dropoff_zone_id",
            "center_lon": "_dropoff_lon",
            "center_lat": "_dropoff_lat",
        }
    )

    reservations_df = reservations_df.merge(
        pickup_centers,
        on="pickup_zone_id",
        how="left",
        validate="many_to_one",
    )

    reservations_df = reservations_df.merge(
        dropoff_centers,
        on="dropoff_zone_id",
        how="left",
        validate="many_to_one",
    )

    coordinate_columns = [
        "_pickup_lon",
        "_pickup_lat",
        "_dropoff_lon",
        "_dropoff_lat",
    ]

    if reservations_df[
        coordinate_columns
    ].isna().any().any():
        raise ValueError(
            "Eksik bölge merkezi bulundu."
        )

    reservations_df["pickup_point"] = (
        "SRID=4326;POINT("
        + reservations_df["_pickup_lon"]
        .round(6)
        .astype(str)
        + " "
        + reservations_df["_pickup_lat"]
        .round(6)
        .astype(str)
        + ")"
    )

    reservations_df["dropoff_point"] = (
        "SRID=4326;POINT("
        + reservations_df["_dropoff_lon"]
        .round(6)
        .astype(str)
        + " "
        + reservations_df["_dropoff_lat"]
        .round(6)
        .astype(str)
        + ")"
    )

    reservations_df["pickup_address"] = (
        reservations_df["_pickup_zone_name"]
        + " / İstanbul"
    )

    reservations_df["dropoff_address"] = (
        reservations_df["_dropoff_zone_name"]
        + " / İstanbul"
    )

    # -------------------------------------------------
    # Rota kesişim bilgileri
    # -------------------------------------------------

    reservations_df = reservations_df.merge(
        route_matrix_df,
        on=[
            "pickup_zone_id",
            "dropoff_zone_id",
        ],
        how="left",
        validate="many_to_one",
    )

    if reservations_df[
        [
            "route_polyline",
            "route_price_per_km",
        ]
    ].isna().any().any():
        raise ValueError(
            "Rota fiyat matrisiyle eşleşmeyen rezervasyon bulundu."
        )

    # -------------------------------------------------
    # Surge çarpanı
    # -------------------------------------------------

    reservations_df[
        "reservation_date_key"
    ] = pd.to_datetime(
        reservations_df["scheduled_time"]
    ).dt.date

    surge_lookup_df = create_surge_lookup(
        pricing_rules_df=pricing_rules_df,
        reservation_dates=reservations_df[
            "scheduled_time"
        ],
    )

    reservations_df = reservations_df.merge(
        surge_lookup_df,
        on=[
            "pickup_zone_id",
            "reservation_date_key",
            "reservation_hour",
        ],
        how="left",
        validate="many_to_one",
    )

    reservations_df["surge_multiplier"] = (
        reservations_df["surge_multiplier"]
        .fillna(1.00)
        .clip(lower=1.00)
        .round(2)
    )

    # -------------------------------------------------
    # Fiyat zinciri — bütün para alanları TRY/TL
    # -------------------------------------------------
    #
    # DÜZELTME:
    # taxi_with_users.parquet içindeki distance_km bazı ortamlarda
    # float32 tutulduğu için, ekranda 6.035 görünen değer bellekte
    # 6.034999847 olabilir. Bu da 102.60 yerine 102.59 gibi
    # 0.01 TL fiyat farklarına yol açıyordu.
    #
    # Fiyat hesabından önce alanlar kaynak hassasiyetlerine göre
    # standartlaştırılır. Parquet yapısı ve diğer bütün işlemler
    # aynen korunur.

    reservations_df["distance_km"] = (
        pd.to_numeric(
            reservations_df["distance_km"],
            errors="raise",
        )
        .astype("float64")
        .round(3)
    )

    reservations_df["route_price_per_km"] = (
        pd.to_numeric(
            reservations_df["route_price_per_km"],
            errors="raise",
        )
        .astype("float64")
        .round(6)
    )

    reservations_df["_pickup_zone_base_price"] = (
        pd.to_numeric(
            reservations_df["_pickup_zone_base_price"],
            errors="raise",
        )
        .astype("float64")
        .round(2)
    )

    reservations_df["_pickup_zone_min_price"] = (
        pd.to_numeric(
            reservations_df["_pickup_zone_min_price"],
            errors="raise",
        )
        .astype("float64")
        .round(2)
    )

    reservations_df["opening_price"] = (
        pd.to_numeric(
            reservations_df["opening_price"],
            errors="raise",
        )
        .astype("float64")
        .round(2)
    )

    reservations_df["_vehicle_price_multiplier"] = (
        pd.to_numeric(
            reservations_df["_vehicle_price_multiplier"],
            errors="raise",
        )
        .astype("float64")
        .round(6)
    )

    reservations_df["surge_multiplier"] = (
        pd.to_numeric(
            reservations_df["surge_multiplier"],
            errors="raise",
        )
        .astype("float64")
        .round(2)
    )

    reservations_df["_distance_fee"] = (
        reservations_df["distance_km"]
        * reservations_df["route_price_per_km"]
    ).round(2)

    reservations_df["_flag_fee"] = (
        reservations_df["_pickup_zone_base_price"]
        + reservations_df["opening_price"]
    ).round(2)

    reservations_df["base_price"] = (
        reservations_df["_flag_fee"]
        + reservations_df["_distance_fee"]
    ).round(2)

    reservations_df[
        "_price_after_vehicle_multiplier"
    ] = (
        reservations_df["base_price"]
        * reservations_df[
            "_vehicle_price_multiplier"
        ]
    ).round(2)

    reservations_df[
        "_price_after_surge"
    ] = (
        reservations_df[
            "_price_after_vehicle_multiplier"
        ]
        * reservations_df["surge_multiplier"]
    ).round(2)

    # Kampanya ve sadakat hesapları sonraki servis/aşamalara ait.
    reservations_df["discount_amount"] = 0.00
    reservations_df["loyalty_discount"] = 0.00

    reservations_df["_net_price"] = (
        reservations_df["_price_after_surge"]
        - reservations_df["discount_amount"]
        - reservations_df["loyalty_discount"]
    ).round(2)

    reservations_df["calculated_price"] = np.maximum(
        reservations_df["_net_price"],
        reservations_df["_pickup_zone_min_price"],
    ).round(2)

    reservations_df["currency"] = "TRY"

    # -------------------------------------------------
    # Kimlik ve booking reference
    # -------------------------------------------------

    reservations_df = reservations_df.reset_index(
        drop=True
    )

    reservations_df["id"] = np.arange(
        1,
        len(reservations_df) + 1,
        dtype=np.int64,
    )

    booking_numbers = (
        reservations_df["id"]
        .astype(str)
        .str.zfill(7)
    )

    reservations_df["booking_reference"] = (
        "VIP-202501-"
        + booking_numbers
    )

    # -------------------------------------------------
    # Durumlar ve zamanlar
    # -------------------------------------------------

    (
        reservations_df,
        snapshot_time,
    ) = add_status_and_timestamps(
        dataframe=reservations_df,
        rng=rng,
    )

    # -------------------------------------------------
    # Kampanya, uçuş ve not alanları
    # -------------------------------------------------

    reservations_df["campaign_id"] = pd.Series(
        pd.NA,
        index=reservations_df.index,
        dtype="Int64",
    )

    reservations_df["flight_number"] = pd.Series(
        pd.NA,
        index=reservations_df.index,
        dtype="string",
    )

    airport_mask = (
        reservations_df["_pickup_zone_name"]
        .isin(AIRPORT_ZONE_NAMES)
        | reservations_df["_dropoff_zone_name"]
        .isin(AIRPORT_ZONE_NAMES)
    )

    flight_known_mask = (
        airport_mask
        & (
            rng.random(
                len(reservations_df)
            )
            < 0.65
        )
    )

    flight_numbers = rng.integers(
        100,
        9999,
        size=int(flight_known_mask.sum()),
    )

    reservations_df.loc[
        flight_known_mask,
        "flight_number",
    ] = (
        "TK"
        + pd.Series(
            flight_numbers,
            index=reservations_df.index[
                flight_known_mask
            ],
        )
        .astype(str)
        .str.zfill(4)
    )

    reservations_df["notes"] = pd.Series(
        pd.NA,
        index=reservations_df.index,
        dtype="string",
    )

    return reservations_df, snapshot_time


# =====================================================
# 10. ÇIKTI DOĞRULAMA
# =====================================================

def validate_reservations(
    reservations_df: pd.DataFrame,
    users_df: pd.DataFrame,
    vehicles_df: pd.DataFrame,
) -> None:
    """
    SQL, fiyatlandırma ve zaman kurallarını doğrular.
    """

    if reservations_df["id"].duplicated().any():
        raise ValueError(
            "reservations.id alanında tekrar bulundu."
        )

    if reservations_df[
        "booking_reference"
    ].duplicated().any():
        raise ValueError(
            "booking_reference alanında tekrar bulundu."
        )

    if (
        reservations_df["booking_reference"]
        .astype(str)
        .str.len()
        .gt(20)
        .any()
    ):
        raise ValueError(
            "20 karakteri geçen booking_reference bulundu."
        )

    if reservations_df["user_id"].isna().any():
        raise ValueError(
            "user_id alanında eksik değer bulundu."
        )

    valid_user_ids = set(
        users_df["id"].astype(int)
    )

    reservation_user_ids = set(
        reservations_df["user_id"].astype(int)
    )

    if not reservation_user_ids.issubset(
        valid_user_ids
    ):
        raise ValueError(
            "users.csv içinde bulunmayan user_id kullanıldı."
        )

    guest_reservations = reservations_df[
        reservations_df["_is_guest"]
    ]

    registered_reservations = reservations_df[
        ~reservations_df["_is_guest"]
    ]

    if guest_reservations[
        "guest_phone"
    ].isna().any():
        raise ValueError(
            "Misafir rezervasyonunda guest_phone eksik."
        )

    if registered_reservations[
        "guest_phone"
    ].notna().any():
        raise ValueError(
            "Kayıtlı kullanıcı rezervasyonunda guest_phone dolu."
        )

    if not set(
        reservations_df["status"].unique()
    ).issubset(ALLOWED_STATUSES):
        raise ValueError(
            "SQL enum ile uyumsuz reservation status bulundu."
        )

    if not (
        reservations_df["passenger_count"] > 0
    ).all():
        raise ValueError(
            "Sıfır veya negatif passenger_count bulundu."
        )

    if not (
        reservations_df["_vehicle_capacity"]
        >= reservations_df["passenger_count"]
    ).all():
        raise ValueError(
            "Yolcu kapasitesi yetersiz araç ataması bulundu."
        )

    if reservations_df[
        [
            "pickup_point",
            "dropoff_point",
        ]
    ].isna().any().any():
        raise ValueError(
            "PostGIS point alanında eksik değer bulundu."
        )

    if not reservations_df[
        "pickup_point"
    ].str.startswith(
        "SRID=4326;POINT("
    ).all():
        raise ValueError(
            "Geçersiz pickup_point EWKT biçimi bulundu."
        )

    if not reservations_df[
        "dropoff_point"
    ].str.startswith(
        "SRID=4326;POINT("
    ).all():
        raise ValueError(
            "Geçersiz dropoff_point EWKT biçimi bulundu."
        )

    if reservations_df[
        "route_polyline"
    ].isna().any():
        raise ValueError(
            "route_polyline alanında eksik değer bulundu."
        )

    numeric_non_negative_columns = [
        "distance_km",
        "base_price",
        "discount_amount",
        "loyalty_discount",
        "opening_price",
        "calculated_price",
    ]

    for column in numeric_non_negative_columns:
        if not (
            reservations_df[column] >= 0
        ).all():
            raise ValueError(
                f"{column} alanında negatif değer bulundu."
            )

    if not (
        reservations_df["surge_multiplier"]
        >= 1
    ).all():
        raise ValueError(
            "1'den küçük surge_multiplier bulundu."
        )

    if not (
        reservations_df["currency"] == "TRY"
    ).all():
        raise ValueError(
            "Rezervasyon para birimi TRY olmalıdır."
        )

    expected_base_price = (
        reservations_df["_flag_fee"]
        + reservations_df["_distance_fee"]
    ).round(2)

    if not np.allclose(
        reservations_df["base_price"],
        expected_base_price,
        atol=0.01,
    ):
        raise ValueError(
            "base_price formülünde tutarsızlık bulundu."
        )

    expected_after_vehicle = (
        expected_base_price
        * reservations_df[
            "_vehicle_price_multiplier"
        ]
    ).round(2)

    expected_after_surge = (
        expected_after_vehicle
        * reservations_df[
            "surge_multiplier"
        ]
    ).round(2)

    expected_net_price = (
        expected_after_surge
        - reservations_df["discount_amount"]
        - reservations_df["loyalty_discount"]
    ).round(2)

    expected_final_price = np.maximum(
        expected_net_price,
        reservations_df[
            "_pickup_zone_min_price"
        ],
    ).round(2)

    if not np.allclose(
        reservations_df["calculated_price"],
        expected_final_price,
        atol=0.01,
    ):
        raise ValueError(
            "calculated_price formülünde tutarsızlık bulundu."
        )

    if not (
        reservations_df["created_at"]
        <= reservations_df["scheduled_time"]
    ).all():
        raise ValueError(
            "Rezervasyon saatinden sonra oluşturulmuş kayıt bulundu."
        )

    completed_mask = (
        reservations_df["status"]
        == "COMPLETED"
    )

    if reservations_df.loc[
        completed_mask,
        "completed_at",
    ].isna().any():
        raise ValueError(
            "COMPLETED rezervasyonda completed_at eksik."
        )

    if not (
        reservations_df.loc[
            completed_mask,
            "completed_at",
        ]
        > reservations_df.loc[
            completed_mask,
            "scheduled_time",
        ]
    ).all():
        raise ValueError(
            "COMPLETED rezervasyonda geçersiz completed_at bulundu."
        )

    cancelled_mask = (
        reservations_df["status"]
        == "CANCELLED"
    )

    if reservations_df.loc[
        cancelled_mask,
        "cancelled_at",
    ].isna().any():
        raise ValueError(
            "CANCELLED rezervasyonda cancelled_at eksik."
        )

    if reservations_df.loc[
        cancelled_mask,
        "cancellation_reason",
    ].isna().any():
        raise ValueError(
            "CANCELLED rezervasyonda cancellation_reason eksik."
        )

    if not (
        reservations_df.loc[
            cancelled_mask,
            "cancelled_at",
        ]
        < reservations_df.loc[
            cancelled_mask,
            "scheduled_time",
        ]
    ).all():
        raise ValueError(
            "Rezervasyon saatinden sonra iptal edilmiş kayıt bulundu."
        )

    non_completed_mask = (
        reservations_df["status"]
        != "COMPLETED"
    )

    if reservations_df.loc[
        non_completed_mask,
        "completed_at",
    ].notna().any():
        raise ValueError(
            "COMPLETED olmayan kayıtta completed_at dolu."
        )

    non_cancelled_mask = (
        reservations_df["status"]
        != "CANCELLED"
    )

    if reservations_df.loc[
        non_cancelled_mask,
        "cancelled_at",
    ].notna().any():
        raise ValueError(
            "CANCELLED olmayan kayıtta cancelled_at dolu."
        )


# =====================================================
# 11. STATUS HISTORY OLUŞTURMA
# =====================================================

def write_status_history(
    reservations_df: pd.DataFrame,
) -> int:
    """
    Her rezervasyonun durum geçmişini parça parça CSV'ye yazar.
    """

    chunk_size = 200_000
    next_history_id = 1
    first_write = True
    total_history_rows = 0

    if STATUS_HISTORY_OUTPUT_FILE.exists():
        STATUS_HISTORY_OUTPUT_FILE.unlink()

    for start_index in range(
        0,
        len(reservations_df),
        chunk_size,
    ):
        chunk = reservations_df.iloc[
            start_index:start_index + chunk_size
        ]

        history_frames = []

        # Her rezervasyon PENDING olarak başlar.
        pending_history = pd.DataFrame(
            {
                "reservation_id": chunk["id"].values,
                "status": "PENDING",
                "changed_by": chunk["user_id"].values,
                "note": "Rezervasyon oluşturuldu.",
                "changed_at": chunk["created_at"].values,
            }
        )

        history_frames.append(
            pending_history
        )

        assigned_mask = chunk["status"].isin(
            [
                "ASSIGNED",
                "COMPLETED",
                "NO_SHOW",
            ]
        )

        if assigned_mask.any():
            assigned_history = pd.DataFrame(
                {
                    "reservation_id": chunk.loc[
                        assigned_mask,
                        "id",
                    ].values,
                    "status": "ASSIGNED",
                    "changed_by": pd.NA,
                    "note": "Araç atandı.",
                    "changed_at": chunk.loc[
                        assigned_mask,
                        "_assigned_at",
                    ].values,
                }
            )

            history_frames.append(
                assigned_history
            )

        completed_mask = (
            chunk["status"] == "COMPLETED"
        )

        if completed_mask.any():
            completed_history = pd.DataFrame(
                {
                    "reservation_id": chunk.loc[
                        completed_mask,
                        "id",
                    ].values,
                    "status": "COMPLETED",
                    "changed_by": pd.NA,
                    "note": "Transfer tamamlandı.",
                    "changed_at": chunk.loc[
                        completed_mask,
                        "completed_at",
                    ].values,
                }
            )

            history_frames.append(
                completed_history
            )

        cancelled_mask = (
            chunk["status"] == "CANCELLED"
        )

        if cancelled_mask.any():
            cancelled_history = pd.DataFrame(
                {
                    "reservation_id": chunk.loc[
                        cancelled_mask,
                        "id",
                    ].values,
                    "status": "CANCELLED",
                    "changed_by": chunk.loc[
                        cancelled_mask,
                        "user_id",
                    ].values,
                    "note": chunk.loc[
                        cancelled_mask,
                        "cancellation_reason",
                    ].values,
                    "changed_at": chunk.loc[
                        cancelled_mask,
                        "cancelled_at",
                    ].values,
                }
            )

            history_frames.append(
                cancelled_history
            )

        no_show_mask = (
            chunk["status"] == "NO_SHOW"
        )

        if no_show_mask.any():
            no_show_history = pd.DataFrame(
                {
                    "reservation_id": chunk.loc[
                        no_show_mask,
                        "id",
                    ].values,
                    "status": "NO_SHOW",
                    "changed_by": pd.NA,
                    "note": "Müşteri transfer noktasına gelmedi.",
                    "changed_at": chunk.loc[
                        no_show_mask,
                        "_no_show_at",
                    ].values,
                }
            )

            history_frames.append(
                no_show_history
            )

        history_chunk = pd.concat(
            history_frames,
            ignore_index=True,
        ).sort_values(
            [
                "reservation_id",
                "changed_at",
            ]
        ).reset_index(drop=True)

        history_chunk.insert(
            0,
            "id",
            np.arange(
                next_history_id,
                next_history_id
                + len(history_chunk),
                dtype=np.int64,
            ),
        )

        history_chunk["changed_by"] = pd.to_numeric(
            history_chunk["changed_by"],
            errors="coerce",
        ).astype("Int64")

        history_chunk.to_csv(
            STATUS_HISTORY_OUTPUT_FILE,
            index=False,
            encoding="utf-8",
            na_rep="",
            mode="w" if first_write else "a",
            header=first_write,
        )

        next_history_id += len(
            history_chunk
        )

        total_history_rows += len(
            history_chunk
        )

        first_write = False

        print(
            "Status history işlendi: "
            f"{min(start_index + chunk_size, len(reservations_df)):,}"
            f"/{len(reservations_df):,} rezervasyon"
        )

    return total_history_rows


# =====================================================
# 12. DOSYALARI KAYDETME
# =====================================================

def save_reservations(
    reservations_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    SQL reservations CSV'sini ve analitik Parquet çıktısını kaydeder.
    """

    reservation_columns = [
        "id",
        "booking_reference",
        "user_id",
        "guest_phone",
        "pickup_address",
        "pickup_point",
        "dropoff_address",
        "dropoff_point",
        "pickup_zone_id",
        "dropoff_zone_id",
        "scheduled_time",
        "vehicle_id",
        "passenger_count",
        "distance_km",
        "route_polyline",
        "base_price",
        "surge_multiplier",
        "discount_amount",
        "loyalty_discount",
        "opening_price",
        "calculated_price",
        "currency",
        "status",
        "campaign_id",
        "flight_number",
        "notes",
        "cancelled_at",
        "cancellation_reason",
        "completed_at",
        "created_at",
        "updated_at",
    ]

    sql_reservations_df = reservations_df[
        reservation_columns
    ].copy()

    sql_reservations_df.to_csv(
        RESERVATIONS_OUTPUT_FILE,
        index=False,
        encoding="utf-8",
        na_rep="",
        chunksize=200_000,
    )

    analytics_columns = reservation_columns + [
        "source_trip_id",
        "reservation_date",
        "reservation_hour",
        "day_of_week",
        "is_weekend",
        "is_peak_hour",
        "is_holiday",
        "source_pickup_location_id",
        "source_dropoff_location_id",
        "source_fare_amount_usd",
        "source_total_amount_usd",
        "trip_distance_miles",
        "trip_duration_min",
        "_is_guest",
        "_vehicle_class",
        "_vehicle_capacity",
        "_vehicle_price_multiplier",
        "_pickup_zone_base_price",
        "_pickup_zone_min_price",
        "route_price_per_km",
        "crossed_zone_count",
        "crossed_zone_ids",
        "zone_segment_weights_json",
        "route_method",
        "_distance_fee",
        "_flag_fee",
        "_price_after_vehicle_multiplier",
        "_price_after_surge",
        "_net_price",
    ]

    available_analytics_columns = [
        column
        for column in analytics_columns
        if column in reservations_df.columns
    ]

    analytics_df = reservations_df[
        available_analytics_columns
    ].copy()

    analytics_df.to_parquet(
        ANALYTICS_OUTPUT_FILE,
        index=False,
        engine="pyarrow",
        compression="snappy",
    )

    return sql_reservations_df


# =====================================================
# 13. RAPORLAMA
# =====================================================

def create_reports(
    reservations_df: pd.DataFrame,
    snapshot_time: pd.Timestamp,
    status_history_row_count: int,
) -> None:
    """
    Rezervasyon üretim raporlarını oluşturur.
    """

    status_distribution = (
        reservations_df["status"]
        .value_counts()
        .rename_axis("status")
        .reset_index(name="reservation_count")
    )

    status_distribution[
        "percentage"
    ] = (
        status_distribution[
            "reservation_count"
        ]
        / len(reservations_df)
        * 100
    ).round(4)

    status_distribution.to_csv(
        REPORT_DIR / "status_distribution.csv",
        index=False,
        encoding="utf-8-sig",
    )

    price_summary = (
        reservations_df[
            [
                "distance_km",
                "_distance_fee",
                "_flag_fee",
                "base_price",
                "_price_after_vehicle_multiplier",
                "surge_multiplier",
                "_price_after_surge",
                "calculated_price",
            ]
        ]
        .describe()
        .transpose()
        .reset_index()
        .rename(columns={"index": "field"})
    )

    price_summary.to_csv(
        REPORT_DIR / "price_summary.csv",
        index=False,
        encoding="utf-8-sig",
    )

    vehicle_summary = (
        reservations_df
        .groupby(
            [
                "_vehicle_class",
                "_vehicle_capacity",
            ],
            observed=True,
        )
        .agg(
            reservation_count=("id", "count"),
            average_passenger_count=(
                "passenger_count",
                "mean",
            ),
            average_price=(
                "calculated_price",
                "mean",
            ),
        )
        .reset_index()
    )

    vehicle_summary.to_csv(
        REPORT_DIR / "vehicle_assignment_summary.csv",
        index=False,
        encoding="utf-8-sig",
    )

    pricing_audit_columns = [
        "id",
        "booking_reference",
        "pickup_zone_id",
        "dropoff_zone_id",
        "distance_km",
        "crossed_zone_ids",
        "route_price_per_km",
        "_distance_fee",
        "_flag_fee",
        "opening_price",
        "base_price",
        "_vehicle_price_multiplier",
        "surge_multiplier",
        "_price_after_surge",
        "discount_amount",
        "loyalty_discount",
        "_pickup_zone_min_price",
        "calculated_price",
        "currency",
    ]

    reservations_df[
        pricing_audit_columns
    ].head(5000).to_csv(
        REPORT_DIR / "pricing_audit_sample.csv",
        index=False,
        encoding="utf-8-sig",
    )

    summary = {
        "input_file": str(
            TRIPS_INPUT_FILE
        ),
        "reservations_output_file": str(
            RESERVATIONS_OUTPUT_FILE
        ),
        "status_history_output_file": str(
            STATUS_HISTORY_OUTPUT_FILE
        ),
        "analytics_output_file": str(
            ANALYTICS_OUTPUT_FILE
        ),
        "route_pricing_matrix_file": str(
            ROUTE_PRICING_MATRIX_FILE
        ),
        "reservation_count": int(
            len(reservations_df)
        ),
        "status_history_row_count": int(
            status_history_row_count
        ),
        "simulation_snapshot_utc": str(
            snapshot_time
        ),
        "currency": "TRY",
        "distance_unit": "kilometre",
        "route_method": (
            "STRAIGHT_LINE_POLYGON_INTERSECTION"
        ),
        "pricing_method": (
            "ZONE_SEGMENT_WEIGHTED_PRICE_PER_KM"
        ),
        "opening_price_included_in_base_price": True,
        "vehicle_multiplier_applied": True,
        "pricing_rule_surge_applied": True,
        "highest_active_surge_rule_selected": True,
        "campaign_discount_applied": False,
        "loyalty_discount_applied": False,
        "minimum_price_applied_after_discounts": True,
        "vehicle_capacity_checked": True,
        "postgis_points_created": True,
        "status_history_created": True,
        "known_simulation_limit": (
            "Gerçek Maps API rotası yerine fiyat bölgelerinin "
            "merkezleri arasındaki düz çizgi kullanılmıştır."
        ),
        "random_seed": RANDOM_SEED,
    }

    with open(
        REPORT_DIR / "reservation_generation_summary.json",
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
    print("=" * 70)
    print("06 — REZERVASYONLARIN OLUŞTURULMASI")
    print("=" * 70)

    rng = np.random.default_rng(
        RANDOM_SEED
    )

    (
        trips_df,
        users_df,
        vehicles_df,
        pricing_zones_df,
        zone_centers_df,
        pricing_rules_df,
    ) = read_inputs()

    route_matrix_df = (
        create_route_pricing_matrix(
            trips_df=trips_df,
            pricing_zones_df=pricing_zones_df,
            zone_centers_df=zone_centers_df,
        )
    )

    (
        reservations_df,
        snapshot_time,
    ) = create_reservations(
        trips_df=trips_df,
        users_df=users_df,
        vehicles_df=vehicles_df,
        pricing_zones_df=pricing_zones_df,
        zone_centers_df=zone_centers_df,
        pricing_rules_df=pricing_rules_df,
        route_matrix_df=route_matrix_df,
        rng=rng,
    )

    print("\nRezervasyonlar doğrulanıyor...")

    validate_reservations(
        reservations_df=reservations_df,
        users_df=users_df,
        vehicles_df=vehicles_df,
    )

    sql_reservations_df = save_reservations(
        reservations_df
    )

    print(
        "\nReservation status history oluşturuluyor..."
    )

    status_history_row_count = (
        write_status_history(
            reservations_df
        )
    )

    create_reports(
        reservations_df=reservations_df,
        snapshot_time=snapshot_time,
        status_history_row_count=(
            status_history_row_count
        ),
    )

    print("\n" + "=" * 70)
    print("REZERVASYON ÜRETİMİ TAMAMLANDI")
    print("=" * 70)

    print(
        f"Rezervasyon sayısı : "
        f"{len(sql_reservations_df):,}"
    )

    print(
        f"Status history      : "
        f"{status_history_row_count:,}"
    )

    print(
        f"Reservations CSV    : "
        f"{RESERVATIONS_OUTPUT_FILE}"
    )

    print(
        f"Status history CSV  : "
        f"{STATUS_HISTORY_OUTPUT_FILE}"
    )

    print(
        f"Analytics Parquet   : "
        f"{ANALYTICS_OUTPUT_FILE}"
    )

    print(
        f"Rota fiyat matrisi  : "
        f"{ROUTE_PRICING_MATRIX_FILE}"
    )

    print(f"Raporlar            : {REPORT_DIR}")

    print("\nKontroller:")
    print("Bütün VIP Transfer fiyatları TL/TRY olarak hesaplandı.")
    print("Mil değil, gerçek distance_km kullanıldı.")
    print("Araçlar yolcu kapasitesine göre atandı.")
    print("opening_price base_price içine eklendi.")
    print("opening_price ayrıca rezervasyona snapshot olarak yazıldı.")
    print("Aktif surge kurallarından en yüksek çarpan seçildi.")
    print("Minimum fiyat indirimlerden sonra uygulandı.")
    print("PostGIS pickup_point ve dropoff_point oluşturuldu.")
    print("Rota, fiyat polygonlarıyla kesiştirildi.")
    print("İptal zamanları rezervasyon saatinden önce oluşturuldu.")
    print("reservation_status_history.csv oluşturuldu.")

    print(
        "\nNot: Kampanya ve sadakat indirimleri bu aşamada "
        "0 TL'dir. Çünkü kampanya seçimi ve sadakat hesapları "
        "sonraki servis/aşamalarda oluşturulacaktır."
    )


if __name__ == "__main__":
    main()