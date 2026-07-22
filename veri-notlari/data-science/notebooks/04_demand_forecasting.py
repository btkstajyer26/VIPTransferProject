# # 04 — Hava Durumu Destekli Talep Tahmini

# Bu notebook içerisinde temizlenmiş Ocak 2025 Yellow Taxi verileri kullanılarak bölge ve saat bazlı yolculuk talebi tahmin edilecektir.

# ## Amaç

# Bu çalışmanın amacı, geçmiş yolculuk hareketlerini, zaman bilgilerini, bölgesel yoğunluğu ve hava durumu koşullarını kullanarak belirli bir bölgede ve saatte oluşabilecek yolculuk sayısını tahmin etmektir.

# Üretilen tahminler, VIP Transfer Rezervasyon Sistemi'nin dinamik fiyatlandırma mekanizmasına veri sağlayacaktır. Bu notebook doğrudan fiyat hesaplamayacak; her bölge ve saat için tahmin edilen talep, normal talep ve talep yoğunluk oranını üretecektir.

# Surge fiyat çarpanı bir sonraki `05_surge_pricing.ipynb` dosyasında hesaplanacaktır.

# ## Kullanılan Veri Kaynakları

# Bu çalışmada iki farklı veri kaynağı kullanılmaktadır:

# 1. `cleaned_taxi_data.csv`
#    - Temizlenmiş Yellow Taxi yolculuk verilerini içerir.
#    - Yolculuğun başlangıç zamanı ve başlangıç bölgesi kullanılır.

# 2. `nyc_hourly_weather.csv`
#    - New York için saatlik hava durumu bilgilerini içerir.
#    - Kod ilk kez çalıştırıldığında hava durumu verisi API üzerinden alınır.
#    - İndirilen veri `data/interim` klasörüne kaydedilir.
#    - Sonraki çalıştırmalarda kayıtlı dosya kullanılır.

# ## Hedef Değişken

# Modelin hedef değişkeni `demand` sütunudur.

# `demand`, belirli bir başlangıç bölgesinde bir saat içerisinde gerçekleşen toplam yolculuk sayısını ifade eder.

# Örnek:

# - Bölge: 132
# - Tarih ve saat: 2025-01-15 18:00
# - Talep: 85 yolculuk

# Bu durumda modelin tahmin etmeye çalıştığı değer `85` olacaktır.

# ## Modelde Kullanılan Özellikler

# Modelde aşağıdaki özellikler kullanılacaktır:

# ### Bölge Bilgisi

# - Başlangıç bölgesi kimliği (`PULocationID`)

# ### Zaman Bilgileri

# - Günün saati
# - Haftanın günü
# - Hafta içi veya hafta sonu olması
# - Sabah veya akşam yoğun saatinde olması
# - Resmî tatil günü olması
# - Saat ve gün bilgilerinin döngüsel gösterimleri

# ### Hava Durumu Bilgileri

# - Sıcaklık
# - Bağıl nem
# - Yağış miktarı
# - Kar yağışı
# - Rüzgâr hızı
# - Yağmurlu hava bilgisi
# - Karlı hava bilgisi
# - Sisli hava bilgisi
# - Kötü hava koşulu bilgisi

# ### Geçmiş Talep Bilgileri

# - Bir önceki saatin talebi
# - Bir önceki gün aynı saatin talebi
# - Bir önceki hafta aynı saatin talebi
# - Önceki 3 saatin ortalama talebi
# - Önceki 24 saatin ortalama talebi
# - Önceki 168 saatin ortalama talebi

# ## Uygulanacak İşlemler

# Bu notebook içerisinde aşağıdaki işlemler gerçekleştirilecektir:

# 1. Temizlenmiş yolculuk verisinin okunması
# 2. Yolculukların bölge ve saat bazında gruplanması
# 3. Yolculuk olmayan bölge-saatlerin sıfır talep olarak eklenmesi
# 4. Saatlik hava durumu verisinin alınması
# 5. Talep ve hava durumu verilerinin birleştirilmesi
# 6. Zaman özelliklerinin oluşturulması
# 7. Geçmiş talep özelliklerinin oluşturulması
# 8. Verinin zamana göre eğitim ve test dönemlerine ayrılması
# 9. Baseline tahmin modelinin oluşturulması
# 10. Random Forest modelinin eğitilmesi
# 11. Model başarısının ölçülmesi
# 12. Gerçek ve tahmin edilen talebin karşılaştırılması
# 13. Nihai modelin kaydedilmesi
# 14. Normal bölgesel talep profilinin oluşturulması
# 15. Gelecek 24 saat için bölge bazlı talep tahmini yapılması
# 16. Tahmin, metrik ve grafik dosyalarının kaydedilmesi

# ## Eğitim ve Test Yaklaşımı

# Bu çalışma zaman bağımlı bir tahmin problemi olduğu için veriler rastgele eğitim ve test olarak ayrılmayacaktır.

# - Geçmiş tarihler eğitim verisi olarak kullanılacaktır.
# - Son 7 günlük dönem test verisi olarak kullanılacaktır.

