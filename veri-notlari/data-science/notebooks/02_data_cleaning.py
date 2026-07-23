# 02 — Veri Temizleme

# Bu notebook içerisinde Ocak 2025 Yellow Taxi veri seti temizlenerek analiz ve makine öğrenmesi çalışmalarına uygun hâle getirilecektir.

# ## Amaç

# Ham veri setinde bulunan eksik, hatalı, mantıksız ve aykırı kayıtları belirlemek; gerekli temizleme işlemlerini uygulamak ve temizlenmiş veriyi yeni bir CSV dosyası olarak kaydetmektir.

# ## Uygulanacak İşlemler

# - Projede kullanılacak sütunların seçilmesi
# - Tarih sütunlarının `datetime` veri tipine dönüştürülmesi
# - Zorunlu alanlardaki eksik kayıtların kaldırılması
# - Eksik yolcu sayılarının medyan değerle doldurulması
# - Ocak 2025 dışında kalan kayıtların çıkarılması
# - Yolculuk süresinin dakika cinsinden hesaplanması
# - Tekrar eden kayıtların kaldırılması
# - Sıfır, negatif ve mantıksız değerlerin temizlenmesi
# - Aşırı mesafe, süre ve ücret değerlerinin filtrelenmesi
# - Veri tiplerinin düzenlenmesi
# - Temizlik öncesi ve sonrası satır sayılarının karşılaştırılması
# - Temiz verinin `cleaned_taxi_data.csv` adıyla kaydedilmesi

# ## Temizleme Kuralları

# Bu çalışmada aşağıdaki kurallar uygulanacaktır:

# | Değişken | Kabul Edilen Aralık |
# |---|---|
# | Yolcu sayısı | 1–8 |
# | Yolculuk mesafesi | 0–150 mil |
# | Temel ücret | 0–1000 |
# | Toplam ücret | 0–1500 |
# | Yolculuk süresi | 3–180 dakika |
# | Başlangıç bölgesi | 1–265 |
# | Varış bölgesi | 1–265 |

# Ham veri dosyası üzerinde herhangi bir değişiklik yapılmayacaktır. Temizlenmiş veri ayrı bir dosya olarak `data/processed` klasörüne kaydedilecektir.


from pathlib import Path
import pandas as pd


# ============================================================
# 1. PROJE VE DOSYA YOLLARINI BELİRLEME
# ============================================================

current_path = Path.cwd()

# Notebook "notebooks" klasöründen çalışıyorsa
# bir üst klasörü proje ana klasörü olarak belirler.
if current_path.name == "notebooks":
    project_root = current_path.parent
else:
    project_root = current_path

# Ham CSV dosyasının yolu
raw_data_path = (
    project_root
    / "data"
    / "raw"
    / "yellow_tripdata_2025-01.csv"
)

# Temizlenmiş CSV dosyasının kaydedileceği yol
cleaned_data_path = (
    project_root
    / "data"
    / "processed"
    / "cleaned_taxi_data.csv"
)


# ============================================================
# 2. HAM CSV DOSYASINI KONTROL ETME
# ============================================================

print("=" * 60)
print("DOSYA KONTROLÜ")
print("=" * 60)

print("Proje ana klasörü:", project_root.resolve())
print("Ham veri yolu:", raw_data_path.resolve())
print("Ham CSV dosyası mevcut mu?", raw_data_path.exists())

if not raw_data_path.exists():
    raise FileNotFoundError(
        "yellow_tripdata_2025-01.csv dosyası bulunamadı. "
        "Dosyanın data/raw klasöründe olduğunu kontrol et."
    )


# ============================================================
# 3. PROJEDE KULLANILACAK SÜTUNLARI BELİRLEME
# ============================================================

selected_columns = [
    "tpep_pickup_datetime",
    "tpep_dropoff_datetime",
    "passenger_count",
    "trip_distance",
    "PULocationID",
    "DOLocationID",
    "fare_amount",
    "total_amount"
]


# ============================================================
# 4. HAM CSV DOSYASINI OKUMA
# ============================================================

df = pd.read_csv(
    raw_data_path,
    usecols=selected_columns,
    low_memory=False
)

initial_row_count = len(df)

print("\n" + "=" * 60)
print("HAM VERİ SETİ")
print("=" * 60)

print("İlk satır sayısı:", initial_row_count)
print("Sütun sayısı:", df.shape[1])

