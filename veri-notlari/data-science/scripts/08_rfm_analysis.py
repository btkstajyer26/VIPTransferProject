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

CHUNK_SIZE = 200_000

# Tamamlanmış rezervasyonu olmayan müşterilere,
# gözlem döneminden daha büyük ama aşırı olmayan recency verilir.
NO_COMPLETION_RECENCY_BUFFER_DAYS = 30

ALLOWED_RESERVATION_STATUSES = [
    "PENDING",
    "ASSIGNED",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
]

ALLOWED_LOYALTY_TIERS = {
    "BRONZE",
    "SILVER",
    "GOLD",
    "PLATINUM",
    "VIP",
}

MONETARY_CURRENCY = "TRY"

# Tek bir iptal/no-show kaydı müşteriyi hemen riskli yapmasın.
MIN_RESOLVED_RESERVATIONS_FOR_RISK = 3
CANCEL_RATE_RISK_THRESHOLD = 0.30
NO_SHOW_RATE_RISK_THRESHOLD = 0.15


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
PROCESSED_DATA_DIR = PROJECT_ROOT / "data" / "processed"

REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "08_rfm_analysis"
)

PROCESSED_DATA_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

REPORT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


USERS_FILE = GENERATED_DATA_DIR / "users.csv"

RESERVATIONS_FILE = (
    GENERATED_DATA_DIR
    / "reservations.csv"
)

LOYALTY_ACCOUNTS_FILE = (
    GENERATED_DATA_DIR
    / "loyalty_accounts.csv"
)

RFM_CSV_OUTPUT_FILE = (
    PROCESSED_DATA_DIR
    / "rfm_customer_segments.csv"
)

RFM_PARQUET_OUTPUT_FILE = (
    PROCESSED_DATA_DIR
    / "rfm_customer_segments.parquet"
)

SEGMENT_DISTRIBUTION_FILE = (
    REPORT_DIR
    / "business_segment_distribution.csv"
)

RFM_SUMMARY_FILE = (
    REPORT_DIR
    / "rfm_statistics.csv"
)

TOP_CUSTOMERS_FILE = (
    REPORT_DIR
    / "top_1000_rfm_customers.csv"
)

CHURN_RISK_FILE = (
    REPORT_DIR
    / "churn_risk_customers.csv"
)

RFM_ANALYSIS_SUMMARY_FILE = (
    REPORT_DIR
    / "rfm_analysis_summary.json"
)


# =====================================================
# 3. YARDIMCI FONKSİYONLAR
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
    DataFrame içinde gerekli sütunların bulunmasını doğrular.
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
    CSV'den okunan boolean değerlerini güvenli biçimde dönüştürür.
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
            f"{column_name} alanında boolean olmayan "
            f"değerler bulundu: {invalid_values}"
        )

    return converted.astype(bool)


# =====================================================
# 4. KULLANICILARI OKUMA
# =====================================================