# Bu yöntem, geçmiş verilerle geleceğin tahmin edildiği gerçek kullanım senaryosuna daha uygundur.

# ## Baseline Model

# Makine öğrenmesi modelinin gerçekten faydalı olup olmadığını ölçmek için basit bir referans model kullanılacaktır.

# Baseline model şu varsayımla çalışır:

# > Bir bölgenin bugünkü belirli bir saatteki talebi, bir önceki gün aynı saatteki talebe eşittir.

# Random Forest modelinin sonuçları bu referans modelle karşılaştırılacaktır.

# ## Kullanılan Model

# Talep tahmini için `RandomForestRegressor` kullanılacaktır.

# Random Forest, birden fazla karar ağacının tahminlerini birleştirerek nihai tahmini oluşturur.

# Modelin başarısı aşağıdaki metriklerle ölçülecektir:

# - **MAE:** Tahminlerin gerçek değerlerden ortalama mutlak sapması
# - **RMSE:** Büyük tahmin hatalarına daha fazla önem veren hata ölçüsü
# - **R²:** Modelin talepteki değişimi açıklama oranı
# - **WAPE:** Toplam mutlak tahmin hatasının toplam gerçek talebe oranı

# Daha düşük MAE, RMSE ve WAPE değerleri; daha yüksek R² değeri daha iyi model performansını ifade eder.

# ## Üretilecek Çıktılar

# Model çalıştırıldığında aşağıdaki dosyalar oluşturulacaktır:

# ### Hava Durumu Verisi

# `data/interim/nyc_hourly_weather.csv`

# ### Eğitilmiş Model

# `models/demand_model.pkl`

# ### Model Bilgileri

# `models/demand_model_metadata.json`

# ### Model Başarı Sonuçları

# `outputs/metrics/demand_model_metrics_weather.csv`

# ### Normal Talep Profili

# `outputs/metrics/normal_zone_hourly_demand.csv`

# ### Test Dönemi Tahminleri

# `outputs/predictions/demand_test_predictions_weather.csv`

# ### Gelecek 24 Saat Tahminleri

# `outputs/predictions/next_24_hours_demand_forecast_weather.csv`

# ### Grafikler

# - Gerçek ve tahmin edilen talep karşılaştırması
# - Gelecek 24 saat toplam talep tahmini

# ## Varsayımlar ve Sınırlılıklar

# - Yellow Taxi bölge kimlikleri, proje kapsamındaki fiyatlandırma bölgelerini temsil etmek amacıyla kullanılmaktadır.
# - Bütün bölgeler için aynı New York şehir merkezi hava durumu verisi kullanılmaktadır.
# - Veri seti yalnızca Ocak 2025 dönemini içerdiği için model uzun dönemli mevsimselliği öğrenemez.
# - Gelecek 24 saat tahmini, veri setinin bittiği tarihten sonraki 24 saat için yapılan proje simülasyonudur.
# - Gerçek üretim sisteminde daha uzun tarih aralığı, güncel hava tahmini, etkinlikler, trafik yoğunluğu ve araç uygunluğu gibi ek bilgiler kullanılmalıdır.
# - Modelin ürettiği talep tahmini doğrudan fiyat değildir. Surge fiyat çarpanı ayrı bir fiyatlandırma aşamasında hesaplanacaktır.

from pathlib import Path
import json

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import requests

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)


pd.set_option("display.max_columns", None)
pd.set_option("display.width", 200)


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

weather_data_path = (
    project_root
    / "data"
    / "interim"
    / "nyc_hourly_weather.csv"
)

models_path = project_root / "models"
metrics_path = project_root / "outputs" / "metrics"
predictions_path = project_root / "outputs" / "predictions"
figures_path = project_root / "outputs" / "figures"

for folder in [
    weather_data_path.parent,
    models_path,
    metrics_path,
    predictions_path,
    figures_path
]:
    folder.mkdir(parents=True, exist_ok=True)


# ============================================================
# 2. TEMİZ VERİ DOSYASINI KONTROL ETME
# ============================================================

print("=" * 70)
print("DOSYA KONTROLÜ")
print("=" * 70)

print("Temiz veri dosyası:")
print(cleaned_data_path.resolve())

print("\nDosya mevcut mu?")
print(cleaned_data_path.exists())

if not cleaned_data_path.exists():
    raise FileNotFoundError(
        "cleaned_taxi_data.csv bulunamadı. "
        "Önce 02_data_cleaning.ipynb dosyasını çalıştır."
    )


# ============================================================
# 3. TEMİZ TAKSİ VERİSİNİ OKUMA
# ============================================================

taxi_df = pd.read_csv(
    cleaned_data_path,
    usecols=[
        "tpep_pickup_datetime",
        "PULocationID"
    ],
    parse_dates=["tpep_pickup_datetime"],
    low_memory=False
)

print("\n" + "=" * 70)
print("TEMİZ TAKSİ VERİSİ OKUNDU")
print("=" * 70)

print("Satır sayısı:", len(taxi_df))
print("Sütun sayısı:", taxi_df.shape[1])

