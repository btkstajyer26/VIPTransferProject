import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.cluster import KMeans
from sklearn.metrics import (
    calinski_harabasz_score,
    davies_bouldin_score,
    silhouette_score,
)
from sklearn.preprocessing import StandardScaler


# Windows terminalinde Türkçe karakter desteği
try:
    sys.stdout.reconfigure(encoding="utf-8")
except AttributeError:
    pass


# =====================================================
# 1. MODEL AYARLARI
# =====================================================

RANDOM_SEED = 42
MODEL_VERSION = "kmeans-rfm-v1"

MIN_CLUSTERS = 3
MAX_CLUSTERS = 8

# Küme sayısını seçerken en fazla bu kadar müşteri kullanılır.
CLUSTER_SELECTION_SAMPLE_SIZE = 50_000

# Silhouette metriğinde kullanılacak azami örnek sayısı.
SILHOUETTE_SAMPLE_SIZE = 10_000

# Bir cluster toplam model kitlesinin en az %1'ini içermeli.
MIN_CLUSTER_SHARE = 0.01

# Aykırı değer kırpma sınırları.
LOWER_QUANTILE = 0.01
UPPER_QUANTILE = 0.99

# İptal ve no-show oranlarında küçük örnek etkisini azaltır.
RISK_SMOOTHING_ALPHA = 5.0

KMEANS_N_INIT = 20
KMEANS_MAX_ITER = 300


# Modelde doğrudan kullanılacak temel davranış özellikleri.
RAW_MODEL_FEATURES = [
    "recency",
    "frequency",
    "monetary",
    "avg_order_value",
]

# Dönüştürme sonrası K-Means'e verilen sütunlar.
MODEL_FEATURES = [
    "log1p_recency",
    "log1p_frequency",
    "log1p_monetary",
    "log1p_avg_order_value",
    "smoothed_cancel_rate",
    "smoothed_no_show_rate",
]


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

MODEL_DIR = (
    PROJECT_ROOT
    / "models"
    / "customer_segmentation"
)

REPORT_DIR = (
    PROJECT_ROOT
    / "outputs"
    / "reports"
    / "09_kmeans_customer_segmentation"
)

PROCESSED_DATA_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

MODEL_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

REPORT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


RFM_PARQUET_FILE = (
    PROCESSED_DATA_DIR
    / "rfm_customer_segments.parquet"
)

RFM_CSV_FILE = (
    PROCESSED_DATA_DIR
    / "rfm_customer_segments.csv"
)

CUSTOMER_SEGMENTS_CSV_FILE = (
    PROCESSED_DATA_DIR
    / "customer_kmeans_segments.csv"
)

CUSTOMER_SEGMENTS_PARQUET_FILE = (
    PROCESSED_DATA_DIR
    / "customer_kmeans_segments.parquet"
)

CLUSTER_SUMMARY_FILE = (
    PROCESSED_DATA_DIR
    / "kmeans_cluster_summary.csv"
)

MODEL_BUNDLE_FILE = (
    MODEL_DIR
    / "kmeans_customer_segmentation_bundle.joblib"
)

PREPROCESSING_METADATA_FILE = (
    MODEL_DIR
    / "preprocessing_metadata.json"
)

CANDIDATE_METRICS_FILE = (
    REPORT_DIR
    / "candidate_cluster_metrics.csv"
)

FINAL_MODEL_METRICS_FILE = (
    REPORT_DIR
    / "final_model_metrics.json"
)

CLUSTER_CENTERS_FILE = (
    REPORT_DIR
    / "cluster_centers.csv"
)

SEGMENT_DISTRIBUTION_FILE = (
    REPORT_DIR
    / "ml_segment_distribution.csv"
)

BUSINESS_ML_CROSSTAB_FILE = (
    REPORT_DIR
    / "business_ml_segment_crosstab.csv"
)

FEATURE_CORRELATION_FILE = (
    REPORT_DIR
    / "model_feature_correlation.csv"
)

SEGMENT_SAMPLE_FILE = (
    REPORT_DIR
    / "customer_segmentation_sample.csv"
)


# =====================================================
# 3. GEREKLİ RFM SÜTUNLARI
# =====================================================

REQUIRED_RFM_COLUMNS = [
    "user_id",
    "is_guest",
    "is_active",
    "deleted_at",
    "recency",
    "frequency",
    "monetary",
    "monetary_currency",
    "avg_order_value",
    "resolved_reservation_count",
    "CANCELLED",
    "NO_SHOW",
    "cancel_rate",
    "no_show_rate",
    "lifetime_points",
    "tier",
    "business_segment",
    "analysis_snapshot",
]


# =====================================================
# 4. YARDIMCI FONKSİYONLAR
# =====================================================

