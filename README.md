# VIP Transfer Rezervasyon Sistemi

Kurumsal düzeyde VIP transfer rezervasyon platformu. Spring Boot backend, React frontend, PostGIS destekli fiyatlandırma, çok kanallı bildirim sistemi ve tam izleme altyapısı içerir.

---

## İçindekiler

- [Genel Bakış](#genel-bakış)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Kurulum](#kurulum)
- [Ortam Değişkenleri](#ortam-değişkenleri)
- [Kullanım Kılavuzu](#kullanım-kılavuzu)
  - [Misafir Kullanıcı](#misafir-kullanıcı)
  - [Kayıtlı Kullanıcı](#kayıtlı-kullanıcı)
  - [Admin Paneli](#admin-paneli)
- [Servisler ve Portlar](#servisler-ve-portlar)
- [API Referansı](#api-referansı)
- [İzleme ve Loglama](#i̇zleme-ve-loglama)
- [Geliştirici Notları](#geliştirici-notları)

---

## Genel Bakış

VIP Transfer; misafir ve kayıtlı kullanıcıların araç seçerek transfer rezervasyonu oluşturabildiği, yöneticilerin tüm süreci yönettiği tam yığın bir web uygulamasıdır.

**Temel özellikler:**
- Giriş yapmadan (misafir) veya hesapla rezervasyon
- PostGIS tabanlı coğrafi fiyatlandırma bölgeleri ve yoğun saat çarpanları
- Kampanya kodu ve sadakat puanı indirimleri
- E-posta, SMS (İleti Merkezi) ve WhatsApp (Meta Cloud API) bildirimleri
- Firebase üzerinden push bildirim desteği
- Rezervasyon durum takibi (misafirler için telefon + rezervasyon numarasıyla)
- Admin paneli: kullanıcı, araç, kampanya, fiyatlandırma, bildirim yönetimi
- Prometheus + Grafana + Loki ile tam gözlemlenebilirlik

---

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Backend | Java 21, Spring Boot 4.1, Spring Security, JPA/Hibernate |
| Veritabanı | PostgreSQL 15 + PostGIS 3.3 |
| Frontend | React 18, Vite, Tailwind CSS, React Router |
| API Gateway | Nginx |
| İzleme | Prometheus, Grafana, Loki, Promtail, cAdvisor, Node Exporter |
| Konteyner | Docker, Docker Compose |
| Bildirim | JavaMail (SMTP), İleti Merkezi (SMS), Meta WhatsApp Cloud API, Firebase FCM |

---

## Kurulum

### Gereksinimler

- Docker Desktop 4.x+
- Git

### 1. Repoyu klonlayın

```bash
git clone https://github.com/btkstajyer26/VIPTransferProject.git
cd VIPTransferProject
```

### 2. Ortam dosyasını oluşturun

```bash
cp .env.example .env
```

`.env` dosyasını açıp en az şu değerleri doldurun:

```env
POSTGRES_PASSWORD=güçlü_bir_şifre
GF_ADMIN_PASSWORD=grafana_şifresi
```

Bildirim servisleri için ilgili bölümleri de doldurun (mail, SMS, WhatsApp).

### 3. Firebase push bildirimleri (opsiyonel)

Firebase Console → Project Settings → Service Accounts → **Generate new private key** ile indirilen JSON dosyasını şu konuma koyun:

```
secrets/firebase-service-account.json
```

Ardından `.env` içinde `FIREBASE_ENABLED=true` yapın.

### 4. Uygulamayı başlatın

```bash
docker compose up -d --build
```

İlk başlatmada veritabanı şeması ve başlangıç verileri otomatik yüklenir.

### 5. Erişim

| Servis | URL |
|---|---|
| Uygulama (frontend + API) | http://localhost:8888 |
| Grafana | http://localhost:3000 |
| Prometheus | http://localhost:9090 |

### Durumu kontrol etme

```bash
docker compose ps
docker logs vip-backend --tail 30
```

### Durdurma

```bash
docker compose down          # Konteynerler durur, veriler kalır
docker compose down -v       # Konteynerler + tüm veriler silinir (sıfırlama)
```

---

## Ortam Değişkenleri

Tüm değişkenler `.env` dosyasından okunur. `.env.example` şablondur — içine gerçek değer girmeyin.

### Veritabanı

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `POSTGRES_USER` | `postgres` | PostgreSQL kullanıcı adı |
| `POSTGRES_PASSWORD` | — | **Zorunlu.** Veritabanı şifresi |
| `POSTGRES_DB` | `vip_transfer_db` | Veritabanı adı |

### Grafana

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `GF_ADMIN_USER` | `admin` | Grafana admin kullanıcı adı |
| `GF_ADMIN_PASSWORD` | — | **Zorunlu.** Grafana admin şifresi |

### E-posta (SMTP)

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `MAIL_ENABLED` | `false` | Mail gönderimini aç/kapat |
| `MAIL_HOST` | `smtp.gmail.com` | SMTP sunucu adresi |
| `MAIL_PORT` | `587` | SMTP portu |
| `MAIL_USERNAME` | — | SMTP kullanıcı adı (e-posta adresi) |
| `MAIL_PASSWORD` | — | SMTP şifre veya uygulama şifresi |

### SMS (İleti Merkezi)

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `SMS_ENABLED` | `false` | SMS gönderimini aç/kapat |
| `ILETIMERKEZI_API_KEY` | — | API anahtarı |
| `ILETIMERKEZI_API_HASH` | — | API hash değeri |
| `ILETIMERKEZI_SENDER` | — | Gönderici adı |

### WhatsApp (Meta Cloud API)

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `WHATSAPP_ENABLED` | `false` | WhatsApp gönderimini aç/kapat |
| `WHATSAPP_API_VERSION` | — | API versiyonu (ör. `v25.0`) |
| `WHATSAPP_ACCESS_TOKEN` | — | Meta erişim token'ı |
| `WHATSAPP_PHONE_NUMBER_ID` | — | WhatsApp telefon numarası ID |

### Firebase Push

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `FIREBASE_ENABLED` | `false` | Push bildirimi aç/kapat. `secrets/firebase-service-account.json` gerektirir |

---

## Kullanım Kılavuzu

### Misafir Kullanıcı

Hesap oluşturmadan transfer rezervasyonu yapabilirsiniz.

#### Rezervasyon oluşturma

1. **http://localhost:8888** adresine gidin
2. Ana sayfada **Rezervasyon Yap** butonuna tıklayın
3. Kalkış ve varış noktalarını haritadan veya adres arayarak seçin
4. Tarih ve saat belirleyin, yolcu sayısını girin
5. Araç sınıfını seçin (Standart, Business, VIP vb.)
6. Onay ekranında fiyat dökümünü inceleyin
   - Varsa kampanya kodunuzu girin ve **Uygula** deyin
   - Fiyat; açılış ücreti, km ücreti, araç fiyatı ve yoğun saat çarpanı olarak gösterilir
7. Ad, telefon numarası ve varsa uçuş numaranızı girin
8. **Rezervasyonu Tamamla** butonuna tıklayın
9. Rezervasyon numaranızı not alın — durum sorgulama için gereklidir

#### Rezervasyon durumu sorgulama

Misafir olarak rezervasyonunuzun durumunu iki yoldan sorgulayabilirsiniz:

**Yöntem 1 — Başarı ekranından:**
Rezervasyon oluşturduktan hemen sonra çıkan ekranda **Rezervasyonumu Takip Et** butonuna tıklayın.

**Yöntem 2 — Doğrudan link:**
`http://localhost:8888/track` veya `http://localhost:8888/reservation/track` adresine gidin, rezervasyon numaranızı ve kayıtlı telefon numaranızı girin.

---

### Kayıtlı Kullanıcı

#### Hesap oluşturma

1. `/register` sayfasına gidin
2. Ad, soyad, e-posta, telefon ve şifre bilgilerini doldurun
   - Şifre: en az 8 karakter, büyük/küçük harf, rakam ve özel karakter içermelidir
3. E-postanıza gelen 6 haneli doğrulama kodunu girin
4. Hesabınız aktif olur ve otomatik olarak BRONZE sadakat seviyesine geçilir

#### Giriş ve hesap yönetimi

`/login` → E-posta ve şifrenizle giriş yapın.

**Hesap menüsü (`/account`):**

| Sayfa | Adres | Açıklama |
|---|---|---|
| Kontrol Paneli | `/account/dashboard` | Genel özet, son rezervasyonlar |
| Rezervasyonlarım | `/account/reservations` | Tüm rezervasyon geçmişi ve detaylar |
| Sadakat Programı | `/account/loyalty` | Puan bakiyesi, tier durumu, geçmiş |
| Profilim | `/account/profile` | Ad, e-posta, telefon güncelleme |
| Şifre Değiştir | `/account/password` | Mevcut şifre ile yeni şifre belirleme |
| Ayarlar | `/account/settings` | Bildirim tercihleri |

#### Sadakat puanları

- Her tamamlanan transfer için ödenen tutar üzerinden puan kazanılır
- Puanlar otomatik olarak birikir, tier atlamak indirim oranını artırır
- Rezervasyon onay ekranında mevcut sadakat indirimi fiyata otomatik yansır

#### Şifre sıfırlama

1. `/forgot-password` sayfasına gidin
2. Kayıtlı e-posta adresinizi girin
3. E-postanıza gelen kodu doğrulayın
4. Yeni şifrenizi belirleyin

---

### Admin Paneli

`/admin` — Yalnızca `ADMIN` rolündeki kullanıcılar erişebilir.

#### Kontrol Paneli (`/admin/dashboard`)

Anlık sistem istatistikleri: toplam rezervasyon, aktif kullanıcı, gelir özeti, son işlemler.

#### Rezervasyon Yönetimi (`/admin/reservations`)

- Tüm rezervasyonları listele, filtrele (durum, tarih, kullanıcı)
- Rezervasyon detayını görüntüle (rota, fiyat dökümü, durum geçmişi)
- Durum güncelle: `PENDING → ASSIGNED → COMPLETED` veya `CANCELLED`
- Durum değişikliğinde kullanıcıya otomatik bildirim gönderilir

**Rezervasyon durumları:**

| Durum | Anlam |
|---|---|
| PENDING | Onay bekleniyor |
| ASSIGNED | Sürücü atandı |
| COMPLETED | Transfer tamamlandı |
| CANCELLED | İptal edildi |
| NO_SHOW | Müşteri gelmedi |

#### Kullanıcı Yönetimi (`/admin/users`)

- Kullanıcı listesi, arama ve filtreleme
- Kullanıcı detayı: profil, rezervasyon geçmişi, sadakat hesabı
- Kullanıcı hesabını aktif/pasif yapma

#### Araç Yönetimi (`/admin/vehicles`)

- Araç ekleme, düzenleme, silme
- Araç sınıfı: STANDARD, BUSINESS, PREMIUM, VAN, MINIBUS
- Her araç için kapasite ve aktiflik durumu

#### Kampanya Yönetimi (`/admin/campaigns`)

- Kampanya kodu oluşturma (yüzde veya sabit indirim)
- Geçerlilik tarihi, kullanım limiti, minimum tutar belirleme
- Kampanya aktif/pasif yapma

#### Fiyatlandırma Bölgeleri (`/admin/pricing-zones`)

- Coğrafi fiyatlandırma bölgelerini harita üzerinde yönetme
- Her bölge için km başı ücret, taban fiyat, minimum fiyat belirleme
- Bölgeler çakışırsa daha küçük (özgün) bölge öncelik alır

#### Fiyatlandırma Kuralları (`/admin/pricing-rules`)

- Bölgeye bağlı zaman dilimi çarpanları (yoğun saat, havalimanı ücreti vb.)
- Gün ve saat aralığı bazında çarpan tanımlama

#### Bildirimler (`/admin/notifications`)

- Gönderilen bildirimlerin listesi ve durumu (PENDING, SENT, FAILED)
- Kanal bazında filtreleme (EMAIL, SMS, WHATSAPP, PUSH)

#### Çeviriler (`/admin/translations`)

- Uygulama içi metinleri çok dilde yönetme

---

## Servisler ve Portlar

| Konteyner | Port | Erişim |
|---|---|---|
| `vip-api-gateway` | **8888** | Tüm uygulama giriş noktası (frontend + API) |
| `vip-grafana` | **3000** | İzleme dashboardları |
| `vip-prometheus` | **9090** | Metrik veritabanı |
| `vip-loki` | **3100** | Log veritabanı (Grafana üzerinden erişilir) |
| `vip-postgres` | **5432** | Veritabanı (IDE bağlantısı için) |
| `vip-backend` | — | Yalnızca iç ağda (8080) |
| `vip-frontend` | — | Yalnızca iç ağda |

> Backend ve frontend doğrudan dışarıya açık değildir. Tüm istekler `vip-api-gateway` (Nginx, port 8888) üzerinden geçer.

---

## API Referansı

Tüm API istekleri `http://localhost:8888/api` üzerinden yapılır.

Swagger UI: **http://localhost:8888/swagger-ui.html**

### Kimlik Doğrulama

```
POST /api/auth/register          Kayıt ol
POST /api/auth/login             Giriş yap (JWT döner)
POST /api/auth/refresh           Token yenile
POST /api/auth/logout            Çıkış yap
POST /api/auth/verify-email      E-posta doğrula
POST /api/auth/forgot-password   Şifre sıfırlama kodu gönder
POST /api/auth/reset-password    Yeni şifre belirle
```

### Rezervasyonlar

```
POST   /api/reservations                              Rezervasyon oluştur
POST   /api/reservations/price-preview                Fiyat önizleme (giriş gerekmez)
GET    /api/reservations/my                           Kendi rezervasyonlarım
GET    /api/reservations/guest/{bookingRef}?phone=    Misafir rezervasyon sorgula
GET    /api/reservations/{id}                         Rezervasyon detayı (admin)
PATCH  /api/reservations/{id}/status                  Durum güncelle (admin)
DELETE /api/reservations/{id}                         Rezervasyon sil (admin)
```

### Kullanıcılar

```
GET    /api/users                  Tüm kullanıcılar (admin)
GET    /api/users/me               Kendi profili
PATCH  /api/users/me               Profil güncelle
PATCH  /api/users/me/password      Şifre değiştir
DELETE /api/users/me               Hesabı sil
```

### Araçlar

```
GET    /api/vehicles               Araç listesi (giriş gerekmez)
POST   /api/vehicles               Araç ekle (admin)
PUT    /api/vehicles/{id}          Araç düzenle (admin)
DELETE /api/vehicles/{id}          Araç sil (admin)
```

### Fiyatlandırma

```
GET    /api/pricing-zones          Bölge listesi
POST   /api/pricing-zones          Bölge ekle (admin)
PUT    /api/pricing-zones/{id}     Bölge düzenle (admin)
GET    /api/pricing-rules          Kural listesi
POST   /api/pricing-rules          Kural ekle (admin)
```

### Kampanyalar

```
GET    /api/campaigns              Kampanya listesi (admin)
GET    /api/campaigns/code/{code}  Kampanya kodu sorgula
POST   /api/campaigns              Kampanya oluştur (admin)
PUT    /api/campaigns/{id}         Kampanya düzenle (admin)
```

### Sadakat

```
GET    /api/loyalty/me             Kendi sadakat hesabı
GET    /api/loyalty                Tüm hesaplar (admin)
```

### Bildirimler

```
GET    /api/notifications          Bildirim listesi (admin)
GET    /api/notification-preferences/me     Bildirim tercihleri
PUT    /api/notification-preferences/me     Bildirim tercihlerini güncelle
```

---

## İzleme ve Loglama

### Grafana — http://localhost:3000

Varsayılan kullanıcı: `.env` içindeki `GF_ADMIN_USER` / `GF_ADMIN_PASSWORD`

**Hazır dashboardlar (VIP Transfer klasörü):**
- **VIP Transfer - Sistem İzleme**: JVM heap, CPU, HTTP istek sayısı, yanıt süresi, DB bağlantı havuzu
- **SOC Dashboard**: Güvenlik olayları, başarısız giriş denemeleri, anormal trafik

### Prometheus — http://localhost:9090

Spring Boot Actuator metrikleri otomatik toplanır:
- `http_server_requests_seconds` — endpoint bazında yanıt süreleri
- `jvm_memory_used_bytes` — JVM bellek kullanımı
- `hikaricp_connections_active` — aktif DB bağlantıları

### Loglama (Loki + Promtail)

Tüm konteyner logları Promtail tarafından toplanır ve Loki'ye gönderilir. Grafana'da **Explore** → **Loki** seçerek sorgulayabilirsiniz:

```logql
{container="vip-backend"} |= "ERROR"
{container="vip-backend"} |= "rezervasyon"
```

---

## Geliştirici Notları

### Veritabanı bağlantısı (IDE)

```
Host: localhost
Port: 5432
Database: vip_transfer_db
User: postgres (veya .env'deki POSTGRES_USER)
Password: .env'deki POSTGRES_PASSWORD
```

### Backend'i yeniden derle ve başlat

```bash
docker compose up -d --build --no-deps backend-service
```

### Frontend'i yeniden derle ve başlat

```bash
docker compose up -d --build --no-deps frontend-service
```

### Fiyatlandırma bölgesi verilerini sıfırla

```bash
docker exec -i vip-postgres psql -U postgres -d vip_transfer_db \
  -c "TRUNCATE pricing_rules, pricing_zones RESTART IDENTITY CASCADE;"
```

Ardından `sql-scripts/scripts.sql` içindeki DO bloğu bir sonraki başlatmada çalışır.

### Swagger / OpenAPI

Geliştirme ortamında API dokümantasyonuna erişmek için:
```
http://localhost:8888/swagger-ui.html
http://localhost:8888/v3/api-docs
```

### Ortam notları

- Mail, SMS ve WhatsApp devre dışıyken uygulama sorunsuz çalışır; bildirimler sessizce atlanır
- `FIREBASE_ENABLED=true` için `secrets/firebase-service-account.json` zorunludur, aksi halde backend başlamaz
- Push bildirimleri yalnızca HTTPS veya `localhost` üzerinde çalışır (tarayıcı güvenlik kısıtlaması)