print("\nİlk 10 satır:")
print(taxi_df.head(10))


# ============================================================
# 4. TARİHLERİ SAATLİK DÜZEYE GETİRME
# ============================================================

taxi_df["hour_start"] = (
    taxi_df["tpep_pickup_datetime"]
    .dt.floor("h")
)

print("\n" + "=" * 70)
print("SAATLİK ZAMAN BİLGİSİ")
print("=" * 70)

print(
    taxi_df[
        [
            "tpep_pickup_datetime",
            "hour_start",
            "PULocationID"
        ]
    ].head(10)
)


# ============================================================
# 5. BÖLGE VE SAAT BAZLI TALEBİ HESAPLAMA
# ============================================================

observed_demand = (
    taxi_df.groupby(
        [
            "hour_start",
            "PULocationID"
        ]
    )
    .size()
    .reset_index(name="demand")
)

print("\n" + "=" * 70)
print("BÖLGE VE SAAT BAZLI TALEP")
print("=" * 70)

print(observed_demand.head(20))
print("Talep tablosu satır sayısı:", len(observed_demand))


# Artık büyük yolculuk tablosuna ihtiyacımız yok.
del taxi_df


# ============================================================
# 6. YETERLİ VERİSİ OLAN BÖLGELERİ SEÇME
# ============================================================

minimum_monthly_trips = 100

zone_trip_counts = (
    observed_demand
    .groupby("PULocationID")["demand"]
    .sum()
    .reset_index(name="monthly_trip_count")
)

active_zones = (
    zone_trip_counts[
        zone_trip_counts["monthly_trip_count"]
        >= minimum_monthly_trips
    ]["PULocationID"]
    .sort_values()
    .tolist()
)

observed_demand = observed_demand[
    observed_demand["PULocationID"].isin(active_zones)
].copy()

print("\n" + "=" * 70)
print("AKTİF BÖLGELER")
print("=" * 70)

print("Minimum aylık yolculuk:", minimum_monthly_trips)
print("Modelde kullanılan bölge sayısı:", len(active_zones))


# ============================================================
# 7. SIFIR TALEPLİ BÖLGE-SAATLERİ EKLEME
# ============================================================

first_hour = observed_demand["hour_start"].min()
last_hour = observed_demand["hour_start"].max()

all_hours = pd.date_range(
    start=first_hour,
    end=last_hour,
    freq="h"
)

complete_grid = (
    pd.MultiIndex.from_product(
        [
            all_hours,
            active_zones
        ],
        names=[
            "hour_start",
            "PULocationID"
        ]
    )
    .to_frame(index=False)
)

demand_df = complete_grid.merge(
    observed_demand,
    on=[
        "hour_start",
        "PULocationID"
    ],
    how="left"
)

demand_df["demand"] = (
    demand_df["demand"]
    .fillna(0)
    .astype(int)
)

demand_df = demand_df.sort_values(
    [
        "PULocationID",
        "hour_start"
    ]
).reset_index(drop=True)

print("\n" + "=" * 70)
print("SIFIR TALEPLİ SAATLER EKLENDİ")
print("=" * 70)

print("İlk saat:", first_hour)
print("Son saat:", last_hour)
print("Toplam saat:", len(all_hours))
print("Toplam model satırı:", len(demand_df))


# ============================================================
# 8. HAVA DURUMU TARİH ARALIĞI
# ============================================================

forecast_start = (
    last_hour
    + pd.Timedelta(hours=1)
)

forecast_end = (
    forecast_start
    + pd.Timedelta(hours=23)
)

weather_start_date = first_hour.date().isoformat()
weather_end_date = forecast_end.date().isoformat()

print("\n" + "=" * 70)
print("HAVA DURUMU TARİH ARALIĞI")
print("=" * 70)

print("Başlangıç:", weather_start_date)
print("Bitiş:", weather_end_date)


# ============================================================
# 9. HAVA DURUMU İNDİRME FONKSİYONU
# ============================================================

def download_weather_data(start_date, end_date):

    api_url = (
        "https://archive-api.open-meteo.com/"
        "v1/archive"
    )

    parameters = {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "start_date": start_date,
        "end_date": end_date,
        "hourly": (
            "temperature_2m,"
            "relative_humidity_2m,"
            "precipitation,"
            "snowfall,"
            "weather_code,"
            "wind_speed_10m"
        ),
        "timezone": "America/New_York"
    }

    response = requests.get(
        api_url,
        params=parameters,
        timeout=60
    )

    response.raise_for_status()

    response_json = response.json()

    if "hourly" not in response_json:
        raise ValueError(
            "API yanıtında saatlik hava durumu bulunamadı."
        )

    weather = pd.DataFrame(
        response_json["hourly"]
    )

    weather["hour_start"] = pd.to_datetime(
        weather["time"],
        errors="coerce"
    )

    weather = weather.drop(
        columns=["time"]
    )

    return weather


# ============================================================
# 10. HAVA DURUMUNU OKUMA VEYA İNDİRME
# ============================================================

use_cached_weather = False