def validate_columns(
    dataframe: pd.DataFrame,
    required_columns: list[str],
    dataframe_name: str,
) -> None:
    """
    Gerekli sütunların mevcut olmasını doğrular.
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
    CSV'den gelen boolean değerleri güvenli biçimde dönüştürür.
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


def min_max_normalize(series: pd.Series) -> pd.Series:
    """
    Bir seriyi 0–1 aralığına dönüştürür.
    """

    numeric_series = pd.to_numeric(
        series,
        errors="coerce",
    )

    minimum_value = numeric_series.min()
    maximum_value = numeric_series.max()

    if pd.isna(minimum_value) or pd.isna(maximum_value):
        raise ValueError(
            "Normalize edilecek seride geçersiz değer bulundu."
        )

    if maximum_value == minimum_value:
        return pd.Series(
            0.5,
            index=series.index,
            dtype=float,
        )

    return (
        numeric_series - minimum_value
    ) / (
        maximum_value - minimum_value
    )


def json_safe(value):
    """
    NumPy ve Pandas türlerini JSON uyumlu hale getirir.
    """

    if isinstance(value, dict):
        return {
            str(key): json_safe(item)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple)):
        return [
            json_safe(item)
            for item in value
        ]

    if isinstance(value, np.ndarray):
        return [
            json_safe(item)
            for item in value.tolist()
        ]

    if isinstance(value, (np.integer,)):
        return int(value)

    if isinstance(value, (np.floating,)):
        return float(value)

    if isinstance(value, (np.bool_,)):
        return bool(value)

    if isinstance(value, (pd.Timestamp, datetime)):
        return str(value)

    return value


# =====================================================
# 5. RFM VERİSİNİ OKUMA
# =====================================================

def read_rfm_data() -> pd.DataFrame:
    """
    08_rfm_analysis.py çıktısını okur.
    """

    if RFM_PARQUET_FILE.exists():
        input_file = RFM_PARQUET_FILE
        dataframe = pd.read_parquet(input_file)

    elif RFM_CSV_FILE.exists():
        input_file = RFM_CSV_FILE
        dataframe = pd.read_csv(
            input_file,
            low_memory=False,
        )

    else:
        raise FileNotFoundError(
            "RFM veri seti bulunamadı.\n"
            "Önce 08_rfm_analysis.py dosyasını çalıştırmalısın.\n\n"
            f"Beklenen dosya:\n{RFM_PARQUET_FILE}"
        )

    validate_columns(
        dataframe,
        REQUIRED_RFM_COLUMNS,
        input_file.name,
    )

    if "current_points" in dataframe.columns:
        raise ValueError(
            "Eski current_points sütunu bulundu. "
            "08_rfm_analysis.py dosyasının güncel sürümünü çalıştır."
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
        "CANCELLED",
        "NO_SHOW",
        "cancel_rate",
        "no_show_rate",
        "lifetime_points",
    ]

    for column in numeric_columns:
        dataframe[column] = pd.to_numeric(
            dataframe[column],
            errors="coerce",
        )

    if dataframe["user_id"].duplicated().any():
        raise ValueError(
            "RFM verisinde tekrar eden user_id bulundu."
        )

    if dataframe["analysis_snapshot"].isna().any():
        raise ValueError(
            "analysis_snapshot alanında geçersiz tarih bulundu."
        )

    if dataframe[numeric_columns].isna().any().any():
        missing_counts = (
            dataframe[numeric_columns]
            .isna()
            .sum()
        )

        raise ValueError(
            "Model için gerekli sayısal alanlarda eksik değer var:\n"
            f"{missing_counts[missing_counts > 0]}"
        )

    non_negative_columns = [
        "recency",
        "frequency",
        "monetary",
        "avg_order_value",
        "resolved_reservation_count",
        "CANCELLED",
        "NO_SHOW",
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

    if not (
        dataframe["monetary_currency"]
        .astype("string")
        .eq("TRY")
    ).all():
        raise ValueError(
            "K-Means monetary değerleri yalnızca TRY olmalıdır."
        )

    dataframe = (
        dataframe
        .sort_values("user_id")
        .reset_index(drop=True)
    )

    print(f"RFM girdisi     : {input_file}")
    print(f"Müşteri sayısı  : {len(dataframe):,}")

    return dataframe


# =====================================================
# 6. MODEL UYGUNLUK DURUMU
# =====================================================

def add_model_eligibility(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Hangi müşterilerin K-Means'e gireceğini belirler.
    """

    result_df = dataframe.copy()

    inactive_mask = (
        ~result_df["is_active"]
        | result_df["deleted_at"].notna()
    )

    no_completed_history_mask = (
        ~inactive_mask
        & (result_df["frequency"] <= 0)
    )

    eligible_mask = (
        ~inactive_mask
        & (result_df["frequency"] > 0)
        & (
            result_df[
                "resolved_reservation_count"
            ] > 0
        )
    )

    result_df["model_eligible"] = eligible_mask

    result_df["model_exclusion_reason"] = pd.Series(
        pd.NA,
        index=result_df.index,
        dtype="string",
    )

    result_df.loc[
        inactive_mask,
        "model_exclusion_reason",
    ] = "INACTIVE_OR_DELETED_ACCOUNT"

    result_df.loc[
        no_completed_history_mask,
        "model_exclusion_reason",
    ] = "NO_COMPLETED_RESERVATION"

    unexplained_exclusion = (
        ~result_df["model_eligible"]
        & result_df[
            "model_exclusion_reason"
        ].isna()
    )

    if unexplained_exclusion.any():
        result_df.loc[
            unexplained_exclusion,
            "model_exclusion_reason",
        ] = "INSUFFICIENT_BEHAVIOR_HISTORY"

    eligible_count = int(
        result_df["model_eligible"].sum()
    )

    if eligible_count < 100:
        raise ValueError(
            "K-Means için yeterli uygun müşteri bulunamadı. "
            f"Uygun müşteri sayısı: {eligible_count}"
        )

    print(
        f"Modele uygun    : {eligible_count:,}"
    )

    print(
        "Model dışı      : "
        f"{len(result_df) - eligible_count:,}"
    )

    return result_df


# =====================================================
# 7. RİSK ORANLARINI YUMUŞATMA
# =====================================================

def calculate_smoothed_risk_rates(
    dataframe: pd.DataFrame,
) -> tuple[pd.DataFrame, dict]:
    """
    Az sayıda rezervasyona sahip müşterilerde risk oranının
    aşırılaşmasını önlemek için genel oranla smoothing uygular.
    """

    result_df = dataframe.copy()

    total_resolved = float(
        result_df[
            "resolved_reservation_count"
        ].sum()
    )

    if total_resolved <= 0:
        raise ValueError(
            "Sonuçlanmış rezervasyon bulunamadı."
        )

    global_cancel_prior = float(
        result_df["CANCELLED"].sum()
        / total_resolved
    )

    global_no_show_prior = float(
        result_df["NO_SHOW"].sum()
        / total_resolved
    )

    denominator = (
        result_df[
            "resolved_reservation_count"
        ]
        + RISK_SMOOTHING_ALPHA
    )

    result_df["smoothed_cancel_rate"] = (
        (
            result_df["CANCELLED"]
            + (
                RISK_SMOOTHING_ALPHA
                * global_cancel_prior
            )
        )
        / denominator
    ).clip(
        lower=0,
        upper=1,
    )

    result_df["smoothed_no_show_rate"] = (
        (
            result_df["NO_SHOW"]
            + (
                RISK_SMOOTHING_ALPHA
                * global_no_show_prior
            )
        )
        / denominator
    ).clip(
        lower=0,
        upper=1,
    )

    priors = {
        "global_cancel_prior": global_cancel_prior,
        "global_no_show_prior": global_no_show_prior,
        "smoothing_alpha": RISK_SMOOTHING_ALPHA,
    }

    return result_df, priors


# =====================================================
# 8. MODEL VERİSİNİ HAZIRLAMA
# =====================================================

def prepare_model_matrix(
    dataframe: pd.DataFrame,
) -> tuple[
    pd.DataFrame,
    np.ndarray,
    StandardScaler,
    dict,
]:
    """
    Kırpma, log dönüşümü ve ölçekleme uygular.
    """

    eligible_df = dataframe.loc[
        dataframe["model_eligible"]
    ].copy()

    clipping_bounds = {}

    for column in RAW_MODEL_FEATURES:
        lower_bound = float(
            eligible_df[column].quantile(
                LOWER_QUANTILE
            )
        )

        upper_bound = float(
            eligible_df[column].quantile(
                UPPER_QUANTILE
            )
        )

        if upper_bound < lower_bound:
            raise ValueError(
                f"{column} için geçersiz quantile sınırı oluştu."
            )

        clipping_bounds[column] = {
            "lower": lower_bound,
            "upper": upper_bound,
        }

        eligible_df[
            f"clipped_{column}"
        ] = eligible_df[column].clip(
            lower=lower_bound,
            upper=upper_bound,
        )

        eligible_df[
            f"log1p_{column}"
        ] = np.log1p(
            eligible_df[
                f"clipped_{column}"
            ]
        )

    model_matrix_df = eligible_df[
        MODEL_FEATURES
    ].astype(float)

    model_values = model_matrix_df.to_numpy(
        dtype=np.float64
    )

    if not np.isfinite(model_values).all():
        raise ValueError(
            "Model girdisinde NaN veya sonsuz değer bulundu."
        )

    scaler = StandardScaler()

    scaled_features = scaler.fit_transform(
        model_values
    )

    metadata = {
        "model_version": MODEL_VERSION,
        "raw_model_features": (
            RAW_MODEL_FEATURES
        ),
        "model_features": MODEL_FEATURES,
        "clipping_quantiles": {
            "lower": LOWER_QUANTILE,
            "upper": UPPER_QUANTILE,
        },
        "clipping_bounds": clipping_bounds,
    }

    return (
        eligible_df,
        scaled_features,
        scaler,
        metadata,
    )


