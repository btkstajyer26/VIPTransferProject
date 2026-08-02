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

RANDOM_SEED = 42

# Bir kullanıcının ortalama kaç rezervasyonu olması hedefleniyor?
TARGET_AVG_RESERVATIONS_PER_USER = 12

# Büyük veri setlerinde gereksiz sayıda kullanıcı üretmemek için üst sınır
MAX_USERS = 250_000

# Toplam kullanıcılar içindeki misafir kullanıcı oranı
GUEST_USER_RATIO = 0.25

# Kayıtlı kullanıcılar, misafirlerden daha sık rezervasyon yapabilsin
REGISTERED_ACTIVITY_MULTIPLIER = 1.50
GUEST_ACTIVITY_MULTIPLIER = 0.35

SIMULATION_TIMEZONE = "Europe/Istanbul"


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
GENERATED_DATA_DIR = PROJECT_ROOT / "data" / "generated"

REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "05_create_users"
)

PROCESSED_DATA_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

GENERATED_DATA_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

REPORT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

INPUT_FILE = (
    PROCESSED_DATA_DIR
    / "featured_taxi_data_with_zones.parquet"
)

USERS_OUTPUT_FILE = (
    GENERATED_DATA_DIR
    / "users.csv"
)

TRIPS_WITH_USERS_OUTPUT_FILE = (
    PROCESSED_DATA_DIR
    / "taxi_with_users.parquet"
)


# =====================================================
# 3. GİRDİ DOSYASINI OKUMA
# =====================================================

def read_featured_data() -> pd.DataFrame:
    """
    04_create_reference_tables.py çıktısını okur.
    """

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            "İstanbul zone bilgisi eklenmiş featured veri bulunamadı:\n"
            f"{INPUT_FILE}\n\n"
            "Önce 04_create_reference_tables.py dosyasını "
            "çalıştırmalısın."
        )

    dataframe = pd.read_parquet(INPUT_FILE)

    required_columns = [
        "source_trip_id",
        "scheduled_time",
        "source_completed_time",
        "pickup_zone_id",
        "dropoff_zone_id",
        "passenger_count",
        "distance_km",
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in dataframe.columns
    ]

    if missing_columns:
        raise ValueError(
            "Kullanıcı ataması için gerekli sütunlar eksik:\n"
            f"{missing_columns}"
        )

    if "user_id" in dataframe.columns:
        raise ValueError(
            "Girdi dosyasında zaten user_id sütunu bulunuyor. "
            "Yanlış veya daha önce işlenmiş bir dosya kullanılıyor olabilir."
        )

    dataframe["scheduled_time"] = pd.to_datetime(
        dataframe["scheduled_time"],
        errors="coerce",
    )

    if dataframe["scheduled_time"].isna().any():
        raise ValueError(
            "scheduled_time sütununda geçersiz tarih bulundu."
        )

    dataframe = dataframe.reset_index(drop=True)

    print(f"Girdi satır sayısı: {len(dataframe):,}")

    return dataframe


# =====================================================
# 4. ZAMAN DİLİMİ DÖNÜŞÜMÜ
# =====================================================

def convert_to_utc(
    datetime_series: pd.Series,
) -> pd.Series:
    """
    İstanbul simülasyon zamanını timezone-aware UTC değere dönüştürür.

    Kaynak zaman sütunu timezone içermiyorsa Europe/Istanbul
    olarak kabul edilir.
    """

    converted_series = pd.to_datetime(
        datetime_series,
        errors="coerce",
    )

    if converted_series.isna().any():
        raise ValueError(
            "UTC dönüşümünde geçersiz tarih değeri bulundu."
        )

    if converted_series.dt.tz is None:
        converted_series = (
            converted_series
            .dt.tz_localize(
                SIMULATION_TIMEZONE,
                nonexistent="shift_forward",
                ambiguous="NaT",
            )
        )

        if converted_series.isna().any():
            raise ValueError(
                "Timezone dönüşümünde belirsiz tarih değeri bulundu."
            )

    return converted_series.dt.tz_convert("UTC")


# =====================================================
# 5. KULLANICI SAYISINI BELİRLEME
# =====================================================