if weather_data_path.exists():

    cached_weather = pd.read_csv(
        weather_data_path,
        parse_dates=["hour_start"]
    )

    if not cached_weather.empty:

        cached_first_hour = (
            cached_weather["hour_start"].min()
        )

        cached_last_hour = (
            cached_weather["hour_start"].max()
        )

        if (
            cached_first_hour <= first_hour
            and cached_last_hour >= forecast_end
        ):
            weather_df = cached_weather
            use_cached_weather = True


if use_cached_weather:

    print("\n" + "=" * 70)
    print("KAYITLI HAVA DURUMU KULLANILDI")
    print("=" * 70)

    print(weather_data_path.resolve())

else:

    print("\n" + "=" * 70)
    print("HAVA DURUMU İNDİRİLİYOR")
    print("=" * 70)

    weather_df = download_weather_data(
        weather_start_date,
        weather_end_date
    )

    weather_df.to_csv(
        weather_data_path,
        index=False,
        encoding="utf-8-sig"
    )

    print("Hava durumu indirildi.")
    print(weather_data_path.resolve())


# ============================================================
# 11. HAVA DURUMU VERİSİNİ DÜZENLEME
# ============================================================

weather_numeric_columns = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "snowfall",
    "wind_speed_10m"
]

for column in weather_numeric_columns:

    weather_df[column] = pd.to_numeric(
        weather_df[column],
        errors="coerce"
    )

    weather_df[column] = (
        weather_df[column]
        .interpolate(limit_direction="both")
    )


weather_df["weather_code"] = (
    pd.to_numeric(
        weather_df["weather_code"],
        errors="coerce"
    )
    .ffill()
    .bfill()
    .astype(int)
)


def assign_weather_condition(weather_code):

    if weather_code == 0:
        return "CLEAR"

    if weather_code in [1, 2]:
        return "PARTLY_CLOUDY"

    if weather_code == 3:
        return "CLOUDY"

    if weather_code in [45, 48]:
        return "FOGGY"

    if weather_code in [
        51, 53, 55, 56, 57,
        61, 63, 65, 66, 67,
        80, 81, 82
    ]:
        return "RAINY"

    if weather_code in [
        71, 73, 75, 77,
        85, 86
    ]:
        return "SNOWY"

    if weather_code in [
        95, 96, 99
    ]:
        return "STORMY"

    return "OTHER"


weather_df["weather_condition"] = (
    weather_df["weather_code"]
    .apply(assign_weather_condition)
)

weather_df["is_rainy"] = (
    weather_df["precipitation"] > 0
).astype(int)

weather_df["is_snowy"] = (
    weather_df["snowfall"] > 0
).astype(int)

weather_df["is_foggy"] = (
    weather_df["weather_code"]
    .isin([45, 48])
    .astype(int)
)

weather_df["is_bad_weather"] = (
    (weather_df["is_rainy"] == 1)
    | (weather_df["is_snowy"] == 1)
    | (weather_df["is_foggy"] == 1)
    | (weather_df["wind_speed_10m"] >= 30)
).astype(int)

weather_df = weather_df.sort_values(
    "hour_start"
).drop_duplicates(
    subset=["hour_start"]
).reset_index(drop=True)

print("\n" + "=" * 70)
print("HAVA DURUMU VERİSİ")
print("=" * 70)

print("Satır sayısı:", len(weather_df))
print("İlk hava durumu saati:", weather_df["hour_start"].min())
print("Son hava durumu saati:", weather_df["hour_start"].max())

print("\nİlk 10 satır:")
print(weather_df.head(10))

print("\nEksik değerler:")
print(weather_df.isnull().sum())


# ============================================================
# 12. HAVA DURUMUNU TALEP VERİSİYLE BİRLEŞTİRME
# ============================================================

weather_merge_columns = [
    "hour_start",
    "weather_condition",
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "snowfall",
    "weather_code",
    "wind_speed_10m",
    "is_rainy",
    "is_snowy",
    "is_foggy",
    "is_bad_weather"
]

demand_df = demand_df.merge(
    weather_df[weather_merge_columns],
    on="hour_start",
    how="left"
)

missing_weather_count = (
    demand_df[
        weather_numeric_columns
    ]
    .isnull()
    .any(axis=1)
    .sum()
)

if missing_weather_count > 0:
    raise ValueError(
        f"{missing_weather_count} satırda hava durumu eksik."
    )

print("\n" + "=" * 70)
print("TALEP VE HAVA DURUMU BİRLEŞTİRİLDİ")
print("=" * 70)

print(
    demand_df[
        [
            "hour_start",
            "PULocationID",
            "demand",
            "weather_condition",
            "temperature_2m",
            "precipitation",
            "snowfall",
            "wind_speed_10m"
        ]
    ].head(20)
)


# ============================================================
# 13. ZAMAN ÖZELLİKLERİNİ OLUŞTURMA
# ============================================================

demand_df["reservation_date"] = (
    demand_df["hour_start"].dt.normalize()
)

demand_df["reservation_hour"] = (
    demand_df["hour_start"].dt.hour
)