# =====================================================
# 9. KÜME SAYISINI SEÇME
# =====================================================

def select_cluster_count(
    scaled_features: np.ndarray,
) -> tuple[int, pd.DataFrame]:
    """
    3–8 arasındaki K değerlerini örnek veri üzerinde karşılaştırır.
    """

    customer_count = len(
        scaled_features
    )

    rng = np.random.default_rng(
        RANDOM_SEED
    )

    selection_size = min(
        CLUSTER_SELECTION_SAMPLE_SIZE,
        customer_count,
    )

    if selection_size < customer_count:
        selection_indexes = rng.choice(
            customer_count,
            size=selection_size,
            replace=False,
        )

        selection_features = (
            scaled_features[
                selection_indexes
            ]
        )
    else:
        selection_features = (
            scaled_features
        )

    maximum_k = min(
        MAX_CLUSTERS,
        len(selection_features) - 1,
    )

    if maximum_k < MIN_CLUSTERS:
        raise ValueError(
            "Küme sayısı seçimi için yeterli müşteri yok."
        )

    candidate_rows = []

    for cluster_count in range(
        MIN_CLUSTERS,
        maximum_k + 1,
    ):
        candidate_model = KMeans(
            n_clusters=cluster_count,
            random_state=RANDOM_SEED,
            n_init=KMEANS_N_INIT,
            max_iter=KMEANS_MAX_ITER,
            algorithm="lloyd",
        )

        candidate_labels = (
            candidate_model.fit_predict(
                selection_features
            )
        )

        unique_labels = np.unique(
            candidate_labels
        )

        if len(unique_labels) != cluster_count:
            continue

        cluster_counts = np.bincount(
            candidate_labels,
            minlength=cluster_count,
        )

        cluster_shares = (
            cluster_counts
            / len(candidate_labels)
        )

        minimum_cluster_share = float(
            cluster_shares.min()
        )

        silhouette_sample_size = min(
            SILHOUETTE_SAMPLE_SIZE,
            len(selection_features),
        )

        if (
            silhouette_sample_size
            < len(selection_features)
        ):
            silhouette_value = float(
                silhouette_score(
                    selection_features,
                    candidate_labels,
                    sample_size=(
                        silhouette_sample_size
                    ),
                    random_state=RANDOM_SEED,
                )
            )
        else:
            silhouette_value = float(
                silhouette_score(
                    selection_features,
                    candidate_labels,
                )
            )

        davies_bouldin_value = float(
            davies_bouldin_score(
                selection_features,
                candidate_labels,
            )
        )

        calinski_harabasz_value = float(
            calinski_harabasz_score(
                selection_features,
                candidate_labels,
            )
        )

        candidate_rows.append(
            {
                "cluster_count": cluster_count,
                "inertia": float(
                    candidate_model.inertia_
                ),
                "silhouette_score": (
                    silhouette_value
                ),
                "davies_bouldin_score": (
                    davies_bouldin_value
                ),
                "calinski_harabasz_score": (
                    calinski_harabasz_value
                ),
                "minimum_cluster_share": (
                    minimum_cluster_share
                ),
                "cluster_size_rule_passed": bool(
                    minimum_cluster_share
                    >= MIN_CLUSTER_SHARE
                ),
                "selection_sample_size": int(
                    len(selection_features)
                ),
            }
        )

        print(
            f"K={cluster_count}: "
            f"silhouette={silhouette_value:.4f}, "
            f"davies_bouldin={davies_bouldin_value:.4f}, "
            f"min_cluster=%{minimum_cluster_share * 100:.2f}"
        )

    candidate_metrics_df = pd.DataFrame(
        candidate_rows
    )

    if candidate_metrics_df.empty:
        raise ValueError(
            "Geçerli bir K-Means adayı oluşturulamadı."
        )

    acceptable_candidates = (
        candidate_metrics_df.loc[
            candidate_metrics_df[
                "cluster_size_rule_passed"
            ]
        ].copy()
    )

    if acceptable_candidates.empty:
        acceptable_candidates = (
            candidate_metrics_df.copy()
        )

    selected_row = (
        acceptable_candidates
        .sort_values(
            by=[
                "silhouette_score",
                "davies_bouldin_score",
                "cluster_count",
            ],
            ascending=[
                False,
                True,
                True,
            ],
        )
        .iloc[0]
    )

    selected_cluster_count = int(
        selected_row["cluster_count"]
    )

    candidate_metrics_df[
        "selected"
    ] = (
        candidate_metrics_df[
            "cluster_count"
        ]
        == selected_cluster_count
    )

    return (
        selected_cluster_count,
        candidate_metrics_df,
    )


# =====================================================
# 10. FİNAL K-MEANS MODELİ
# =====================================================

def train_final_model(
    scaled_features: np.ndarray,
    cluster_count: int,
) -> tuple[KMeans, np.ndarray]:
    """
    Seçilen K değeriyle bütün uygun müşteriler üzerinde modeli eğitir.
    """

    model = KMeans(
        n_clusters=cluster_count,
        random_state=RANDOM_SEED,
        n_init=KMEANS_N_INIT,
        max_iter=KMEANS_MAX_ITER,
        algorithm="lloyd",
    )

    labels = model.fit_predict(
        scaled_features
    )

    if len(np.unique(labels)) != cluster_count:
        raise ValueError(
            "Final model beklenen sayıda cluster oluşturamadı."
        )

    return model, labels


# =====================================================
# 11. MODEL METRİKLERİ İÇİN ÖRNEK
# =====================================================

