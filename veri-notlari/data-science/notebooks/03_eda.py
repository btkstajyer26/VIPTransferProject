# 03 — Keşifsel Veri Analizi

# Bu notebook içerisinde temizlenmiş Ocak 2025 Yellow Taxi verisi; tablolar, istatistiksel sonuçlar ve grafikler yardımıyla incelenecektir.

# ## Amaç

# Veri setindeki zaman, lokasyon, mesafe, süre ve ücret değişkenlerinin dağılımlarını incelemek; talep tahmini ve surge fiyatlandırma modeli için önemli olabilecek ilişkileri belirlemektir.

# ## Yapılacak Analizler

# - Temiz veri dosyasının okunması
# - Veri setinin genel yapısının kontrol edilmesi
# - Saatlik yolculuk talebinin incelenmesi
# - Günlük yolculuk talebinin incelenmesi
# - Haftanın günlerine göre talep analizi
# - Hafta içi ve hafta sonu karşılaştırması
# - Yolcu sayısı dağılımının incelenmesi
# - Yolculuk mesafesi dağılımının incelenmesi
# - Yolculuk süresi dağılımının incelenmesi
# - Ücret dağılımlarının incelenmesi
# - En yoğun başlangıç ve varış bölgelerinin bulunması
# - En sık kullanılan başlangıç-varış rotalarının belirlenmesi
# - Mesafe, süre ve ücret arasındaki ilişkilerin incelenmesi
# - Sayısal değişkenler arasındaki korelasyonların hesaplanması

# Bu aşamada veri üzerinde yeni bir temizleme işlemi yapılmayacak, yalnızca analiz ve görselleştirme gerçekleştirilecektir.


from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd


# ============================================================
# 1. PROJE VE DOSYA YOLLARINI BELİRLEME
# ============================================================

current_path = Path.cwd()

if current_path.name == "notebooks":
    project_root = current_path.parent
else:
    project_root = current_path

cleaned_data_path = (
    project_root
    / "data"
    / "processed"
    / "cleaned_taxi_data.csv"
)

figures_path = (
    project_root
    / "outputs"
    / "figures"
)

metrics_path = (
    project_root
    / "outputs"
    / "metrics"
)

figures_path.mkdir(
    parents=True,
    exist_ok=True
)

metrics_path.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# 2. DOSYA KONTROLÜ
# ============================================================

print("=" * 60)
print("DOSYA KONTROLÜ")
print("=" * 60)

print("Temiz veri dosyasının yolu:")
print(cleaned_data_path.resolve())

print("\nDosya mevcut mu?")
print(cleaned_data_path.exists())

if not cleaned_data_path.exists():
    raise FileNotFoundError(
        "cleaned_taxi_data.csv dosyası bulunamadı. "
        "Önce 02_data_cleaning.ipynb dosyasını çalıştır."
    )


# ============================================================
# 3. TEMİZ VERİ SETİNİ OKUMA
# ============================================================

selected_columns = [
    "tpep_pickup_datetime",
    "tpep_dropoff_datetime",
    "passenger_count",
    "trip_distance",
    "PULocationID",
    "DOLocationID",
    "fare_amount",
    "total_amount",
    "trip_duration_min"
]

df = pd.read_csv(
    cleaned_data_path,
    usecols=selected_columns,
    parse_dates=[
        "tpep_pickup_datetime",
        "tpep_dropoff_datetime"
    ],
    low_memory=False
)

print("\n" + "=" * 60)
print("VERİ SETİ BAŞARIYLA OKUNDU")
print("=" * 60)

print("Satır sayısı:", df.shape[0])
print("Sütun sayısı:", df.shape[1])


# ============================================================
# 4. VERİ SETİNİN GENEL KONTROLÜ
# ============================================================

print("\n" + "=" * 60)
print("İLK 10 SATIR")
print("=" * 60)

print(df.head(10))


print("\n" + "=" * 60)
print("SON 10 SATIR")
print("=" * 60)