def determine_user_count(
    reservation_count: int,
) -> int:
    """
    Rezervasyon sayısına göre kullanıcı sayısını belirler.
    """

    if reservation_count <= 0:
        raise ValueError(
            "Kullanıcı üretmek için en az bir rezervasyon gerekir."
        )

    estimated_user_count = max(
        1,
        round(
            reservation_count
            / TARGET_AVG_RESERVATIONS_PER_USER
        ),
    )

    user_count = min(
        estimated_user_count,
        MAX_USERS,
        reservation_count,
    )

    return int(user_count)


# =====================================================
# 6. MİSAFİR VE KAYITLI KULLANICI TİPLERİ
# =====================================================

def create_guest_flags(
    user_count: int,
    rng: np.random.Generator,
) -> np.ndarray:
    """
    Belirlenen oranda kullanıcıyı misafir olarak işaretler.

    Misafir sayısı rastgele dalgalanmaz; hedef oran kadar
    kullanıcı tam olarak seçilir.
    """

    guest_count = int(
        round(user_count * GUEST_USER_RATIO)
    )

    guest_flags = np.zeros(
        user_count,
        dtype=bool,
    )

    if guest_count > 0:
        guest_indexes = rng.choice(
            user_count,
            size=guest_count,
            replace=False,
        )

        guest_flags[guest_indexes] = True

    return guest_flags


# =====================================================
# 7. REZERVASYONLARA KULLANICI ATAMA
# =====================================================

def assign_users_to_reservations(
    reservation_count: int,
    user_count: int,
    guest_flags: np.ndarray,
    rng: np.random.Generator,
) -> np.ndarray:
    """
    Her rezervasyona bir user_id atar.

    Kurallar:
    - Her kullanıcı en az bir rezervasyona sahip olur.
    - Bazı kullanıcılar diğerlerinden daha aktif olur.
    - Misafir kullanıcıların aktivitesi ortalama olarak daha düşüktür.
    """

    user_ids = np.arange(
        1,
        user_count + 1,
        dtype=np.int64,
    )

    # Gamma dağılımı kontrollü bir uzun kuyruk davranışı oluşturur.
    activity_weights = (
        rng.gamma(
            shape=0.80,
            scale=1.00,
            size=user_count,
        )
        + 0.05
    )

    activity_multipliers = np.where(
        guest_flags,
        GUEST_ACTIVITY_MULTIPLIER,
        REGISTERED_ACTIVITY_MULTIPLIER,
    )

    activity_weights = (
        activity_weights
        * activity_multipliers
    )

    activity_probabilities = (
        activity_weights
        / activity_weights.sum()
    )

    # Önce her kullanıcıya bir rezervasyon verilir.
    remaining_reservation_count = (
        reservation_count - user_count
    )

    if remaining_reservation_count > 0:
        extra_counts = rng.multinomial(
            remaining_reservation_count,
            activity_probabilities,
        )
    else:
        extra_counts = np.zeros(
            user_count,
            dtype=np.int64,
        )

    reservation_count_per_user = (
        extra_counts + 1
    )

    assigned_user_ids = np.repeat(
        user_ids,
        reservation_count_per_user,
    )

    if len(assigned_user_ids) != reservation_count:
        raise ValueError(
            "Kullanıcı atamasında rezervasyon sayısı tutarsız."
        )

    # Kullanıcıların rezervasyonları tarih sırasına göre blok hâlinde
    # görünmesin diye atamaları karıştırıyoruz.
    rng.shuffle(assigned_user_ids)

    return assigned_user_ids


# =====================================================
# 8. USERS TABLOSU OLUŞTURMA
# =====================================================