print("\nİlk 10 satır:")
print(df.head(10))


# ============================================================
# 5. TARİH SÜTUNLARINI DATETIME TİPİNE DÖNÜŞTÜRME
# ============================================================

df["tpep_pickup_datetime"] = pd.to_datetime(
    df["tpep_pickup_datetime"],
    errors="coerce"
)

df["tpep_dropoff_datetime"] = pd.to_datetime(
    df["tpep_dropoff_datetime"],
    errors="coerce"
)

print("\n" + "=" * 60)
print("TARİH DÖNÜŞÜMÜ")
print("=" * 60)

print("Başlangıç tarihi veri tipi:", df["tpep_pickup_datetime"].dtype)
print("Bitiş tarihi veri tipi:", df["tpep_dropoff_datetime"].dtype)


# ============================================================
# 6. ZORUNLU ALANLARDAKİ EKSİK DEĞERLERİ TEMİZLEME
# ============================================================

required_columns = [
    "tpep_pickup_datetime",
    "tpep_dropoff_datetime",
    "trip_distance",
    "PULocationID",
    "DOLocationID",
    "fare_amount",
    "total_amount"
]

before_required_drop = len(df)

df = df.dropna(
    subset=required_columns
).copy()

print("\n" + "=" * 60)
print("ZORUNLU ALANLARDAKİ EKSİK VERİLER")
print("=" * 60)

print(
    "Eksik zorunlu alan nedeniyle silinen satır:",
    before_required_drop - len(df)
)

print("Kalan satır sayısı:", len(df))


# ============================================================
# 7. EKSİK YOLCU SAYILARINI DOLDURMA
# ============================================================

missing_passenger_count = df["passenger_count"].isna().sum()

passenger_median = df["passenger_count"].median()

if pd.isna(passenger_median):
    passenger_median = 1

passenger_median = int(passenger_median)

df["passenger_count"] = (
    df["passenger_count"]
    .fillna(passenger_median)
    .astype(int)
)

print("\n" + "=" * 60)
print("YOLCU SAYISI EKSİK VERİLERİ")
print("=" * 60)

print("Eksik yolcu sayısı:", missing_passenger_count)
print("Eksik değerlerin doldurulduğu değer:", passenger_median)


# ============================================================
# 8. SADECE OCAK 2025 KAYITLARINI ALMA
# ============================================================

january_start = pd.Timestamp("2025-01-01 00:00:00")
february_start = pd.Timestamp("2025-02-01 00:00:00")

before_date_filter = len(df)

df = df[
    (df["tpep_pickup_datetime"] >= january_start)
    & (df["tpep_pickup_datetime"] < february_start)
].copy()

print("\n" + "=" * 60)
print("TARİH TEMİZLİĞİ")
print("=" * 60)

print(
    "Ocak 2025 dışında olduğu için silinen satır:",
    before_date_filter - len(df)
)

print("Kalan satır sayısı:", len(df))


# ============================================================
# 9. YOLCULUK SÜRESİNİ HESAPLAMA
# ============================================================

df["trip_duration_min"] = (
    df["tpep_dropoff_datetime"]
    - df["tpep_pickup_datetime"]
).dt.total_seconds() / 60

print("\n" + "=" * 60)
print("YOLCULUK SÜRESİ")
print("=" * 60)

print(
    df["trip_duration_min"]
    .describe()
    .round(2)
)


# ============================================================
# 10. TEKRAR EDEN SATIRLARI TEMİZLEME
# ============================================================

before_duplicate_drop = len(df)

df = df.drop_duplicates().copy()

print("\n" + "=" * 60)
print("TEKRAR EDEN SATIRLAR")
print("=" * 60)

print(
    "Silinen tekrar eden satır sayısı:",
    before_duplicate_drop - len(df)
)

print("Kalan satır sayısı:", len(df))


# ============================================================
# 11. MANTIKSIZ VE AYKIRI DEĞERLERİ TEMİZLEME
# ============================================================

before_quality_filter = len(df)

