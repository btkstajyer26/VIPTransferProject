import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd


# Windows terminalinde Türkçe karakter desteği
try:
    sys.stdout.reconfigure(encoding="utf-8")
except AttributeError:
    pass


# =====================================================
# 1. GENEL AYARLAR
# =====================================================

RANDOM_SEED = 42
N_VEHICLES = 500
N_TOP_SURGE_ZONES = 20

ALLOWED_VEHICLE_CLASSES = {
    "ECONOMY",
    "STANDARD",
    "BUSINESS",
    "VIP",
    "LUXURY",
    "MINIVAN",
}

MORNING_SURGE_HOURS = [7, 8, 9]
EVENING_SURGE_HOURS = [17, 18, 19, 20]

NOW = datetime.now(timezone.utc).isoformat()


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

PROCESSED_DATA_DIR = PROJECT_ROOT / "data" / "processed"
REFERENCE_DATA_DIR = PROJECT_ROOT / "data" / "reference"

REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "04_create_reference_tables"
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

INPUT_FILE = (
    PROCESSED_DATA_DIR
    / "featured_taxi_data.parquet"
)

ENRICHED_OUTPUT_FILE = (
    PROCESSED_DATA_DIR
    / "featured_taxi_data_with_zones.parquet"
)

PRICING_ZONES_FILE = (
    REFERENCE_DATA_DIR
    / "pricing_zones.csv"
)

PRICING_ZONE_CENTERS_FILE = (
    REFERENCE_DATA_DIR
    / "pricing_zone_centers.csv"
)

VEHICLES_FILE = (
    REFERENCE_DATA_DIR
    / "vehicles.csv"
)

PRICING_RULES_FILE = (
    REFERENCE_DATA_DIR
    / "pricing_rules.csv"
)

ZONE_MAPPING_FILE = (
    REFERENCE_DATA_DIR
    / "zone_mapping_istanbul.csv"
)


# =====================================================
# 3. İSTANBUL BÖLGELERİ
# =====================================================

ISTANBUL_ZONE_NAMES = [
    "İstanbul Havalimanı",
    "Sabiha Gökçen Havalimanı",
    "Taksim",
    "Beşiktaş",
    "Kadıköy",
    "Üsküdar",
    "Şişli",
    "Levent",
    "Maslak",
    "Sarıyer",
    "Bakırköy",
    "Ataköy",
    "Zeytinburnu",
    "Fatih",
    "Eminönü",
    "Sultanahmet",
    "Beyoğlu",
    "Nişantaşı",
    "Etiler",
    "Bebek",
    "Ortaköy",
    "Karaköy",
    "Galata",
    "Ataşehir",
    "Kozyatağı",
    "Bostancı",
    "Maltepe",
    "Kartal",
    "Pendik",
    "Tuzla",
    "Beylikdüzü",
    "Avcılar",
    "Küçükçekmece",
    "Başakşehir",
    "Bahçelievler",
    "Bağcılar",
    "Esenler",
    "Eyüp",
    "Kağıthane",
    "Ümraniye",
    "Çekmeköy",
    "Beykoz",
    "Çengelköy",
    "Kavacık",
    "Florya",
    "Yeşilköy",
    "Aksaray",
    "Laleli",
    "Mecidiyeköy",
    "Gayrettepe",
    "Zorlu Center",
    "İstinye",
    "Tarabya",
    "Arnavutköy",
    "Kuruçeşme",
    "Moda",
    "Caddebostan",
    "Suadiye",
    "Bağdat Caddesi",
    "Fenerbahçe",
]


AIRPORT_ZONES = {
    "İstanbul Havalimanı",
    "Sabiha Gökçen Havalimanı",
}


PREMIUM_ZONES = {
    "Levent",
    "Maslak",
    "Sarıyer",
    "Nişantaşı",
    "Etiler",
    "Bebek",
    "Ortaköy",
    "Zorlu Center",
    "İstinye",
    "Tarabya",
    "Kuruçeşme",
    "Caddebostan",
    "Suadiye",
    "Bağdat Caddesi",
    "Fenerbahçe",
}


CENTRAL_ZONES = {
    "Taksim",
    "Beşiktaş",
    "Kadıköy",
    "Üsküdar",
    "Şişli",
    "Bakırköy",
    "Ataköy",
    "Fatih",
    "Eminönü",
    "Sultanahmet",
    "Beyoğlu",
    "Karaköy",
    "Galata",
    "Aksaray",
    "Laleli",
    "Mecidiyeköy",
    "Gayrettepe",
    "Moda",
}