print(df.tail(10))


print("\n" + "=" * 60)
print("VERİ TİPLERİ VE GENEL BİLGİ")
print("=" * 60)

df.info()


print("\n" + "=" * 60)
print("EKSİK VERİ KONTROLÜ")
print("=" * 60)

print(df.isnull().sum())


print("\n" + "=" * 60)
print("TEKRAR EDEN SATIR KONTROLÜ")
print("=" * 60)

print("Tekrar eden satır sayısı:", df.duplicated().sum())


# ============================================================
# 5. ZAMAN ÖZELLİKLERİNİ OLUŞTURMA
# ============================================================

df["pickup_date"] = (
    df["tpep_pickup_datetime"]
    .dt.floor("D")
)

df["pickup_hour"] = (
    df["tpep_pickup_datetime"]
    .dt.hour
)

df["day_of_week"] = (
    df["tpep_pickup_datetime"]
    .dt.dayofweek
)

day_name_mapping = {
    0: "Pazartesi",
    1: "Salı",
    2: "Çarşamba",
    3: "Perşembe",
    4: "Cuma",
    5: "Cumartesi",
    6: "Pazar"
}

df["day_name"] = (
    df["day_of_week"]
    .map(day_name_mapping)
)

df["is_weekend"] = (
    df["day_of_week"]
    .isin([5, 6])
)

df["week_type"] = df["is_weekend"].map({
    False: "Hafta İçi",
    True: "Hafta Sonu"
})

time_period_conditions = [
    df["pickup_hour"].between(0, 5),
    df["pickup_hour"].between(6, 9),
    df["pickup_hour"].between(10, 15),
    df["pickup_hour"].between(16, 19),
    df["pickup_hour"].between(20, 23)
]

time_period_labels = [
    "Gece",
    "Sabah Yoğunluğu",
    "Gündüz",
    "Akşam Yoğunluğu",
    "Akşam"
]

df["time_period"] = pd.Series(
    pd.NA,
    index=df.index,
    dtype="object"
)

for condition, label in zip(
    time_period_conditions,
    time_period_labels
):
    df.loc[condition, "time_period"] = label

print("\n" + "=" * 60)
print("OLUŞTURULAN YENİ ÖZELLİKLER")
print("=" * 60)

print(
    df[
        [
            "tpep_pickup_datetime",
            "pickup_date",
            "pickup_hour",
            "day_name",
            "week_type",
            "time_period"
        ]
    ].head(10)
)


# ============================================================
# 6. GENEL İSTATİSTİKSEL ÖZET
# ============================================================

analysis_columns = [
    "passenger_count",
    "trip_distance",
    "trip_duration_min",
    "fare_amount",
    "total_amount"
]

statistical_summary = (
    df[analysis_columns]
    .describe()
    .T
    .round(2)
)

print("\n" + "=" * 60)
print("GENEL İSTATİSTİKSEL ÖZET")
print("=" * 60)

print(statistical_summary)

statistical_summary.to_csv(
    metrics_path / "eda_statistical_summary.csv",
    encoding="utf-8-sig"
)


# ============================================================
# 7. TARİH ARALIĞI
# ============================================================

print("\n" + "=" * 60)
print("VERİ SETİNİN TARİH ARALIĞI")
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
    "Toplam incelenen gün sayısı:",
    df["pickup_date"].nunique()
)


# ============================================================
# 8. SAATLİK TALEP ANALİZİ
# ============================================================

hourly_daily_demand = (
    df.groupby(
        [
            "pickup_date",
            "pickup_hour"
        ]
    )
    .size()
    .reset_index(name="trip_count")
)

hourly_demand = (
    hourly_daily_demand
    .groupby("pickup_hour")["trip_count"]
    .mean()
    .reset_index(name="average_trip_count")
)

print("\n" + "=" * 60)
print("SAATLİK ORTALAMA TALEP")
print("=" * 60)

print(hourly_demand)