def create_metric_sample_indexes(
    labels: np.ndarray,
) -> np.ndarray:
    """
    Her cluster'ın temsil edildiği deterministik bir metrik örneği oluşturur.
    """

    rng = np.random.default_rng(
        RANDOM_SEED
    )

    total_count = len(labels)
    cluster_ids = np.unique(labels)

    if total_count <= SILHOUETTE_SAMPLE_SIZE:
        return np.arange(
            total_count,
            dtype=np.int64,
        )

    sample_parts = []

    target_per_cluster = max(
        2,
        SILHOUETTE_SAMPLE_SIZE
        // len(cluster_ids),
    )

    for cluster_id in cluster_ids:
        cluster_indexes = np.flatnonzero(
            labels == cluster_id
        )

        sample_count = min(
            target_per_cluster,
            len(cluster_indexes),
        )

        selected = rng.choice(
            cluster_indexes,
            size=sample_count,
            replace=False,
        )

        sample_parts.append(selected)

    sampled_indexes = np.unique(
        np.concatenate(sample_parts)
    )

    remaining_capacity = (
        SILHOUETTE_SAMPLE_SIZE
        - len(sampled_indexes)
    )

    if remaining_capacity > 0:
        all_indexes = np.arange(
            total_count
        )

        remaining_indexes = np.setdiff1d(
            all_indexes,
            sampled_indexes,
            assume_unique=False,
        )

        additional_count = min(
            remaining_capacity,
            len(remaining_indexes),
        )

        if additional_count > 0:
            additional_indexes = rng.choice(
                remaining_indexes,
                size=additional_count,
                replace=False,
            )

            sampled_indexes = np.concatenate(
                [
                    sampled_indexes,
                    additional_indexes,
                ]
            )

    return np.sort(
        sampled_indexes.astype(np.int64)
    )


def calculate_final_model_metrics(
    scaled_features: np.ndarray,
    labels: np.ndarray,
    model: KMeans,
) -> dict:
    """
    Final modelin kalite metriklerini hesaplar.
    """

    sample_indexes = (
        create_metric_sample_indexes(
            labels
        )
    )

    sample_features = scaled_features[
        sample_indexes
    ]

    sample_labels = labels[
        sample_indexes
    ]

    cluster_counts = np.bincount(
        labels,
        minlength=model.n_clusters,
    )

    cluster_shares = (
        cluster_counts / len(labels)
    )

    metrics = {
        "model_version": MODEL_VERSION,
        "selected_cluster_count": int(
            model.n_clusters
        ),
        "model_eligible_customer_count": int(
            len(labels)
        ),
        "metric_sample_size": int(
            len(sample_indexes)
        ),
        "inertia": float(
            model.inertia_
        ),
        "silhouette_score": float(
            silhouette_score(
                sample_features,
                sample_labels,
            )
        ),
        "davies_bouldin_score": float(
            davies_bouldin_score(
                sample_features,
                sample_labels,
            )
        ),
        "calinski_harabasz_score": float(
            calinski_harabasz_score(
                sample_features,
                sample_labels,
            )
        ),
        "minimum_cluster_share": float(
            cluster_shares.min()
        ),
        "maximum_cluster_share": float(
            cluster_shares.max()
        ),
        "cluster_counts": {
            str(cluster_id): int(
                cluster_counts[cluster_id]
            )
            for cluster_id in range(
                model.n_clusters
            )
        },
    }

    return metrics


# =====================================================
# 12. CLUSTER ÖZETİ
# =====================================================

def create_cluster_summary(
    eligible_df: pd.DataFrame,
    labels: np.ndarray,
) -> pd.DataFrame:
    """
    K-Means kümelerinin davranışsal profillerini oluşturur.
    """

    profile_df = eligible_df.copy()

    profile_df["kmeans_cluster"] = (
        labels.astype(int)
    )

    cluster_summary = (
        profile_df
        .groupby(
            "kmeans_cluster",
            observed=True,
        )
        .agg(
            customer_count=(
                "user_id",
                "count",
            ),
            guest_rate=(
                "is_guest",
                "mean",
            ),
            avg_recency=(
                "recency",
                "mean",
            ),
            median_recency=(
                "recency",
                "median",
            ),
            avg_frequency=(
                "frequency",
                "mean",
            ),
            median_frequency=(
                "frequency",
                "median",
            ),
            avg_monetary_try=(
                "monetary",
                "mean",
            ),
            median_monetary_try=(
                "monetary",
                "median",
            ),
            avg_order_value_try=(
                "avg_order_value",
                "mean",
            ),
            avg_cancel_rate=(
                "cancel_rate",
                "mean",
            ),
            avg_no_show_rate=(
                "no_show_rate",
                "mean",
            ),
            avg_smoothed_cancel_rate=(
                "smoothed_cancel_rate",
                "mean",
            ),
            avg_smoothed_no_show_rate=(
                "smoothed_no_show_rate",
                "mean",
            ),
            avg_lifetime_points=(
                "lifetime_points",
                "mean",
            ),
            avg_rfm_score=(
                "rfm_score",
                "mean",
            ),
        )
        .reset_index()
    )

    cluster_summary[
        "cluster_share"
    ] = (
        cluster_summary[
            "customer_count"
        ]
        / len(profile_df)
    )

    dominant_business_segment = (
        profile_df
        .groupby(
            "kmeans_cluster",
            observed=True,
        )["business_segment"]
        .agg(
            lambda values: (
                values.mode().iloc[0]
                if not values.mode().empty
                else "Bilinmiyor"
            )
        )
        .rename(
            "dominant_business_segment"
        )
        .reset_index()
    )

    dominant_tier = (
        profile_df
        .groupby(
            "kmeans_cluster",
            observed=True,
        )["tier"]
        .agg(
            lambda values: (
                values.mode().iloc[0]
                if not values.mode().empty
                else "Bilinmiyor"
            )
        )
        .rename(
            "dominant_loyalty_tier"
        )
        .reset_index()
    )

    cluster_summary = cluster_summary.merge(
        dominant_business_segment,
        on="kmeans_cluster",
        how="left",
        validate="one_to_one",
    )

    cluster_summary = cluster_summary.merge(
        dominant_tier,
        on="kmeans_cluster",
        how="left",
        validate="one_to_one",
    )

    # -------------------------------------------------
    # Cluster karşılaştırma skorları
    # -------------------------------------------------

    cluster_summary["recency_good_score"] = (
        1
        - min_max_normalize(
            cluster_summary["avg_recency"]
        )
    )

    cluster_summary["frequency_score"] = (
        min_max_normalize(
            cluster_summary["avg_frequency"]
        )
    )

    cluster_summary["monetary_score"] = (
        min_max_normalize(
            cluster_summary[
                "avg_monetary_try"
            ]
        )
    )

    cluster_summary["order_value_score"] = (
        min_max_normalize(
            cluster_summary[
                "avg_order_value_try"
            ]
        )
    )

    cluster_summary["risk_severity"] = (
        cluster_summary[
            "avg_smoothed_cancel_rate"
        ]
        + (
            2
            * cluster_summary[
                "avg_smoothed_no_show_rate"
            ]
        )
    )

    cluster_summary["risk_score"] = (
        min_max_normalize(
            cluster_summary[
                "risk_severity"
            ]
        )
    )

    cluster_summary[
        "historical_value_score"
    ] = (
        0.45
        * cluster_summary[
            "frequency_score"
        ]
        + 0.45
        * cluster_summary[
            "monetary_score"
        ]
        + 0.10
        * cluster_summary[
            "order_value_score"
        ]
    )

    cluster_summary[
        "current_value_score"
    ] = (
        0.30
        * cluster_summary[
            "recency_good_score"
        ]
        + 0.35
        * cluster_summary[
            "frequency_score"
        ]
        + 0.35
        * cluster_summary[
            "monetary_score"
        ]
    )

    cluster_summary["churn_score"] = (
        cluster_summary[
            "historical_value_score"
        ]
        * (
            1
            - cluster_summary[
                "recency_good_score"
            ]
        )
    )

    cluster_summary["new_customer_score"] = (
        cluster_summary[
            "recency_good_score"
        ]
        * (
            1
            - cluster_summary[
                "frequency_score"
            ]
        )
        * (
            1
            - cluster_summary[
                "monetary_score"
            ]
        )
    )

    return cluster_summary


