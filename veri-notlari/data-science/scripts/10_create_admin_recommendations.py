import json
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

RECOMMENDATION_VERSION = "admin-recommendations-v1"

MONETARY_CURRENCY = "TRY"

# Operasyonel risk için minimum sonuçlanmış rezervasyon
MIN_RESOLVED_RESERVATIONS_FOR_RISK = 3

CANCEL_RATE_RISK_THRESHOLD = 0.30
NO_SHOW_RATE_RISK_THRESHOLD = 0.15

TOP_RECOMMENDATION_COUNT = 1_000


VALID_RECOMMENDATION_TYPES = {
    "OPERATIONAL_RISK",
    "CHURN_RISK",
    "VIP_RETENTION",
    "HIGH_VALUE_GROWTH",
    "NEW_CUSTOMER_NURTURE",
    "FIRST_BOOKING_ACTIVATION",
    "REACTIVATION",
    "STANDARD_MONITORING",
    "NO_ACTION_INACTIVE",
}


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

REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "10_create_admin_recommendations"
)

PROCESSED_DATA_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

REPORT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


CUSTOMER_SEGMENTS_PARQUET_FILE = (
    PROCESSED_DATA_DIR
    / "customer_kmeans_segments.parquet"
)

CUSTOMER_SEGMENTS_CSV_FILE = (
    PROCESSED_DATA_DIR
    / "customer_kmeans_segments.csv"
)

ADMIN_RECOMMENDATIONS_CSV_FILE = (
    PROCESSED_DATA_DIR
    / "admin_customer_recommendations.csv"
)

ADMIN_RECOMMENDATIONS_PARQUET_FILE = (
    PROCESSED_DATA_DIR
    / "admin_customer_recommendations.parquet"
)

TOP_RECOMMENDATIONS_FILE = (
    PROCESSED_DATA_DIR
    / "admin_top_1000_customer_recommendations.csv"
)

RECOMMENDATION_DISTRIBUTION_FILE = (
    REPORT_DIR
    / "recommendation_type_distribution.csv"
)

PRIORITY_DISTRIBUTION_FILE = (
    REPORT_DIR
    / "priority_level_distribution.csv"
)

EVIDENCE_QUALITY_FILE = (
    REPORT_DIR
    / "recommendation_evidence_quality.csv"
)

RECOMMENDATION_SAMPLE_FILE = (
    REPORT_DIR
    / "admin_recommendations_sample.csv"
)

ADMIN_SUMMARY_FILE = (
    REPORT_DIR
    / "admin_recommendations_summary.json"
)


# =====================================================
# 3. GEREKLİ VE OPSİYONEL SÜTUNLAR
# =====================================================

REQUIRED_COLUMNS = [
    "user_id",
    "is_guest",
    "is_active",
    "recency",
    "frequency",
    "monetary",
    "monetary_currency",
    "avg_order_value",
    "resolved_reservation_count",
    "cancel_rate",
    "no_show_rate",
    "lifetime_points",
    "tier",
    "business_segment",
    "ml_segment_code",
    "ml_segment_name",
    "model_eligible",
    "analysis_snapshot",
]

OPTIONAL_DEFAULTS = {
    "deleted_at": pd.NaT,
    "preferred_lang": "tr",
    "business_segment_reason": "",
    "model_exclusion_reason": pd.NA,
    "cluster_separation_score": np.nan,
    "segmentation_model_version": "unknown",
    "rfm_score": 3,
    "smoothed_cancel_rate": np.nan,
    "smoothed_no_show_rate": np.nan,
}


# =====================================================
# 4. YARDIMCI FONKSİYONLAR
# =====================================================

def validate_columns(
    dataframe: pd.DataFrame,
    required_columns: list[str],
    dataframe_name: str,
) -> None:
    """
    Gerekli sütunların mevcut olduğunu doğrular.
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
            f"{column_name} alanında geçersiz boolean "
            f"değerler bulundu: {invalid_values}"
        )

    return converted.astype(bool)


def percentile_score(
    series: pd.Series,
) -> pd.Series:
    """
    Sayısal bir alanı tie-aware şekilde 0–1 aralığına dönüştürür.

    Aynı değere sahip müşteriler aynı skoru alır.
    """

    numeric_series = pd.to_numeric(
        series,
        errors="coerce",
    )

    if numeric_series.isna().any():
        raise ValueError(
            "Yüzdelik skor hesaplanacak alanda eksik değer bulundu."
        )

    if numeric_series.nunique() <= 1:
        return pd.Series(
            0.5,
            index=series.index,
            dtype=float,
        )

    ranks = numeric_series.rank(
        method="average",
        pct=True,
    )

    minimum_rank = float(ranks.min())
    maximum_rank = float(ranks.max())

    if maximum_rank == minimum_rank:
        return pd.Series(
            0.5,
            index=series.index,
            dtype=float,
        )

    return (
        (ranks - minimum_rank)
        / (maximum_rank - minimum_rank)
    ).clip(
        lower=0,
        upper=1,
    )


def add_optional_columns(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Eski veya eksik analitik çıktılarda bulunmayan opsiyonel
    sütunları güvenli varsayılanlarla ekler.
    """

    result_df = dataframe.copy()

    for column, default_value in OPTIONAL_DEFAULTS.items():
        if column not in result_df.columns:
            result_df[column] = default_value

    return result_df


# =====================================================
# 5. K-MEANS MÜŞTERİ VERİSİNİ OKUMA
# =====================================================