hourly_demand.to_csv(
    metrics_path / "eda_hourly_demand.csv",
    index=False,
    encoding="utf-8-sig"
)

fig, ax = plt.subplots(figsize=(12, 6))

ax.plot(
    hourly_demand["pickup_hour"],
    hourly_demand["average_trip_count"],
    marker="o"
)

ax.set_title(
    "Saatlere Göre Ortalama Günlük Yolculuk Talebi"
)

ax.set_xlabel("Saat")
ax.set_ylabel("Ortalama Yolculuk Sayısı")
ax.set_xticks(range(0, 24))
ax.grid(True, alpha=0.3)

fig.tight_layout()

fig.savefig(
    figures_path / "01_hourly_demand.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close(fig)


# ============================================================
# 9. GÜNLÜK TALEP ANALİZİ
# ============================================================

daily_demand = (
    df.groupby("pickup_date")
    .size()
    .reset_index(name="trip_count")
)

daily_demand["day_of_week"] = (
    daily_demand["pickup_date"]
    .dt.dayofweek
)

daily_demand["day_name"] = (
    daily_demand["day_of_week"]
    .map(day_name_mapping)
)

daily_demand["week_type"] = (
    daily_demand["day_of_week"]
    .isin([5, 6])
    .map({
        False: "Hafta İçi",
        True: "Hafta Sonu"
    })
)

print("\n" + "=" * 60)
print("GÜNLÜK TALEP")
print("=" * 60)

print(daily_demand)

daily_demand.to_csv(
    metrics_path / "eda_daily_demand.csv",
    index=False,
    encoding="utf-8-sig"
)

fig, ax = plt.subplots(figsize=(14, 6))

ax.plot(
    daily_demand["pickup_date"],
    daily_demand["trip_count"],
    marker="o"
)

ax.set_title("Günlere Göre Yolculuk Talebi")
ax.set_xlabel("Tarih")
ax.set_ylabel("Yolculuk Sayısı")
ax.tick_params(axis="x", rotation=45)
ax.grid(True, alpha=0.3)

fig.tight_layout()

fig.savefig(
    figures_path / "02_daily_demand.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close(fig)


# ============================================================
# 10. HAFTANIN GÜNLERİNE GÖRE TALEP
# ============================================================

weekday_order = [
    "Pazartesi",
    "Salı",
    "Çarşamba",
    "Perşembe",
    "Cuma",
    "Cumartesi",
    "Pazar"
]

weekday_demand = (
    daily_demand
    .groupby("day_name")["trip_count"]
    .mean()
    .reindex(weekday_order)
    .reset_index(name="average_trip_count")
)

print("\n" + "=" * 60)
print("HAFTANIN GÜNLERİNE GÖRE ORTALAMA TALEP")
print("=" * 60)

print(weekday_demand)

weekday_demand.to_csv(
    metrics_path / "eda_weekday_demand.csv",
    index=False,
    encoding="utf-8-sig"
)

fig, ax = plt.subplots(figsize=(10, 6))

ax.bar(
    weekday_demand["day_name"],
    weekday_demand["average_trip_count"]
)

ax.set_title(
    "Haftanın Günlerine Göre Ortalama Yolculuk Talebi"
)

ax.set_xlabel("Gün")
ax.set_ylabel("Ortalama Yolculuk Sayısı")
ax.tick_params(axis="x", rotation=30)

fig.tight_layout()

fig.savefig(
    figures_path / "03_weekday_demand.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close(fig)


# ============================================================
# 11. HAFTA İÇİ VE HAFTA SONU KARŞILAŞTIRMASI
# ============================================================

week_type_demand = (
    daily_demand
    .groupby("week_type")["trip_count"]
    .mean()
    .reset_index(name="average_daily_trip_count")
)

week_type_order = [
    "Hafta İçi",
    "Hafta Sonu"
]

week_type_demand["week_type"] = pd.Categorical(
    week_type_demand["week_type"],
    categories=week_type_order,
    ordered=True
)

week_type_demand = (
    week_type_demand
    .sort_values("week_type")
)

print("\n" + "=" * 60)
print("HAFTA İÇİ VE HAFTA SONU KARŞILAŞTIRMASI")
print("=" * 60)

print(week_type_demand)

week_type_demand.to_csv(
    metrics_path / "eda_week_type_demand.csv",
    index=False,
    encoding="utf-8-sig"
)

fig, ax = plt.subplots(figsize=(8, 5))

ax.bar(
    week_type_demand["week_type"],
    week_type_demand["average_daily_trip_count"]
)

ax.set_title(
    "Hafta İçi ve Hafta Sonu Ortalama Günlük Talep"
)

ax.set_xlabel("Gün Türü")
ax.set_ylabel("Ortalama Günlük Yolculuk Sayısı")

fig.tight_layout()

fig.savefig(
    figures_path / "04_week_type_demand.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close(fig)


# ============================================================
# 12. GÜNÜN BÖLÜMLERİNE GÖRE TALEP
# ============================================================

time_period_order = [
    "Gece",
    "Sabah Yoğunluğu",
    "Gündüz",
    "Akşam Yoğunluğu",
    "Akşam"
]

time_period_demand = (
    df["time_period"]
    .value_counts()
    .reindex(time_period_order)
    .reset_index()
)

time_period_demand.columns = [
    "time_period",
    "trip_count"
]

print("\n" + "=" * 60)
print("GÜNÜN BÖLÜMLERİNE GÖRE TALEP")
print("=" * 60)

print(time_period_demand)

time_period_demand.to_csv(
    metrics_path / "eda_time_period_demand.csv",
    index=False,
    encoding="utf-8-sig"
)

fig, ax = plt.subplots(figsize=(10, 6))

ax.bar(
    time_period_demand["time_period"],
    time_period_demand["trip_count"]
)

ax.set_title(
    "Günün Bölümlerine Göre Toplam Yolculuk Talebi"
)

ax.set_xlabel("Zaman Dilimi")
ax.set_ylabel("Yolculuk Sayısı")
ax.tick_params(axis="x", rotation=25)

fig.tight_layout()

fig.savefig(
    figures_path / "05_time_period_demand.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close(fig)


# ============================================================
# 13. YOLCU SAYISI DAĞILIMI
# ============================================================

passenger_distribution = (
    df["passenger_count"]
    .value_counts()
    .sort_index()
    .reset_index()
)

passenger_distribution.columns = [
    "passenger_count",
    "trip_count"
]

passenger_distribution["percentage"] = (
    passenger_distribution["trip_count"]
    / len(df)
    * 100
).round(2)

print("\n" + "=" * 60)
print("YOLCU SAYISI DAĞILIMI")
print("=" * 60)

print(passenger_distribution)

passenger_distribution.to_csv(
    metrics_path / "eda_passenger_distribution.csv",
    index=False,
    encoding="utf-8-sig"
)

fig, ax = plt.subplots(figsize=(10, 6))

ax.bar(
    passenger_distribution["passenger_count"],
    passenger_distribution["trip_count"]
)

ax.set_title("Yolcu Sayısı Dağılımı")
ax.set_xlabel("Yolcu Sayısı")
ax.set_ylabel("Yolculuk Sayısı")
ax.set_xticks(passenger_distribution["passenger_count"])

fig.tight_layout()

fig.savefig(
    figures_path / "06_passenger_distribution.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close(fig)


# ============================================================
# 14. DAĞILIM GRAFİKLERİ İÇİN ÖRNEK VERİ OLUŞTURMA
# ============================================================

distribution_sample_size = min(
    500_000,
    len(df)
)

distribution_sample = df.sample(
    n=distribution_sample_size,
    random_state=42
)

print("\n" + "=" * 60)
print("DAĞILIM GRAFİKLERİ İÇİN ÖRNEKLEM")
print("=" * 60)

print(
    "Grafiklerde kullanılacak örnek satır sayısı:",
    len(distribution_sample)
)


# ============================================================
# 15. YOLCULUK MESAFESİ DAĞILIMI
# ============================================================

fig, ax = plt.subplots(figsize=(10, 6))

ax.hist(
    distribution_sample["trip_distance"],
    bins=60
)

ax.set_title("Yolculuk Mesafesi Dağılımı")
ax.set_xlabel("Yolculuk Mesafesi (Mil)")
ax.set_ylabel("Kayıt Sayısı")

fig.tight_layout()

fig.savefig(
    figures_path / "07_trip_distance_distribution.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close(fig)


# ============================================================
# 16. YOLCULUK SÜRESİ DAĞILIMI
# ============================================================

fig, ax = plt.subplots(figsize=(10, 6))

ax.hist(
    distribution_sample["trip_duration_min"],
    bins=60
)

ax.set_title("Yolculuk Süresi Dağılımı")
ax.set_xlabel("Yolculuk Süresi (Dakika)")
ax.set_ylabel("Kayıt Sayısı")

fig.tight_layout()

fig.savefig(
    figures_path / "08_trip_duration_distribution.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close(fig)


# ============================================================
# 17. TEMEL ÜCRET DAĞILIMI
# ============================================================

fig, ax = plt.subplots(figsize=(10, 6))

ax.hist(
    distribution_sample["fare_amount"],
    bins=60
)

ax.set_title("Temel Ücret Dağılımı")
ax.set_xlabel("Temel Ücret")
ax.set_ylabel("Kayıt Sayısı")

fig.tight_layout()

fig.savefig(
    figures_path / "09_fare_amount_distribution.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close(fig)


# ============================================================
# 18. TOPLAM ÜCRET DAĞILIMI
# ============================================================

fig, ax = plt.subplots(figsize=(10, 6))

ax.hist(
    distribution_sample["total_amount"],
    bins=60
)

ax.set_title("Toplam Ücret Dağılımı")
ax.set_xlabel("Toplam Ücret")
ax.set_ylabel("Kayıt Sayısı")

fig.tight_layout()

fig.savefig(
    figures_path / "10_total_amount_distribution.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close(fig)


# ============================================================
# 19. EN YOĞUN BAŞLANGIÇ BÖLGELERİ
# ============================================================

top_pickup_locations = (
    df["PULocationID"]
    .value_counts()
    .head(15)
    .reset_index()
)

top_pickup_locations.columns = [
    "PULocationID",
    "trip_count"
]

print("\n" + "=" * 60)
print("EN YOĞUN 15 BAŞLANGIÇ BÖLGESİ")
print("=" * 60)

print(top_pickup_locations)

top_pickup_locations.to_csv(
    metrics_path / "eda_top_pickup_locations.csv",
    index=False,
    encoding="utf-8-sig"
)

fig, ax = plt.subplots(figsize=(12, 6))

ax.bar(
    top_pickup_locations["PULocationID"].astype(str),
    top_pickup_locations["trip_count"]
)

ax.set_title("En Yoğun 15 Başlangıç Bölgesi")
ax.set_xlabel("Başlangıç Bölgesi ID")
ax.set_ylabel("Yolculuk Sayısı")
ax.tick_params(axis="x", rotation=45)

fig.tight_layout()

fig.savefig(
    figures_path / "11_top_pickup_locations.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close(fig)


# ============================================================
# 20. EN YOĞUN VARIŞ BÖLGELERİ
# ============================================================

top_dropoff_locations = (
    df["DOLocationID"]
    .value_counts()
    .head(15)
    .reset_index()
)

top_dropoff_locations.columns = [
    "DOLocationID",
    "trip_count"
]

print("\n" + "=" * 60)
print("EN YOĞUN 15 VARIŞ BÖLGESİ")
print("=" * 60)

print(top_dropoff_locations)

top_dropoff_locations.to_csv(
    metrics_path / "eda_top_dropoff_locations.csv",
    index=False,
    encoding="utf-8-sig"
)

fig, ax = plt.subplots(figsize=(12, 6))

ax.bar(
    top_dropoff_locations["DOLocationID"].astype(str),
    top_dropoff_locations["trip_count"]
)

ax.set_title("En Yoğun 15 Varış Bölgesi")
ax.set_xlabel("Varış Bölgesi ID")
ax.set_ylabel("Yolculuk Sayısı")
ax.tick_params(axis="x", rotation=45)

fig.tight_layout()

fig.savefig(
    figures_path / "12_top_dropoff_locations.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close(fig)


# ============================================================
# 21. EN SIK KULLANILAN ROTALAR
# ============================================================

top_routes = (
    df.groupby(
        [
            "PULocationID",
            "DOLocationID"
        ]
    )
    .size()
    .reset_index(name="trip_count")
    .sort_values(
        by="trip_count",
        ascending=False
    )
    .head(15)
)

top_routes["route"] = (
    top_routes["PULocationID"].astype(str)
    + " → "
    + top_routes["DOLocationID"].astype(str)
)

print("\n" + "=" * 60)
print("EN SIK KULLANILAN 15 ROTA")
print("=" * 60)

print(
    top_routes[
        [
            "PULocationID",
            "DOLocationID",
            "trip_count"
        ]
    ]
)

top_routes.to_csv(
    metrics_path / "eda_top_routes.csv",
    index=False,
    encoding="utf-8-sig"
)

fig, ax = plt.subplots(figsize=(12, 7))

ax.barh(
    top_routes["route"][::-1],
    top_routes["trip_count"][::-1]
)

ax.set_title("En Sık Kullanılan 15 Rota")
ax.set_xlabel("Yolculuk Sayısı")
ax.set_ylabel("Başlangıç → Varış Bölgesi")

fig.tight_layout()

fig.savefig(
    figures_path / "13_top_routes.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close(fig)


# ============================================================
# 22. MESAFE VE ÜCRET İLİŞKİSİ
# ============================================================

scatter_sample_size = min(
    50_000,
    len(df)
)

scatter_sample = df.sample(
    n=scatter_sample_size,
    random_state=42
)

fig, ax = plt.subplots(figsize=(10, 6))

ax.scatter(
    scatter_sample["trip_distance"],
    scatter_sample["fare_amount"],
    alpha=0.2,
    s=8
)

ax.set_title("Yolculuk Mesafesi ile Temel Ücret İlişkisi")
ax.set_xlabel("Yolculuk Mesafesi (Mil)")
ax.set_ylabel("Temel Ücret")

fig.tight_layout()

fig.savefig(
    figures_path / "14_distance_fare_relationship.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close(fig)


# ============================================================
# 23. MESAFE VE SÜRE İLİŞKİSİ
# ============================================================

fig, ax = plt.subplots(figsize=(10, 6))

ax.scatter(
    scatter_sample["trip_distance"],
    scatter_sample["trip_duration_min"],
    alpha=0.2,
    s=8
)

ax.set_title("Yolculuk Mesafesi ile Süre İlişkisi")
ax.set_xlabel("Yolculuk Mesafesi (Mil)")
ax.set_ylabel("Yolculuk Süresi (Dakika)")

fig.tight_layout()

fig.savefig(
    figures_path / "15_distance_duration_relationship.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close(fig)


# ============================================================
# 24. SAYISAL DEĞİŞKENLERİN KORELASYONU
# ============================================================

correlation_columns = [
    "passenger_count",
    "trip_distance",
    "trip_duration_min",
    "fare_amount",
    "total_amount"
]

correlation_matrix = (
    df[correlation_columns]
    .corr()
    .round(3)
)

print("\n" + "=" * 60)
print("KORELASYON MATRİSİ")
print("=" * 60)

print(correlation_matrix)

correlation_matrix.to_csv(
    metrics_path / "eda_correlation_matrix.csv",
    encoding="utf-8-sig"
)

fig, ax = plt.subplots(figsize=(9, 7))

correlation_image = ax.imshow(
    correlation_matrix
)

ax.set_title("Sayısal Değişkenler Arasındaki Korelasyon")

ax.set_xticks(
    range(len(correlation_columns))
)

ax.set_yticks(
    range(len(correlation_columns))
)

ax.set_xticklabels(
    correlation_columns,
    rotation=45,
    ha="right"
)

ax.set_yticklabels(
    correlation_columns
)

for row_index in range(len(correlation_columns)):
    for column_index in range(len(correlation_columns)):
        ax.text(
            column_index,
            row_index,
            correlation_matrix.iloc[
                row_index,
                column_index
            ],
            ha="center",
            va="center"
        )

fig.colorbar(
    correlation_image,
    ax=ax
)

fig.tight_layout()

fig.savefig(
    figures_path / "16_correlation_matrix.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close(fig)


# ============================================================
# 25. BÖLGE VE SAAT BAZLI TALEP TABLOSU
# ============================================================

zone_hourly_demand = (
    df.groupby(
        [
            "pickup_date",
            "pickup_hour",
            "PULocationID"
        ]
    )
    .size()
    .reset_index(name="demand")
)

zone_hourly_demand.to_csv(
    metrics_path / "eda_zone_hourly_demand.csv",
    index=False,
    encoding="utf-8-sig"
)

print("\n" + "=" * 60)
print("BÖLGE VE SAAT BAZLI TALEP TABLOSU")
print("=" * 60)

print(zone_hourly_demand.head(20))

print(
    "\nBölge-saat talep tablosundaki satır sayısı:",
    len(zone_hourly_demand)
)


# ============================================================
# 26. EDA SONUÇ ÖZETİ
# ============================================================

busiest_hour_row = hourly_demand.loc[
    hourly_demand["average_trip_count"].idxmax()
]

busiest_day_row = daily_demand.loc[
    daily_demand["trip_count"].idxmax()
]

busiest_pickup_row = top_pickup_locations.iloc[0]
busiest_dropoff_row = top_dropoff_locations.iloc[0]
most_popular_route = top_routes.iloc[0]

eda_summary = pd.DataFrame({
    "metric": [
        "Toplam yolculuk sayısı",
        "En yoğun saat",
        "En yoğun saatte ortalama talep",
        "En yoğun tarih",
        "En yoğun tarihte yolculuk sayısı",
        "En yoğun başlangıç bölgesi",
        "En yoğun varış bölgesi",
        "En popüler rota",
        "Ortalama yolculuk mesafesi",
        "Ortalama yolculuk süresi",
        "Ortalama temel ücret",
        "Ortalama toplam ücret"
    ],
    "value": [
        len(df),
        int(busiest_hour_row["pickup_hour"]),
        round(
            busiest_hour_row["average_trip_count"],
            2
        ),
        busiest_day_row["pickup_date"],
        int(busiest_day_row["trip_count"]),
        int(busiest_pickup_row["PULocationID"]),
        int(busiest_dropoff_row["DOLocationID"]),
        most_popular_route["route"],
        round(df["trip_distance"].mean(), 2),
        round(df["trip_duration_min"].mean(), 2),
        round(df["fare_amount"].mean(), 2),
        round(df["total_amount"].mean(), 2)
    ]
})

print("\n" + "=" * 60)
print("EDA SONUÇ ÖZETİ")
print("=" * 60)

print(eda_summary.to_string(index=False))

eda_summary.to_csv(
    metrics_path / "eda_summary.csv",
    index=False,
    encoding="utf-8-sig"
)


# ============================================================
# 27. İŞLEM SONU
# ============================================================

print("\n" + "=" * 60)
print("EDA İŞLEMİ TAMAMLANDI")
print("=" * 60)

print("Grafikler şu klasöre kaydedildi:")
print(figures_path.resolve())

print("\nAnaliz tabloları şu klasöre kaydedildi:")
print(metrics_path.resolve())