OUTER_ZONES = {
    "Tuzla",
    "Beylikdüzü",
    "Avcılar",
    "Başakşehir",
    "Çekmeköy",
    "Beykoz",
    "Arnavutköy",
}


# =====================================================
# 4. FEATURED VERİYİ OKUMA
# =====================================================

def read_featured_data() -> pd.DataFrame:
    """
    03_feature_engineering.py çıktısını okur.
    """

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            "Featured veri dosyası bulunamadı:\n"
            f"{INPUT_FILE}\n\n"
            "Önce 03_feature_engineering.py dosyasını "
            "çalıştırmalısın."
        )

    dataframe = pd.read_parquet(INPUT_FILE)

    required_columns = [
        "source_trip_id",
        "scheduled_time",
        "source_pickup_location_id",
        "source_dropoff_location_id",
        "reservation_hour",
        "day_of_week",
        "distance_km",
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in dataframe.columns
    ]

    if missing_columns:
        raise ValueError(
            "Referans tablolar için gerekli sütunlar eksik:\n"
            f"{missing_columns}\n\n"
            "03_feature_engineering.py dosyasının güncel "
            "sürümünü çalıştırdığından emin ol."
        )

    dataframe["scheduled_time"] = pd.to_datetime(
        dataframe["scheduled_time"],
        errors="coerce",
    )

    if dataframe["scheduled_time"].isna().any():
        raise ValueError(
            "scheduled_time sütununda geçersiz tarih bulundu."
        )

    print(f"Featured veri satır sayısı: {len(dataframe):,}")

    return dataframe


# =====================================================
# 5. BÖLGE FİYAT KATEGORİLERİ
# =====================================================

def get_zone_category(zone_name: str) -> str:
    """
    İstanbul bölgesini fiyat kategorisine ayırır.
    """

    if zone_name in AIRPORT_ZONES:
        return "AIRPORT"

    if zone_name in PREMIUM_ZONES:
        return "PREMIUM"

    if zone_name in CENTRAL_ZONES:
        return "CENTRAL"

    if zone_name in OUTER_ZONES:
        return "OUTER"

    return "STANDARD"


def get_zone_prices(
    category: str,
) -> tuple[float, float, float]:
    """
    Bölge kategorisine göre TL bazlı fiyatları döndürür.

    Dönüş sırası:
    base_price, min_price, price_per_km
    """

    price_configuration = {
        "AIRPORT": {
            "base_price": 180.00,
            "min_price": 450.00,
            "price_per_km": 28.00,
        },
        "PREMIUM": {
            "base_price": 120.00,
            "min_price": 300.00,
            "price_per_km": 22.00,
        },
        "CENTRAL": {
            "base_price": 100.00,
            "min_price": 250.00,
            "price_per_km": 20.00,
        },
        "STANDARD": {
            "base_price": 80.00,
            "min_price": 200.00,
            "price_per_km": 17.00,
        },
        "OUTER": {
            "base_price": 70.00,
            "min_price": 180.00,
            "price_per_km": 15.00,
        },
    }

    configuration = price_configuration[category]

    return (
        configuration["base_price"],
        configuration["min_price"],
        configuration["price_per_km"],
    )


# =====================================================
# 6. POSTGIS POLYGON ÜRETME
# =====================================================

def create_grid_polygon(
    index: int,
    total_zone_count: int,
) -> tuple[str, float, float]:
    """
    İstanbul sınırları içinde simülasyon amaçlı,
    çakışmayan grid polygon oluşturur.

    Bu polygonlar gerçek idari veya ticari bölge sınırı değildir.
    Backend/PostGIS entegrasyon testi içindir.
    """

    grid_columns = 10
    grid_rows = math.ceil(
        total_zone_count / grid_columns
    )

    minimum_longitude = 28.55
    maximum_longitude = 29.45

    minimum_latitude = 40.80
    maximum_latitude = 41.30

    cell_width = (
        maximum_longitude - minimum_longitude
    ) / grid_columns

    cell_height = (
        maximum_latitude - minimum_latitude
    ) / grid_rows

    row_index = index // grid_columns
    column_index = index % grid_columns

    longitude_1 = (
        minimum_longitude
        + column_index * cell_width
    )

    longitude_2 = longitude_1 + cell_width

    latitude_1 = (
        minimum_latitude
        + row_index * cell_height
    )

    latitude_2 = latitude_1 + cell_height

    center_longitude = (
        longitude_1 + longitude_2
    ) / 2

    center_latitude = (
        latitude_1 + latitude_2
    ) / 2

    polygon_ewkt = (
        "SRID=4326;POLYGON(("
        f"{longitude_1:.6f} {latitude_1:.6f}, "
        f"{longitude_2:.6f} {latitude_1:.6f}, "
        f"{longitude_2:.6f} {latitude_2:.6f}, "
        f"{longitude_1:.6f} {latitude_2:.6f}, "
        f"{longitude_1:.6f} {latitude_1:.6f}"
        "))"
    )

    return (
        polygon_ewkt,
        round(center_longitude, 6),
        round(center_latitude, 6),
    )