# =====================================================
# 13. CLUSTER İSİMLENDİRME
# =====================================================

def assign_cluster_labels(
    cluster_summary: pd.DataFrame,
) -> tuple[pd.DataFrame, dict]:
    """
    Cluster numaralarını davranış profillerine göre isimlendirir.

    K-Means cluster ID'leri anlamsız ve yeniden eğitimde değişebilir.
    ml_segment_code semantik ve backend/admin tarafında kullanılabilecek
    daha kararlı değerdir.
    """

    summary_df = cluster_summary.copy()

    available_clusters = set(
        summary_df[
            "kmeans_cluster"
        ].astype(int)
    )

    label_map = {}

    def assign_label(
        cluster_id: int,
        code: str,
        name: str,
        description: str,
    ) -> None:
        label_map[int(cluster_id)] = {
            "ml_segment_code": code,
            "ml_segment_name": name,
            "ml_segment_description": description,
        }

        available_clusters.discard(
            int(cluster_id)
        )

    # -------------------------------------------------
    # 1. En değerli ve güncel müşteri grubu
    # -------------------------------------------------

    if available_clusters:
        available_summary = summary_df[
            summary_df[
                "kmeans_cluster"
            ].isin(available_clusters)
        ]

        vip_cluster = int(
            available_summary
            .sort_values(
                by=[
                    "current_value_score",
                    "avg_rfm_score",
                ],
                ascending=[
                    False,
                    False,
                ],
            )
            .iloc[0][
                "kmeans_cluster"
            ]
        )

        assign_label(
            cluster_id=vip_cluster,
            code="LOYAL_VIP",
            name="ML Sadık VIP",
            description=(
                "Yakın zamanda rezervasyon yapan, sıklığı ve "
                "harcaması diğer kümelere göre yüksek müşteri grubu. "
                "Bu etiket SQL loyalty tier değeri değildir."
            ),
        )

    # -------------------------------------------------
    # 2. Geçmiş değeri yüksek ama recency kötü grup
    # -------------------------------------------------

    if available_clusters:
        available_summary = summary_df[
            summary_df[
                "kmeans_cluster"
            ].isin(available_clusters)
        ]

        churn_candidate = (
            available_summary
            .sort_values(
                by="churn_score",
                ascending=False,
            )
            .iloc[0]
        )

        if float(
            churn_candidate[
                "churn_score"
            ]
        ) >= 0.20:
            assign_label(
                cluster_id=int(
                    churn_candidate[
                        "kmeans_cluster"
                    ]
                ),
                code="CHURN_RISK",
                name=(
                    "ML Kaybedilmek Üzere Olan Müşteri"
                ),
                description=(
                    "Geçmiş rezervasyon değeri görece yüksek, "
                    "ancak son tamamlanmış rezervasyonu diğer "
                    "kümelere göre daha eski müşteri grubu."
                ),
            )

    # -------------------------------------------------
    # 3. İptal/no-show riski yüksek grup
    # -------------------------------------------------

    if available_clusters:
        available_summary = summary_df[
            summary_df[
                "kmeans_cluster"
            ].isin(available_clusters)
        ]

        risk_candidate = (
            available_summary
            .sort_values(
                by="risk_severity",
                ascending=False,
            )
            .iloc[0]
        )

        overall_risk_median = float(
            summary_df[
                "risk_severity"
            ].median()
        )

        risk_candidate_value = float(
            risk_candidate[
                "risk_severity"
            ]
        )

        if (
            risk_candidate_value
            > (
                overall_risk_median
                * 1.15
                + 0.01
            )
        ):
            assign_label(
                cluster_id=int(
                    risk_candidate[
                        "kmeans_cluster"
                    ]
                ),
                code="OPERATIONAL_RISK",
                name="ML Riskli Müşteri",
                description=(
                    "Yumuşatılmış iptal veya no-show oranı "
                    "diğer kümelerden daha yüksek müşteri grubu."
                ),
            )

    # -------------------------------------------------
    # 4. Yakın zamanda gelen, düşük geçmişli grup
    # -------------------------------------------------

    if available_clusters:
        available_summary = summary_df[
            summary_df[
                "kmeans_cluster"
            ].isin(available_clusters)
        ]

        new_candidate = (
            available_summary
            .sort_values(
                by="new_customer_score",
                ascending=False,
            )
            .iloc[0]
        )

        if float(
            new_candidate[
                "new_customer_score"
            ]
        ) >= 0.15:
            assign_label(
                cluster_id=int(
                    new_candidate[
                        "kmeans_cluster"
                    ]
                ),
                code="NEW_POTENTIAL",
                name="ML Yeni / Potansiyel Müşteri",
                description=(
                    "Son rezervasyonu yakın, fakat rezervasyon "
                    "sıklığı ve toplam geçmişi henüz sınırlı grup."
                ),
            )

    # -------------------------------------------------
    # 5. Kalan gruplar
    # -------------------------------------------------

    if available_clusters:
        remaining_summary = (
            summary_df[
                summary_df[
                    "kmeans_cluster"
                ].isin(available_clusters)
            ]
            .sort_values(
                by="current_value_score",
                ascending=False,
            )
        )

        for position, row in enumerate(
            remaining_summary.itertuples(
                index=False
            ),
            start=1,
        ):
            cluster_id = int(
                row.kmeans_cluster
            )

            if position == 1:
                assign_label(
                    cluster_id=cluster_id,
                    code="HIGH_VALUE",
                    name="ML Yüksek Değerli Müşteri",
                    description=(
                        "Harcama veya rezervasyon sıklığı "
                        "ortalamanın üzerinde olan müşteri grubu."
                    ),
                )

            else:
                assign_label(
                    cluster_id=cluster_id,
                    code=(
                        f"STANDARD_CLUSTER_{cluster_id}"
                    ),
                    name="ML Standart Müşteri",
                    description=(
                        "Belirgin bir churn, operasyonel risk, "
                        "yeni müşteri veya yüksek değer profili "
                        "göstermeyen davranış kümesi."
                    ),
                )

    summary_df["ml_segment_code"] = (
        summary_df[
            "kmeans_cluster"
        ]
        .map(
            lambda cluster_id: (
                label_map[int(cluster_id)][
                    "ml_segment_code"
                ]
            )
        )
    )

    summary_df["ml_segment_name"] = (
        summary_df[
            "kmeans_cluster"
        ]
        .map(
            lambda cluster_id: (
                label_map[int(cluster_id)][
                    "ml_segment_name"
                ]
            )
        )
    )

    summary_df[
        "ml_segment_description"
    ] = (
        summary_df[
            "kmeans_cluster"
        ]
        .map(
            lambda cluster_id: (
                label_map[int(cluster_id)][
                    "ml_segment_description"
                ]
            )
        )
    )

    return summary_df, label_map