df = df[
    # Yolcu sayısı 1 ile 8 arasında olmalı
    (df["passenger_count"] >= 1)
    & (df["passenger_count"] <= 8)

    # Yolculuk mesafesi sıfırdan büyük olmalı
    & (df["trip_distance"] > 0)

    # Yolculuk mesafesi en fazla 150 mil olmalı
    & (df["trip_distance"] <= 150)

    # Temel ücret sıfırdan büyük olmalı
    & (df["fare_amount"] > 0)

    # Temel ücret en fazla 1000 olmalı
    & (df["fare_amount"] <= 1000)

    # Toplam ücret sıfırdan büyük olmalı
    & (df["total_amount"] > 0)

    # Toplam ücret en fazla 1500 olmalı
    & (df["total_amount"] <= 1500)

    # Yolculuk en az 3 dakika sürmeli
    & (df["trip_duration_min"] >= 3)

    # Yolculuk en fazla 180 dakika sürmeli
    & (df["trip_duration_min"] <= 180)

    # Başlangıç bölgesi geçerli aralıkta olmalı
    & (df["PULocationID"].between(1, 265))

    # Varış bölgesi geçerli aralıkta olmalı
    & (df["DOLocationID"].between(1, 265))
].copy()

print("\n" + "=" * 60)
print("MANTIKSIZ VE AYKIRI DEĞERLER")
print("=" * 60)

print(
    "Mantıksız veya aykırı olduğu için silinen satır:",
    before_quality_filter - len(df)
)

print("Kalan satır sayısı:", len(df))


# ============================================================
# 12. VERİ TİPLERİNİ DÜZENLEME
# ============================================================

df["passenger_count"] = df["passenger_count"].astype("int8")
df["PULocationID"] = df["PULocationID"].astype("int16")
df["DOLocationID"] = df["DOLocationID"].astype("int16")

numeric_float_columns = [
    "trip_distance",
    "fare_amount",
    "total_amount",
    "trip_duration_min"
]

for column in numeric_float_columns:
    df[column] = df[column].astype("float32")


# ============================================================
# 13. İNDEKSİ YENİDEN DÜZENLEME
# ============================================================

df = df.reset_index(drop=True)


# ============================================================
# 14. TEMİZLİK SONRASI KONTROLLER
# ============================================================

final_row_count = len(df)
removed_row_count = initial_row_count - final_row_count

removed_percentage = (
    removed_row_count
    / initial_row_count
    * 100
)

print("\n" + "=" * 60)
print("TEMİZLİK SONRASI ÖZET")
print("=" * 60)

print("İlk satır sayısı:", initial_row_count)
print("Temizlik sonrası satır sayısı:", final_row_count)
print("Toplam çıkarılan satır:", removed_row_count)
print(f"Çıkarılan veri yüzdesi: %{removed_percentage:.2f}")


print("\n" + "=" * 60)
print("KALAN EKSİK VERİLER")
print("=" * 60)

print(df.isnull().sum())


print("\n" + "=" * 60)
print("KALAN TEKRAR EDEN SATIRLAR")
print("=" * 60)

print("Tekrar eden satır sayısı:", df.duplicated().sum())


print("\n" + "=" * 60)
print("TEMİZ VERİNİN VERİ TİPLERİ")
print("=" * 60)

df.info()


print("\n" + "=" * 60)
print("TEMİZ VERİNİN İLK 10 SATIRI")
print("=" * 60)

print(df.head(10))


print("\n" + "=" * 60)
print("TEMİZ VERİNİN SON 10 SATIRI")
print("=" * 60)

print(df.tail(10))


print("\n" + "=" * 60)
print("TEMİZ VERİNİN İSTATİSTİKSEL ÖZETİ")
print("=" * 60)

print(df.describe().T.round(2))


# ============================================================
# 15. TEMİZ VERİYİ CSV OLARAK KAYDETME
# ============================================================

cleaned_data_path.parent.mkdir(
    parents=True,
    exist_ok=True
)

df.to_csv(
    cleaned_data_path,
    index=False,
    encoding="utf-8"
)

print("\n" + "=" * 60)
print("CSV KAYDETME İŞLEMİ")
print("=" * 60)

print("Temiz veri CSV olarak başarıyla kaydedildi.")
print("CSV dosyasının yolu:", cleaned_data_path.resolve())
print("CSV dosyasının adı:", cleaned_data_path.name)
print("CSV dosyası mevcut mu?", cleaned_data_path.exists())

file_size_mb = cleaned_data_path.stat().st_size / (1024 ** 2)

print(f"CSV dosyasının boyutu: {file_size_mb:.2f} MB")