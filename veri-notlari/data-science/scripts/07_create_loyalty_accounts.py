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

POINTS_AUDIT_SAMPLE_SIZE = 5_000
SQL_INTEGER_MAX = 2_147_483_647

POINT_EARNING_METHOD = (
    "floor(calculated_price_try * tier_earn_rate)"
)


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
PROCESSED_DATA_DIR = PROJECT_ROOT / "data" / "processed"

REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "07_create_loyalty_accounts"
)

GENERATED_DATA_DIR.mkdir(
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


USERS_FILE = (
    GENERATED_DATA_DIR
    / "users.csv"
)

RESERVATIONS_FILE = (
    GENERATED_DATA_DIR
    / "reservations.csv"
)

LOYALTY_ACCOUNTS_FILE = (
    GENERATED_DATA_DIR
    / "loyalty_accounts.csv"
)

LOYALTY_TIER_CONFIG_FILE = (
    REFERENCE_DATA_DIR
    / "loyalty_tier_config.csv"
)

LOYALTY_ANALYTICS_FILE = (
    PROCESSED_DATA_DIR
    / "loyalty_account_analytics.parquet"
)

POINTS_AUDIT_FILE = (
    REPORT_DIR
    / "loyalty_points_audit_sample.csv"
)

TIER_DISTRIBUTION_FILE = (
    REPORT_DIR
    / "loyalty_tier_distribution.csv"
)

LOYALTY_SUMMARY_FILE = (
    REPORT_DIR
    / "loyalty_generation_summary.json"
)


# =====================================================
# 3. SQL İLE UYUMLU KADEME YAPILANDIRMASI
# =====================================================

def create_loyalty_tier_config() -> pd.DataFrame:
    """
    scripts.sql içindeki loyalty_tier_config seed verisiyle
    birebir uyumlu kademe tablosunu oluşturur.
    """

    config_rows = [
        {
            "id": 1,
            "tier": "BRONZE",
            "min_points": 0,
            "earn_rate": 1.00,
            "discount_percentage": 0.00,
            "priority_support": False,
            "description": "Başlangıç seviyesi",
        },
        {
            "id": 2,
            "tier": "SILVER",
            "min_points": 500,
            "earn_rate": 1.25,
            "discount_percentage": 2.00,
            "priority_support": False,
            "description": "Düzenli müşteri",
        },
        {
            "id": 3,
            "tier": "GOLD",
            "min_points": 2_000,
            "earn_rate": 1.50,
            "discount_percentage": 5.00,
            "priority_support": True,
            "description": "Değerli müşteri",
        },
        {
            "id": 4,
            "tier": "PLATINUM",
            "min_points": 5_000,
            "earn_rate": 1.75,
            "discount_percentage": 8.00,
            "priority_support": True,
            "description": "Premium müşteri",
        },
        {
            "id": 5,
            "tier": "VIP",
            "min_points": 10_000,
            "earn_rate": 2.00,
            "discount_percentage": 12.00,
            "priority_support": True,
            "description": "Elit VIP müşteri",
        },
    ]

    config_df = pd.DataFrame(config_rows)

    config_df["id"] = config_df["id"].astype("int64")
    config_df["min_points"] = config_df[
        "min_points"
    ].astype("int64")

    config_df["earn_rate"] = pd.to_numeric(
        config_df["earn_rate"],
        errors="raise",
    ).round(2)

    config_df["discount_percentage"] = pd.to_numeric(
        config_df["discount_percentage"],
        errors="raise",
    ).round(2)

    config_df["priority_support"] = config_df[
        "priority_support"
    ].astype(bool)

    return config_df


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


def convert_boolean(series: pd.Series) -> pd.Series:
    """
    CSV'den okunan boolean sütununu güvenli biçimde dönüştürür.
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
            "Boolean alanda dönüştürülemeyen değer bulundu: "
            f"{invalid_values}"
        )

    return converted.astype(bool)


def tier_index_for_points(
    points: int,
    minimum_points: np.ndarray,
) -> int:
    """
    Puan değerine karşılık gelen kademe dizinini döndürür.
    """

    tier_index = int(
        np.searchsorted(
            minimum_points,
            points,
            side="right",
        )
        - 1
    )

    return max(tier_index, 0)


# =====================================================
# 5. USERS DOSYASINI OKUMA
# =====================================================

def read_users() -> pd.DataFrame:
    """
    users.csv dosyasını okur ve kayıtlı/misafir ayrımını kontrol eder.
    """

    require_file(USERS_FILE)

    users_df = pd.read_csv(
        USERS_FILE,
        usecols=[
            "id",
            "is_guest",
            "created_at",
        ],
        low_memory=False,
    )

    users_df["id"] = pd.to_numeric(
        users_df["id"],
        errors="raise",
    ).astype("int64")

    users_df["is_guest"] = convert_boolean(
        users_df["is_guest"]
    )

    users_df["created_at"] = pd.to_datetime(
        users_df["created_at"],
        errors="coerce",
        utc=True,
    )

    if users_df["created_at"].isna().any():
        raise ValueError(
            "users.created_at alanında geçersiz tarih bulundu."
        )

    if users_df["id"].duplicated().any():
        raise ValueError(
            "users.id alanında tekrar eden değer bulundu."
        )

    print(f"Toplam kullanıcı   : {len(users_df):,}")
    print(
        "Kayıtlı kullanıcı : "
        f"{(~users_df['is_guest']).sum():,}"
    )
    print(
        "Misafir kullanıcı : "
        f"{users_df['is_guest'].sum():,}"
    )

    return users_df


# =====================================================
# 6. RESERVATIONS DOSYASINI OKUMA
# =====================================================

def read_reservations(
    users_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Sadakat puanı için gerekli rezervasyon sütunlarını okur.
    """

    require_file(RESERVATIONS_FILE)

    required_columns = [
        "id",
        "user_id",
        "status",
        "calculated_price",
        "currency",
        "scheduled_time",
        "completed_at",
    ]

    reservations_df = pd.read_csv(
        RESERVATIONS_FILE,
        usecols=required_columns,
        low_memory=False,
    )

    reservations_df["id"] = pd.to_numeric(
        reservations_df["id"],
        errors="raise",
    ).astype("int64")

    reservations_df["user_id"] = pd.to_numeric(
        reservations_df["user_id"],
        errors="coerce",
    ).astype("Int64")

    reservations_df["calculated_price"] = pd.to_numeric(
        reservations_df["calculated_price"],
        errors="coerce",
    )

    reservations_df["scheduled_time"] = pd.to_datetime(
        reservations_df["scheduled_time"],
        errors="coerce",
        utc=True,
    )

    reservations_df["completed_at"] = pd.to_datetime(
        reservations_df["completed_at"],
        errors="coerce",
        utc=True,
    )

    if reservations_df["id"].duplicated().any():
        raise ValueError(
            "reservations.id alanında tekrar eden değer bulundu."
        )

    if reservations_df["user_id"].isna().any():
        raise ValueError(
            "Sadakat hesabında kullanılacak rezervasyonlarda "
            "user_id eksik olamaz."
        )

    valid_user_ids = set(
        users_df["id"].astype(int)
    )

    reservation_user_ids = set(
        reservations_df["user_id"]
        .astype(int)
    )

    unknown_user_ids = (
        reservation_user_ids
        - valid_user_ids
    )

    if unknown_user_ids:
        raise ValueError(
            "users.csv içinde bulunmayan rezervasyon user_id "
            f"değerleri bulundu: {sorted(unknown_user_ids)[:10]}"
        )

    completed_mask = (
        reservations_df["status"]
        .astype("string")
        .str.upper()
        .eq("COMPLETED")
    )

    completed_df = reservations_df.loc[
        completed_mask
    ].copy()

    if completed_df["completed_at"].isna().any():
        raise ValueError(
            "COMPLETED rezervasyonlarda completed_at eksik."
        )

    if completed_df["calculated_price"].isna().any():
        raise ValueError(
            "COMPLETED rezervasyonlarda calculated_price eksik."
        )

    if not (
        completed_df["calculated_price"] >= 0
    ).all():
        raise ValueError(
            "COMPLETED rezervasyonlarda negatif fiyat bulundu."
        )

    if not (
        completed_df["currency"]
        .astype("string")
        .eq("TRY")
    ).all():
        raise ValueError(
            "Sadakat puanı yalnızca TRY rezervasyonlardan "
            "hesaplanmalıdır."
        )

    print(
        "Tamamlanmış rezervasyon: "
        f"{len(completed_df):,}"
    )

    return completed_df


# =====================================================
# 7. TAMAMLANMIŞ REZERVASYONLARI AYIRMA
# =====================================================

def separate_registered_and_guest_reservations(
    completed_df: pd.DataFrame,
    users_df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Tamamlanan rezervasyonları kayıtlı ve misafir kullanıcı
    olarak ayırır.
    """

    user_type_lookup = users_df[
        [
            "id",
            "is_guest",
        ]
    ].rename(
        columns={
            "id": "user_id",
        }
    )

    completed_with_type = completed_df.merge(
        user_type_lookup,
        on="user_id",
        how="left",
        validate="many_to_one",
    )

    if completed_with_type["is_guest"].isna().any():
        raise ValueError(
            "Kullanıcı tipi belirlenemeyen rezervasyon bulundu."
        )

    registered_completed_df = completed_with_type.loc[
        ~completed_with_type["is_guest"]
    ].copy()

    guest_completed_df = completed_with_type.loc[
        completed_with_type["is_guest"]
    ].copy()

    print(
        "Sadakate dahil tamamlanmış rezervasyon: "
        f"{len(registered_completed_df):,}"
    )

    print(
        "Sadakat dışında bırakılan misafir rezervasyonu: "
        f"{len(guest_completed_df):,}"
    )

    return (
        registered_completed_df,
        guest_completed_df,
    )


# =====================================================
# 8. KRONOLOJİK PUAN HESABI
# =====================================================

def calculate_loyalty_activity(
    registered_completed_df: pd.DataFrame,
    config_df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Her kayıtlı kullanıcının tamamlanmış rezervasyonlarını
    kronolojik sırada işler.

    Rezervasyon öncesindeki kademenin earn_rate değeri
    kullanılarak puan kazanılır.
    """

    activity_columns = [
        "user_id",
        "completed_reservation_count",
        "total_spending_try",
        "lifetime_points",
        "tier",
        "last_completed_at",
    ]

    audit_columns = [
        "reservation_id",
        "user_id",
        "completed_at",
        "calculated_price_try",
        "points_before",
        "tier_before",
        "earn_rate",
        "earned_points",
        "points_after",
        "tier_after",
    ]

    if registered_completed_df.empty:
        return (
            pd.DataFrame(columns=activity_columns),
            pd.DataFrame(columns=audit_columns),
        )

    work_df = registered_completed_df[
        [
            "id",
            "user_id",
            "completed_at",
            "calculated_price",
        ]
    ].copy()

    work_df["user_id"] = work_df[
        "user_id"
    ].astype("int64")

    work_df = work_df.sort_values(
        by=[
            "user_id",
            "completed_at",
            "id",
        ],
        kind="mergesort",
    ).reset_index(drop=True)

    minimum_points = config_df[
        "min_points"
    ].to_numpy(dtype=np.int64)

    earn_rates = config_df[
        "earn_rate"
    ].to_numpy(dtype=np.float64)

    tier_names = config_df[
        "tier"
    ].to_numpy(dtype=object)

    user_ids = work_df[
        "user_id"
    ].to_numpy(dtype=np.int64)

    reservation_ids = work_df[
        "id"
    ].to_numpy(dtype=np.int64)

    prices = work_df[
        "calculated_price"
    ].to_numpy(dtype=np.float64)

    completed_times = work_df[
        "completed_at"
    ].array

    unique_user_ids, group_starts = np.unique(
        user_ids,
        return_index=True,
    )

    group_ends = np.append(
        group_starts[1:],
        len(work_df),
    )

    activity_rows = []
    audit_rows = []

    for user_id, start_index, end_index in zip(
        unique_user_ids,
        group_starts,
        group_ends,
    ):
        lifetime_points = 0
        user_total_spending = 0.0

        for row_position in range(
            int(start_index),
            int(end_index),
        ):
            price_try = float(
                prices[row_position]
            )

            points_before = lifetime_points

            tier_before_index = tier_index_for_points(
                points=points_before,
                minimum_points=minimum_points,
            )

            tier_before = str(
                tier_names[tier_before_index]
            )

            earn_rate = float(
                earn_rates[tier_before_index]
            )

            earned_points = int(
                np.floor(
                    price_try * earn_rate
                    + 1e-9
                )
            )

            earned_points = max(
                earned_points,
                0,
            )

            lifetime_points += earned_points
            user_total_spending += price_try

            if lifetime_points > SQL_INTEGER_MAX:
                raise OverflowError(
                    "loyalty_accounts.lifetime_points SQL INT "
                    f"sınırını aştı. user_id={int(user_id)}"
                )

            tier_after_index = tier_index_for_points(
                points=lifetime_points,
                minimum_points=minimum_points,
            )

            tier_after = str(
                tier_names[tier_after_index]
            )

            if len(audit_rows) < POINTS_AUDIT_SAMPLE_SIZE:
                audit_rows.append(
                    {
                        "reservation_id": int(
                            reservation_ids[row_position]
                        ),
                        "user_id": int(user_id),
                        "completed_at": (
                            completed_times[row_position]
                        ),
                        "calculated_price_try": round(
                            price_try,
                            2,
                        ),
                        "points_before": int(
                            points_before
                        ),
                        "tier_before": tier_before,
                        "earn_rate": round(
                            earn_rate,
                            2,
                        ),
                        "earned_points": int(
                            earned_points
                        ),
                        "points_after": int(
                            lifetime_points
                        ),
                        "tier_after": tier_after,
                    }
                )

        final_tier_index = tier_index_for_points(
            points=lifetime_points,
            minimum_points=minimum_points,
        )

        activity_rows.append(
            {
                "user_id": int(user_id),
                "completed_reservation_count": int(
                    end_index - start_index
                ),
                "total_spending_try": round(
                    user_total_spending,
                    2,
                ),
                "lifetime_points": int(
                    lifetime_points
                ),
                "tier": str(
                    tier_names[final_tier_index]
                ),
                "last_completed_at": (
                    completed_times[
                        int(end_index) - 1
                    ]
                ),
            }
        )

    activity_df = pd.DataFrame(
        activity_rows,
        columns=activity_columns,
    )

    audit_df = pd.DataFrame(
        audit_rows,
        columns=audit_columns,
    )

    return activity_df, audit_df


# =====================================================
# 9. LOYALTY ACCOUNTS TABLOSUNU OLUŞTURMA
# =====================================================

def create_loyalty_accounts(
    users_df: pd.DataFrame,
    activity_df: pd.DataFrame,
    config_df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    SQL loyalty_accounts tablosunu ve ayrı analitik çıktıyı oluşturur.
    """

    registered_users_df = users_df.loc[
        ~users_df["is_guest"],
        [
            "id",
            "created_at",
        ],
    ].rename(
        columns={
            "id": "user_id",
            "created_at": "account_created_at",
        }
    ).copy()

    analytics_df = registered_users_df.merge(
        activity_df,
        on="user_id",
        how="left",
        validate="one_to_one",
    )

    analytics_df[
        "completed_reservation_count"
    ] = (
        analytics_df[
            "completed_reservation_count"
        ]
        .fillna(0)
        .astype("int64")
    )

    analytics_df["total_spending_try"] = (
        analytics_df["total_spending_try"]
        .fillna(0.0)
        .round(2)
    )

    analytics_df["lifetime_points"] = (
        analytics_df["lifetime_points"]
        .fillna(0)
        .astype("int64")
    )

    analytics_df["tier"] = (
        analytics_df["tier"]
        .fillna("BRONZE")
        .astype("string")
    )

    analytics_df["updated_at"] = (
        analytics_df["last_completed_at"]
        .fillna(
            analytics_df["account_created_at"]
        )
    )

    tier_metadata = config_df[
        [
            "tier",
            "earn_rate",
            "discount_percentage",
            "priority_support",
            "description",
        ]
    ].rename(
        columns={
            "earn_rate": "current_earn_rate",
            "discount_percentage": (
                "current_discount_percentage"
            ),
            "priority_support": (
                "has_priority_support"
            ),
            "description": (
                "tier_description"
            ),
        }
    )

    analytics_df = analytics_df.merge(
        tier_metadata,
        on="tier",
        how="left",
        validate="many_to_one",
    )

    if analytics_df[
        "current_earn_rate"
    ].isna().any():
        raise ValueError(
            "Kademe ayarı bulunamayan sadakat hesabı oluştu."
        )

    loyalty_accounts_df = analytics_df[
        [
            "user_id",
            "lifetime_points",
            "tier",
            "updated_at",
        ]
    ].copy()

    loyalty_accounts_df["user_id"] = (
        loyalty_accounts_df["user_id"]
        .astype("int64")
    )

    loyalty_accounts_df["lifetime_points"] = (
        loyalty_accounts_df["lifetime_points"]
        .astype("int64")
    )

    return loyalty_accounts_df, analytics_df


# =====================================================
# 10. DOĞRULAMA
# =====================================================

def validate_outputs(
    users_df: pd.DataFrame,
    config_df: pd.DataFrame,
    loyalty_accounts_df: pd.DataFrame,
    analytics_df: pd.DataFrame,
) -> None:
    """
    SQL ve sistem mimarisi uyumluluğunu doğrular.
    """

    expected_tiers = [
        "BRONZE",
        "SILVER",
        "GOLD",
        "PLATINUM",
        "VIP",
    ]

    if config_df["tier"].tolist() != expected_tiers:
        raise ValueError(
            "loyalty_tier enum sırası SQL ile uyuşmuyor."
        )

    if config_df["id"].duplicated().any():
        raise ValueError(
            "loyalty_tier_config.id alanında tekrar var."
        )

    if config_df["tier"].duplicated().any():
        raise ValueError(
            "loyalty_tier_config.tier alanında tekrar var."
        )

    if not config_df[
        "min_points"
    ].is_monotonic_increasing:
        raise ValueError(
            "Kademe puan eşikleri artan sırada olmalıdır."
        )

    if not (
        config_df["min_points"] >= 0
    ).all():
        raise ValueError(
            "min_points negatif olamaz."
        )

    if not config_df[
        "discount_percentage"
    ].between(
        0,
        100,
    ).all():
        raise ValueError(
            "discount_percentage 0–100 arasında olmalıdır."
        )

    if loyalty_accounts_df[
        "user_id"
    ].duplicated().any():
        raise ValueError(
            "Bir kullanıcı için birden fazla loyalty account oluştu."
        )

    if loyalty_accounts_df[
        "updated_at"
    ].isna().any():
        raise ValueError(
            "loyalty_accounts.updated_at alanında eksik değer var."
        )

    if not (
        loyalty_accounts_df["lifetime_points"]
        >= 0
    ).all():
        raise ValueError(
            "lifetime_points negatif olamaz."
        )

    if (
        loyalty_accounts_df["lifetime_points"]
        > SQL_INTEGER_MAX
    ).any():
        raise ValueError(
            "lifetime_points SQL INT sınırını aştı."
        )

    registered_user_ids = set(
        users_df.loc[
            ~users_df["is_guest"],
            "id",
        ].astype(int)
    )

    guest_user_ids = set(
        users_df.loc[
            users_df["is_guest"],
            "id",
        ].astype(int)
    )

    account_user_ids = set(
        loyalty_accounts_df[
            "user_id"
        ].astype(int)
    )

    if account_user_ids != registered_user_ids:
        missing_accounts = (
            registered_user_ids
            - account_user_ids
        )

        extra_accounts = (
            account_user_ids
            - registered_user_ids
        )

        raise ValueError(
            "Kayıtlı kullanıcı ve sadakat hesabı eşleşmesi bozuk.\n"
            f"Eksik hesap sayısı: {len(missing_accounts)}\n"
            f"Fazla hesap sayısı: {len(extra_accounts)}"
        )

    if account_user_ids.intersection(
        guest_user_ids
    ):
        raise ValueError(
            "Misafir kullanıcı için sadakat hesabı oluşturuldu."
        )

    minimum_points = config_df[
        "min_points"
    ].to_numpy(dtype=np.int64)

    tier_names = config_df[
        "tier"
    ].to_numpy(dtype=object)

    expected_account_tiers = (
        loyalty_accounts_df[
            "lifetime_points"
        ]
        .apply(
            lambda points: str(
                tier_names[
                    tier_index_for_points(
                        int(points),
                        minimum_points,
                    )
                ]
            )
        )
    )

    actual_account_tiers = (
        loyalty_accounts_df["tier"]
        .astype("string")
    )

    expected_account_tiers = (
        expected_account_tiers
        .astype("string")
    )

    tier_match_mask = (
        expected_account_tiers
        .eq(actual_account_tiers)
        .fillna(False)
    )

    invalid_count = int(
        (~tier_match_mask).sum()
    )

    if invalid_count > 0:
        raise ValueError(
            "lifetime_points ile tier arasında tutarsızlık var. "
            f"Hatalı hesap sayısı: {invalid_count}"
        )

    sql_account_columns = [
        "user_id",
        "lifetime_points",
        "tier",
        "updated_at",
    ]

    if loyalty_accounts_df.columns.tolist() != (
        sql_account_columns
    ):
        raise ValueError(
            "loyalty_accounts.csv sütunları SQL sırasıyla uyuşmuyor."
        )

    forbidden_sql_columns = {
        "current_points",
        "completed_reservation_count",
        "total_spending",
        "created_at",
    }

    incorrectly_included_columns = (
        forbidden_sql_columns
        .intersection(
            loyalty_accounts_df.columns
        )
    )

    if incorrectly_included_columns:
        raise ValueError(
            "SQL loyalty_accounts tablosunda olmayan alanlar bulundu: "
            f"{sorted(incorrectly_included_columns)}"
        )

    if len(analytics_df) != len(
        loyalty_accounts_df
    ):
        raise ValueError(
            "Analitik sadakat çıktısı ile SQL hesap sayısı uyuşmuyor."
        )


# =====================================================
# 11. DOSYALARI KAYDETME
# =====================================================

def save_outputs(
    config_df: pd.DataFrame,
    loyalty_accounts_df: pd.DataFrame,
    analytics_df: pd.DataFrame,
    audit_df: pd.DataFrame,
) -> None:
    """
    SQL ve analitik çıktılarını kaydeder.
    """

    config_df.to_csv(
        LOYALTY_TIER_CONFIG_FILE,
        index=False,
        encoding="utf-8",
    )

    loyalty_accounts_df.to_csv(
        LOYALTY_ACCOUNTS_FILE,
        index=False,
        encoding="utf-8",
        na_rep="",
    )

    try:
        analytics_df.to_parquet(
            LOYALTY_ANALYTICS_FILE,
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

    audit_df.to_csv(
        POINTS_AUDIT_FILE,
        index=False,
        encoding="utf-8-sig",
    )


# =====================================================
# 12. RAPORLAMA
# =====================================================

def create_reports(
    users_df: pd.DataFrame,
    registered_completed_df: pd.DataFrame,
    guest_completed_df: pd.DataFrame,
    config_df: pd.DataFrame,
    loyalty_accounts_df: pd.DataFrame,
    analytics_df: pd.DataFrame,
) -> None:
    """
    Sadakat sistemi raporlarını oluşturur.
    """

    tier_distribution_df = (
        analytics_df
        .groupby(
            [
                "tier",
                "current_earn_rate",
                "current_discount_percentage",
                "has_priority_support",
            ],
            observed=True,
        )
        .agg(
            customer_count=("user_id", "count"),
            completed_reservation_count=(
                "completed_reservation_count",
                "sum",
            ),
            total_spending_try=(
                "total_spending_try",
                "sum",
            ),
            average_lifetime_points=(
                "lifetime_points",
                "mean",
            ),
            median_lifetime_points=(
                "lifetime_points",
                "median",
            ),
        )
        .reset_index()
    )

    tier_order = {
        tier: order
        for order, tier in enumerate(
            config_df["tier"].tolist()
        )
    }

    tier_distribution_df["_tier_order"] = (
        tier_distribution_df["tier"]
        .map(tier_order)
    )

    tier_distribution_df = (
        tier_distribution_df
        .sort_values("_tier_order")
        .drop(columns="_tier_order")
    )

    tier_distribution_df[
        "total_spending_try"
    ] = tier_distribution_df[
        "total_spending_try"
    ].round(2)

    tier_distribution_df[
        "average_lifetime_points"
    ] = tier_distribution_df[
        "average_lifetime_points"
    ].round(2)

    tier_distribution_df.to_csv(
        TIER_DISTRIBUTION_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    guest_ignored_spending = float(
        guest_completed_df[
            "calculated_price"
        ].sum()
    )

    accounts_without_completed_reservation = int(
        (
            analytics_df[
                "completed_reservation_count"
            ]
            == 0
        ).sum()
    )

    summary = {
        "users_file": str(USERS_FILE),
        "reservations_file": str(
            RESERVATIONS_FILE
        ),
        "loyalty_tier_config_file": str(
            LOYALTY_TIER_CONFIG_FILE
        ),
        "loyalty_accounts_file": str(
            LOYALTY_ACCOUNTS_FILE
        ),
        "loyalty_analytics_file": str(
            LOYALTY_ANALYTICS_FILE
        ),
        "total_user_count": int(
            len(users_df)
        ),
        "registered_user_count": int(
            (~users_df["is_guest"]).sum()
        ),
        "guest_user_count": int(
            users_df["is_guest"].sum()
        ),
        "loyalty_account_count": int(
            len(loyalty_accounts_df)
        ),
        "registered_completed_reservation_count": int(
            len(registered_completed_df)
        ),
        "ignored_guest_completed_reservation_count": int(
            len(guest_completed_df)
        ),
        "ignored_guest_spending_try": round(
            guest_ignored_spending,
            2,
        ),
        "accounts_without_completed_reservation": (
            accounts_without_completed_reservation
        ),
        "total_registered_spending_try": round(
            float(
                analytics_df[
                    "total_spending_try"
                ].sum()
            ),
            2,
        ),
        "total_lifetime_points": int(
            analytics_df[
                "lifetime_points"
            ].sum()
        ),
        "points_earning_method": (
            POINT_EARNING_METHOD
        ),
        "points_calculated_chronologically": True,
        "earn_rate_based_on_tier_before_reservation": True,
        "completed_reservations_only": True,
        "guest_accounts_created": False,
        "current_points_created": False,
        "current_points_explanation": (
            "loyalty_transactions tablosu bulunmadığı için "
            "harcanabilir bakiye güvenilir biçimde hesaplanamaz."
        ),
        "historical_reservation_prices_modified": False,
        "historical_loyalty_discounts_applied": False,
        "future_discount_strategy": (
            "Loyalty Service, yeni rezervasyon oluşturulurken "
            "loyalty_accounts.tier ve "
            "loyalty_tier_config.discount_percentage kullanmalıdır."
        ),
        "backend_import_warning": (
            "users import trigger'ı kayıtlı kullanıcılar için BRONZE "
            "hesap oluşturur. loyalty_accounts.csv UPSERT ile "
            "yüklenmeli veya trigger hesapları importtan önce "
            "temizlenmelidir."
        ),
        "sql_loyalty_account_columns": [
            "user_id",
            "lifetime_points",
            "tier",
            "updated_at",
        ],
    }

    with open(
        LOYALTY_SUMMARY_FILE,
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
# 13. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 70)
    print("07 — SADAKAT HESAPLARININ OLUŞTURULMASI")
    print("=" * 70)

    print("\nSadakat kademe ayarları oluşturuluyor...")

    config_df = create_loyalty_tier_config()

    print(config_df.to_string(index=False))

    print("\nKullanıcılar okunuyor...")

    users_df = read_users()

    print("\nTamamlanmış rezervasyonlar okunuyor...")

    completed_df = read_reservations(
        users_df=users_df
    )

    (
        registered_completed_df,
        guest_completed_df,
    ) = separate_registered_and_guest_reservations(
        completed_df=completed_df,
        users_df=users_df,
    )

    print(
        "\nKayıtlı kullanıcıların puanları "
        "kronolojik olarak hesaplanıyor..."
    )

    activity_df, audit_df = calculate_loyalty_activity(
        registered_completed_df=registered_completed_df,
        config_df=config_df,
    )

    print("\nSQL loyalty_accounts tablosu oluşturuluyor...")

    (
        loyalty_accounts_df,
        analytics_df,
    ) = create_loyalty_accounts(
        users_df=users_df,
        activity_df=activity_df,
        config_df=config_df,
    )

    print("Çıktılar doğrulanıyor...")

    validate_outputs(
        users_df=users_df,
        config_df=config_df,
        loyalty_accounts_df=loyalty_accounts_df,
        analytics_df=analytics_df,
    )

    save_outputs(
        config_df=config_df,
        loyalty_accounts_df=loyalty_accounts_df,
        analytics_df=analytics_df,
        audit_df=audit_df,
    )

    create_reports(
        users_df=users_df,
        registered_completed_df=registered_completed_df,
        guest_completed_df=guest_completed_df,
        config_df=config_df,
        loyalty_accounts_df=loyalty_accounts_df,
        analytics_df=analytics_df,
    )

    print("\n" + "=" * 70)
    print("SADAKAT HESAPLARI OLUŞTURULDU")
    print("=" * 70)

    print(
        f"Kademe ayarları : "
        f"{LOYALTY_TIER_CONFIG_FILE}"
    )

    print(
        f"Sadakat hesapları: "
        f"{LOYALTY_ACCOUNTS_FILE}"
    )

    print(
        f"Analitik çıktı  : "
        f"{LOYALTY_ANALYTICS_FILE}"
    )

    print(f"Raporlar        : {REPORT_DIR}")

    print("\nHesap özeti:")
    print(
        f"Kayıtlı kullanıcı hesabı: "
        f"{len(loyalty_accounts_df):,}"
    )

    print(
        f"Misafir kullanıcı hesabı: 0"
    )

    print(
        "Toplam lifetime points: "
        f"{loyalty_accounts_df['lifetime_points'].sum():,}"
    )

    print("\nKademe dağılımı:")

    print(
        loyalty_accounts_df[
            "tier"
        ].value_counts().to_string()
    )

    print("\nKontroller:")
    print("Yalnızca kayıtlı kullanıcılar için hesap oluşturuldu.")
    print("Misafir kullanıcılar sadakat sisteminin dışında bırakıldı.")
    print("Kademe eşikleri scripts.sql ile eşleştirildi.")
    print("priority_support alanı eklendi.")
    print("Puanlar tamamlanmış rezervasyonlardan hesaplandı.")
    print("Puanlar rezervasyon sırasına göre kronolojik hesaplandı.")
    print("Her kademenin earn_rate değeri kullanıldı.")
    print("Rastgele current_points üretimi kaldırıldı.")
    print("SQL dışı analitik alanlar ayrı Parquet dosyasına taşındı.")
    print("Geçmiş rezervasyon fiyatları değiştirilmedi.")

    print(
        "\nBackend import notu: users tablosu yüklenirken "
        "trigger BRONZE hesapları otomatik oluşturabilir. "
        "loyalty_accounts.csv UPSERT ile yüklenmelidir."
    )


if __name__ == "__main__":
    main()