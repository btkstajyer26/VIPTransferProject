# 01 — Yellow Taxi Veri Setini Tanıma

# Bu notebook içerisinde Ocak 2025 Yellow Taxi veri seti incelenecektir.

# Amaçlar

# - CSV dosyasının doğru yerde olduğunu kontrol etmek
# - Veri setinin satır ve sütun sayısını görmek
# - Sütunları ve veri tiplerini incelemek
# - Eksik değerleri belirlemek
# - Negatif ve sıfır değerleri tespit etmek
# - Tarih aralığını kontrol etmek
# - Veri temizliği öncesinde veri kalite raporu oluşturmak

from pathlib import Path
import pandas as pd

# --------------------------------------------------
# DOSYA YOLU VE DOSYA KONTROLÜ
# --------------------------------------------------

file_path = Path("data/raw/yellow_tripdata_2025-01.csv" \
"")

print("=" * 60)
print("DOSYA KONTROLÜ")
print("=" * 60)

print("Dosya yolu:", file_path.resolve())
print("Dosya mevcut mu?", file_path.exists())

if not file_path.exists():
    raise FileNotFoundError(
        "CSV dosyası bulunamadı. Dosya adını ve klasör yolunu kontrol et."
    )

# --------------------------------------------------
# İLK VE SON 10 SATIR
# --------------------------------------------------

df = pd.read_csv(
    file_path,
    low_memory=False,
    parse_dates=[
        "tpep_pickup_datetime",
        "tpep_dropoff_datetime"
    ]
)

print("\n" + "=" * 60)
print("İLK 10 SATIR")
print("=" * 60)

print(df.head(10))

print("\n" + "=" * 60)
print("SON 10 SATIR")
print("=" * 60)

print(df.tail(10))

# --------------------------------------------------
# GENEL
# --------------------------------------------------

print("\n" + "=" * 60)
print("GENEL VERİ BİLGİSİ")
print("=" * 60)

df.info()

# --------------------------------------------------
# VERİ SETİNİ OKUMA
# --------------------------------------------------

df = pd.read_csv(
    file_path,
    low_memory=False,
    parse_dates=[
        "tpep_pickup_datetime",
        "tpep_dropoff_datetime"
    ]
)

# --------------------------------------------------
# VERİ SETİ BOYUTU
# --------------------------------------------------

print("\n" + "=" * 60)
print("VERİ SETİ BOYUTU")
print("=" * 60)

print("Satır sayısı:", df.shape[0])
print("Sütun sayısı:", df.shape[1])

# --------------------------------------------------
# SÜTUNLAR VE VERİ TİPLERİ
# --------------------------------------------------

print("\n" + "=" * 60)
print("SÜTUNLAR VE VERİ TİPLERİ")
print("=" * 60)

column_report = pd.DataFrame({
    "Sütun": df.columns,
    "Veri Tipi": df.dtypes.astype(str).values
})

print(column_report.to_string(index=False))

# --------------------------------------------------
# EKSİK VERİLER
# --------------------------------------------------

print("\n" + "=" * 60)
print("EKSİK VERİLER")
print("=" * 60)

missing_report = pd.DataFrame({
    "Eksik Veri Sayısı": df.isnull().sum(),
    "Eksik Veri Yüzdesi": (
        df.isnull().sum() / len(df) * 100
    ).round(2)
})

missing_report = missing_report.sort_values(
    by="Eksik Veri Sayısı",
    ascending=False
)

print(missing_report)

# --------------------------------------------------
# TEKRAR EDEN SATIRLAR
# --------------------------------------------------

print("\n" + "=" * 60)
print("TEKRAR EDEN SATIRLAR")
print("=" * 60)

duplicate_count = df.duplicated().sum()

print("Tekrar eden satır sayısı:", duplicate_count)

# --------------------------------------------------
# NEGATİF VE SIFIR DEĞERLER
# --------------------------------------------------

print("\n" + "=" * 60)
print("NEGATİF VE SIFIR DEĞERLER")
print("=" * 60)