# =====================================================
# 14. MÜŞTERİLERE SEGMENT EKLEME
# =====================================================

def add_segments_to_customers(
    full_df: pd.DataFrame,
    eligible_df: pd.DataFrame,
    labels: np.ndarray,
    model: KMeans,
    scaled_features: np.ndarray,
    label_map: dict,
    created_at: str,
) -> pd.DataFrame:
    """
    Model cluster sonuçlarını bütün müşteri tablosuna ekler.
    """

    output_df = full_df.copy()

    output_df["kmeans_cluster"] = pd.Series(
        pd.NA,
        index=output_df.index,
        dtype="Int64",
    )

    output_df["ml_segment_code"] = pd.Series(
        pd.NA,
        index=output_df.index,
        dtype="string",
    )

    output_df["ml_segment_name"] = pd.Series(
        pd.NA,
        index=output_df.index,
        dtype="string",
    )

    output_df[
        "ml_segment_description"
    ] = pd.Series(
        pd.NA,
        index=output_df.index,
        dtype="string",
    )

    output_df["cluster_distance"] = np.nan
    output_df[
        "cluster_separation_score"
    ] = np.nan

    eligible_indexes = eligible_df.index

    distances = model.transform(
        scaled_features
    )

    nearest_distance = distances[
        np.arange(len(labels)),
        labels,
    ]

    if model.n_clusters > 1:
        two_smallest_distances = np.partition(
            distances,
            kth=1,
            axis=1,
        )[:, :2]

        first_distance = (
            two_smallest_distances[:, 0]
        )

        second_distance = (
            two_smallest_distances[:, 1]
        )

        separation_score = np.divide(
            (
                second_distance
                - first_distance
            ),
            (
                second_distance
                + 1e-12
            ),
            out=np.zeros_like(
                second_distance
            ),
            where=(
                second_distance > 0
            ),
        )

        separation_score = np.clip(
            separation_score,
            0,
            1,
        )

    else:
        separation_score = np.ones(
            len(labels),
            dtype=float,
        )

    output_df.loc[
        eligible_indexes,
        "kmeans_cluster",
    ] = labels

    output_df.loc[
        eligible_indexes,
        "cluster_distance",
    ] = nearest_distance

    output_df.loc[
        eligible_indexes,
        "cluster_separation_score",
    ] = separation_score

    eligible_codes = [
        label_map[int(cluster_id)][
            "ml_segment_code"
        ]
        for cluster_id in labels
    ]

    eligible_names = [
        label_map[int(cluster_id)][
            "ml_segment_name"
        ]
        for cluster_id in labels
    ]

    eligible_descriptions = [
        label_map[int(cluster_id)][
            "ml_segment_description"
        ]
        for cluster_id in labels
    ]

    output_df.loc[
        eligible_indexes,
        "ml_segment_code",
    ] = eligible_codes

    output_df.loc[
        eligible_indexes,
        "ml_segment_name",
    ] = eligible_names

    output_df.loc[
        eligible_indexes,
        "ml_segment_description",
    ] = eligible_descriptions

    # -------------------------------------------------
    # Model dışındaki kullanıcılar
    # -------------------------------------------------

    inactive_mask = (
        ~output_df["is_active"]
        | output_df["deleted_at"].notna()
    )

    passive_mask = (
        ~inactive_mask
        & (output_df["frequency"] <= 0)
    )

    other_excluded_mask = (
        ~output_df["model_eligible"]
        & ~inactive_mask
        & ~passive_mask
    )

    output_df.loc[
        inactive_mask,
        "kmeans_cluster",
    ] = -2

    output_df.loc[
        inactive_mask,
        "ml_segment_code",
    ] = "INACTIVE_ACCOUNT"

    output_df.loc[
        inactive_mask,
        "ml_segment_name",
    ] = "ML Aktif Olmayan Müşteri"

    output_df.loc[
        inactive_mask,
        "ml_segment_description",
    ] = (
        "Kullanıcı hesabı aktif olmadığı veya "
        "soft-delete uygulandığı için modele alınmadı."
    )

    output_df.loc[
        passive_mask,
        "kmeans_cluster",
    ] = -1

    output_df.loc[
        passive_mask,
        "ml_segment_code",
    ] = "NO_COMPLETED_HISTORY"

    output_df.loc[
        passive_mask,
        "ml_segment_name",
    ] = "ML Rezervasyonsuz / Pasif Müşteri"

    output_df.loc[
        passive_mask,
        "ml_segment_description",
    ] = (
        "Tamamlanmış rezervasyonu bulunmadığı için "
        "K-Means modeline alınmadı."
    )

    output_df.loc[
        other_excluded_mask,
        "kmeans_cluster",
    ] = -3

    output_df.loc[
        other_excluded_mask,
        "ml_segment_code",
    ] = "INSUFFICIENT_HISTORY"

    output_df.loc[
        other_excluded_mask,
        "ml_segment_name",
    ] = "ML Yetersiz Geçmiş"

    output_df.loc[
        other_excluded_mask,
        "ml_segment_description",
    ] = (
        "Davranışsal kümeleme için yeterli sonuçlanmış "
        "rezervasyon geçmişi bulunmuyor."
    )

    output_df[
        "segmentation_model_version"
    ] = MODEL_VERSION

    output_df[
        "segmentation_created_at"
    ] = created_at

    output_df["kmeans_cluster"] = (
        output_df["kmeans_cluster"]
        .astype("int64")
    )

    output_df["cluster_distance"] = (
        output_df["cluster_distance"]
        .round(6)
    )

    output_df[
        "cluster_separation_score"
    ] = (
        output_df[
            "cluster_separation_score"
        ]
        .round(6)
    )

    return output_df


# =====================================================
# 15. CLUSTER MERKEZLERİ
# =====================================================