demand_df["day_of_week"] = (
    demand_df["hour_start"].dt.dayofweek
)

demand_df["is_weekend"] = (
    demand_df["day_of_week"]
    .isin([5, 6])
    .astype(int)
)

demand_df["is_peak_hour"] = (
    demand_df["reservation_hour"]
    .isin([
        7, 8, 9,
        17, 18, 19, 20
    ])
    .astype(int)
)

demand_df["is_holiday"] = (
    demand_df["reservation_date"]
    .dt.strftime("%Y-%m-%d")
    .isin(["2025-01-01"])
    .astype(int)
)

demand_df["hour_sin"] = np.sin(
    2
    * np.pi
    * demand_df["reservation_hour"]
    / 24
)

demand_df["hour_cos"] = np.cos(
    2
    * np.pi
    * demand_df["reservation_hour"]
    / 24
)

demand_df["day_sin"] = np.sin(
    2
    * np.pi
    * demand_df["day_of_week"]
    / 7
)

demand_df["day_cos"] = np.cos(
    2
    * np.pi
    * demand_df["day_of_week"]
    / 7
)


# ============================================================
# 14. GEÇMİŞ TALEP ÖZELLİKLERİNİ OLUŞTURMA
# ============================================================

zone_group = demand_df.groupby(
    "PULocationID"
)["demand"]

demand_df["lag_1"] = (
    zone_group.shift(1)
)

demand_df["lag_24"] = (
    zone_group.shift(24)
)

demand_df["lag_168"] = (
    zone_group.shift(168)
)

demand_df["rolling_mean_3"] = (
    zone_group.transform(
        lambda values:
        values.shift(1)
        .rolling(
            window=3,
            min_periods=1
        )
        .mean()
    )
)

demand_df["rolling_mean_24"] = (
    zone_group.transform(
        lambda values:
        values.shift(1)
        .rolling(
            window=24,
            min_periods=1
        )
        .mean()
    )
)

demand_df["rolling_mean_168"] = (
    zone_group.transform(
        lambda values:
        values.shift(1)
        .rolling(
            window=168,
            min_periods=1
        )
        .mean()
    )
)


# ============================================================
# 15. MODEL VERİ SETİNİ HAZIRLAMA
# ============================================================

lag_columns = [
    "lag_1",
    "lag_24",
    "lag_168",
    "rolling_mean_3",
    "rolling_mean_24",
    "rolling_mean_168"
]

before_drop = len(demand_df)

model_df = demand_df.dropna(
    subset=lag_columns
).copy()

print("\n" + "=" * 70)
print("MODEL VERİ SETİ")
print("=" * 70)

print(
    "Geçmiş verisi olmadığı için çıkarılan satır:",
    before_drop - len(model_df)
)

print("Model satır sayısı:", len(model_df))


# ============================================================
# 16. MODELDE KULLANILACAK ÖZELLİKLER
# ============================================================

features = [
    "PULocationID",
    "reservation_hour",
    "day_of_week",
    "is_weekend",
    "is_peak_hour",
    "is_holiday",
    "hour_sin",
    "hour_cos",
    "day_sin",
    "day_cos",
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "snowfall",
    "wind_speed_10m",
    "is_rainy",
    "is_snowy",
    "is_foggy",
    "is_bad_weather",
    "lag_1",
    "lag_24",
    "lag_168",
    "rolling_mean_3",
    "rolling_mean_24",
    "rolling_mean_168"
]

target = "demand"

print("\nModel özellikleri:")

for number, feature in enumerate(
    features,
    start=1
):
    print(f"{number}. {feature}")


# ============================================================
# 17. VERİYİ ZAMANA GÖRE EĞİTİM VE TESTE AYIRMA
# ============================================================

last_model_day = (
    model_df["hour_start"]
    .max()
    .normalize()
)

test_start = (
    last_model_day
    - pd.Timedelta(days=6)
)

train_df = model_df[
    model_df["hour_start"] < test_start
].copy()

test_df = model_df[
    model_df["hour_start"] >= test_start
].copy()

X_train = train_df[features]
y_train = train_df[target]

X_test = test_df[features]
y_test = test_df[target]

print("\n" + "=" * 70)
print("EĞİTİM VE TEST AYRIMI")
print("=" * 70)

print("Eğitim başlangıcı:", train_df["hour_start"].min())
print("Eğitim bitişi:", train_df["hour_start"].max())
print("Test başlangıcı:", test_df["hour_start"].min())
print("Test bitişi:", test_df["hour_start"].max())

print("Eğitim satır sayısı:", len(train_df))
print("Test satır sayısı:", len(test_df))


# ============================================================
# 18. REFERANS MODEL
# ============================================================

baseline_prediction = (
    test_df["lag_24"]
    .clip(lower=0)
    .to_numpy()
)


# ============================================================
# 19. RANDOM FOREST MODELİNİ EĞİTME
# ============================================================

model = RandomForestRegressor(
    n_estimators=150,
    max_depth=18,
    min_samples_leaf=2,
    max_features="sqrt",
    random_state=42,
    n_jobs=-1
)