# =====================================================
# 7. PRICING_ZONES TABLOSU
# =====================================================

def create_pricing_zones() -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    SQL pricing_zones tablosuna uygun bölge verisi oluşturur.
    """

    pricing_zone_rows = []
    center_rows = []

    total_zone_count = len(ISTANBUL_ZONE_NAMES)

    for index, zone_name in enumerate(
        ISTANBUL_ZONE_NAMES
    ):
        zone_id = index + 1

        category = get_zone_category(zone_name)

        (
            base_price,
            min_price,
            price_per_km,
        ) = get_zone_prices(category)

        (
            polygon_geom,
            center_lon,
            center_lat,
        ) = create_grid_polygon(
            index=index,
            total_zone_count=total_zone_count,
        )

        pricing_zone_rows.append(
            {
                "id": zone_id,
                "name": zone_name,
                "description": (
                    f"{zone_name} için {category.lower()} "
                    "kategorisinde İstanbul VIP transfer "
                    "fiyatlandırma bölgesi. Polygon simülasyon "
                    "amaçlıdır."
                ),
                "polygon_geom": polygon_geom,
                "base_price": base_price,
                "min_price": min_price,
                "price_per_km": price_per_km,
                "currency": "TRY",
                "is_active": True,
                "created_at": NOW,
                "updated_at": NOW,
            }
        )

        center_rows.append(
            {
                "zone_id": zone_id,
                "zone_name": zone_name,
                "zone_category": category,
                "center_lon": center_lon,
                "center_lat": center_lat,
                "polygon_method": "SIMULATED_GRID",
            }
        )

    pricing_zones_df = pd.DataFrame(
        pricing_zone_rows
    )

    zone_centers_df = pd.DataFrame(
        center_rows
    )

    return pricing_zones_df, zone_centers_df


# =====================================================
# 8. NYC → İSTANBUL ZONE MAPPING
# =====================================================

def create_zone_mapping(
    dataframe: pd.DataFrame,
    pricing_zones_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Kaynak NYC lokasyon kimliklerini İstanbul fiyat
    bölgesi kimliklerine deterministik biçimde eşler.

    Kaynak kimlik doğrudan backend zone kimliği olarak kullanılmaz.
    """

    pickup_location_ids = (
        dataframe["source_pickup_location_id"]
        .dropna()
        .astype(int)
        .unique()
        .tolist()
    )

    dropoff_location_ids = (
        dataframe["source_dropoff_location_id"]
        .dropna()
        .astype(int)
        .unique()
        .tolist()
    )

    all_source_location_ids = sorted(
        set(pickup_location_ids)
        .union(dropoff_location_ids)
    )

    zone_count = len(pricing_zones_df)

    zone_name_lookup = (
        pricing_zones_df
        .set_index("id")["name"]
        .to_dict()
    )

    mapping_rows = []

    for source_location_id in all_source_location_ids:
        # 37 ile çarpım, kaynak ID'lerin İstanbul
        # bölgelerine sıralı biçimde yığılmasını azaltır.
        pricing_zone_id = (
            (source_location_id * 37) % zone_count
        ) + 1

        mapping_rows.append(
            {
                "source_location_id": (
                    int(source_location_id)
                ),
                "pricing_zone_id": (
                    int(pricing_zone_id)
                ),
                "pricing_zone_name": (
                    zone_name_lookup[pricing_zone_id]
                ),
                "mapping_method": (
                    "DETERMINISTIC_SIMULATION"
                ),
                "is_simulated": True,
                "created_at": NOW,
            }
        )

    mapping_df = pd.DataFrame(mapping_rows)

    return mapping_df


# =====================================================
# 9. FEATURED VERİYE BACKEND ZONE EKLEME
# =====================================================