def create_users_dataframe(
    dataframe: pd.DataFrame,
    assigned_user_ids: np.ndarray,
    guest_flags: np.ndarray,
    rng: np.random.Generator,
) -> pd.DataFrame:
    """
    SQL users tablosuna uygun sentetik kullanıcılar oluşturur.
    """

    user_count = len(guest_flags)

    user_ids = np.arange(
        1,
        user_count + 1,
        dtype=np.int64,
    )

    user_id_strings = (
        pd.Series(user_ids)
        .astype(str)
        .str.zfill(7)
    )

    scheduled_time_utc = convert_to_utc(
        dataframe["scheduled_time"]
    )

    user_trip_times = pd.DataFrame(
        {
            "user_id": assigned_user_ids,
            "scheduled_time_utc": (
                scheduled_time_utc
            ),
        }
    )

    first_trip_times = (
        user_trip_times
        .groupby("user_id")["scheduled_time_utc"]
        .min()
        .reindex(user_ids)
        .reset_index(drop=True)
    )

    last_trip_times = (
        user_trip_times
        .groupby("user_id")["scheduled_time_utc"]
        .max()
        .reindex(user_ids)
        .reset_index(drop=True)
    )

    if first_trip_times.isna().any():
        raise ValueError(
            "Rezervasyonu bulunmayan kullanıcı oluştu."
        )

    # Kullanıcı hesabı ilk rezervasyondan 30–730 gün önce oluşturulsun.
    lead_days = rng.integers(
        30,
        731,
        size=user_count,
    )

    lead_seconds = rng.integers(
        0,
        86_400,
        size=user_count,
    )

    created_at = (
        first_trip_times
        - pd.to_timedelta(
            lead_days,
            unit="D",
        )
        - pd.to_timedelta(
            lead_seconds,
            unit="s",
        )
    ).dt.floor("s")

    # updated_at, son rezervasyon zamanından kısa süre sonra olsun.
    update_delay_seconds = rng.integers(
        0,
        86_400,
        size=user_count,
    )

    updated_at = (
        last_trip_times
        + pd.to_timedelta(
            update_delay_seconds,
            unit="s",
        )
    ).dt.floor("s")

    simulation_snapshot = (
        scheduled_time_utc.max()
        + pd.Timedelta(days=1)
    )

    updated_at = updated_at.where(
        updated_at <= simulation_snapshot,
        simulation_snapshot,
    )

    # -------------------------------------------------
    # Telefon
    # -------------------------------------------------

    phone_numbers = (
        "+90555"
        + user_id_strings
    ).astype("string")

    # -------------------------------------------------
    # E-posta
    # -------------------------------------------------

    emails = pd.Series(
        pd.NA,
        index=range(user_count),
        dtype="string",
    )

    registered_mask = ~guest_flags

    emails.loc[registered_mask] = (
        "sentetik.user"
        + user_id_strings.loc[registered_mask]
        + "@example.com"
    )

    # -------------------------------------------------
    # Dil tercihi
    # -------------------------------------------------

    preferred_languages = np.where(
        rng.random(user_count) < 0.90,
        "tr",
        "en",
    )

    # -------------------------------------------------
    # Doğrulama durumları
    # -------------------------------------------------

    email_verified = (
        registered_mask
        & (
            rng.random(user_count) < 0.85
        )
    )

    phone_verification_probability = np.where(
        guest_flags,
        0.70,
        0.95,
    )

    phone_verified = (
        rng.random(user_count)
        < phone_verification_probability
    )

    # -------------------------------------------------
    # Sentetik isimler
    # -------------------------------------------------

    first_names = np.where(
        guest_flags,
        "Misafir",
        "Sentetik",
    )

    last_names = (
        "Kullanıcı"
        + user_id_strings
    )

    # -------------------------------------------------
    # SQL users tablosu
    # -------------------------------------------------

    users_df = pd.DataFrame(
        {
            "id": user_ids,
            "phone_number": phone_numbers,
            "email": emails,

            # Veri bilimi ekibi sahte parola üretmemelidir.
            # Parolalar Auth Service tarafından güvenli biçimde oluşturulmalıdır.
            "password_hash": pd.Series(
                pd.NA,
                index=range(user_count),
                dtype="string",
            ),

            "first_name": first_names,
            "last_name": last_names,

            "profile_photo": pd.Series(
                pd.NA,
                index=range(user_count),
                dtype="string",
            ),

            "preferred_lang": preferred_languages,
            "role": "CUSTOMER",
            "is_guest": guest_flags,
            "is_active": True,
            "email_verified": email_verified,
            "phone_verified": phone_verified,
            "created_at": created_at,
            "updated_at": updated_at,
            "deleted_at": pd.NaT,
        }
    )

    users_columns = [
        "id",
        "phone_number",
        "email",
        "password_hash",
        "first_name",
        "last_name",
        "profile_photo",
        "preferred_lang",
        "role",
        "is_guest",
        "is_active",
        "email_verified",
        "phone_verified",
        "created_at",
        "updated_at",
        "deleted_at",
    ]

    return users_df[users_columns]