print("\n" + "=" * 70)
print("RANDOM FOREST MODELİ EĞİTİLİYOR")
print("=" * 70)

model.fit(
    X_train,
    y_train
)

model_prediction = model.predict(
    X_test
)

model_prediction = np.clip(
    model_prediction,
    a_min=0,
    a_max=None
)

print("Model eğitimi tamamlandı.")


# ============================================================
# 20. MODEL METRİKLERİ
# ============================================================

def calculate_metrics(actual, predicted):

    mae = mean_absolute_error(
        actual,
        predicted
    )

    rmse = np.sqrt(
        mean_squared_error(
            actual,
            predicted
        )
    )

    r2 = r2_score(
        actual,
        predicted
    )

    actual_total = np.sum(actual)

    if actual_total == 0:
        wape = np.nan
    else:
        wape = (
            np.sum(
                np.abs(
                    actual - predicted
                )
            )
            / actual_total
            * 100
        )

    return {
        "MAE": round(mae, 4),
        "RMSE": round(rmse, 4),
        "R2": round(r2, 4),
        "WAPE": round(wape, 2)
    }


baseline_metrics = calculate_metrics(
    y_test.to_numpy(),
    baseline_prediction
)

model_metrics = calculate_metrics(
    y_test.to_numpy(),
    model_prediction
)

metrics_df = pd.DataFrame([
    {
        "model": "Baseline - Dün Aynı Saat",
        **baseline_metrics
    },
    {
        "model": "Random Forest + Hava Durumu",
        **model_metrics
    }
])

print("\n" + "=" * 70)
print("MODEL PERFORMANSI")
print("=" * 70)

print(metrics_df.to_string(index=False))

metrics_file_path = (
    metrics_path
    / "demand_model_metrics_weather.csv"
)

metrics_df.to_csv(
    metrics_file_path,
    index=False,
    encoding="utf-8-sig"
)


# ============================================================
# 21. TEST TAHMİNLERİNİ KAYDETME
# ============================================================

test_predictions_df = test_df[
    [
        "hour_start",
        "PULocationID",
        "demand",
        "weather_condition",
        "temperature_2m",
        "relative_humidity_2m",
        "precipitation",
        "snowfall",
        "wind_speed_10m",
        "is_bad_weather",
        "lag_24"
    ]
].copy()

test_predictions_df = test_predictions_df.rename(
    columns={
        "demand": "actual_demand",
        "lag_24": "baseline_prediction"
    }
)

test_predictions_df["model_prediction"] = (
    model_prediction.round(2)
)

test_predictions_df["absolute_error"] = (
    test_predictions_df["actual_demand"]
    - test_predictions_df["model_prediction"]
).abs().round(2)

test_predictions_file_path = (
    predictions_path
    / "demand_test_predictions_weather.csv"
)

test_predictions_df.to_csv(
    test_predictions_file_path,
    index=False,
    encoding="utf-8-sig"
)


# ============================================================
# 22. TEST SONUÇLARI GRAFİĞİ
# ============================================================

hourly_comparison = (
    test_predictions_df
    .groupby("hour_start")
    [
        [
            "actual_demand",
            "baseline_prediction",
            "model_prediction"
        ]
    ]
    .sum()
    .reset_index()
)

fig, ax = plt.subplots(
    figsize=(15, 7)
)

ax.plot(
    hourly_comparison["hour_start"],
    hourly_comparison["actual_demand"],
    label="Gerçek Talep"
)

ax.plot(
    hourly_comparison["hour_start"],
    hourly_comparison["baseline_prediction"],
    label="Dün Aynı Saat"
)

ax.plot(
    hourly_comparison["hour_start"],
    hourly_comparison["model_prediction"],
    label="Random Forest"
)

ax.set_title(
    "Gerçek ve Tahmin Edilen Saatlik Talep"
)

ax.set_xlabel("Tarih ve Saat")
ax.set_ylabel("Toplam Yolculuk Sayısı")

ax.legend()
ax.grid(True, alpha=0.3)
ax.tick_params(axis="x", rotation=45)

fig.tight_layout()

comparison_figure_path = (
    figures_path
    / "17_weather_demand_forecast_comparison.png"
)