numeric_columns = [
    "passenger_count",
    "trip_distance",
    "fare_amount",
    "extra",
    "mta_tax",
    "tip_amount",
    "tolls_amount",
    "improvement_surcharge",
    "total_amount",
    "congestion_surcharge",
    "Airport_fee",
    "cbd_congestion_fee"
]

numeric_columns = [
    column
    for column in numeric_columns
    if column in df.columns
]

value_quality_report = pd.DataFrame({
    "Negatif Değer Sayısı": [
        (df[column] < 0).sum()
        for column in numeric_columns
    ],
    "Sıfır Değer Sayısı": [
        (df[column] == 0).sum()
        for column in numeric_columns
    ]
}, index=numeric_columns)

print(value_quality_report)

# --------------------------------------------------
# TARİH ARALIĞI
# --------------------------------------------------

print("\n" + "=" * 60)
print("TARİH ARALIĞI")
print("=" * 60)

print(
    "En erken başlangıç tarihi:",
    df["tpep_pickup_datetime"].min()
)

print(
    "En geç başlangıç tarihi:",
    df["tpep_pickup_datetime"].max()
)

print(
    "En erken bitiş tarihi:",
    df["tpep_dropoff_datetime"].min()
)

print(
    "En geç bitiş tarihi:",
    df["tpep_dropoff_datetime"].max()
)

january_start = pd.Timestamp("2025-01-01")
february_start = pd.Timestamp("2025-02-01")

outside_january_count = (
    (df["tpep_pickup_datetime"] < january_start)
    | (df["tpep_pickup_datetime"] >= february_start)
).sum()

print(
    "Ocak 2025 dışında kalan başlangıç kaydı:",
    outside_january_count
)

# --------------------------------------------------
# YOLCULUK SÜRESİ KONTROLÜ
# --------------------------------------------------

print("\n" + "=" * 60)
print("YOLCULUK SÜRESİ KONTROLÜ")
print("=" * 60)

trip_duration_minutes = (
    df["tpep_dropoff_datetime"]
    - df["tpep_pickup_datetime"]
).dt.total_seconds() / 60

duration_report = pd.Series({
    "Sıfır veya negatif süre": (
        trip_duration_minutes <= 0
    ).sum(),
    "5 saatten uzun süre": (
        trip_duration_minutes > 300
    ).sum(),
    "Eksik süre": (
        trip_duration_minutes.isnull()
    ).sum(),
    "Minimum süre (dakika)": (
        trip_duration_minutes.min()
    ),
    "Maksimum süre (dakika)": (
        trip_duration_minutes.max()
    )
})

print(duration_report)

# --------------------------------------------------
# İSTATİSTİKSEL ÖZET
# --------------------------------------------------

print("\n" + "=" * 60)
print("İSTATİSTİKSEL ÖZET")
print("=" * 60)

print(df.describe().T)

# --------------------------------------------------
# VERİ KALİTE RAPORU
# --------------------------------------------------

print("\n" + "=" * 60)
print("VERİ KALİTE RAPORU")
print("=" * 60)

quality_report = pd.Series({
    "Toplam satır": len(df),
    "Toplam sütun": df.shape[1],
    "Toplam eksik hücre": df.isnull().sum().sum(),
    "Eksik veri içeren sütun": (
        df.isnull().sum() > 0
    ).sum(),
    "Tekrar eden satır": duplicate_count,
    "Sıfır mesafeli yolculuk": (
        df["trip_distance"] == 0
    ).sum(),
    "Negatif mesafeli yolculuk": (
        df["trip_distance"] < 0
    ).sum(),
    "Negatif temel ücret": (
        df["fare_amount"] < 0
    ).sum(),
    "Negatif toplam ücret": (
        df["total_amount"] < 0
    ).sum(),
    "Ocak 2025 dışındaki kayıt": (
        outside_january_count
    ),
    "Sıfır veya negatif süreli yolculuk": (
        trip_duration_minutes <= 0
    ).sum()
})

print(quality_report)

print("\nVeri seti inceleme işlemi tamamlandı.")