def read_customer_segments() -> pd.DataFrame:
    """
    09_kmeans_customer_segmentation.py çıktısını okur.

    Parquet varsa önce Parquet tercih edilir.
    """

    if CUSTOMER_SEGMENTS_PARQUET_FILE.exists():
        input_file = CUSTOMER_SEGMENTS_PARQUET_FILE

        dataframe = pd.read_parquet(
            input_file
        )

    elif CUSTOMER_SEGMENTS_CSV_FILE.exists():
        input_file = CUSTOMER_SEGMENTS_CSV_FILE

        dataframe = pd.read_csv(
            input_file,
            low_memory=False,
        )

    else:
        raise FileNotFoundError(
            "K-Means müşteri segment dosyası bulunamadı.\n"
            "Önce 09_kmeans_customer_segmentation.py "
            "dosyasını çalıştırmalısın.\n\n"
            f"Beklenen dosya:\n"
            f"{CUSTOMER_SEGMENTS_PARQUET_FILE}"
        )

    dataframe = add_optional_columns(
        dataframe
    )

    validate_columns(
        dataframe=dataframe,
        required_columns=REQUIRED_COLUMNS,
        dataframe_name=input_file.name,
    )

    dataframe["user_id"] = pd.to_numeric(
        dataframe["user_id"],
        errors="raise",
    ).astype("int64")

    dataframe["is_guest"] = convert_boolean(
        dataframe["is_guest"],
        "is_guest",
    )

    dataframe["is_active"] = convert_boolean(
        dataframe["is_active"],
        "is_active",
    )

    dataframe["model_eligible"] = convert_boolean(
        dataframe["model_eligible"],
        "model_eligible",
    )

    dataframe["deleted_at"] = pd.to_datetime(
        dataframe["deleted_at"],
        errors="coerce",
        utc=True,
    )

    dataframe["analysis_snapshot"] = pd.to_datetime(
        dataframe["analysis_snapshot"],
        errors="coerce",
        utc=True,
    )

    numeric_columns = [
        "recency",
        "frequency",
        "monetary",
        "avg_order_value",
        "resolved_reservation_count",
        "cancel_rate",
        "no_show_rate",
        "lifetime_points",
        "rfm_score",
        "cluster_separation_score",
        "smoothed_cancel_rate",
        "smoothed_no_show_rate",
    ]

    for column in numeric_columns:
        dataframe[column] = pd.to_numeric(
            dataframe[column],
            errors="coerce",
        )

    # 09 çıktısında smoothed oranlar bulunuyorsa kullanılır.
    # Yoksa ham oranlara geri dönülür.
    dataframe["smoothed_cancel_rate"] = (
        dataframe["smoothed_cancel_rate"]
        .fillna(
            dataframe["cancel_rate"]
        )
    )

    dataframe["smoothed_no_show_rate"] = (
        dataframe["smoothed_no_show_rate"]
        .fillna(
            dataframe["no_show_rate"]
        )
    )

    dataframe["cluster_separation_score"] = (
        dataframe["cluster_separation_score"]
        .fillna(0.0)
        .clip(
            lower=0,
            upper=1,
        )
    )

    critical_numeric_columns = [
        "recency",
        "frequency",
        "monetary",
        "avg_order_value",
        "resolved_reservation_count",
        "cancel_rate",
        "no_show_rate",
        "lifetime_points",
        "rfm_score",
        "smoothed_cancel_rate",
        "smoothed_no_show_rate",
    ]

    if dataframe[
        critical_numeric_columns
    ].isna().any().any():
        missing_counts = (
            dataframe[
                critical_numeric_columns
            ]
            .isna()
            .sum()
        )

        raise ValueError(
            "Admin önerileri için gerekli sayısal "
            "alanlarda eksik değer var:\n"
            f"{missing_counts[missing_counts > 0]}"
        )

    non_negative_columns = [
        "recency",
        "frequency",
        "monetary",
        "avg_order_value",
        "resolved_reservation_count",
        "lifetime_points",
    ]

    for column in non_negative_columns:
        if not (
            dataframe[column] >= 0
        ).all():
            raise ValueError(
                f"{column} alanında negatif değer bulundu."
            )

    for rate_column in [
        "cancel_rate",
        "no_show_rate",
        "smoothed_cancel_rate",
        "smoothed_no_show_rate",
    ]:
        if not dataframe[
            rate_column
        ].between(
            0,
            1,
        ).all():
            raise ValueError(
                f"{rate_column} 0–1 arasında olmalıdır."
            )

    if dataframe["user_id"].duplicated().any():
        raise ValueError(
            "Müşteri segment verisinde tekrar eden user_id bulundu."
        )

    if dataframe["analysis_snapshot"].isna().any():
        raise ValueError(
            "analysis_snapshot alanında geçersiz tarih bulundu."
        )

    if not (
        dataframe["monetary_currency"]
        .astype("string")
        .eq(MONETARY_CURRENCY)
    ).all():
        raise ValueError(
            "Admin önerilerindeki parasal değerler TRY olmalıdır."
        )

    dataframe["preferred_lang"] = (
        dataframe["preferred_lang"]
        .fillna("tr")
        .astype("string")
        .str.lower()
    )

    invalid_languages = (
        set(
            dataframe[
                "preferred_lang"
            ].dropna()
        )
        - {"tr", "en"}
    )

    if invalid_languages:
        raise ValueError(
            "Desteklenmeyen preferred_lang değerleri bulundu: "
            f"{sorted(invalid_languages)}"
        )

    dataframe["business_segment"] = (
        dataframe["business_segment"]
        .astype("string")
    )

    dataframe["ml_segment_code"] = (
        dataframe["ml_segment_code"]
        .astype("string")
        .str.upper()
    )

    dataframe["ml_segment_name"] = (
        dataframe["ml_segment_name"]
        .astype("string")
    )

    dataframe["tier"] = (
        dataframe["tier"]
        .astype("string")
        .str.upper()
    )

    dataframe = (
        dataframe
        .sort_values("user_id")
        .reset_index(drop=True)
    )

    print(f"Girdi dosyası : {input_file}")
    print(f"Müşteri sayısı: {len(dataframe):,}")

    return dataframe


# =====================================================
# 6. DEĞER VE RİSK SKORLARI
# =====================================================