def add_backend_zone_ids(
    dataframe: pd.DataFrame,
    mapping_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Featured veri setine pickup_zone_id ve dropoff_zone_id ekler.
    """

    original_row_count = len(dataframe)

    pickup_mapping = mapping_df[
        [
            "source_location_id",
            "pricing_zone_id",
            "pricing_zone_name",
        ]
    ].rename(
        columns={
            "source_location_id": (
                "source_pickup_location_id"
            ),
            "pricing_zone_id": "pickup_zone_id",
            "pricing_zone_name": "pickup_zone_name",
        }
    )

    dropoff_mapping = mapping_df[
        [
            "source_location_id",
            "pricing_zone_id",
            "pricing_zone_name",
        ]
    ].rename(
        columns={
            "source_location_id": (
                "source_dropoff_location_id"
            ),
            "pricing_zone_id": "dropoff_zone_id",
            "pricing_zone_name": "dropoff_zone_name",
        }
    )

    enriched_df = dataframe.merge(
        pickup_mapping,
        on="source_pickup_location_id",
        how="left",
        validate="many_to_one",
    )

    enriched_df = enriched_df.merge(
        dropoff_mapping,
        on="source_dropoff_location_id",
        how="left",
        validate="many_to_one",
    )

    if len(enriched_df) != original_row_count:
        raise ValueError(
            "Zone mapping sırasında satır sayısı değişti."
        )

    zone_columns = [
        "pickup_zone_id",
        "dropoff_zone_id",
    ]

    if enriched_df[zone_columns].isna().any().any():
        raise ValueError(
            "İstanbul bölgesine eşlenemeyen kaynak "
            "lokasyon bulundu."
        )

    enriched_df["pickup_zone_id"] = (
        enriched_df["pickup_zone_id"]
        .astype("Int16")
    )

    enriched_df["dropoff_zone_id"] = (
        enriched_df["dropoff_zone_id"]
        .astype("Int16")
    )

    return enriched_df


# =====================================================
# 10. VEHICLES TABLOSU
# =====================================================

def create_vehicles() -> pd.DataFrame:
    """
    SQL vehicles tablosuna uygun sentetik filo oluşturur.
    """

    rng = np.random.default_rng(RANDOM_SEED)

    class_probabilities = {
        "ECONOMY": 0.20,
        "STANDARD": 0.30,
        "BUSINESS": 0.20,
        "VIP": 0.15,
        "LUXURY": 0.05,
        "MINIVAN": 0.10,
    }

    vehicle_configuration = {
        "ECONOMY": {
            "multiplier": 1.00,
            "opening_price": 15.00,
            "capacities": [4],
            "models": [
                ("Toyota", "Corolla"),
                ("Hyundai", "Elantra"),
                ("Renault", "Megane"),
            ],
        },
        "STANDARD": {
            "multiplier": 1.15,
            "opening_price": 20.00,
            "capacities": [4],
            "models": [
                ("Volkswagen", "Passat"),
                ("Skoda", "Superb"),
                ("Toyota", "Camry"),
            ],
        },
        "BUSINESS": {
            "multiplier": 1.35,
            "opening_price": 30.00,
            "capacities": [4],
            "models": [
                ("Mercedes", "E-Class"),
                ("BMW", "5 Series"),
                ("Audi", "A6"),
            ],
        },
        "VIP": {
            "multiplier": 1.75,
            "opening_price": 50.00,
            "capacities": [4],
            "models": [
                ("Mercedes", "S-Class"),
                ("BMW", "7 Series"),
                ("Audi", "A8"),
            ],
        },
        "LUXURY": {
            "multiplier": 2.25,
            "opening_price": 75.00,
            "capacities": [4],
            "models": [
                ("Mercedes", "Maybach"),
                ("Range Rover", "Vogue"),
                ("Porsche", "Panamera"),
            ],
        },
        "MINIVAN": {
            "multiplier": 1.60,
            "opening_price": 25.00,
            "capacities": [6, 7, 8, 16],
            "models": [
                ("Mercedes", "Vito"),
                ("Volkswagen", "Caravelle"),
                ("Ford", "Tourneo"),
                ("Mercedes", "Sprinter"),
            ],
        },
    }

    vehicle_classes = list(
        class_probabilities.keys()
    )

    probabilities = [
        class_probabilities[vehicle_class]
        for vehicle_class in vehicle_classes
    ]

    colors = [
        "Black",
        "White",
        "Gray",
        "Silver",
        "Navy",
    ]

    vehicle_rows = []

    for vehicle_id in range(
        1,
        N_VEHICLES + 1,
    ):
        vehicle_class = str(
            rng.choice(
                vehicle_classes,
                p=probabilities,
            )
        )

        configuration = (
            vehicle_configuration[vehicle_class]
        )

        model_index = int(
            rng.integers(
                0,
                len(configuration["models"]),
            )
        )

        brand, model = (
            configuration["models"][model_index]
        )

        capacity = int(
            rng.choice(
                configuration["capacities"]
            )
        )

        vehicle_rows.append(
            {
                "id": vehicle_id,
                "plate_number": (
                    f"34 VIP {vehicle_id:04d}"
                ),
                "vehicle_class": vehicle_class,
                "brand": brand,
                "model": model,
                "year": int(
                    rng.integers(2019, 2026)
                ),
                "color": str(
                    rng.choice(colors)
                ),
                "photo_url": None,
                "capacity": capacity,
                "base_price_multiplier": (
                    configuration["multiplier"]
                ),
                "opening_price": (
                    configuration["opening_price"]
                ),
                "is_active": True,
                "created_at": NOW,
                "updated_at": NOW,
            }
        )

    return pd.DataFrame(vehicle_rows)


# =====================================================
# 11. TALEP ORANINDAN SURGE ÇARPANI
# =====================================================

def demand_ratio_to_multiplier(
    demand_ratio: float,
) -> float:
    """
    Saatlik talep oranını deterministik surge değerine çevirir.
    """

    if demand_ratio >= 2.00:
        return 1.50

    if demand_ratio >= 1.70:
        return 1.35

    if demand_ratio >= 1.40:
        return 1.20

    if demand_ratio >= 1.15:
        return 1.10

    return 1.00


# =====================================================
# 12. PRICING_RULES TABLOSU
# =====================================================

def create_pricing_rules(
    enriched_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Geçmiş rezervasyon yoğunluğundan sabit temel
    surge pricing kuralları çıkarır.

    XGBoost modeli daha sonra dinamik tahmin çıktısı üretecektir.
    Bu tablo backend için temel/baseline kuralları temsil eder.
    """

    hourly_demand = (
        enriched_df
        .groupby(
            [
                "pickup_zone_id",
                "day_of_week",
                "reservation_hour",
            ],
            observed=True,
        )
        .size()
        .reset_index(name="demand_count")
    )

    top_zone_ids = (
        enriched_df["pickup_zone_id"]
        .value_counts()
        .head(N_TOP_SURGE_ZONES)
        .index
        .astype(int)
        .tolist()
    )

    pricing_rule_rows = []
    rule_id = 1

    time_windows = [
        {
            "period": "MORNING",
            "hours": MORNING_SURGE_HOURS,
            "start_time": "07:00:00",
            "end_time": "10:00:00",
            "reason": "Historical morning peak demand",
        },
        {
            "period": "EVENING",
            "hours": EVENING_SURGE_HOURS,
            "start_time": "17:00:00",
            "end_time": "21:00:00",
            "reason": "Historical evening peak demand",
        },
    ]

    for zone_id in top_zone_ids:
        for day_of_week in range(7):
            day_data = hourly_demand[
                (
                    hourly_demand["pickup_zone_id"]
                    == zone_id
                )
                & (
                    hourly_demand["day_of_week"]
                    == day_of_week
                )
            ]

            hourly_series = (
                day_data
                .set_index("reservation_hour")[
                    "demand_count"
                ]
                .reindex(
                    range(24),
                    fill_value=0,
                )
            )

            baseline_hourly_demand = float(
                hourly_series.mean()
            )

            if baseline_hourly_demand <= 0:
                continue

            for window in time_windows:
                window_average_demand = float(
                    hourly_series
                    .reindex(
                        window["hours"],
                        fill_value=0,
                    )
                    .mean()
                )

                demand_ratio = (
                    window_average_demand
                    / baseline_hourly_demand
                )

                multiplier = (
                    demand_ratio_to_multiplier(
                        demand_ratio
                    )
                )

                # 1.00 için aktif surge kuralı yazmaya gerek yok.
                if multiplier <= 1.00:
                    continue

                pricing_rule_rows.append(
                    {
                        "id": rule_id,
                        "zone_id": zone_id,
                        "name": (
                            f"{window['period']} Surge "
                            f"Z{zone_id} D{day_of_week}"
                        ),
                        "day_of_week": day_of_week,
                        "start_time": (
                            window["start_time"]
                        ),
                        "end_time": (
                            window["end_time"]
                        ),
                        "multiplier": multiplier,
                        "reason": window["reason"],
                        "valid_from": None,
                        "valid_to": None,
                        "is_active": True,
                        "created_at": NOW,
                    }
                )

                rule_id += 1

    # Veride beklenmedik biçimde hiçbir yoğunluk kuralı çıkmazsa
    # backend testleri için tek bir güvenli başlangıç kuralı oluştur.
    if not pricing_rule_rows:
        fallback_zone_id = int(
            enriched_df["pickup_zone_id"]
            .value_counts()
            .index[0]
        )

        pricing_rule_rows.append(
            {
                "id": 1,
                "zone_id": fallback_zone_id,
                "name": "EVENING Surge Fallback",
                "day_of_week": 0,
                "start_time": "17:00:00",
                "end_time": "21:00:00",
                "multiplier": 1.10,
                "reason": "Fallback simulation rule",
                "valid_from": None,
                "valid_to": None,
                "is_active": True,
                "created_at": NOW,
            }
        )

    return pd.DataFrame(pricing_rule_rows)


# =====================================================
# 13. DOĞRULAMA
# =====================================================

def validate_outputs(
    original_df: pd.DataFrame,
    enriched_df: pd.DataFrame,
    pricing_zones_df: pd.DataFrame,
    vehicles_df: pd.DataFrame,
    pricing_rules_df: pd.DataFrame,
    mapping_df: pd.DataFrame,
) -> None:
    """
    Üretilen bütün referans tabloları doğrular.
    """

    # -------------------------------------------------
    # Satır bütünlüğü
    # -------------------------------------------------

    if len(original_df) != len(enriched_df):
        raise ValueError(
            "Zone ekleme işleminde rezervasyon satır "
            "sayısı değişti."
        )

    # -------------------------------------------------
    # Pricing zones
    # -------------------------------------------------

    if pricing_zones_df["id"].duplicated().any():
        raise ValueError(
            "pricing_zones.id alanında tekrar var."
        )

    if pricing_zones_df["name"].duplicated().any():
        raise ValueError(
            "pricing_zones.name alanında tekrar var."
        )

    if pricing_zones_df["polygon_geom"].isna().any():
        raise ValueError(
            "polygon_geom alanında eksik değer var."
        )

    if not pricing_zones_df[
        "polygon_geom"
    ].str.startswith(
        "SRID=4326;POLYGON(("
    ).all():
        raise ValueError(
            "Geçersiz PostGIS polygon formatı bulundu."
        )

    if not (
        pricing_zones_df["currency"] == "TRY"
    ).all():
        raise ValueError(
            "pricing_zones para birimi TRY olmalıdır."
        )

    for price_column in [
        "base_price",
        "min_price",
        "price_per_km",
    ]:
        if not (
            pricing_zones_df[price_column] >= 0
        ).all():
            raise ValueError(
                f"{price_column} alanında negatif "
                "değer bulundu."
            )

    # -------------------------------------------------
    # Vehicles
    # -------------------------------------------------

    if vehicles_df["id"].duplicated().any():
        raise ValueError(
            "vehicles.id alanında tekrar var."
        )

    if vehicles_df[
        "plate_number"
    ].duplicated().any():
        raise ValueError(
            "plate_number alanında tekrar var."
        )

    invalid_vehicle_classes = (
        set(vehicles_df["vehicle_class"])
        - ALLOWED_VEHICLE_CLASSES
    )

    if invalid_vehicle_classes:
        raise ValueError(
            "SQL enum ile uyumsuz araç sınıfları: "
            f"{invalid_vehicle_classes}"
        )

    if not (
        vehicles_df["capacity"] > 0
    ).all():
        raise ValueError(
            "Araç kapasitesi sıfırdan büyük olmalıdır."
        )

    if not (
        vehicles_df[
            "base_price_multiplier"
        ] > 0
    ).all():
        raise ValueError(
            "Araç fiyat çarpanı sıfırdan büyük olmalıdır."
        )

    if not (
        vehicles_df["opening_price"] >= 0
    ).all():
        raise ValueError(
            "opening_price negatif olamaz."
        )

    # -------------------------------------------------
    # Mapping
    # -------------------------------------------------

    if mapping_df[
        "source_location_id"
    ].duplicated().any():
        raise ValueError(
            "Bir kaynak lokasyon birden fazla "
            "İstanbul bölgesine eşlenmiş."
        )

    valid_zone_ids = set(
        pricing_zones_df["id"].astype(int)
    )

    mapped_zone_ids = set(
        mapping_df["pricing_zone_id"].astype(int)
    )

    if not mapped_zone_ids.issubset(
        valid_zone_ids
    ):
        raise ValueError(
            "Mapping içinde geçersiz pricing_zone_id var."
        )

    # -------------------------------------------------
    # Enriched data
    # -------------------------------------------------

    for zone_column in [
        "pickup_zone_id",
        "dropoff_zone_id",
    ]:
        if enriched_df[zone_column].isna().any():
            raise ValueError(
                f"{zone_column} alanında eksik değer var."
            )

        used_zone_ids = set(
            enriched_df[zone_column].astype(int)
        )

        if not used_zone_ids.issubset(
            valid_zone_ids
        ):
            raise ValueError(
                f"{zone_column} içinde geçersiz "
                "pricing zone bulundu."
            )

    # -------------------------------------------------
    # Pricing rules
    # -------------------------------------------------

    if pricing_rules_df["id"].duplicated().any():
        raise ValueError(
            "pricing_rules.id alanında tekrar var."
        )

    rule_zone_ids = set(
        pricing_rules_df["zone_id"].astype(int)
    )

    if not rule_zone_ids.issubset(
        valid_zone_ids
    ):
        raise ValueError(
            "pricing_rules içinde geçersiz zone_id var."
        )

    if not pricing_rules_df[
        "day_of_week"
    ].between(
        0,
        6,
    ).all():
        raise ValueError(
            "day_of_week 0–6 arasında olmalıdır."
        )

    if not (
        pricing_rules_df["multiplier"] >= 1
    ).all():
        raise ValueError(
            "Surge multiplier 1'den küçük olamaz."
        )

    invalid_time_rows = (
        pricing_rules_df["end_time"]
        <= pricing_rules_df["start_time"]
    )

    if invalid_time_rows.any():
        raise ValueError(
            "end_time, start_time değerinden "
            "büyük olmalıdır."
        )


# =====================================================
# 14. RAPORLAMA
# =====================================================

def create_reports(
    enriched_df: pd.DataFrame,
    pricing_zones_df: pd.DataFrame,
    vehicles_df: pd.DataFrame,
    pricing_rules_df: pd.DataFrame,
    mapping_df: pd.DataFrame,
) -> None:
    """
    Referans tablo üretim raporlarını oluşturur.
    """

    zone_demand_summary = (
        enriched_df
        .groupby(
            [
                "pickup_zone_id",
                "pickup_zone_name",
            ],
            observed=True,
        )
        .size()
        .reset_index(name="pickup_count")
        .sort_values(
            by="pickup_count",
            ascending=False,
        )
    )

    zone_demand_summary.to_csv(
        REPORT_DIR / "zone_demand_summary.csv",
        index=False,
        encoding="utf-8-sig",
    )

    vehicles_df[
        "vehicle_class"
    ].value_counts().rename_axis(
        "vehicle_class"
    ).reset_index(
        name="vehicle_count"
    ).to_csv(
        REPORT_DIR / "vehicle_class_distribution.csv",
        index=False,
        encoding="utf-8-sig",
    )

    pricing_rules_df[
        [
            "zone_id",
            "day_of_week",
            "start_time",
            "end_time",
            "multiplier",
        ]
    ].to_csv(
        REPORT_DIR / "pricing_rules_summary.csv",
        index=False,
        encoding="utf-8-sig",
    )

    mapping_df.head(1000).to_csv(
        REPORT_DIR / "zone_mapping_sample.csv",
        index=False,
        encoding="utf-8-sig",
    )

    summary = {
        "input_file": str(INPUT_FILE),
        "enriched_output_file": str(
            ENRICHED_OUTPUT_FILE
        ),
        "pricing_zones_file": str(
            PRICING_ZONES_FILE
        ),
        "vehicles_file": str(VEHICLES_FILE),
        "pricing_rules_file": str(
            PRICING_RULES_FILE
        ),
        "zone_mapping_file": str(
            ZONE_MAPPING_FILE
        ),
        "featured_row_count": int(
            len(enriched_df)
        ),
        "pricing_zone_count": int(
            len(pricing_zones_df)
        ),
        "vehicle_count": int(
            len(vehicles_df)
        ),
        "pricing_rule_count": int(
            len(pricing_rules_df)
        ),
        "source_location_mapping_count": int(
            len(mapping_df)
        ),
        "pricing_currency": "TRY",
        "source_currency_preserved": "USD",
        "polygon_srid": 4326,
        "polygon_method": "SIMULATED_GRID",
        "zone_mapping_method": (
            "DETERMINISTIC_SIMULATION"
        ),
        "random_zone_prices": False,
        "random_surge_rules": False,
        "vehicle_random_seed": RANDOM_SEED,
        "production_warning": (
            "Grid polygonlar yalnızca staj simülasyonu ve "
            "backend entegrasyon testi içindir. Gerçek sistemde "
            "admin panelinden çizilmiş polygonlar kullanılmalıdır."
        ),
    }

    with open(
        REPORT_DIR / "reference_tables_summary.json",
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
# 15. DOSYALARI KAYDETME
# =====================================================

def save_outputs(
    enriched_df: pd.DataFrame,
    pricing_zones_df: pd.DataFrame,
    zone_centers_df: pd.DataFrame,
    vehicles_df: pd.DataFrame,
    pricing_rules_df: pd.DataFrame,
    mapping_df: pd.DataFrame,
) -> None:
    """
    Üretilen referans tabloları kaydeder.
    """

    pricing_zones_df.to_csv(
        PRICING_ZONES_FILE,
        index=False,
        encoding="utf-8",
    )

    zone_centers_df.to_csv(
        PRICING_ZONE_CENTERS_FILE,
        index=False,
        encoding="utf-8",
    )

    vehicles_df.to_csv(
        VEHICLES_FILE,
        index=False,
        encoding="utf-8",
    )

    pricing_rules_df.to_csv(
        PRICING_RULES_FILE,
        index=False,
        encoding="utf-8",
    )

    mapping_df.to_csv(
        ZONE_MAPPING_FILE,
        index=False,
        encoding="utf-8",
    )

    try:
        enriched_df.to_parquet(
            ENRICHED_OUTPUT_FILE,
            index=False,
            engine="pyarrow",
            compression="snappy",
        )

    except ImportError as error:
        raise ImportError(
            "Parquet çıktısı için pyarrow gereklidir.\n"
            "VS Code terminalinde şu komutu çalıştır:\n\n"
            "pip install pyarrow"
        ) from error


# =====================================================
# 16. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 70)
    print("04 — REFERANS TABLOLARIN OLUŞTURULMASI")
    print("=" * 70)

    featured_df = read_featured_data()

    print("\nPricing zones oluşturuluyor...")

    (
        pricing_zones_df,
        zone_centers_df,
    ) = create_pricing_zones()

    print(
        f"Pricing zone sayısı: "
        f"{len(pricing_zones_df)}"
    )

    print("\nNYC → İstanbul zone mapping oluşturuluyor...")

    mapping_df = create_zone_mapping(
        dataframe=featured_df,
        pricing_zones_df=pricing_zones_df,
    )

    print(
        f"Eşlenen kaynak lokasyon sayısı: "
        f"{len(mapping_df)}"
    )

    print("\nFeatured veriye backend zone ID'leri ekleniyor...")

    enriched_df = add_backend_zone_ids(
        dataframe=featured_df,
        mapping_df=mapping_df,
    )

    print("\nAraç filosu oluşturuluyor...")

    vehicles_df = create_vehicles()

    print(
        f"Araç sayısı: {len(vehicles_df)}"
    )

    print("\nGeçmiş talepten pricing rules çıkarılıyor...")

    pricing_rules_df = create_pricing_rules(
        enriched_df=enriched_df,
    )

    print(
        f"Pricing rule sayısı: "
        f"{len(pricing_rules_df)}"
    )

    print("\nÇıktılar doğrulanıyor...")

    validate_outputs(
        original_df=featured_df,
        enriched_df=enriched_df,
        pricing_zones_df=pricing_zones_df,
        vehicles_df=vehicles_df,
        pricing_rules_df=pricing_rules_df,
        mapping_df=mapping_df,
    )

    save_outputs(
        enriched_df=enriched_df,
        pricing_zones_df=pricing_zones_df,
        zone_centers_df=zone_centers_df,
        vehicles_df=vehicles_df,
        pricing_rules_df=pricing_rules_df,
        mapping_df=mapping_df,
    )

    create_reports(
        enriched_df=enriched_df,
        pricing_zones_df=pricing_zones_df,
        vehicles_df=vehicles_df,
        pricing_rules_df=pricing_rules_df,
        mapping_df=mapping_df,
    )

    print("\n" + "=" * 70)
    print("REFERANS TABLOLAR OLUŞTURULDU")
    print("=" * 70)

    print(f"\nPricing zones : {PRICING_ZONES_FILE}")
    print(f"Zone centers  : {PRICING_ZONE_CENTERS_FILE}")
    print(f"Vehicles      : {VEHICLES_FILE}")
    print(f"Pricing rules : {PRICING_RULES_FILE}")
    print(f"Zone mapping  : {ZONE_MAPPING_FILE}")
    print(f"Featured data : {ENRICHED_OUTPUT_FILE}")
    print(f"Raporlar      : {REPORT_DIR}")

    print("\nÖnemli kontroller:")
    print("Backend pricing zone ID'leri NYC ID'lerinden ayrıldı.")
    print("Bütün fiyatlandırma değerleri TRY/TL olarak üretildi.")
    print("Kaynak NYC fiyatları USD olarak ayrı tutuldu.")
    print("vehicles.opening_price alanı oluşturuldu.")
    print("PostGIS polygon_geom alanı oluşturuldu.")
    print("Surge kuralları rastgele değil, geçmiş talepten çıkarıldı.")
    print("Çıktılar SQL şemasına göre doğrulandı.")


if __name__ == "__main__":
    main()