def create_cluster_centers_output(
    model: KMeans,
    scaler: StandardScaler,
    cluster_summary: pd.DataFrame,
) -> pd.DataFrame:
    """
    Standardize ve dönüşüm sonrası cluster merkezlerini kaydeder.
    """

    scaled_centers = model.cluster_centers_

    transformed_centers = scaler.inverse_transform(
        scaled_centers
    )

    rows = []

    summary_lookup = (
        cluster_summary
        .set_index("kmeans_cluster")
        .to_dict("index")
    )

    for cluster_id in range(
        model.n_clusters
    ):
        row = {
            "kmeans_cluster": cluster_id,
            "ml_segment_code": (
                summary_lookup[cluster_id][
                    "ml_segment_code"
                ]
            ),
            "ml_segment_name": (
                summary_lookup[cluster_id][
                    "ml_segment_name"
                ]
            ),
        }

        for feature_index, feature_name in enumerate(
            MODEL_FEATURES
        ):
            row[
                f"scaled_center_{feature_name}"
            ] = float(
                scaled_centers[
                    cluster_id,
                    feature_index,
                ]
            )

            row[
                f"transformed_center_{feature_name}"
            ] = float(
                transformed_centers[
                    cluster_id,
                    feature_index,
                ]
            )

        rows.append(row)

    return pd.DataFrame(rows)


# =====================================================
# 16. SON DOĞRULAMALAR
# =====================================================

def validate_outputs(
    input_df: pd.DataFrame,
    output_df: pd.DataFrame,
    cluster_summary: pd.DataFrame,
    selected_cluster_count: int,
) -> None:
    """
    Model ve segment çıktılarının tutarlılığını doğrular.
    """

    if len(input_df) != len(output_df):
        raise ValueError(
            "Segmentasyon sırasında müşteri sayısı değişti."
        )

    if output_df["user_id"].duplicated().any():
        raise ValueError(
            "Segment çıktısında tekrar eden user_id bulundu."
        )

    required_output_columns = [
        "kmeans_cluster",
        "ml_segment_code",
        "ml_segment_name",
        "ml_segment_description",
        "model_eligible",
        "cluster_distance",
        "cluster_separation_score",
        "segmentation_model_version",
        "segmentation_created_at",
    ]

    if output_df[
        required_output_columns[:4]
    ].isna().any().any():
        raise ValueError(
            "Segment etiketlerinde eksik değer bulundu."
        )

    eligible_rows = output_df.loc[
        output_df["model_eligible"]
    ]

    excluded_rows = output_df.loc[
        ~output_df["model_eligible"]
    ]

    expected_cluster_ids = set(
        range(selected_cluster_count)
    )

    actual_cluster_ids = set(
        eligible_rows[
            "kmeans_cluster"
        ].astype(int)
    )

    if actual_cluster_ids != expected_cluster_ids:
        raise ValueError(
            "Final cluster kimlikleri seçilen K değeriyle uyuşmuyor."
        )

    if not (
        eligible_rows[
            "kmeans_cluster"
        ] >= 0
    ).all():
        raise ValueError(
            "Modele giren müşteride negatif cluster ID bulundu."
        )

    if not (
        excluded_rows[
            "kmeans_cluster"
        ] < 0
    ).all():
        raise ValueError(
            "Model dışındaki müşteride pozitif cluster ID bulundu."
        )

    if eligible_rows[
        "cluster_distance"
    ].isna().any():
        raise ValueError(
            "Modele giren müşteride cluster_distance eksik."
        )

    if eligible_rows[
        "cluster_separation_score"
    ].isna().any():
        raise ValueError(
            "Modele giren müşteride separation score eksik."
        )

    if not eligible_rows[
        "cluster_separation_score"
    ].between(
        0,
        1,
    ).all():
        raise ValueError(
            "cluster_separation_score 0–1 arasında olmalıdır."
        )

    if int(
        cluster_summary[
            "customer_count"
        ].sum()
    ) != len(eligible_rows):
        raise ValueError(
            "Cluster özeti müşteri sayısı model girdisiyle uyuşmuyor."
        )

    if len(cluster_summary) != (
        selected_cluster_count
    ):
        raise ValueError(
            "Cluster summary satır sayısı seçilen K ile uyuşmuyor."
        )

    if "current_points" in output_df.columns:
        raise ValueError(
            "Eski current_points alanı segment çıktısında bulunmamalıdır."
        )

    if not (
        output_df["monetary_currency"]
        == "TRY"
    ).all():
        raise ValueError(
            "Müşteri segmentasyonu para birimi TRY olmalıdır."
        )


# =====================================================
# 17. MODEL VE ÇIKTILARI KAYDETME
# =====================================================