fig.savefig(
    comparison_figure_path,
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close(fig)


# ============================================================
# 23. NİHAİ MODELİ TÜM VERİYLE EĞİTME
# ============================================================

final_model = RandomForestRegressor(
    n_estimators=150,
    max_depth=18,
    min_samples_leaf=2,
    max_features="sqrt",
    random_state=42,
    n_jobs=-1
)

final_model.fit(
    model_df[features],
    model_df[target]
)


# ============================================================
# 24. NORMAL TALEP PROFİLİ OLUŞTURMA
# ============================================================

normal_demand_profile = (
    train_df.groupby(
        [
            "PULocationID",
            "day_of_week",
            "reservation_hour"
        ]
    )["demand"]
    .mean()
    .reset_index(name="normal_demand")
)

normal_profile_file_path = (
    metrics_path
    / "normal_zone_hourly_demand.csv"
)

normal_demand_profile.to_csv(
    normal_profile_file_path,
    index=False,
    encoding="utf-8-sig"
)

normal_demand_map = (
    normal_demand_profile
    .set_index(
        [
            "PULocationID",
            "day_of_week",
            "reservation_hour"
        ]
    )["normal_demand"]
    .to_dict()
)

zone_average_demand = (
    train_df.groupby(
        "PULocationID"
    )["demand"]
    .mean()
    .to_dict()
)


# ============================================================
# 25. MODELİ KAYDETME
# ============================================================

model_file_path = (
    models_path
    / "demand_model.pkl"
)

model_package = {
    "model": final_model,
    "features": features,
    "active_zones": active_zones,
    "normal_demand_profile": normal_demand_profile,
    "model_name": "RandomForestRegressor",
    "model_version": "weather-demand-v1"
}

joblib.dump(
    model_package,
    model_file_path
)


# ============================================================
# 26. MODEL BİLGİLERİNİ KAYDETME
# ============================================================

metadata = {
    "model_name": "RandomForestRegressor",
    "model_version": "weather-demand-v1",
    "target": "hourly_zone_demand",
    "training_start": str(
        model_df["hour_start"].min()
    ),
    "training_end": str(
        model_df["hour_start"].max()
    ),
    "test_start": str(test_start),
    "active_zone_count": len(active_zones),
    "weather_source": "Open-Meteo",
    "weather_location": "New York City",
    "features": features,
    "baseline_metrics": baseline_metrics,
    "model_metrics": model_metrics
}

metadata_file_path = (
    models_path
    / "demand_model_metadata.json"
)

with open(
    metadata_file_path,
    "w",
    encoding="utf-8"
) as file:
    json.dump(
        metadata,
        file,
        ensure_ascii=False,
        indent=4
    )


# ============================================================
# 27. GELECEK 24 SAAT İÇİN GEÇMİŞ TALEBİ HAZIRLAMA
# ============================================================

history_by_zone = {}

for zone_id in active_zones:

    zone_history = (
        demand_df[
            demand_df["PULocationID"] == zone_id
        ]
        .set_index("hour_start")["demand"]
        .sort_index()
        .astype(float)
    )

    history_by_zone[zone_id] = zone_history


weather_by_hour = (
    weather_df
    .set_index("hour_start")
    .sort_index()
)

future_forecast_records = []


# ============================================================
# 28. GELECEK 24 SAATİ TAHMİN ETME
# ============================================================

for hour_step in range(24):

    forecast_time = (
        forecast_start
        + pd.Timedelta(hours=hour_step)
    )

    if forecast_time not in weather_by_hour.index:
        raise ValueError(
            f"{forecast_time} için hava durumu bulunamadı."
        )

    weather_row = weather_by_hour.loc[
        forecast_time
    ]

    future_rows = []

    for zone_id in active_zones:

        zone_history = history_by_zone[
            zone_id
        ]

        reservation_hour = forecast_time.hour
        day_of_week = forecast_time.dayofweek

        future_rows.append({
            "PULocationID": zone_id,
            "reservation_hour": reservation_hour,
            "day_of_week": day_of_week,
            "is_weekend": int(
                day_of_week in [5, 6]
            ),
            "is_peak_hour": int(
                reservation_hour in [
                    7, 8, 9,
                    17, 18, 19, 20
                ]
            ),
            "is_holiday": int(
                forecast_time.strftime("%Y-%m-%d")
                in ["2025-01-01"]
            ),
            "hour_sin": np.sin(
                2
                * np.pi
                * reservation_hour
                / 24
            ),
            "hour_cos": np.cos(
                2
                * np.pi
                * reservation_hour
                / 24
            ),
            "day_sin": np.sin(
                2
                * np.pi
                * day_of_week
                / 7
            ),
            "day_cos": np.cos(
                2
                * np.pi
                * day_of_week
                / 7
            ),
            "temperature_2m": float(
                weather_row["temperature_2m"]
            ),
            "relative_humidity_2m": float(
                weather_row["relative_humidity_2m"]
            ),
            "precipitation": float(
                weather_row["precipitation"]
            ),
            "snowfall": float(
                weather_row["snowfall"]
            ),
            "wind_speed_10m": float(
                weather_row["wind_speed_10m"]
            ),
            "is_rainy": int(
                weather_row["is_rainy"]
            ),
            "is_snowy": int(
                weather_row["is_snowy"]
            ),
            "is_foggy": int(
                weather_row["is_foggy"]
            ),
            "is_bad_weather": int(
                weather_row["is_bad_weather"]
            ),
            "lag_1": float(
                zone_history.get(
                    forecast_time
                    - pd.Timedelta(hours=1),
                    0
                )
            ),
            "lag_24": float(
                zone_history.get(
                    forecast_time
                    - pd.Timedelta(hours=24),
                    0
                )
            ),
            "lag_168": float(
                zone_history.get(
                    forecast_time
                    - pd.Timedelta(hours=168),
                    0
                )
            ),
            "rolling_mean_3": float(
                zone_history.tail(3).mean()
            ),
            "rolling_mean_24": float(
                zone_history.tail(24).mean()
            ),
            "rolling_mean_168": float(
                zone_history.tail(168).mean()
            )
        })


    future_features_df = pd.DataFrame(
        future_rows
    )

    future_predictions = final_model.predict(
        future_features_df[features]
    )

    future_predictions = np.clip(
        future_predictions,
        a_min=0,
        a_max=None
    )


    for index, zone_id in enumerate(active_zones):

        predicted_demand = float(
            future_predictions[index]
        )

        normal_demand = float(
            normal_demand_map.get(
                (
                    zone_id,
                    forecast_time.dayofweek,
                    forecast_time.hour
                ),
                zone_average_demand.get(
                    zone_id,
                    0
                )
            )
        )

        demand_ratio = (
            predicted_demand
            / max(normal_demand, 1)
        )

        if demand_ratio >= 1.50:
            predicted_demand_level = "HIGH"
        elif demand_ratio >= 1.10:
            predicted_demand_level = "MEDIUM"
        else:
            predicted_demand_level = "LOW"

        future_forecast_records.append({
            "forecast_time": forecast_time,
            "zone_id": zone_id,
            "predicted_demand": round(
                predicted_demand,
                2
            ),
            "normal_demand": round(
                normal_demand,
                2
            ),
            "demand_ratio": round(
                demand_ratio,
                4
            ),
            "predicted_demand_level": (
                predicted_demand_level
            ),
            "weather_condition": (
                weather_row["weather_condition"]
            ),
            "temperature_c": round(
                float(
                    weather_row["temperature_2m"]
                ),
                2
            ),
            "precipitation_mm": round(
                float(
                    weather_row["precipitation"]
                ),
                2
            ),
            "snowfall_cm": round(
                float(
                    weather_row["snowfall"]
                ),
                2
            ),
            "wind_speed_kmh": round(
                float(
                    weather_row["wind_speed_10m"]
                ),
                2
            ),
            "is_rainy": int(
                weather_row["is_rainy"]
            ),
            "is_snowy": int(
                weather_row["is_snowy"]
            ),
            "is_foggy": int(
                weather_row["is_foggy"]
            ),
            "is_bad_weather": int(
                weather_row["is_bad_weather"]
            )
        })

        predicted_history = pd.Series(
            [predicted_demand],
            index=[forecast_time]
        )

        history_by_zone[zone_id] = pd.concat(
            [
                history_by_zone[zone_id],
                predicted_history
            ]
        )


# ============================================================
# 29. GELECEK 24 SAAT TAHMİNLERİNİ KAYDETME
# ============================================================

future_forecast_df = pd.DataFrame(
    future_forecast_records
)

future_forecast_file_path = (
    predictions_path
    / "next_24_hours_demand_forecast_weather.csv"
)

future_forecast_df.to_csv(
    future_forecast_file_path,
    index=False,
    encoding="utf-8-sig"
)

print("\n" + "=" * 70)
print("GELECEK 24 SAAT TALEP TAHMİNİ")
print("=" * 70)

print(future_forecast_df.head(20))

print(
    "\nTahmin satır sayısı:",
    len(future_forecast_df)
)


# ============================================================
# 30. GELECEK 24 SAAT TOPLAM TALEP GRAFİĞİ
# ============================================================

future_total_demand = (
    future_forecast_df
    .groupby("forecast_time")[
        "predicted_demand"
    ]
    .sum()
    .reset_index()
)

fig, ax = plt.subplots(
    figsize=(13, 6)
)

ax.plot(
    future_total_demand["forecast_time"],
    future_total_demand["predicted_demand"],
    marker="o"
)

ax.set_title(
    "Hava Durumu Destekli Gelecek 24 Saat Talep Tahmini"
)

ax.set_xlabel("Tahmin Tarihi ve Saati")
ax.set_ylabel("Tahmin Edilen Yolculuk Sayısı")

ax.grid(True, alpha=0.3)
ax.tick_params(axis="x", rotation=45)

fig.tight_layout()

future_figure_path = (
    figures_path
    / "18_next_24_hours_weather_demand_forecast.png"
)

fig.savefig(
    future_figure_path,
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close(fig)


# ============================================================
# 31. İŞLEM SONU
# ============================================================

print("\n" + "=" * 70)
print("TALEP TAHMİNİ TAMAMLANDI")
print("=" * 70)

print("Hava durumu:")
print(weather_data_path.resolve())

print("\nKaydedilen model:")
print(model_file_path.resolve())

print("\nModel bilgileri:")
print(metadata_file_path.resolve())

print("\nModel metrikleri:")
print(metrics_file_path.resolve())

print("\nTest tahminleri:")
print(test_predictions_file_path.resolve())

print("\nNormal talep profili:")
print(normal_profile_file_path.resolve())

print("\nGelecek 24 saat tahminleri:")
print(future_forecast_file_path.resolve())

print("\nGrafikler:")
print(comparison_figure_path.resolve())
print(future_figure_path.resolve())