# =====================================================
# 9. DOĞRULAMA
# =====================================================

def validate_outputs(
    original_df: pd.DataFrame,
    enriched_df: pd.DataFrame,
    users_df: pd.DataFrame,
) -> None:
    """
    Kullanıcı ve yolculuk çıktılarının SQL ve pipeline
    kurallarına uygunluğunu kontrol eder.
    """

    if len(original_df) != len(enriched_df):
        raise ValueError(
            "Kullanıcı ataması sırasında satır sayısı değişti."
        )

    if enriched_df["user_id"].isna().any():
        raise ValueError(
            "user_id alanında eksik değer bulundu."
        )

    if users_df["id"].duplicated().any():
        raise ValueError(
            "users.id alanında tekrar bulundu."
        )

    if users_df["phone_number"].duplicated().any():
        raise ValueError(
            "phone_number alanında tekrar bulundu."
        )

    if users_df["phone_number"].isna().any():
        raise ValueError(
            "SQL gereksinimine aykırı boş telefon numarası bulundu."
        )

    valid_phone_format = (
        users_df["phone_number"]
        .astype("string")
        .str.fullmatch(r"\+90\d{10}")
    )

    if not valid_phone_format.all():
        raise ValueError(
            "Geçersiz Türkiye telefon numarası formatı bulundu."
        )

    non_null_emails = users_df["email"].dropna()

    if non_null_emails.duplicated().any():
        raise ValueError(
            "email alanında tekrar bulundu."
        )

    guest_users = users_df[
        users_df["is_guest"]
    ]

    registered_users = users_df[
        ~users_df["is_guest"]
    ]

    if guest_users["email"].notna().any():
        raise ValueError(
            "Misafir kullanıcıların e-posta alanı boş olmalıdır."
        )

    if registered_users["email"].isna().any():
        raise ValueError(
            "Kayıtlı kullanıcıların e-posta alanı dolu olmalıdır."
        )

    if not set(
        users_df["preferred_lang"].unique()
    ).issubset({"tr", "en"}):
        raise ValueError(
            "preferred_lang yalnızca tr veya en olmalıdır."
        )

    if not (
        users_df["role"] == "CUSTOMER"
    ).all():
        raise ValueError(
            "Veri bilimi pipeline'ı ADMIN hesabı oluşturmamalıdır."
        )

    if users_df["password_hash"].notna().any():
        raise ValueError(
            "Sentetik veri içinde sahte password_hash bulunmamalıdır."
        )

    assigned_user_count = (
        enriched_df["user_id"]
        .nunique()
    )

    if assigned_user_count != len(users_df):
        raise ValueError(
            "Bazı kullanıcıların rezervasyonu bulunmuyor."
        )

    valid_user_ids = set(
        users_df["id"].astype(int)
    )

    assigned_user_ids = set(
        enriched_df["user_id"].astype(int)
    )

    if assigned_user_ids != valid_user_ids:
        raise ValueError(
            "Yolculuk user_id değerleri users tablosuyla eşleşmiyor."
        )

    scheduled_time_utc = convert_to_utc(
        enriched_df["scheduled_time"]
    )

    first_trip_by_user = (
        pd.DataFrame(
            {
                "user_id": enriched_df["user_id"],
                "scheduled_time_utc": scheduled_time_utc,
            }
        )
        .groupby("user_id")["scheduled_time_utc"]
        .min()
        .reindex(users_df["id"])
        .reset_index(drop=True)
    )

    created_at_utc = pd.to_datetime(
        users_df["created_at"],
        utc=True,
        errors="coerce",
    )

    if created_at_utc.isna().any():
        raise ValueError(
            "created_at alanında geçersiz tarih bulundu."
        )

    if not (
        created_at_utc <= first_trip_by_user
    ).all():
        raise ValueError(
            "İlk rezervasyonundan sonra oluşturulmuş kullanıcı bulundu."
        )


# =====================================================
# 10. RAPORLAMA
# =====================================================