def read_users() -> pd.DataFrame:
    """
    RFM analizine dahil edilecek müşteri kullanıcılarını okur.
    """

    require_file(USERS_FILE)

    required_columns = [
        "id",
        "preferred_lang",
        "role",
        "is_guest",
        "is_active",
        "created_at",
        "deleted_at",
    ]

    users_df = pd.read_csv(
        USERS_FILE,
        usecols=required_columns,
        low_memory=False,
    )

    validate_columns(
        users_df,
        required_columns,
        "users.csv",
    )

    users_df["id"] = pd.to_numeric(
        users_df["id"],
        errors="raise",
    ).astype("int64")

    users_df["is_guest"] = convert_boolean(
        users_df["is_guest"],
        "users.is_guest",
    )

    users_df["is_active"] = convert_boolean(
        users_df["is_active"],
        "users.is_active",
    )

    users_df["created_at"] = pd.to_datetime(
        users_df["created_at"],
        errors="coerce",
        utc=True,
    )

    users_df["deleted_at"] = pd.to_datetime(
        users_df["deleted_at"],
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

    # Veri bilimi müşteri segmentasyonu yalnızca CUSTOMER
    # hesapları için yapılır. ADMIN hesapları analiz edilmez.
    customer_users_df = users_df.loc[
        users_df["role"]
        .astype("string")
        .str.upper()
        .eq("CUSTOMER")
    ].copy()

    if customer_users_df.empty:
        raise ValueError(
            "RFM analizi için CUSTOMER kullanıcısı bulunamadı."
        )

    customer_users_df = customer_users_df.rename(
        columns={
            "id": "user_id",
        }
    ).reset_index(drop=True)

    print(f"Toplam CUSTOMER sayısı: {len(customer_users_df):,}")
    print(
        "Kayıtlı müşteri sayısı: "
        f"{(~customer_users_df['is_guest']).sum():,}"
    )
    print(
        "Misafir müşteri sayısı: "
        f"{customer_users_df['is_guest'].sum():,}"
    )

    return customer_users_df


# =====================================================
# 5. SADAKAT HESAPLARINI OKUMA
# =====================================================

def read_loyalty_accounts(
    users_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Güncel SQL loyalty_accounts çıktısını okur.

    Misafir kullanıcıların sadakat hesabı bulunmamalıdır.
    """

    require_file(LOYALTY_ACCOUNTS_FILE)

    required_columns = [
        "user_id",
        "lifetime_points",
        "tier",
        "updated_at",
    ]

    loyalty_df = pd.read_csv(
        LOYALTY_ACCOUNTS_FILE,
        usecols=required_columns,
        low_memory=False,
    )

    validate_columns(
        loyalty_df,
        required_columns,
        "loyalty_accounts.csv",
    )

    loyalty_df["user_id"] = pd.to_numeric(
        loyalty_df["user_id"],
        errors="raise",
    ).astype("int64")

    loyalty_df["lifetime_points"] = pd.to_numeric(
        loyalty_df["lifetime_points"],
        errors="raise",
    ).astype("int64")

    loyalty_df["tier"] = (
        loyalty_df["tier"]
        .astype("string")
        .str.upper()
    )

    loyalty_df["updated_at"] = pd.to_datetime(
        loyalty_df["updated_at"],
        errors="coerce",
        utc=True,
    )

    if loyalty_df["user_id"].duplicated().any():
        raise ValueError(
            "Bir kullanıcı için birden fazla loyalty account bulundu."
        )

    if loyalty_df["updated_at"].isna().any():
        raise ValueError(
            "loyalty_accounts.updated_at alanında "
            "geçersiz tarih bulundu."
        )

    if not (
        loyalty_df["lifetime_points"] >= 0
    ).all():
        raise ValueError(
            "Negatif lifetime_points değeri bulundu."
        )

    invalid_tiers = (
        set(loyalty_df["tier"].dropna())
        - ALLOWED_LOYALTY_TIERS
    )

    if invalid_tiers:
        raise ValueError(
            "SQL loyalty_tier enum ile uyumsuz değerler bulundu: "
            f"{sorted(invalid_tiers)}"
        )

    guest_user_ids = set(
        users_df.loc[
            users_df["is_guest"],
            "user_id",
        ].astype(int)
    )

    loyalty_user_ids = set(
        loyalty_df["user_id"].astype(int)
    )

    guest_accounts = (
        guest_user_ids
        .intersection(loyalty_user_ids)
    )

    if guest_accounts:
        raise ValueError(
            "Misafir kullanıcılar için sadakat hesabı bulundu. "
            f"Hatalı hesap sayısı: {len(guest_accounts)}"
        )

    registered_user_ids = set(
        users_df.loc[
            ~users_df["is_guest"],
            "user_id",
        ].astype(int)
    )

    missing_registered_accounts = (
        registered_user_ids
        - loyalty_user_ids
    )

    extra_accounts = (
        loyalty_user_ids
        - registered_user_ids
    )

    if missing_registered_accounts:
        raise ValueError(
            "Bazı kayıtlı müşterilerin loyalty account kaydı eksik. "
            f"Eksik hesap sayısı: {len(missing_registered_accounts)}"
        )

    if extra_accounts:
        raise ValueError(
            "users.csv ile eşleşmeyen loyalty account bulundu. "
            f"Fazla hesap sayısı: {len(extra_accounts)}"
        )

    loyalty_df["loyalty_account_exists"] = True

    print(
        "Sadakat hesabı sayısı: "
        f"{len(loyalty_df):,}"
    )

    return loyalty_df


# =====================================================
# 6. REZERVASYONLARI PARÇA PARÇA ÖZETLEME
# =====================================================

def aggregate_reservations(
    users_df: pd.DataFrame,
) -> dict:
    """
    Büyük reservations.csv dosyasını tek seferde belleğe almaz.

    Kullanıcı bazında:
    - durum sayıları,
    - tamamlanmış rezervasyon sayısı,
    - toplam harcama,
    - son tamamlanma zamanı

    değerlerini NumPy dizilerinde biriktirir.
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

    user_count = len(users_df)

    user_index_lookup = pd.Series(
        np.arange(user_count, dtype=np.int64),
        index=users_df["user_id"].astype(int),
    ).to_dict()

    status_index_lookup = {
        status: index
        for index, status
        in enumerate(ALLOWED_RESERVATION_STATUSES)
    }

    status_counts = np.zeros(
        (
            user_count,
            len(ALLOWED_RESERVATION_STATUSES),
        ),
        dtype=np.int64,
    )

    completed_frequency = np.zeros(
        user_count,
        dtype=np.int64,
    )

    completed_monetary = np.zeros(
        user_count,
        dtype=np.float64,
    )

    no_completed_timestamp = np.iinfo(
        np.int64
    ).min

    last_completed_timestamp_ns = np.full(
        user_count,
        no_completed_timestamp,
        dtype=np.int64,
    )

    minimum_scheduled_timestamp_ns = None
    maximum_scheduled_timestamp_ns = None

    total_processed_rows = 0

    csv_iterator = pd.read_csv(
        RESERVATIONS_FILE,
        usecols=required_columns,
        chunksize=CHUNK_SIZE,
        low_memory=False,
    )

    for chunk_number, chunk in enumerate(
        csv_iterator,
        start=1,
    ):
        validate_columns(
            chunk,
            required_columns,
            "reservations.csv",
        )

        chunk["id"] = pd.to_numeric(
            chunk["id"],
            errors="raise",
        ).astype("int64")

        chunk["user_id"] = pd.to_numeric(
            chunk["user_id"],
            errors="coerce",
        ).astype("Int64")

        if chunk["user_id"].isna().any():
            raise ValueError(
                "RFM analizinde user_id değeri boş olan "
                "rezervasyon bulundu."
            )

        chunk["status"] = (
            chunk["status"]
            .astype("string")
            .str.upper()
        )

        invalid_statuses = (
            set(chunk["status"].dropna())
            - set(ALLOWED_RESERVATION_STATUSES)
        )

        if invalid_statuses:
            raise ValueError(
                "Geçersiz reservation status değerleri bulundu: "
                f"{sorted(invalid_statuses)}"
            )

        chunk["calculated_price"] = pd.to_numeric(
            chunk["calculated_price"],
            errors="coerce",
        )

        chunk["scheduled_time"] = pd.to_datetime(
            chunk["scheduled_time"],
            errors="coerce",
            utc=True,
        )

        chunk["completed_at"] = pd.to_datetime(
            chunk["completed_at"],
            errors="coerce",
            utc=True,
        )

        if chunk["scheduled_time"].isna().any():
            raise ValueError(
                "scheduled_time alanında geçersiz tarih bulundu."
            )

        if not (
            chunk["currency"]
            .astype("string")
            .str.upper()
            .eq(MONETARY_CURRENCY)
        ).all():
            raise ValueError(
                "RFM monetary hesabında TRY dışında "
                "para birimi bulundu."
            )

        user_positions = (
            chunk["user_id"]
            .astype(int)
            .map(user_index_lookup)
        )

        if user_positions.isna().any():
            unknown_user_ids = (
                chunk.loc[
                    user_positions.isna(),
                    "user_id",
                ]
                .drop_duplicates()
                .head(10)
                .tolist()
            )

            raise ValueError(
                "users.csv içinde bulunmayan rezervasyon "
                f"user_id değerleri bulundu: {unknown_user_ids}"
            )

        user_positions_array = (
            user_positions
            .astype(np.int64)
            .to_numpy()
        )

        status_indexes = (
            chunk["status"]
            .map(status_index_lookup)
            .astype(np.int64)
            .to_numpy()
        )

        np.add.at(
            status_counts,
            (
                user_positions_array,
                status_indexes,
            ),
            1,
        )

        scheduled_timestamp_values = (
            chunk["scheduled_time"]
            .astype("int64")
            .to_numpy()
        )

        chunk_minimum_timestamp = int(
            scheduled_timestamp_values.min()
        )

        chunk_maximum_timestamp = int(
            scheduled_timestamp_values.max()
        )

        if minimum_scheduled_timestamp_ns is None:
            minimum_scheduled_timestamp_ns = (
                chunk_minimum_timestamp
            )
        else:
            minimum_scheduled_timestamp_ns = min(
                minimum_scheduled_timestamp_ns,
                chunk_minimum_timestamp,
            )

        if maximum_scheduled_timestamp_ns is None:
            maximum_scheduled_timestamp_ns = (
                chunk_maximum_timestamp
            )
        else:
            maximum_scheduled_timestamp_ns = max(
                maximum_scheduled_timestamp_ns,
                chunk_maximum_timestamp,
            )

        completed_mask = (
            chunk["status"] == "COMPLETED"
        )

        if completed_mask.any():
            completed_chunk = chunk.loc[
                completed_mask
            ].copy()

            if completed_chunk["completed_at"].isna().any():
                raise ValueError(
                    "COMPLETED rezervasyonlarda "
                    "completed_at eksik."
                )

            if completed_chunk[
                "calculated_price"
            ].isna().any():
                raise ValueError(
                    "COMPLETED rezervasyonlarda "
                    "calculated_price eksik."
                )

            if not (
                completed_chunk["calculated_price"]
                >= 0
            ).all():
                raise ValueError(
                    "COMPLETED rezervasyonlarda "
                    "negatif calculated_price bulundu."
                )

            completed_user_positions = (
                user_positions.loc[
                    completed_mask
                ]
                .astype(np.int64)
                .to_numpy()
            )

            completed_prices = (
                completed_chunk[
                    "calculated_price"
                ]
                .astype(float)
                .to_numpy()
            )

            completed_timestamps_ns = (
                completed_chunk["completed_at"]
                .astype("int64")
                .to_numpy()
            )

            np.add.at(
                completed_frequency,
                completed_user_positions,
                1,
            )

            np.add.at(
                completed_monetary,
                completed_user_positions,
                completed_prices,
            )

            np.maximum.at(
                last_completed_timestamp_ns,
                completed_user_positions,
                completed_timestamps_ns,
            )

        total_processed_rows += len(chunk)

        print(
            f"Parça {chunk_number}: "
            f"{total_processed_rows:,} rezervasyon işlendi."
        )

    if total_processed_rows == 0:
        raise ValueError(
            "reservations.csv içinde kayıt bulunamadı."
        )

    return {
        "status_counts": status_counts,
        "completed_frequency": completed_frequency,
        "completed_monetary": completed_monetary,
        "last_completed_timestamp_ns": (
            last_completed_timestamp_ns
        ),
        "no_completed_timestamp": (
            no_completed_timestamp
        ),
        "minimum_scheduled_timestamp_ns": (
            minimum_scheduled_timestamp_ns
        ),
        "maximum_scheduled_timestamp_ns": (
            maximum_scheduled_timestamp_ns
        ),
        "total_processed_rows": total_processed_rows,
    }


# =====================================================
# 7. MÜŞTERİ DAVRANIŞ TABLOSUNU OLUŞTURMA
# =====================================================

def create_customer_metrics(
    users_df: pd.DataFrame,
    aggregation_result: dict,
) -> tuple[pd.DataFrame, pd.Timestamp, int]:
    """
    Rezervasyon özetlerini kullanıcı bilgileriyle birleştirir.
    """

    customer_df = users_df.copy().reset_index(drop=True)

    status_counts = aggregation_result[
        "status_counts"
    ]

    for status_index, status_name in enumerate(
        ALLOWED_RESERVATION_STATUSES
    ):
        customer_df[status_name] = (
            status_counts[:, status_index]
        )

    customer_df["total_reservations"] = (
        customer_df[
            ALLOWED_RESERVATION_STATUSES
        ]
        .sum(axis=1)
        .astype("int64")
    )

    customer_df["resolved_reservation_count"] = (
        customer_df["COMPLETED"]
        + customer_df["CANCELLED"]
        + customer_df["NO_SHOW"]
    ).astype("int64")

    customer_df["active_reservation_count"] = (
        customer_df["PENDING"]
        + customer_df["ASSIGNED"]
    ).astype("int64")

    customer_df["frequency"] = (
        aggregation_result[
            "completed_frequency"
        ]
    ).astype("int64")

    customer_df["monetary"] = np.round(
        aggregation_result[
            "completed_monetary"
        ],
        2,
    )

    # frequency ile COMPLETED durum sayısı aynı olmalıdır.
    if not (
        customer_df["frequency"]
        == customer_df["COMPLETED"]
    ).all():
        raise ValueError(
            "Frequency ile COMPLETED rezervasyon sayısı uyuşmuyor."
        )

    customer_df["avg_order_value"] = np.divide(
        customer_df["monetary"],
        customer_df["frequency"],
        out=np.zeros(
            len(customer_df),
            dtype=np.float64,
        ),
        where=customer_df["frequency"].to_numpy() > 0,
    ).round(2)

    resolved_counts = (
        customer_df[
            "resolved_reservation_count"
        ].to_numpy(dtype=np.float64)
    )

    customer_df["cancel_rate"] = np.divide(
        customer_df["CANCELLED"],
        resolved_counts,
        out=np.zeros(
            len(customer_df),
            dtype=np.float64,
        ),
        where=resolved_counts > 0,
    ).round(4)

    customer_df["no_show_rate"] = np.divide(
        customer_df["NO_SHOW"],
        resolved_counts,
        out=np.zeros(
            len(customer_df),
            dtype=np.float64,
        ),
        where=resolved_counts > 0,
    ).round(4)

    customer_df["completion_rate"] = np.divide(
        customer_df["COMPLETED"],
        resolved_counts,
        out=np.zeros(
            len(customer_df),
            dtype=np.float64,
        ),
        where=resolved_counts > 0,
    ).round(4)

    snapshot_date = (
        pd.to_datetime(
            aggregation_result[
                "maximum_scheduled_timestamp_ns"
            ],
            utc=True,
        )
        + pd.Timedelta(days=1)
    )

    observation_start = pd.to_datetime(
        aggregation_result[
            "minimum_scheduled_timestamp_ns"
        ],
        utc=True,
    )

    observation_period_days = max(
        1,
        int(
            np.ceil(
                (
                    snapshot_date
                    - observation_start
                ).total_seconds()
                / 86_400
            )
        ),
    )

    no_completion_recency = (
        observation_period_days
        + NO_COMPLETION_RECENCY_BUFFER_DAYS
    )

    last_timestamp_values = aggregation_result[
        "last_completed_timestamp_ns"
    ]

    has_completed_reservation = (
        last_timestamp_values
        != aggregation_result[
            "no_completed_timestamp"
        ]
    )

    last_completed_at = pd.Series(
        pd.NaT,
        index=customer_df.index,
        dtype="datetime64[ns, UTC]",
    )

    last_completed_at.loc[
        has_completed_reservation
    ] = pd.to_datetime(
        last_timestamp_values[
            has_completed_reservation
        ],
        utc=True,
    )

    customer_df["last_completed_at"] = (
        last_completed_at
    )

    recency_values = np.full(
        len(customer_df),
        no_completion_recency,
        dtype=np.int64,
    )

    completed_recency = (
        (
            snapshot_date
            - customer_df.loc[
                has_completed_reservation,
                "last_completed_at",
            ]
        )
        .dt.total_seconds()
        .div(86_400)
        .floordiv(1)
        .astype(int)
        .clip(lower=0)
    )

    recency_values[
        has_completed_reservation
    ] = completed_recency.to_numpy()

    customer_df["recency"] = recency_values

    customer_df["analysis_snapshot"] = (
        snapshot_date
    )

    customer_df["monetary_currency"] = (
        MONETARY_CURRENCY
    )

    return (
        customer_df,
        snapshot_date,
        observation_period_days,
    )


# =====================================================
# 8. SADAKAT BİLGİLERİNİ EKLEME
# =====================================================

def add_loyalty_information(
    customer_df: pd.DataFrame,
    loyalty_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Kayıtlı kullanıcılara sadakat bilgisini ekler.

    Misafir kullanıcılar sadakat sistemi dışında tutulur.
    """

    result_df = customer_df.merge(
        loyalty_df[
            [
                "user_id",
                "lifetime_points",
                "tier",
                "updated_at",
                "loyalty_account_exists",
            ]
        ],
        on="user_id",
        how="left",
        validate="one_to_one",
    )

    registered_mask = (
        ~result_df["is_guest"]
    )

    guest_mask = result_df["is_guest"]

    if result_df.loc[
        registered_mask,
        "loyalty_account_exists",
    ].isna().any():
        raise ValueError(
            "Kayıtlı müşterilerden bazılarının sadakat hesabı eksik."
        )

    if result_df.loc[
        guest_mask,
        "loyalty_account_exists",
    ].notna().any():
        raise ValueError(
            "Misafir kullanıcıya sadakat hesabı bağlandı."
        )

    result_df.loc[
        guest_mask,
        "lifetime_points",
    ] = 0

    result_df.loc[
        guest_mask,
        "tier",
    ] = "GUEST"

    result_df.loc[
        guest_mask,
        "loyalty_account_exists",
    ] = False

    result_df["lifetime_points"] = (
        result_df["lifetime_points"]
        .fillna(0)
        .astype("int64")
    )

    result_df["tier"] = (
        result_df["tier"]
        .astype("string")
    )

    result_df["loyalty_account_exists"] = (
        result_df[
            "loyalty_account_exists"
        ]
        .fillna(False)
        .astype(bool)
    )

    result_df = result_df.rename(
        columns={
            "updated_at": (
                "loyalty_account_updated_at"
            ),
        }
    )

    return result_df


# =====================================================
# 9. RFM SKORLARI
# =====================================================

def create_percentile_score(
    series: pd.Series,
    eligible_mask: pd.Series,
    higher_is_better: bool,
) -> pd.Series:
    """
    Tie-aware yüzde sıralamasından 1–5 arasında skor üretir.

    Aynı değere sahip müşteriler aynı skoru alır.
    Tamamlanmış rezervasyonu olmayan müşteriler 1 puan alır.
    """

    scores = pd.Series(
        1,
        index=series.index,
        dtype="int8",
    )

    eligible_values = series.loc[
        eligible_mask
    ]

    if eligible_values.empty:
        return scores

    if eligible_values.nunique() == 1:
        scores.loc[eligible_mask] = 3
        return scores

    percentile_rank = eligible_values.rank(
        method="average",
        pct=True,
        ascending=True,
    )

    percentile_bucket = (
        np.ceil(
            percentile_rank * 5
        )
        .clip(1, 5)
        .astype(int)
    )

    if higher_is_better:
        calculated_scores = percentile_bucket
    else:
        calculated_scores = (
            6 - percentile_bucket
        )

    scores.loc[eligible_mask] = (
        calculated_scores.astype("int8")
    )

    return scores


def add_rfm_scores(
    customer_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Recency, Frequency ve Monetary skorlarını oluşturur.
    """

    result_df = customer_df.copy()

    eligible_mask = (
        result_df["frequency"] > 0
    )

    result_df["r_score"] = create_percentile_score(
        series=result_df["recency"],
        eligible_mask=eligible_mask,
        higher_is_better=False,
    )

    result_df["f_score"] = create_percentile_score(
        series=result_df["frequency"],
        eligible_mask=eligible_mask,
        higher_is_better=True,
    )

    result_df["m_score"] = create_percentile_score(
        series=result_df["monetary"],
        eligible_mask=eligible_mask,
        higher_is_better=True,
    )

    result_df["rfm_score"] = (
        result_df["r_score"].astype(int)
        + result_df["f_score"].astype(int)
        + result_df["m_score"].astype(int)
    ).astype("int8")

    result_df["rfm_code"] = (
        result_df["r_score"].astype(str)
        + result_df["f_score"].astype(str)
        + result_df["m_score"].astype(str)
    )

    return result_df


# =====================================================
# 10. İŞ KURALI BAZLI SEGMENTLER
# =====================================================

def add_business_segments(
    customer_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    RFM ve operasyonel risk değerlerine göre iş segmenti oluşturur.
    """

    result_df = customer_df.copy()

    no_completed_reservation = (
        result_df["frequency"] == 0
    )

    operational_risk = (
        (
            result_df[
                "resolved_reservation_count"
            ]
            >= MIN_RESOLVED_RESERVATIONS_FOR_RISK
        )
        & (
            (
                result_df["cancel_rate"]
                >= CANCEL_RATE_RISK_THRESHOLD
            )
            | (
                result_df["no_show_rate"]
                >= NO_SHOW_RATE_RISK_THRESHOLD
            )
        )
    )

    loyal_vip = (
        (result_df["r_score"] >= 4)
        & (result_df["f_score"] >= 4)
        & (result_df["m_score"] >= 4)
    )

    churn_risk = (
        (result_df["r_score"] <= 2)
        & (result_df["f_score"] >= 4)
        & (result_df["m_score"] >= 3)
    )

    new_customer = (
        (result_df["r_score"] >= 4)
        & (result_df["frequency"] <= 2)
    )

    high_value = (
        (result_df["m_score"] >= 4)
        & (result_df["f_score"] >= 3)
    )

    frequent_customer = (
        result_df["f_score"] >= 4
    )

    low_engagement = (
        (result_df["r_score"] <= 2)
        & (result_df["f_score"] <= 2)
    )

    conditions = [
        no_completed_reservation,
        operational_risk,
        loyal_vip,
        churn_risk,
        new_customer,
        high_value,
        frequent_customer,
        low_engagement,
    ]

    segment_names = [
        "Rezervasyonsuz / Pasif Müşteri",
        "Riskli Müşteri",
        "Sadık VIP",
        "Kaybedilmek Üzere Olan Müşteri",
        "Yeni / Potansiyel Müşteri",
        "Yüksek Değerli Müşteri",
        "Sık Rezervasyon Yapan Müşteri",
        "Düşük Etkileşimli Müşteri",
    ]

    segment_reasons = [
        "Tamamlanmış rezervasyonu bulunmuyor.",
        (
            "İptal veya no-show oranı operasyonel "
            "risk sınırının üzerinde."
        ),
        (
            "Yakın zamanda, sık ve yüksek tutarlı "
            "rezervasyonlar gerçekleştirdi."
        ),
        (
            "Geçmişte sık ve değerli müşteriyken "
            "son dönemde rezervasyon yapmadı."
        ),
        (
            "Yakın zamanda sisteme katıldı veya "
            "henüz az sayıda rezervasyon yaptı."
        ),
        (
            "Yüksek toplam harcama ve rezervasyon "
            "değerine sahip."
        ),
        "Rezervasyon sıklığı müşteri ortalamasının üzerinde.",
        "Rezervasyon sıklığı düşük ve son işlemi eski.",
    ]

    result_df["business_segment"] = np.select(
        conditions,
        segment_names,
        default="Standart Müşteri",
    )

    result_df["business_segment_reason"] = np.select(
        conditions,
        segment_reasons,
        default=(
            "Belirgin bir yüksek değer, risk veya "
            "pasiflik kuralı oluşmadı."
        ),
    )

    return result_df


# =====================================================
# 11. SON ÇIKTI SÜTUNLARI
# =====================================================

def prepare_final_output(
    customer_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    K-Means ve admin önerileriyle uyumlu son RFM çıktısını hazırlar.
    """

    final_columns = [
        "user_id",
        "is_guest",
        "is_active",
        "deleted_at",
        "preferred_lang",

        "recency",
        "frequency",
        "monetary",
        "monetary_currency",
        "avg_order_value",
        "last_completed_at",

        "total_reservations",
        "resolved_reservation_count",
        "active_reservation_count",

        "PENDING",
        "ASSIGNED",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",

        "completion_rate",
        "cancel_rate",
        "no_show_rate",

        "lifetime_points",
        "tier",
        "loyalty_account_exists",
        "loyalty_account_updated_at",

        "r_score",
        "f_score",
        "m_score",
        "rfm_score",
        "rfm_code",

        "business_segment",
        "business_segment_reason",
        "analysis_snapshot",
    ]

    missing_columns = [
        column
        for column in final_columns
        if column not in customer_df.columns
    ]

    if missing_columns:
        raise ValueError(
            "RFM final çıktısında gerekli sütunlar eksik: "
            f"{missing_columns}"
        )

    return (
        customer_df[final_columns]
        .sort_values(
            by=[
                "rfm_score",
                "monetary",
                "frequency",
            ],
            ascending=[
                False,
                False,
                False,
            ],
        )
        .reset_index(drop=True)
    )


# =====================================================
# 12. DOĞRULAMA
# =====================================================

def validate_rfm_output(
    rfm_df: pd.DataFrame,
    users_df: pd.DataFrame,
    reservation_row_count: int,
) -> None:
    """
    RFM çıktısının veri ve iş kurallarına uygunluğunu doğrular.
    """

    if len(rfm_df) != len(users_df):
        raise ValueError(
            "RFM satır sayısı CUSTOMER kullanıcı sayısıyla uyuşmuyor."
        )

    if rfm_df["user_id"].duplicated().any():
        raise ValueError(
            "RFM çıktısında tekrar eden user_id bulundu."
        )

    if int(
        rfm_df["total_reservations"].sum()
    ) != reservation_row_count:
        raise ValueError(
            "RFM toplam rezervasyon sayısı reservations.csv "
            "satır sayısıyla uyuşmuyor."
        )

    expected_status_total = (
        rfm_df[
            ALLOWED_RESERVATION_STATUSES
        ]
        .sum(axis=1)
    )

    if not (
        expected_status_total
        == rfm_df["total_reservations"]
    ).all():
        raise ValueError(
            "Durum sayıları ile total_reservations uyuşmuyor."
        )

    if not (
        rfm_df["frequency"]
        == rfm_df["COMPLETED"]
    ).all():
        raise ValueError(
            "Frequency ile COMPLETED sayısı uyuşmuyor."
        )

    if not (
        rfm_df["monetary"] >= 0
    ).all():
        raise ValueError(
            "Negatif monetary değeri bulundu."
        )

    for rate_column in [
        "completion_rate",
        "cancel_rate",
        "no_show_rate",
    ]:
        if not rfm_df[
            rate_column
        ].between(
            0,
            1,
        ).all():
            raise ValueError(
                f"{rate_column} alanında 0–1 dışında değer bulundu."
            )

    for score_column in [
        "r_score",
        "f_score",
        "m_score",
    ]:
        if not rfm_df[
            score_column
        ].between(
            1,
            5,
        ).all():
            raise ValueError(
                f"{score_column} 1–5 arasında olmalıdır."
            )

    if not rfm_df[
        "rfm_score"
    ].between(
        3,
        15,
    ).all():
        raise ValueError(
            "rfm_score 3–15 arasında olmalıdır."
        )

    if not (
        rfm_df["monetary_currency"]
        == MONETARY_CURRENCY
    ).all():
        raise ValueError(
            "RFM para birimi TRY olmalıdır."
        )

    guest_rows = rfm_df[
        rfm_df["is_guest"]
    ]

    registered_rows = rfm_df[
        ~rfm_df["is_guest"]
    ]

    if not (
        guest_rows["lifetime_points"] == 0
    ).all():
        raise ValueError(
            "Misafir kullanıcıların lifetime_points değeri 0 olmalıdır."
        )

    if not (
        guest_rows["tier"] == "GUEST"
    ).all():
        raise ValueError(
            "Misafir kullanıcıların analitik tier değeri GUEST olmalıdır."
        )

    if guest_rows[
        "loyalty_account_exists"
    ].any():
        raise ValueError(
            "Misafir kullanıcıda loyalty account görünüyor."
        )

    if not registered_rows[
        "loyalty_account_exists"
    ].all():
        raise ValueError(
            "Kayıtlı kullanıcının loyalty account kaydı eksik."
        )

    if not set(
        registered_rows["tier"].dropna()
    ).issubset(ALLOWED_LOYALTY_TIERS):
        raise ValueError(
            "Kayıtlı müşterilerde geçersiz loyalty tier bulundu."
        )

    forbidden_columns = {
        "current_points",
        "total_spending",
        "completed_reservation_count",
    }

    old_columns = forbidden_columns.intersection(
        rfm_df.columns
    )

    if old_columns:
        raise ValueError(
            "Eski loyalty alanları RFM çıktısına taşındı: "
            f"{sorted(old_columns)}"
        )

    if rfm_df[
        "business_segment"
    ].isna().any():
        raise ValueError(
            "business_segment alanında eksik değer bulundu."
        )


# =====================================================
# 13. RAPORLAMA
# =====================================================

def create_reports(
    rfm_df: pd.DataFrame,
    snapshot_date: pd.Timestamp,
    observation_period_days: int,
    reservation_row_count: int,
) -> None:
    """
    RFM analiz sonuçlarını raporlar.
    """

    segment_distribution_df = (
        rfm_df
        .groupby(
            "business_segment",
            observed=True,
        )
        .agg(
            customer_count=("user_id", "count"),
            guest_rate=("is_guest", "mean"),
            average_recency=("recency", "mean"),
            average_frequency=("frequency", "mean"),
            average_monetary_try=("monetary", "mean"),
            total_monetary_try=("monetary", "sum"),
            average_cancel_rate=("cancel_rate", "mean"),
            average_no_show_rate=("no_show_rate", "mean"),
            average_rfm_score=("rfm_score", "mean"),
        )
        .reset_index()
        .sort_values(
            by="customer_count",
            ascending=False,
        )
    )

    numeric_report_columns = [
        "guest_rate",
        "average_recency",
        "average_frequency",
        "average_monetary_try",
        "total_monetary_try",
        "average_cancel_rate",
        "average_no_show_rate",
        "average_rfm_score",
    ]

    for column in numeric_report_columns:
        segment_distribution_df[column] = (
            segment_distribution_df[column]
            .round(4)
        )

    segment_distribution_df.to_csv(
        SEGMENT_DISTRIBUTION_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    rfm_statistics_df = (
        rfm_df[
            [
                "recency",
                "frequency",
                "monetary",
                "avg_order_value",
                "total_reservations",
                "cancel_rate",
                "no_show_rate",
                "lifetime_points",
                "rfm_score",
            ]
        ]
        .describe()
        .transpose()
        .reset_index()
        .rename(columns={"index": "metric"})
    )

    rfm_statistics_df.to_csv(
        RFM_SUMMARY_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    rfm_df.head(1000).to_csv(
        TOP_CUSTOMERS_FILE,
        index=False,
        encoding="utf-8-sig",
        na_rep="",
    )

    rfm_df.loc[
        rfm_df["business_segment"]
        == "Kaybedilmek Üzere Olan Müşteri"
    ].sort_values(
        by=[
            "monetary",
            "frequency",
        ],
        ascending=[
            False,
            False,
        ],
    ).to_csv(
        CHURN_RISK_FILE,
        index=False,
        encoding="utf-8-sig",
        na_rep="",
    )

    summary = {
        "users_file": str(USERS_FILE),
        "reservations_file": str(
            RESERVATIONS_FILE
        ),
        "loyalty_accounts_file": str(
            LOYALTY_ACCOUNTS_FILE
        ),
        "rfm_csv_output_file": str(
            RFM_CSV_OUTPUT_FILE
        ),
        "rfm_parquet_output_file": str(
            RFM_PARQUET_OUTPUT_FILE
        ),
        "customer_count": int(
            len(rfm_df)
        ),
        "reservation_count": int(
            reservation_row_count
        ),
        "completed_reservation_count": int(
            rfm_df["frequency"].sum()
        ),
        "analysis_snapshot_utc": str(
            snapshot_date
        ),
        "observation_period_days": int(
            observation_period_days
        ),
        "recency_method": (
            "analysis_snapshot - last_completed_at"
        ),
        "no_completion_recency_days": int(
            observation_period_days
            + NO_COMPLETION_RECENCY_BUFFER_DAYS
        ),
        "frequency_method": (
            "COMPLETED reservation count"
        ),
        "monetary_method": (
            "Sum of calculated_price for COMPLETED reservations"
        ),
        "monetary_currency": MONETARY_CURRENCY,
        "status_rate_denominator": (
            "COMPLETED + CANCELLED + NO_SHOW"
        ),
        "pending_and_assigned_excluded_from_risk_rates": True,
        "rfm_scoring_method": (
            "Tie-aware percentile scores from 1 to 5"
        ),
        "same_values_receive_same_score": True,
        "current_points_used": False,
        "guest_loyalty_accounts_expected": False,
        "guest_analytical_tier": "GUEST",
        "output_is_database_table": False,
        "output_purpose": (
            "Data Science customer segmentation, "
            "K-Means input and admin recommendations"
        ),
        "business_segments": (
            rfm_df["business_segment"]
            .value_counts()
            .to_dict()
        ),
    }

    with open(
        RFM_ANALYSIS_SUMMARY_FILE,
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
# 14. DOSYALARI KAYDETME
# =====================================================

def save_outputs(
    rfm_df: pd.DataFrame,
) -> None:
    """
    RFM çıktısını CSV ve Parquet biçiminde kaydeder.
    """

    rfm_df.to_csv(
        RFM_CSV_OUTPUT_FILE,
        index=False,
        encoding="utf-8",
        na_rep="",
    )

    try:
        rfm_df.to_parquet(
            RFM_PARQUET_OUTPUT_FILE,
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
# 15. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 70)
    print("08 — RFM MÜŞTERİ ANALİZİ")
    print("=" * 70)

    print("\nKullanıcılar okunuyor...")

    users_df = read_users()

    print("\nSadakat hesapları okunuyor...")

    loyalty_df = read_loyalty_accounts(
        users_df=users_df
    )

    print("\nRezervasyonlar parça parça özetleniyor...")

    aggregation_result = aggregate_reservations(
        users_df=users_df
    )

    print("\nKullanıcı davranış metrikleri oluşturuluyor...")

    (
        customer_df,
        snapshot_date,
        observation_period_days,
    ) = create_customer_metrics(
        users_df=users_df,
        aggregation_result=aggregation_result,
    )

    customer_df = add_loyalty_information(
        customer_df=customer_df,
        loyalty_df=loyalty_df,
    )

    print("RFM skorları hesaplanıyor...")

    customer_df = add_rfm_scores(
        customer_df=customer_df
    )

    print("İş kuralı segmentleri oluşturuluyor...")

    customer_df = add_business_segments(
        customer_df=customer_df
    )

    final_rfm_df = prepare_final_output(
        customer_df=customer_df
    )

    print("RFM çıktısı doğrulanıyor...")

    validate_rfm_output(
        rfm_df=final_rfm_df,
        users_df=users_df,
        reservation_row_count=aggregation_result[
            "total_processed_rows"
        ],
    )

    save_outputs(
        rfm_df=final_rfm_df
    )

    create_reports(
        rfm_df=final_rfm_df,
        snapshot_date=snapshot_date,
        observation_period_days=(
            observation_period_days
        ),
        reservation_row_count=aggregation_result[
            "total_processed_rows"
        ],
    )

    print("\n" + "=" * 70)
    print("RFM ANALİZİ TAMAMLANDI")
    print("=" * 70)

    print(
        f"Müşteri sayısı : "
        f"{len(final_rfm_df):,}"
    )

    print(
        "Tamamlanan rezervasyon: "
        f"{final_rfm_df['frequency'].sum():,}"
    )

    print(
        "Toplam müşteri harcaması: "
        f"{final_rfm_df['monetary'].sum():,.2f} TRY"
    )

    print(
        f"Analiz tarihi  : "
        f"{snapshot_date}"
    )

    print(
        f"\nRFM CSV       : "
        f"{RFM_CSV_OUTPUT_FILE}"
    )

    print(
        f"RFM Parquet   : "
        f"{RFM_PARQUET_OUTPUT_FILE}"
    )

    print(f"Raporlar      : {REPORT_DIR}")

    print("\nBusiness segment dağılımı:")

    print(
        final_rfm_df[
            "business_segment"
        ].value_counts().to_string()
    )

    print("\nKontroller:")
    print("Recency, completed_at üzerinden hesaplandı.")
    print("Frequency yalnızca COMPLETED rezervasyonları içeriyor.")
    print("Monetary yalnızca TRY tamamlanmış fiyatlarını içeriyor.")
    print("PENDING ve ASSIGNED risk oranlarından çıkarıldı.")
    print("Aynı RFM değerleri aynı skoru alıyor.")
    print("Sabit recency=999 kullanımı kaldırıldı.")
    print("Misafir kullanıcılar sadakat sisteminden ayrıldı.")
    print("current_points kullanımı kaldırıldı.")
    print("Büyük reservations.csv parça parça işlendi.")
    print("K-Means için gerekli sütunlar hazırlandı.")

    print(
        "\nNot: rfm_customer_segments dosyası SQL'e doğrudan "
        "aktarılacak bir veritabanı tablosu değildir. "
        "K-Means, admin önerileri ve analitik ekranlar için "
        "Data Science çıktısıdır."
    )


if __name__ == "__main__":
    main()