def save_outputs(
    customer_segments_df: pd.DataFrame,
    cluster_summary_df: pd.DataFrame,
    candidate_metrics_df: pd.DataFrame,
    cluster_centers_df: pd.DataFrame,
    model: KMeans,
    scaler: StandardScaler,
    metadata: dict,
    final_metrics: dict,
    label_map: dict,
) -> None:
    """
    Model, veri ve rapor çıktılarını kaydeder.
    """

    customer_segments_df.to_csv(
        CUSTOMER_SEGMENTS_CSV_FILE,
        index=False,
        encoding="utf-8",
        na_rep="",
    )

    try:
        customer_segments_df.to_parquet(
            CUSTOMER_SEGMENTS_PARQUET_FILE,
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

    cluster_summary_df.to_csv(
        CLUSTER_SUMMARY_FILE,
        index=False,
        encoding="utf-8",
    )

    candidate_metrics_df.to_csv(
        CANDIDATE_METRICS_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    cluster_centers_df.to_csv(
        CLUSTER_CENTERS_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    model_metadata = {
        **metadata,
        "selected_cluster_count": int(
            model.n_clusters
        ),
        "cluster_label_map": label_map,
        "final_model_metrics": final_metrics,
    }

    model_bundle = {
        "model": model,
        "scaler": scaler,
        "metadata": model_metadata,
    }

    joblib.dump(
        model_bundle,
        MODEL_BUNDLE_FILE,
    )

    with open(
        PREPROCESSING_METADATA_FILE,
        "w",
        encoding="utf-8",
    ) as json_file:
        json.dump(
            json_safe(model_metadata),
            json_file,
            ensure_ascii=False,
            indent=4,
        )

    with open(
        FINAL_MODEL_METRICS_FILE,
        "w",
        encoding="utf-8",
    ) as json_file:
        json.dump(
            json_safe(final_metrics),
            json_file,
            ensure_ascii=False,
            indent=4,
        )

    segment_distribution_df = (
        customer_segments_df
        .groupby(
            [
                "ml_segment_code",
                "ml_segment_name",
                "model_eligible",
            ],
            observed=True,
        )
        .agg(
            customer_count=("user_id", "count"),
            average_recency=("recency", "mean"),
            average_frequency=("frequency", "mean"),
            average_monetary_try=("monetary", "mean"),
            guest_rate=("is_guest", "mean"),
            average_cancel_rate=("cancel_rate", "mean"),
            average_no_show_rate=("no_show_rate", "mean"),
        )
        .reset_index()
        .sort_values(
            by="customer_count",
            ascending=False,
        )
    )

    segment_distribution_df.to_csv(
        SEGMENT_DISTRIBUTION_FILE,
        index=False,
        encoding="utf-8-sig",
    )

    business_ml_crosstab = pd.crosstab(
        customer_segments_df[
            "business_segment"
        ],
        customer_segments_df[
            "ml_segment_name"
        ],
        margins=True,
    )

    business_ml_crosstab.to_csv(
        BUSINESS_ML_CROSSTAB_FILE,
        encoding="utf-8-sig",
    )

    correlation_columns = [
        "recency",
        "frequency",
        "monetary",
        "avg_order_value",
        "smoothed_cancel_rate",
        "smoothed_no_show_rate",
    ]

    customer_segments_df.loc[
        customer_segments_df[
            "model_eligible"
        ],
        correlation_columns,
    ].corr().to_csv(
        FEATURE_CORRELATION_FILE,
        encoding="utf-8-sig",
    )

    customer_segments_df.head(
        2_000
    ).to_csv(
        SEGMENT_SAMPLE_FILE,
        index=False,
        encoding="utf-8-sig",
        na_rep="",
    )


# =====================================================
# 18. ANA İŞLEM
# =====================================================

def main() -> None:
    print("=" * 70)
    print("09 — K-MEANS MÜŞTERİ SEGMENTASYONU")
    print("=" * 70)

    segmentation_created_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
    )

    rfm_df = read_rfm_data()

    customer_df = add_model_eligibility(
        rfm_df
    )

    (
        customer_df,
        risk_priors,
    ) = calculate_smoothed_risk_rates(
        customer_df
    )

    (
        eligible_df,
        scaled_features,
        scaler,
        preprocessing_metadata,
    ) = prepare_model_matrix(
        customer_df
    )

    preprocessing_metadata[
        "risk_smoothing"
    ] = risk_priors

    preprocessing_metadata[
        "model_eligibility_rule"
    ] = (
        "is_active=true, deleted_at is null, "
        "frequency>0 and resolved_reservation_count>0"
    )

    preprocessing_metadata[
        "lifetime_points_used_as_model_feature"
    ] = False

    preprocessing_metadata[
        "is_guest_used_as_model_feature"
    ] = False

    preprocessing_metadata[
        "segmentation_created_at"
    ] = segmentation_created_at

    print("\nKüme sayısı seçiliyor...")

    (
        selected_cluster_count,
        candidate_metrics_df,
    ) = select_cluster_count(
        scaled_features
    )

    print(
        f"\nSeçilen cluster sayısı: "
        f"{selected_cluster_count}"
    )

    print("\nFinal K-Means modeli eğitiliyor...")

    model, labels = train_final_model(
        scaled_features=scaled_features,
        cluster_count=selected_cluster_count,
    )

    final_metrics = calculate_final_model_metrics(
        scaled_features=scaled_features,
        labels=labels,
        model=model,
    )

    final_metrics[
        "total_customer_count"
    ] = int(
        len(customer_df)
    )

    final_metrics[
        "excluded_customer_count"
    ] = int(
        (
            ~customer_df[
                "model_eligible"
            ]
        ).sum()
    )

    print(
        "Final silhouette skoru: "
        f"{final_metrics['silhouette_score']:.4f}"
    )

    print("\nCluster profilleri oluşturuluyor...")

    cluster_summary_df = create_cluster_summary(
        eligible_df=eligible_df,
        labels=labels,
    )

    (
        cluster_summary_df,
        label_map,
    ) = assign_cluster_labels(
        cluster_summary=cluster_summary_df
    )

    customer_segments_df = add_segments_to_customers(
        full_df=customer_df,
        eligible_df=eligible_df,
        labels=labels,
        model=model,
        scaled_features=scaled_features,
        label_map=label_map,
        created_at=segmentation_created_at,
    )

    cluster_centers_df = (
        create_cluster_centers_output(
            model=model,
            scaler=scaler,
            cluster_summary=cluster_summary_df,
        )
    )

    print("Çıktılar doğrulanıyor...")

    validate_outputs(
        input_df=rfm_df,
        output_df=customer_segments_df,
        cluster_summary=cluster_summary_df,
        selected_cluster_count=(
            selected_cluster_count
        ),
    )

    save_outputs(
        customer_segments_df=(
            customer_segments_df
        ),
        cluster_summary_df=(
            cluster_summary_df
        ),
        candidate_metrics_df=(
            candidate_metrics_df
        ),
        cluster_centers_df=(
            cluster_centers_df
        ),
        model=model,
        scaler=scaler,
        metadata=preprocessing_metadata,
        final_metrics=final_metrics,
        label_map=label_map,
    )

    print("\n" + "=" * 70)
    print("K-MEANS SEGMENTASYONU TAMAMLANDI")
    print("=" * 70)

    print(
        f"Toplam müşteri    : "
        f"{len(customer_segments_df):,}"
    )

    print(
        f"Modele giren      : "
        f"{customer_segments_df['model_eligible'].sum():,}"
    )

    print(
        "Model dışında     : "
        f"{(~customer_segments_df['model_eligible']).sum():,}"
    )

    print(
        f"Seçilen K         : "
        f"{selected_cluster_count}"
    )

    print(
        "Silhouette        : "
        f"{final_metrics['silhouette_score']:.4f}"
    )

    print(
        "Davies-Bouldin    : "
        f"{final_metrics['davies_bouldin_score']:.4f}"
    )

    print(
        "\nMüşteri segmentleri:"
    )

    print(
        customer_segments_df[
            "ml_segment_name"
        ].value_counts().to_string()
    )

    print(
        f"\nMüşteri CSV       : "
        f"{CUSTOMER_SEGMENTS_CSV_FILE}"
    )

    print(
        f"Müşteri Parquet   : "
        f"{CUSTOMER_SEGMENTS_PARQUET_FILE}"
    )

    print(
        f"Cluster özeti     : "
        f"{CLUSTER_SUMMARY_FILE}"
    )

    print(
        f"Model bundle      : "
        f"{MODEL_BUNDLE_FILE}"
    )

    print(
        f"Model metadata    : "
        f"{PREPROCESSING_METADATA_FILE}"
    )

    print(f"Raporlar          : {REPORT_DIR}")

    print("\nKontroller:")
    print("Küme sayısı 3–8 arasından metriklerle seçildi.")
    print("Rezervasyonsuz müşteriler K-Means dışında tutuldu.")
    print("Aktif olmayan kullanıcılar modele alınmadı.")
    print("İptal ve no-show oranlarında smoothing uygulandı.")
    print("Aykırı değerler quantile sınırlarıyla kırpıldı.")
    print("Log dönüşümü ve StandardScaler uygulandı.")
    print("lifetime_points model girdisinden çıkarıldı.")
    print("is_guest model girdisinden çıkarıldı.")
    print("Cluster isimleri gerçek profillerden üretildi.")
    print("K-Means modeli ve scaler kaydedildi.")
    print("Para birimi TRY olarak doğrulandı.")

    print(
        "\nNot: customer_kmeans_segments.csv bir SQL ana tablosu "
        "değildir. Admin önerileri ve Data Science model çıktısı "
        "olarak kullanılmalıdır."
    )


if __name__ == "__main__":
    main()