def create_reports(
    users_df: pd.DataFrame,
    enriched_df: pd.DataFrame,
) -> None:
    """
    Kullanıcı üretimi ve rezervasyon dağılımı raporlarını oluşturur.
    """

    reservation_counts = (
        enriched_df["user_id"]
        .value_counts()
        .rename_axis("user_id")
        .reset_index(name="reservation_count")
    )

    user_activity = (
        users_df[
            [
                "id",
                "is_guest",
                "preferred_lang",
            ]
        ]
        .rename(columns={"id": "user_id"})
        .merge(
            reservation_counts,
            on="user_id",
            how="left",
            validate="one_to_one",
        )
    )

    user_activity["reservation_count"] = (
        user_activity["reservation_count"]
        .fillna(0)
        .astype(int)
    )

    user_type_summary = (
        user_activity
        .groupby("is_guest")
        .agg(
            user_count=("user_id", "count"),
            total_reservations=(
                "reservation_count",
                "sum",
            ),
            average_reservations=(
                "reservation_count",
                "mean",
            ),
            median_reservations=(
                "reservation_count",
                "median",
            ),
            minimum_reservations=(
                "reservation_count",
                "min",
            ),
            maximum_reservations=(
                "reservation_count",
                "max",
            ),
        )
        .reset_index()
    )

    user_type_summary["user_type"] = np.where(
        user_type_summary["is_guest"],
        "GUEST",
        "REGISTERED",
    )

    user_type_summary = user_type_summary[
        [
            "user_type",
            "is_guest",
            "user_count",
            "total_reservations",
            "average_reservations",
            "median_reservations",
            "minimum_reservations",
            "maximum_reservations",
        ]
    ]

    user_type_summary.to_csv(
        REPORT_DIR / "user_type_activity_summary.csv",
        index=False,
        encoding="utf-8-sig",
    )

    user_activity.sort_values(
        by="reservation_count",
        ascending=False,
    ).head(100).to_csv(
        REPORT_DIR / "top_100_active_users.csv",
        index=False,
        encoding="utf-8-sig",
    )

    users_df.head(1000).to_csv(
        REPORT_DIR / "users_sample.csv",
        index=False,
        encoding="utf-8-sig",
        na_rep="",
    )

    language_distribution = (
        users_df["preferred_lang"]
        .value_counts()
        .rename_axis("preferred_lang")
        .reset_index(name="user_count")
    )

    language_distribution.to_csv(
        REPORT_DIR / "language_distribution.csv",
        index=False,
        encoding="utf-8-sig",
    )

    registered_count = int(
        (~users_df["is_guest"]).sum()
    )

    guest_count = int(
        users_df["is_guest"].sum()
    )

    guest_reservation_count = int(
        enriched_df.loc[
            enriched_df["user_id"].isin(
                users_df.loc[
                    users_df["is_guest"],
                    "id",
                ]
            )
        ].shape[0]
    )

    summary = {
        "input_file": str(INPUT_FILE),
        "users_output_file": str(
            USERS_OUTPUT_FILE
        ),
        "trips_with_users_output_file": str(
            TRIPS_WITH_USERS_OUTPUT_FILE
        ),
        "reservation_count": int(
            len(enriched_df)
        ),
        "user_count": int(
            len(users_df)
        ),
        "registered_user_count": registered_count,
        "guest_user_count": guest_count,
        "guest_user_ratio": round(
            guest_count / len(users_df),
            4,
        ),
        "guest_reservation_count": (
            guest_reservation_count
        ),
        "average_reservations_per_user": round(
            len(enriched_df) / len(users_df),
            4,
        ),
        "minimum_reservations_per_user": int(
            reservation_counts["reservation_count"].min()
        ),
        "maximum_reservations_per_user": int(
            reservation_counts["reservation_count"].max()
        ),
        "all_users_have_reservations": True,
        "all_phone_numbers_unique": True,
        "registered_emails_unique": True,
        "supported_languages": ["tr", "en"],
        "admin_user_created": False,
        "password_hash_strategy": (
            "NULL. Authentication credentials must be "
            "created by the Authentication Service."
        ),
        "loyalty_trigger_note": (
            "SQL trigger automatically creates a BRONZE "
            "loyalty account only for users where is_guest=false."
        ),
        "random_seed": RANDOM_SEED,
    }

    with open(
        REPORT_DIR / "user_generation_summary.json",
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
# 11. DOSYALARI KAYDETME
# =====================================================

def save_outputs(
    users_df: pd.DataFrame,
    enriched_df: pd.DataFrame,
) -> None:
    """
    users.csv ve kullanıcı atanmış Parquet dosyasını kaydeder.
    """

    users_df.to_csv(
        USERS_OUTPUT_FILE,
        index=False,
        encoding="utf-8",
        na_rep="",
    )

    try:
        enriched_df.to_parquet(
            TRIPS_WITH_USERS_OUTPUT_FILE,
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
# 12. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 70)
    print("05 — SENTETİK KULLANICILARIN OLUŞTURULMASI")
    print("=" * 70)

    rng = np.random.default_rng(
        RANDOM_SEED
    )

    featured_df = read_featured_data()

    reservation_count = len(featured_df)

    user_count = determine_user_count(
        reservation_count
    )

    print(f"Rezervasyon sayısı : {reservation_count:,}")
    print(f"Kullanıcı sayısı   : {user_count:,}")

    guest_flags = create_guest_flags(
        user_count=user_count,
        rng=rng,
    )

    print(
        f"Misafir kullanıcı  : "
        f"{guest_flags.sum():,}"
    )

    print(
        f"Kayıtlı kullanıcı  : "
        f"{(~guest_flags).sum():,}"
    )

    print("\nRezervasyonlara kullanıcı atanıyor...")

    assigned_user_ids = assign_users_to_reservations(
        reservation_count=reservation_count,
        user_count=user_count,
        guest_flags=guest_flags,
        rng=rng,
    )

    trips_with_users_df = featured_df.copy()

    trips_with_users_df["user_id"] = (
        assigned_user_ids
    )

    print("users tablosu oluşturuluyor...")

    users_df = create_users_dataframe(
        dataframe=trips_with_users_df,
        assigned_user_ids=assigned_user_ids,
        guest_flags=guest_flags,
        rng=rng,
    )

    print("Çıktılar doğrulanıyor...")

    validate_outputs(
        original_df=featured_df,
        enriched_df=trips_with_users_df,
        users_df=users_df,
    )

    save_outputs(
        users_df=users_df,
        enriched_df=trips_with_users_df,
    )

    create_reports(
        users_df=users_df,
        enriched_df=trips_with_users_df,
    )

    reservation_counts = (
        trips_with_users_df["user_id"]
        .value_counts()
    )

    print("\n" + "=" * 70)
    print("KULLANICI ÜRETİMİ TAMAMLANDI")
    print("=" * 70)

    print(f"users.csv      : {USERS_OUTPUT_FILE}")
    print(
        "Kullanıcılı veri: "
        f"{TRIPS_WITH_USERS_OUTPUT_FILE}"
    )
    print(f"Raporlar       : {REPORT_DIR}")

    print("\nRezervasyon dağılımı:")
    print(
        f"Ortalama : "
        f"{reservation_counts.mean():.2f}"
    )
    print(
        f"Medyan   : "
        f"{reservation_counts.median():.2f}"
    )
    print(
        f"Minimum  : "
        f"{reservation_counts.min():,}"
    )
    print(
        f"Maksimum : "
        f"{reservation_counts.max():,}"
    )

    print("\nKontroller:")
    print("Her kullanıcıya en az bir rezervasyon atandı.")
    print("Telefon numaraları benzersiz oluşturuldu.")
    print("Kayıtlı kullanıcı e-postaları benzersizdir.")
    print("Misafir kullanıcılar is_guest=true olarak işaretlendi.")
    print("preferred_lang alanı tr/en olarak oluşturuldu.")
    print("Sahte password_hash oluşturulmadı.")
    print("ADMIN hesabı oluşturulmadı.")
    print("created_at, ilk rezervasyondan önce oluşturuldu.")

    print(
        "\nNot: Kayıtlı kullanıcıların gerçek parola özetleri "
        "Authentication Service tarafından üretilmelidir."
    )


if __name__ == "__main__":
    main()