def add_decision_scores(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Admin önerilerinde kullanılacak müşteri değer,
    güncellik ve risk skorlarını oluşturur.
    """

    result_df = dataframe.copy()

    monetary_percentile = percentile_score(
        result_df["monetary"]
    )

    frequency_percentile = percentile_score(
        result_df["frequency"]
    )

    order_value_percentile = percentile_score(
        result_df["avg_order_value"]
    )

    lifetime_points_percentile = percentile_score(
        result_df["lifetime_points"]
    )

    # Recency yükseldikçe müşterinin son işlemi eskidir.
    staleness_percentile = percentile_score(
        result_df["recency"]
    )

    result_df["value_score"] = (
        0.40 * monetary_percentile
        + 0.25 * frequency_percentile
        + 0.20 * order_value_percentile
        + 0.15 * lifetime_points_percentile
    ).clip(
        lower=0,
        upper=1,
    )

    result_df["staleness_score"] = (
        staleness_percentile
    ).clip(
        lower=0,
        upper=1,
    )

    result_df["freshness_score"] = (
        1 - result_df["staleness_score"]
    ).clip(
        lower=0,
        upper=1,
    )

    # No-show, normal iptalden daha yüksek ağırlıkla değerlendirilir.
    result_df["raw_operational_risk_score"] = (
        0.40
        * result_df["smoothed_cancel_rate"]
        + 0.60
        * result_df["smoothed_no_show_rate"]
    )

    # Çok az rezervasyon geçmişinde risk skorunun aşırı yükselmesini önler.
    result_df["risk_exposure_confidence"] = (
        1
        - np.exp(
            -result_df[
                "resolved_reservation_count"
            ]
            / 5
        )
    )

    result_df["operational_risk_score"] = (
        result_df[
            "raw_operational_risk_score"
        ]
        * result_df[
            "risk_exposure_confidence"
        ]
    ).clip(
        lower=0,
        upper=1,
    )

    loyalty_tier_score_map = {
        "GUEST": 0.00,
        "BRONZE": 0.20,
        "SILVER": 0.40,
        "GOLD": 0.60,
        "PLATINUM": 0.80,
        "VIP": 1.00,
    }

    result_df["loyalty_tier_score"] = (
        result_df["tier"]
        .map(loyalty_tier_score_map)
        .fillna(0.0)
        .astype(float)
    )

    score_columns = [
        "value_score",
        "staleness_score",
        "freshness_score",
        "raw_operational_risk_score",
        "risk_exposure_confidence",
        "operational_risk_score",
        "loyalty_tier_score",
    ]

    for column in score_columns:
        result_df[column] = (
            result_df[column]
            .round(6)
        )

    return result_df


# =====================================================
# 7. ÖNERİ KANITLARI
# =====================================================

def add_recommendation_flags(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Business segment, ML segment ve doğrudan metriklerden
    öneri kanıtlarını oluşturur.
    """

    result_df = dataframe.copy()

    business_segment = result_df[
        "business_segment"
    ]

    ml_segment_code = result_df[
        "ml_segment_code"
    ]

    inactive_account = (
        ~result_df["is_active"]
        | result_df["deleted_at"].notna()
    )

    # -------------------------------------------------
    # Operasyonel risk
    # -------------------------------------------------

    result_df[
        "business_operational_risk_flag"
    ] = (
        business_segment
        == "Riskli Müşteri"
    )

    result_df[
        "ml_operational_risk_flag"
    ] = (
        ml_segment_code
        == "OPERATIONAL_RISK"
    )

    result_df[
        "metric_operational_risk_flag"
    ] = (
        (
            result_df[
                "resolved_reservation_count"
            ]
            >= MIN_RESOLVED_RESERVATIONS_FOR_RISK
        )
        & (
            (
                result_df[
                    "smoothed_cancel_rate"
                ]
                >= CANCEL_RATE_RISK_THRESHOLD
            )
            | (
                result_df[
                    "smoothed_no_show_rate"
                ]
                >= NO_SHOW_RATE_RISK_THRESHOLD
            )
        )
    )

    # -------------------------------------------------
    # Churn riski
    # -------------------------------------------------

    result_df["business_churn_flag"] = (
        business_segment
        == "Kaybedilmek Üzere Olan Müşteri"
    )

    result_df["ml_churn_flag"] = (
        ml_segment_code
        == "CHURN_RISK"
    )

    result_df["metric_churn_flag"] = (
        (result_df["frequency"] >= 3)
        & (result_df["value_score"] >= 0.60)
        & (result_df["staleness_score"] >= 0.70)
    )

    # -------------------------------------------------
    # VIP koruma
    # -------------------------------------------------

    result_df["business_vip_flag"] = (
        business_segment
        == "Sadık VIP"
    )

    result_df["ml_vip_flag"] = (
        ml_segment_code
        == "LOYAL_VIP"
    )

    result_df["metric_vip_flag"] = (
        result_df["tier"].isin(
            ["PLATINUM", "VIP"]
        )
        & (result_df["value_score"] >= 0.55)
        & (result_df["freshness_score"] >= 0.50)
    )

    # -------------------------------------------------
    # Yüksek değer
    # -------------------------------------------------

    result_df["business_high_value_flag"] = (
        business_segment
        == "Yüksek Değerli Müşteri"
    )

    result_df["ml_high_value_flag"] = (
        ml_segment_code
        == "HIGH_VALUE"
    )

    result_df["metric_high_value_flag"] = (
        result_df["value_score"] >= 0.80
    )

    # -------------------------------------------------
    # Yeni müşteri
    # -------------------------------------------------

    result_df["business_new_flag"] = (
        business_segment
        == "Yeni / Potansiyel Müşteri"
    )

    result_df["ml_new_flag"] = (
        ml_segment_code
        == "NEW_POTENTIAL"
    )

    result_df["metric_new_flag"] = (
        result_df["frequency"].between(
            1,
            2,
        )
        & (result_df["freshness_score"] >= 0.75)
    )

    # -------------------------------------------------
    # İlk rezervasyon aktivasyonu
    # -------------------------------------------------

    result_df[
        "first_booking_activation_flag"
    ] = (
        ~inactive_account
        & (result_df["frequency"] == 0)
    )

    # -------------------------------------------------
    # Yeniden aktivasyon
    # -------------------------------------------------

    result_df["reactivation_flag"] = (
        ~inactive_account
        & (result_df["frequency"] > 0)
        & (
            (
                business_segment
                == "Düşük Etkileşimli Müşteri"
            )
            | (
                result_df["staleness_score"]
                >= 0.75
            )
        )
        & ~result_df["business_churn_flag"]
        & ~result_df["ml_churn_flag"]
        & ~result_df["metric_churn_flag"]
    )

    result_df[
        "inactive_account_flag"
    ] = inactive_account

    return result_df


# =====================================================
# 8. ANA ÖNERİ TİPİNİ BELİRLEME
# =====================================================

def assign_primary_recommendation(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Çakışan öneri kanıtlarından tek bir ana öneri tipi seçer.

    Öncelik:
    1. Aktif olmayan hesap
    2. Operasyonel risk
    3. Churn riski
    4. VIP koruma
    5. Yüksek değer büyütme
    6. Yeni müşteri geliştirme
    7. İlk rezervasyon aktivasyonu
    8. Yeniden aktivasyon
    9. Standart izleme
    """

    result_df = dataframe.copy()

    operational_risk = (
        result_df[
            "business_operational_risk_flag"
        ]
        | result_df[
            "ml_operational_risk_flag"
        ]
        | result_df[
            "metric_operational_risk_flag"
        ]
    )

    churn_risk = (
        result_df["business_churn_flag"]
        | result_df["ml_churn_flag"]
        | result_df["metric_churn_flag"]
    )

    vip_retention = (
        result_df["business_vip_flag"]
        | result_df["ml_vip_flag"]
        | result_df["metric_vip_flag"]
    )

    high_value = (
        result_df[
            "business_high_value_flag"
        ]
        | result_df[
            "ml_high_value_flag"
        ]
        | result_df[
            "metric_high_value_flag"
        ]
    )

    new_customer = (
        result_df["business_new_flag"]
        | result_df["ml_new_flag"]
        | result_df["metric_new_flag"]
    )

    conditions = [
        result_df["inactive_account_flag"],
        operational_risk,
        churn_risk,
        vip_retention,
        high_value,
        new_customer,
        result_df[
            "first_booking_activation_flag"
        ],
        result_df["reactivation_flag"],
    ]

    choices = [
        "NO_ACTION_INACTIVE",
        "OPERATIONAL_RISK",
        "CHURN_RISK",
        "VIP_RETENTION",
        "HIGH_VALUE_GROWTH",
        "NEW_CUSTOMER_NURTURE",
        "FIRST_BOOKING_ACTIVATION",
        "REACTIVATION",
    ]

    result_df["recommendation_type"] = (
        np.select(
            conditions,
            choices,
            default="STANDARD_MONITORING",
        )
    )

    return result_df


# =====================================================
# 9. KANIT UYUMU VE GÜVEN SKORU
# =====================================================

def add_evidence_and_confidence(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Seçilen öneri için business, ML ve metrik kanıtlarının
    uyumunu hesaplar.
    """

    result_df = dataframe.copy()

    recommendation_type = result_df[
        "recommendation_type"
    ]

    business_evidence = np.select(
        [
            recommendation_type
            == "OPERATIONAL_RISK",

            recommendation_type
            == "CHURN_RISK",

            recommendation_type
            == "VIP_RETENTION",

            recommendation_type
            == "HIGH_VALUE_GROWTH",

            recommendation_type
            == "NEW_CUSTOMER_NURTURE",
        ],
        [
            result_df[
                "business_operational_risk_flag"
            ],
            result_df[
                "business_churn_flag"
            ],
            result_df[
                "business_vip_flag"
            ],
            result_df[
                "business_high_value_flag"
            ],
            result_df[
                "business_new_flag"
            ],
        ],
        default=False,
    )

    ml_evidence = np.select(
        [
            recommendation_type
            == "OPERATIONAL_RISK",

            recommendation_type
            == "CHURN_RISK",

            recommendation_type
            == "VIP_RETENTION",

            recommendation_type
            == "HIGH_VALUE_GROWTH",

            recommendation_type
            == "NEW_CUSTOMER_NURTURE",
        ],
        [
            result_df[
                "ml_operational_risk_flag"
            ],
            result_df[
                "ml_churn_flag"
            ],
            result_df[
                "ml_vip_flag"
            ],
            result_df[
                "ml_high_value_flag"
            ],
            result_df[
                "ml_new_flag"
            ],
        ],
        default=False,
    )

    metric_evidence = np.select(
        [
            recommendation_type
            == "OPERATIONAL_RISK",

            recommendation_type
            == "CHURN_RISK",

            recommendation_type
            == "VIP_RETENTION",

            recommendation_type
            == "HIGH_VALUE_GROWTH",

            recommendation_type
            == "NEW_CUSTOMER_NURTURE",

            recommendation_type
            == "FIRST_BOOKING_ACTIVATION",

            recommendation_type
            == "REACTIVATION",

            recommendation_type
            == "NO_ACTION_INACTIVE",
        ],
        [
            result_df[
                "metric_operational_risk_flag"
            ],
            result_df[
                "metric_churn_flag"
            ],
            result_df[
                "metric_vip_flag"
            ],
            result_df[
                "metric_high_value_flag"
            ],
            result_df[
                "metric_new_flag"
            ],
            result_df[
                "first_booking_activation_flag"
            ],
            result_df[
                "reactivation_flag"
            ],
            result_df[
                "inactive_account_flag"
            ],
        ],
        default=True,
    )

    result_df["business_evidence"] = (
        pd.Series(
            business_evidence,
            index=result_df.index,
        ).astype(bool)
    )

    result_df["ml_evidence"] = (
        pd.Series(
            ml_evidence,
            index=result_df.index,
        ).astype(bool)
    )

    result_df["metric_evidence"] = (
        pd.Series(
            metric_evidence,
            index=result_df.index,
        ).astype(bool)
    )

    result_df[
        "evidence_agreement_count"
    ] = (
        result_df[
            "business_evidence"
        ].astype(int)
        + result_df[
            "ml_evidence"
        ].astype(int)
        + result_df[
            "metric_evidence"
        ].astype(int)
    )

    # En az bir kanıt olması normaldir.
    base_confidence = 0.40

    evidence_bonus = (
        result_df[
            "evidence_agreement_count"
        ]
        * 0.15
    )

    model_confidence_bonus = (
        result_df[
            "cluster_separation_score"
        ]
        * result_df[
            "model_eligible"
        ].astype(int)
        * 0.15
    )

    result_df[
        "recommendation_confidence"
    ] = (
        base_confidence
        + evidence_bonus
        + model_confidence_bonus
    ).clip(
        lower=0,
        upper=0.98,
    )

    inactive_mask = (
        result_df[
            "recommendation_type"
        ]
        == "NO_ACTION_INACTIVE"
    )

    result_df.loc[
        inactive_mask,
        "recommendation_confidence",
    ] = 1.00

    result_df[
        "recommendation_confidence"
    ] = (
        result_df[
            "recommendation_confidence"
        ]
        .round(4)
    )

    result_df[
        "recommendation_confidence_level"
    ] = np.select(
        [
            result_df[
                "recommendation_confidence"
            ]
            >= 0.75,

            result_df[
                "recommendation_confidence"
            ]
            >= 0.55,
        ],
        [
            "HIGH",
            "MEDIUM",
        ],
        default="LOW",
    )

    return result_df


# =====================================================
# 10. AKSİYON VE GEREKÇE METİNLERİ
# =====================================================

def add_action_texts(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Admin paneli için Türkçe ve İngilizce öneri metinleri ekler.
    """

    result_df = dataframe.copy()

    action_tr = {
        "OPERATIONAL_RISK": (
            "Sonraki rezervasyonda ek teyit adımı uygulanmalı; "
            "gerekirse ön ödeme veya manuel onay değerlendirilmelidir."
        ),
        "CHURN_RISK": (
            "Müşterinin geri kazanımı için kişiselleştirilmiş "
            "bir kampanya hazırlanmalı ve admin onayına sunulmalıdır."
        ),
        "VIP_RETENTION": (
            "Müşteriye VIP koruma programı, öncelikli destek ve "
            "uygun sadakat avantajları değerlendirilmelidir."
        ),
        "HIGH_VALUE_GROWTH": (
            "Premium araç veya üst segment hizmet önerisiyle "
            "müşteri değerinin artırılması değerlendirilmelidir."
        ),
        "NEW_CUSTOMER_NURTURE": (
            "İkinci rezervasyonu teşvik eden hoş geldin iletişimi "
            "ve uygun kampanya değerlendirilmelidir."
        ),
        "FIRST_BOOKING_ACTIVATION": (
            "Müşterinin ilk başarılı transferini tamamlamasını "
            "kolaylaştıracak aktivasyon iletişimi hazırlanmalıdır."
        ),
        "REACTIVATION": (
            "Pasif müşteriye yeniden aktivasyon iletişimi ve "
            "geri dönüş kampanyası değerlendirilmelidir."
        ),
        "STANDARD_MONITORING": (
            "Müşteri standart davranış grubunda izlenmeye devam edilmelidir."
        ),
        "NO_ACTION_INACTIVE": (
            "Hesap aktif olmadığı için pazarlama veya operasyonel "
            "aksiyon uygulanmamalıdır."
        ),
    }

    action_en = {
        "OPERATIONAL_RISK": (
            "Apply an additional confirmation step to the next booking; "
            "consider prepayment or manual approval where appropriate."
        ),
        "CHURN_RISK": (
            "Prepare a personalized win-back campaign and submit it "
            "for administrative approval."
        ),
        "VIP_RETENTION": (
            "Evaluate VIP retention benefits, priority support and "
            "appropriate loyalty advantages."
        ),
        "HIGH_VALUE_GROWTH": (
            "Consider premium vehicle or higher-service-tier offers "
            "to increase customer value."
        ),
        "NEW_CUSTOMER_NURTURE": (
            "Consider a welcome communication and an appropriate offer "
            "to encourage a second booking."
        ),
        "FIRST_BOOKING_ACTIVATION": (
            "Prepare an activation communication that helps the customer "
            "complete their first successful transfer."
        ),
        "REACTIVATION": (
            "Consider reactivation communication and a customer "
            "return campaign."
        ),
        "STANDARD_MONITORING": (
            "Continue monitoring the customer as part of the standard segment."
        ),
        "NO_ACTION_INACTIVE": (
            "Do not apply marketing or operational actions because "
            "the account is inactive."
        ),
    }

    reason_tr = {
        "OPERATIONAL_RISK": (
            "İptal veya no-show davranışı operasyonel risk sınırını aşıyor."
        ),
        "CHURN_RISK": (
            "Geçmiş müşteri değeri yüksekken son tamamlanmış "
            "rezervasyonun üzerinden uzun süre geçti."
        ),
        "VIP_RETENTION": (
            "Müşteri güncel, sık ve yüksek değerli rezervasyon "
            "davranışı gösteriyor."
        ),
        "HIGH_VALUE_GROWTH": (
            "Toplam harcama, rezervasyon sıklığı veya ortalama "
            "sipariş değeri müşteri kitlesinin üst bölümünde."
        ),
        "NEW_CUSTOMER_NURTURE": (
            "Müşteri yakın zamanda işlem yaptı ancak rezervasyon "
            "geçmişi henüz sınırlı."
        ),
        "FIRST_BOOKING_ACTIVATION": (
            "Müşterinin henüz tamamlanmış bir rezervasyonu bulunmuyor."
        ),
        "REACTIVATION": (
            "Müşterinin tamamlanmış rezervasyon geçmişi var ancak "
            "son işlem tarihi görece eski."
        ),
        "STANDARD_MONITORING": (
            "Belirgin bir churn, operasyonel risk veya yüksek "
            "değer sinyali oluşmadı."
        ),
        "NO_ACTION_INACTIVE": (
            "Kullanıcı hesabı aktif değil veya soft-delete uygulanmış."
        ),
    }

    reason_en = {
        "OPERATIONAL_RISK": (
            "Cancellation or no-show behaviour exceeds the operational "
            "risk threshold."
        ),
        "CHURN_RISK": (
            "The customer had meaningful historical value but has not "
            "completed a booking recently."
        ),
        "VIP_RETENTION": (
            "The customer demonstrates recent, frequent and high-value "
            "booking behaviour."
        ),
        "HIGH_VALUE_GROWTH": (
            "Total spending, booking frequency or average order value "
            "is in the upper customer range."
        ),
        "NEW_CUSTOMER_NURTURE": (
            "The customer completed a recent booking but still has "
            "limited booking history."
        ),
        "FIRST_BOOKING_ACTIVATION": (
            "The customer does not yet have a completed booking."
        ),
        "REACTIVATION": (
            "The customer has completed booking history, but the latest "
            "activity is relatively old."
        ),
        "STANDARD_MONITORING": (
            "No significant churn, operational risk or high-value "
            "signal was identified."
        ),
        "NO_ACTION_INACTIVE": (
            "The user account is inactive or soft-deleted."
        ),
    }

    result_df["recommended_action_tr"] = (
        result_df[
            "recommendation_type"
        ].map(action_tr)
    )

    result_df["recommended_action_en"] = (
        result_df[
            "recommendation_type"
        ].map(action_en)
    )

    result_df["recommendation_reason_tr"] = (
        result_df[
            "recommendation_type"
        ].map(reason_tr)
    )

    result_df["recommendation_reason_en"] = (
        result_df[
            "recommendation_type"
        ].map(reason_en)
    )

    # Admin panelinin önerinin dayanağını ayrıca gösterebilmesi için
    # sayısal kanıt özeti oluşturulur.
    result_df["evidence_summary"] = (
        "recency_days="
        + result_df["recency"]
        .round()
        .astype(int)
        .astype(str)

        + "; frequency="
        + result_df["frequency"]
        .round()
        .astype(int)
        .astype(str)

        + "; monetary_try="
        + result_df["monetary"]
        .round(2)
        .astype(str)

        + "; cancel_rate="
        + result_df["cancel_rate"]
        .round(4)
        .astype(str)

        + "; no_show_rate="
        + result_df["no_show_rate"]
        .round(4)
        .astype(str)

        + "; value_score="
        + result_df["value_score"]
        .round(4)
        .astype(str)

        + "; operational_risk_score="
        + result_df[
            "operational_risk_score"
        ]
        .round(4)
        .astype(str)
    )

    return result_df


# =====================================================
# 11. ÖNCELİK SKORU
# =====================================================

def add_priority_scores(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Öneri tipi ve müşteri metriklerinden 0–100 öncelik skoru üretir.
    """

    result_df = dataframe.copy()

    base_priority_map = {
        "OPERATIONAL_RISK": 86.0,
        "CHURN_RISK": 82.0,
        "VIP_RETENTION": 72.0,
        "HIGH_VALUE_GROWTH": 62.0,
        "NEW_CUSTOMER_NURTURE": 52.0,
        "REACTIVATION": 48.0,
        "FIRST_BOOKING_ACTIVATION": 42.0,
        "STANDARD_MONITORING": 20.0,
        "NO_ACTION_INACTIVE": 0.0,
    }

    result_df["priority_score"] = (
        result_df[
            "recommendation_type"
        ]
        .map(base_priority_map)
        .astype(float)
    )

    recommendation_type = result_df[
        "recommendation_type"
    ]

    result_df["priority_score"] += np.select(
        [
            recommendation_type
            == "OPERATIONAL_RISK",

            recommendation_type
            == "CHURN_RISK",

            recommendation_type
            == "VIP_RETENTION",

            recommendation_type
            == "HIGH_VALUE_GROWTH",

            recommendation_type
            == "NEW_CUSTOMER_NURTURE",

            recommendation_type
            == "REACTIVATION",

            recommendation_type
            == "FIRST_BOOKING_ACTIVATION",
        ],
        [
            (
                9
                * result_df[
                    "operational_risk_score"
                ]
                + 5
                * result_df[
                    "value_score"
                ]
            ),

            (
                10
                * result_df[
                    "value_score"
                ]
                + 6
                * result_df[
                    "staleness_score"
                ]
            ),

            (
                12
                * result_df[
                    "value_score"
                ]
                + 5
                * result_df[
                    "loyalty_tier_score"
                ]
            ),

            (
                12
                * result_df[
                    "value_score"
                ]
            ),

            (
                8
                * result_df[
                    "freshness_score"
                ]
            ),

            (
                8
                * result_df[
                    "staleness_score"
                ]
            ),

            (
                5
                * result_df[
                    "freshness_score"
                ]
            ),
        ],
        default=0.0,
    )

    # Kanıtların aynı yönde olması önceliği artırır.
    result_df["priority_score"] += (
        result_df[
            "evidence_agreement_count"
        ]
        * 1.50
    )

    result_df["priority_score"] = (
        result_df["priority_score"]
        .clip(
            lower=0,
            upper=100,
        )
        .round(2)
    )

    result_df["priority_level"] = np.select(
        [
            result_df[
                "recommendation_type"
            ]
            == "NO_ACTION_INACTIVE",

            result_df["priority_score"]
            >= 90,

            result_df["priority_score"]
            >= 75,

            result_df["priority_score"]
            >= 55,
        ],
        [
            "EXCLUDED",
            "P1_CRITICAL",
            "P2_HIGH",
            "P3_MEDIUM",
        ],
        default="P4_LOW",
    )

    result_df["is_actionable"] = ~result_df[
        "recommendation_type"
    ].isin(
        [
            "NO_ACTION_INACTIVE",
            "STANDARD_MONITORING",
        ]
    )

    return result_df


# =====================================================
# 12. KANAL VE İNSAN ONAYI
# =====================================================

def add_delivery_guidance(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Admin ve Notification Service için yalnızca kanal önerisi üretir.

    Gerçek kanal uygunluğu backend tarafından email_verified,
    phone_verified ve cihaz token bilgisiyle doğrulanmalıdır.
    """

    result_df = dataframe.copy()

    reactivation_types = {
        "CHURN_RISK",
        "REACTIVATION",
        "FIRST_BOOKING_ACTIVATION",
    }

    high_touch_types = {
        "OPERATIONAL_RISK",
        "VIP_RETENTION",
        "HIGH_VALUE_GROWTH",
    }

    result_df["suggested_channel"] = np.select(
        [
            result_df[
                "recommendation_type"
            ]
            == "NO_ACTION_INACTIVE",

            result_df[
                "recommendation_type"
            ]
            == "STANDARD_MONITORING",

            result_df[
                "recommendation_type"
            ]
            == "OPERATIONAL_RISK",

            result_df[
                "recommendation_type"
            ].isin(reactivation_types)
            & result_df["is_guest"],

            result_df[
                "recommendation_type"
            ].isin(reactivation_types),

            result_df["is_guest"],
        ],
        [
            "NONE",
            "NONE",
            "SMS_OR_WHATSAPP",
            "SMS_OR_WHATSAPP",
            "PUSH_OR_EMAIL",
            "SMS_OR_WHATSAPP",
        ],
        default="PUSH_OR_EMAIL",
    )

    result_df[
        "channel_requires_backend_verification"
    ] = (
        result_df["suggested_channel"]
        != "NONE"
    )

    result_df["requires_human_review"] = (
        result_df[
            "recommendation_type"
        ].isin(
            high_touch_types.union(
                {"CHURN_RISK"}
            )
        )
    )

    # Veri bilimi çıktısı öneri sağlar; otomatik bildirim göndermez.
    result_df["auto_execute"] = False

    result_df["communication_language"] = (
        result_df["preferred_lang"]
    )

    return result_df


# =====================================================
# 13. SON ÇIKTIYI HAZIRLAMA
# =====================================================

def prepare_admin_output(
    dataframe: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Admin paneli için son sütunları seçer ve öneri kuyruğunu sıralar.
    """

    generated_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
    )

    result_df = dataframe.copy()

    result_df[
        "recommendation_generated_at"
    ] = generated_at

    output_columns = [
        "user_id",
        "is_guest",
        "is_active",
        "deleted_at",
        "preferred_lang",
        "communication_language",

        "tier",
        "recency",
        "frequency",
        "monetary",
        "monetary_currency",
        "avg_order_value",
        "resolved_reservation_count",
        "cancel_rate",
        "no_show_rate",
        "smoothed_cancel_rate",
        "smoothed_no_show_rate",
        "lifetime_points",
        "rfm_score",

        "business_segment",
        "business_segment_reason",
        "ml_segment_code",
        "ml_segment_name",
        "model_eligible",
        "model_exclusion_reason",
        "cluster_separation_score",
        "segmentation_model_version",

        "value_score",
        "staleness_score",
        "freshness_score",
        "operational_risk_score",
        "loyalty_tier_score",

        "business_evidence",
        "ml_evidence",
        "metric_evidence",
        "evidence_agreement_count",
        "evidence_summary",

        "recommendation_type",
        "recommended_action_tr",
        "recommended_action_en",
        "recommendation_reason_tr",
        "recommendation_reason_en",

        "recommendation_confidence",
        "recommendation_confidence_level",

        "priority_score",
        "priority_level",
        "is_actionable",

        "suggested_channel",
        "channel_requires_backend_verification",
        "requires_human_review",
        "auto_execute",

        "analysis_snapshot",
        "recommendation_generated_at",
        "recommendation_version",
    ]

    result_df["recommendation_version"] = (
        RECOMMENDATION_VERSION
    )

    missing_columns = [
        column
        for column in output_columns
        if column not in result_df.columns
    ]

    if missing_columns:
        raise ValueError(
            "Admin çıktı sütunları eksik:\n"
            f"{missing_columns}"
        )

    admin_df = result_df[
        output_columns
    ].copy()

    admin_df = admin_df.sort_values(
        by=[
            "is_actionable",
            "priority_score",
            "monetary",
            "frequency",
            "user_id",
        ],
        ascending=[
            False,
            False,
            False,
            False,
            True,
        ],
        kind="mergesort",
    ).reset_index(drop=True)

    admin_df["queue_rank"] = pd.Series(
        pd.NA,
        index=admin_df.index,
        dtype="Int64",
    )

    actionable_mask = admin_df[
        "is_actionable"
    ]

    actionable_count = int(
        actionable_mask.sum()
    )

    admin_df.loc[
        actionable_mask,
        "queue_rank",
    ] = np.arange(
        1,
        actionable_count + 1,
        dtype=np.int64,
    )

    # queue_rank admin panelinde recommendation_type öncesinde gösterilsin.
    queue_rank_column = admin_df.pop(
        "queue_rank"
    )

    insert_position = admin_df.columns.get_loc(
        "recommendation_type"
    )

    admin_df.insert(
        insert_position,
        "queue_rank",
        queue_rank_column,
    )

    top_recommendations_df = (
        admin_df.loc[
            admin_df["is_actionable"]
        ]
        .head(
            TOP_RECOMMENDATION_COUNT
        )
        .copy()
    )

    return (
        admin_df,
        top_recommendations_df,
    )


# =====================================================
# 14. DOĞRULAMA
# =====================================================

def validate_admin_outputs(
    input_df: pd.DataFrame,
    admin_df: pd.DataFrame,
    top_df: pd.DataFrame,
) -> None:
    """
    Admin öneri çıktılarının güvenlik ve tutarlılık
    kurallarına uygunluğunu doğrular.
    """

    if len(input_df) != len(admin_df):
        raise ValueError(
            "Admin önerileri sırasında müşteri sayısı değişti."
        )

    if admin_df["user_id"].duplicated().any():
        raise ValueError(
            "Admin önerilerinde tekrar eden user_id bulundu."
        )

    invalid_recommendation_types = (
        set(
            admin_df[
                "recommendation_type"
            ].unique()
        )
        - VALID_RECOMMENDATION_TYPES
    )

    if invalid_recommendation_types:
        raise ValueError(
            "Geçersiz recommendation_type değerleri bulundu: "
            f"{sorted(invalid_recommendation_types)}"
        )

    if not admin_df[
        "priority_score"
    ].between(
        0,
        100,
    ).all():
        raise ValueError(
            "priority_score 0–100 arasında olmalıdır."
        )

    if not admin_df[
        "recommendation_confidence"
    ].between(
        0,
        1,
    ).all():
        raise ValueError(
            "recommendation_confidence 0–1 arasında olmalıdır."
        )

    if not (
        admin_df["monetary_currency"]
        == MONETARY_CURRENCY
    ).all():
        raise ValueError(
            "Admin önerilerinin para birimi TRY olmalıdır."
        )

    inactive_rows = admin_df[
        admin_df[
            "recommendation_type"
        ]
        == "NO_ACTION_INACTIVE"
    ]

    if inactive_rows[
        "is_actionable"
    ].any():
        raise ValueError(
            "Aktif olmayan kullanıcı actionable olamaz."
        )

    if not (
        inactive_rows[
            "suggested_channel"
        ]
        == "NONE"
    ).all():
        raise ValueError(
            "Aktif olmayan kullanıcıya iletişim kanalı önerildi."
        )

    if admin_df["auto_execute"].any():
        raise ValueError(
            "Data Science önerileri otomatik uygulanmamalıdır."
        )

    if len(top_df) > TOP_RECOMMENDATION_COUNT:
        raise ValueError(
            "Top recommendation dosyası belirlenen sınırı aşıyor."
        )

    if not top_df["is_actionable"].all():
        raise ValueError(
            "Top öneri kuyruğunda actionable olmayan müşteri bulundu."
        )

    if top_df["queue_rank"].isna().any():
        raise ValueError(
            "Top öneri kuyruğunda queue_rank eksik."
        )

    if not top_df[
        "queue_rank"
    ].is_monotonic_increasing:
        raise ValueError(
            "Top öneri queue_rank sırası bozuk."
        )

    # KVKK açısından model çıktısında doğrudan iletişim bilgisi tutulmaz.
    forbidden_personal_columns = {
        "phone_number",
        "guest_phone",
        "email",
        "first_name",
        "last_name",
        "password_hash",
    }

    included_personal_columns = (
        forbidden_personal_columns
        .intersection(admin_df.columns)
    )

    if included_personal_columns:
        raise ValueError(
            "Admin Data Science çıktısında gereksiz kişisel "
            "veri sütunları bulundu: "
            f"{sorted(included_personal_columns)}"
        )

    if admin_df[
        [
            "recommended_action_tr",
            "recommended_action_en",
            "recommendation_reason_tr",
            "recommendation_reason_en",
        ]
    ].isna().any().any():
        raise ValueError(
            "Çok dilli öneri metinlerinde eksik değer bulundu."
        )


# =====================================================
# 15. RAPORLAMA
# =====================================================

def create_reports(
    admin_df: pd.DataFrame,
    top_df: pd.DataFrame,
) -> None:
    """
    Admin önerilerinin dağılım ve kalite raporlarını oluşturur.
    """

    recommendation_distribution_df = (
        admin_df
        .groupby(
            [
                "recommendation_type",
                "is_actionable",
            ],
            observed=True,
        )
        .agg(
            customer_count=(
                "user_id",
                "count",
            ),
            average_priority_score=(
                "priority_score",
                "mean",
            ),
            average_confidence=(
                "recommendation_confidence",
                "mean",
            ),
            average_recency_days=(
                "recency",
                "mean",
            ),
            average_frequency=(
                "frequency",
                "mean",
            ),
            average_monetary_try=(
                "monetary",
                "mean",
            ),
            total_monetary_try=(
                "monetary",
                "sum",
            ),
        )
        .reset_index()
        .sort_values(
            by=[
                "is_actionable",
                "average_priority_score",
            ],
            ascending=[
                False,
                False,
            ],
        )
    )

    numeric_columns = [
        "average_priority_score",
        "average_confidence",
        "average_recency_days",
        "average_frequency",
        "average_monetary_try",
        "total_monetary_try",
    ]

    for column in numeric_columns:
        recommendation_distribution_df[
            column
        ] = (
            recommendation_distribution_df[
                column
            ]
            .round(4)
        )

    recommendation_distribution_df.to_csv(
        RECOMMENDATION_DISTRIBUTION_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    priority_distribution_df = (
        admin_df[
            "priority_level"
        ]
        .value_counts()
        .rename_axis(
            "priority_level"
        )
        .reset_index(
            name="customer_count"
        )
    )

    priority_distribution_df.to_csv(
        PRIORITY_DISTRIBUTION_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    evidence_quality_df = (
        admin_df
        .groupby(
            [
                "recommendation_confidence_level",
                "evidence_agreement_count",
            ],
            observed=True,
        )
        .agg(
            customer_count=(
                "user_id",
                "count",
            ),
            average_confidence=(
                "recommendation_confidence",
                "mean",
            ),
            average_cluster_separation=(
                "cluster_separation_score",
                "mean",
            ),
        )
        .reset_index()
    )

    evidence_quality_df[
        "average_confidence"
    ] = (
        evidence_quality_df[
            "average_confidence"
        ]
        .round(4)
    )

    evidence_quality_df[
        "average_cluster_separation"
    ] = (
        evidence_quality_df[
            "average_cluster_separation"
        ]
        .round(4)
    )

    evidence_quality_df.to_csv(
        EVIDENCE_QUALITY_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    admin_df.head(2_000).to_csv(
        RECOMMENDATION_SAMPLE_FILE,
        index=False,
        encoding="utf-8-sig",
        na_rep="",
    )

    actionable_count = int(
        admin_df["is_actionable"].sum()
    )

    human_review_count = int(
        admin_df[
            "requires_human_review"
        ].sum()
    )

    summary = {
        "input_parquet_file": str(
            CUSTOMER_SEGMENTS_PARQUET_FILE
        ),
        "input_csv_file": str(
            CUSTOMER_SEGMENTS_CSV_FILE
        ),
        "admin_recommendations_csv": str(
            ADMIN_RECOMMENDATIONS_CSV_FILE
        ),
        "admin_recommendations_parquet": str(
            ADMIN_RECOMMENDATIONS_PARQUET_FILE
        ),
        "top_recommendations_file": str(
            TOP_RECOMMENDATIONS_FILE
        ),
        "customer_count": int(
            len(admin_df)
        ),
        "actionable_customer_count": (
            actionable_count
        ),
        "non_actionable_customer_count": int(
            len(admin_df)
            - actionable_count
        ),
        "top_queue_customer_count": int(
            len(top_df)
        ),
        "human_review_required_count": (
            human_review_count
        ),
        "currency": MONETARY_CURRENCY,
        "priority_score_range": [
            0,
            100,
        ],
        "recommendation_confidence_range": [
            0,
            1,
        ],
        "recommendation_types": (
            admin_df[
                "recommendation_type"
            ]
            .value_counts()
            .to_dict()
        ),
        "recommendation_version": (
            RECOMMENDATION_VERSION
        ),
        "recommendation_is_sql_table": False,
        "automatic_campaign_creation": False,
        "automatic_notification_sending": False,
        "automatic_discount_application": False,
        "automatic_loyalty_tier_change": False,
        "human_review_applied_to_high_impact_actions": True,
        "direct_personal_contact_fields_included": False,
        "multilingual_action_texts": [
            "tr",
            "en",
        ],
        "channel_note": (
            "suggested_channel yalnızca öneridir. "
            "Backend, email_verified, phone_verified ve "
            "cihaz token bilgisine göre gerçek kanalı seçmelidir."
        ),
        "admin_integration_note": (
            "Backend bu dosyayı analitik API veya ayrı bir "
            "Data Science output store üzerinden admin paneline sunmalıdır."
        ),
    }

    with open(
        ADMIN_SUMMARY_FILE,
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
# 16. DOSYALARI KAYDETME
# =====================================================

def save_outputs(
    admin_df: pd.DataFrame,
    top_df: pd.DataFrame,
) -> None:
    """
    Admin önerilerini CSV ve Parquet olarak kaydeder.
    """

    admin_df.to_csv(
        ADMIN_RECOMMENDATIONS_CSV_FILE,
        index=False,
        encoding="utf-8",
        na_rep="",
    )

    top_df.to_csv(
        TOP_RECOMMENDATIONS_FILE,
        index=False,
        encoding="utf-8",
        na_rep="",
    )

    try:
        admin_df.to_parquet(
            ADMIN_RECOMMENDATIONS_PARQUET_FILE,
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
# 17. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 70)
    print("10 — ADMIN MÜŞTERİ ÖNERİLERİ")
    print("=" * 70)

    customer_df = read_customer_segments()

    print("\nMüşteri değer ve risk skorları hesaplanıyor...")

    customer_df = add_decision_scores(
        customer_df
    )

    print("Öneri kanıtları oluşturuluyor...")

    customer_df = add_recommendation_flags(
        customer_df
    )

    print("Ana öneri tipleri belirleniyor...")

    customer_df = assign_primary_recommendation(
        customer_df
    )

    print("Öneri güven skorları hesaplanıyor...")

    customer_df = add_evidence_and_confidence(
        customer_df
    )

    print("Çok dilli aksiyon ve gerekçeler oluşturuluyor...")

    customer_df = add_action_texts(
        customer_df
    )

    print("Admin öncelik skorları hesaplanıyor...")

    customer_df = add_priority_scores(
        customer_df
    )

    print("İletişim kanalı ve insan onayı bilgisi ekleniyor...")

    customer_df = add_delivery_guidance(
        customer_df
    )

    (
        admin_recommendations_df,
        top_recommendations_df,
    ) = prepare_admin_output(
        customer_df
    )

    print("Admin önerileri doğrulanıyor...")

    validate_admin_outputs(
        input_df=customer_df,
        admin_df=admin_recommendations_df,
        top_df=top_recommendations_df,
    )

    save_outputs(
        admin_df=admin_recommendations_df,
        top_df=top_recommendations_df,
    )

    create_reports(
        admin_df=admin_recommendations_df,
        top_df=top_recommendations_df,
    )

    print("\n" + "=" * 70)
    print("ADMIN ÖNERİLERİ OLUŞTURULDU")
    print("=" * 70)

    print(
        f"Toplam müşteri    : "
        f"{len(admin_recommendations_df):,}"
    )

    print(
        "Aksiyon önerilen  : "
        f"{admin_recommendations_df['is_actionable'].sum():,}"
    )

    print(
        "İnsan onayı gerekli: "
        f"{admin_recommendations_df['requires_human_review'].sum():,}"
    )

    print(
        f"Top öneri kuyruğu : "
        f"{len(top_recommendations_df):,}"
    )

    print(
        f"\nTam öneri CSV    : "
        f"{ADMIN_RECOMMENDATIONS_CSV_FILE}"
    )

    print(
        f"Tam öneri Parquet: "
        f"{ADMIN_RECOMMENDATIONS_PARQUET_FILE}"
    )

    print(
        f"Top 1000 öneri   : "
        f"{TOP_RECOMMENDATIONS_FILE}"
    )

    print(f"Raporlar         : {REPORT_DIR}")

    print("\nÖneri tipi dağılımı:")

    print(
        admin_recommendations_df[
            "recommendation_type"
        ].value_counts().to_string()
    )

    print("\nKontroller:")
    print("Türkçe segment adı aramak yerine semantik kodlar kullanıldı.")
    print("Business, ML ve metrik kanıtları birlikte değerlendirildi.")
    print("Müşteri bazlı 0–100 öncelik skoru üretildi.")
    print("Öneri güven seviyesi oluşturuldu.")
    print("İlk rezervasyon ve yeniden aktivasyon ayrıldı.")
    print("Aktif olmayan kullanıcılara aksiyon önerilmedi.")
    print("Türkçe ve İngilizce öneri metinleri oluşturuldu.")
    print("Para birimi TRY olarak doğrulandı.")
    print("Doğrudan telefon veya e-posta çıktıya eklenmedi.")
    print("Kampanya, indirim veya bildirim otomatik uygulanmadı.")
    print("Top 1000 aksiyon kuyruğu oluşturuldu.")

    print(
        "\nNot: suggested_channel yalnızca veri bilimi önerisidir. "
        "Notification Service gerçek kanalı kullanıcı doğrulama "
        "durumu ve cihaz bilgisine göre seçmelidir."
    )


if __name__ == "__main__":
    main()