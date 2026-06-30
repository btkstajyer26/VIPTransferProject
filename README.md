# 🚐 VIP TRANSFER REZERVASYON SİSTEMİ
### Kurumsal Mikroservis Staj Projesi Dokümanı

---

## 📌 1. Projenin Amacı ve Genel Tanımı
Bu projenin amacı, gerçek hayatta büyük ölçekli lojistik ve taşımacılık firmaları tarafından kullanılan kurumsal düzeyde bir **VIP Transfer Rezervasyon Sistemi**'nin mikroservis mimarisiyle, uçtan uca simüle edilerek geliştirilmesidir. 

Proje; sadece yazılım geliştirme süreçlerini değil, aynı zamanda veri analitiği, siber güvenlik altyapısı ve gelişmiş ağ/sistem operasyonlarını kapsayan çok disiplinli bir mühendislik çalışması olarak kurgulanmıştır.

---

## 🏗️ 2. Ortak Teknolojik Altyapı ve Servis Mimarisi
Proje kapsamında kurulacak ekosistem, bağımsız mikroservislerin API Gateway arkasında güvenli ve senkron/asenkron haberleşmesi esasına dayanır. Kullanılacak ortak yapılar şu şekildedir:

*   **Mikroservis Bileşenleri:** `Authentication Service`, `User Service`, `Reservation Service`, `Pricing Service`, `Loyalty Service`, `Notification Service`, `Localization Service` (Ortak Kütüphane/Servis), `API Gateway`.
*   **Veri Tabanı ve Depolama:** PostgreSQL (İlişkisel Veri Yönetimi), Redis (Dağıtık Önbellekleme - İsteğe Bağlı).
*   **Ortak Mekanizmalar:** Çoklu dil (Localization/i18n) desteği (Türkçe ve İngilizce zorunlu), JWT tabanlı merkezi güvenlik.

---

## 👥 3. Rol Bazlı Ekip İş Bölümü ve Görev Dağılımı
Projenin başarısı, 5 farklı uzmanlık alanındaki stajyer gruplarının entegre çalışmasına bağlıdır. Rollerin spesifik sorumluluk alanları aşağıda detaylandırılmıştır:

### ☕ 3.1. Backend Geliştirme (Java / Spring Boot Ekibi)
Sistemin kalbini oluşturan iş mantığını ve veri kalıcılığı katmanını inşa etmekle sorumludur.
*   **Teknoloji Seti:** Java 21, Spring Boot, Maven, PostgreSQL, Hibernate / JPA, Spring Security, JWT, Swagger / OpenAPI.
*   **Sorumluluklar ve Görevler:**
    *   Belirtilen tüm mikroservisleri katmanlı mimariye (`Controller`, `Service`, `Repository`, `DTO`) uygun şekilde geliştirmek.
    *   **Girişsiz Rezervasyon Akışı:** Login olmadan telefon numarası bazlı rezervasyon oluşturma mantığını kurmak. Telefon numarası eşleşmesine göre kullanıcı geçmişini konsolide etmek.
    *   **Polygon ve Bölgesel Fiyatlandırma:** Harita üzerindeki koordinat verilerini (Polygon) PostgreSQL tabanında (mümkünse PostGIS veya koordinat matematik mantığı ile) saklamak; başlangıç/varış noktalarının bu polygon içinde olup olmadığını doğrulayarak dinamik fiyat hesaplayan algoritmayı `Pricing Service` içinde yazmak.
    *   Tüm API uçlarını Swagger ile dökümante etmek ve küresel hata yönetim (`Global Exception Handling`) yapısını kurmak.

### 💻 3.2. Web Frontend Geliştirme Ekibi
Hem son kullanıcıların rezervasyon yapabileceği modern web arayüzünü hem de operasyonun yönetildiği kapsamlı Yönetim Panelini (Admin Dashboard) geliştirmekle sorumludur.
*   **Teknoloji Seti:** React / Vue / Angular (Ekip seçebilir) veya Native/Vanilla JavaScript, Tailwind CSS / Bootstrap, i18next (Localization).
*   **Sorumluluklar ve Görevler:**
    *   **Kullanıcı Arayüzü:** Login olmadan hızlıca rezervasyon yapılabilen akıcı bir form ve Google Maps Places API entegrasyonu ile adres arama/seçme ekranı oluşturmak. Giriş yapmış kullanıcılar için sadakat puanı ve geçmiş paneli.
    *   **Yönetim Paneli (Admin):** Kullanıcı, rezervasyon, araç, kampanya ve sadakat sisteminin yönetileceği CRUD ekranlarını tasarlamak.
    *   **Polygon Çizim Aracı:** Admin panelinde Google Maps üzerinde görsel olarak polygon çizilmesini, bu polygon koordinatlarının backend'e gönderilmesini ve bölgesel fiyatlandırma tanımlanmasını sağlamak. *(Not: Ekip hazır kütüphaneler yerine tamamen Native/Vanilla JS de tercihebilir.)*

### 📱 3.3. Mobil Geliştirme Ekibi
Son kullanıcıların hareket halindeyken rezervasyon yapabilmelerini ve seyahatlerini takip edebilmelerini sağlayacak mobil uygulamayı geliştirir.
*   **Teknoloji Seti:** Flutter / React Native / Kotlin / Swift (Ekip seçimine bırakılmıştır).
*   **Sorumluluklar ve Görevler:**
    *   Web arayüzündeki tüm kullanıcı fonksiyonlarını (girişli/girişsiz rezervasyon, geçmiş takibi, sadakat puanı gösterimi, çoklu dil desteği) mobil ortama taşımak.
    *   Google Maps Mobile SDK entegrasyonu ile yerel cihazlarda yüksek performanslı adres seçimi ve harita gösterimi sunmak.
    *   Yönetim panelinden tetiklenen veya rezervasyon durum değişikliklerinde çalışan anlık bildirim (`Push Notification`) altyapısını cihaza entegre etmek.

### 📊 3.4. Veri Bilimi (Data Science) Ekibi
Sistemde biriken verilerden kurumsal katma değer, akıllı tahminler ve optimizasyon modelleri üretmekle sorumludur.
*   **Teknoloji Seti:** Python, Pandas, Scikit-Learn, XGBoost / LightGBM, Statsmodels, Jupyter Notebook.
*   **Sorumluluklar ve Görevler:**
    *   **Dinamik Fiyatlandırma ve Yoğunluk Tahmini:** Geçmiş rezervasyon zamanları, özel günler, hava durumu ve lokasyon bazlı polygon yoğunluklarını analiz ederek geleceğe yönelik talep tahmin modelleri geliştirmek. `Pricing Service`'e girdi sağlayacak akıllı bir çarpan (`Surge Pricing`) mekanizması simüle etmek.
    *   **Müşteri Segmentasyonu ve Sadakat Analizi:** Kullanıcıların rezervasyon sıklığı, harcama miktarları ve iptal eğilimlerine göre RFM (Recency, Frequency, Monetary) analizi yaparak kümeleme (K-Means vb.) modelleri çıkarmak. Admin paneline 'kaybedilmek üzere olan' veya 'sadık VIP' müşteri listeleri önermek.

### 🛡️ 3.5. Siber Güvenlik (Cyber Security) Uzmanı
Projenin tasarım aşamasından canlıya alınma aşamasına kadar tüm katmanlarda bilgi güvenliğini ve siber dayanıklılığı sağlamakle sorumludur.
*   **Teknoloji Seti:** OWASP ZAP, SonarQube / OWASP Dependency-Check, Burp Suite, Wireshark, Linux Security Tools.
*   **Sorumluluklar ve Görevler:**
    *   **API ve Gateway Güvenliği:** API Gateway üzerindeki JWT doğrulama mekanizmalarını incelemek, Brute-Force ve DoS/DDoS risklerine karşı istek sınırlama (`Rate Limiting`) kurallarını denetlemek.
    *   **Zafiyet Tarama ve Sızma Testleri:** OWASP Top 10 risklerine (SQL Injection, XSS, BOLA vb.) karşı API uçlarını test etmek ve kapatılması gereken açıkları raporlamak.
    *   **Güvenli Kod ve Bağımlılık Analizi:** Projede kullanılan Java bağımlılıkları veya npm paketlerindeki bilinen açıkları (CVE) taramak amacıyla statik/dinamik analiz (SAST/DAST) araçlarının çıktılarını denetlemek.

### ⚙️ 3.6. Ağ ve Sistem Operasyonları (Network / DevOps) Uzmanı
Mikroservislerin izole ve yüksek erişilebilir bir altyapıda çalışmasını, dağıtım hatlarının kurulmasını ve sistemlerin izlenmesini üstlenir.
*   **Teknoloji Seti:** Docker, Docker Compose, Spring Cloud Gateway / Nginx, GitHub Actions, Prometheus, Grafana.
*   **Sorumluluklar ve Görevler:**
    *   **Konteynerleştirme ve İzole Ağ Tasarımı:** Tüm mikroservisleri ve PostgreSQL veritabanını Dockerize etmek. Sadece API Gateway'in dış dünyaya açık olacağı, diğer servislerin ise kendi aralarında izole bir iç ağda (`Docker Network`) haberleşeceği ağ mimarisini kurmak.
    *   **Yük Dengeleme ve Service Discovery:** Gelen isteklerin mikroservislere dengeli dağıtılması için API Gateway/Nginx konfigürasyonunu ve servislerin dinamik yerleşimi için Service Discovery yapısını kurmak veya simüle etmek.
    *   **CI/CD Boru Hattı ve İzleme (Monitoring):** Kodun ana dallara birleşmesiyle otomatik derleme ve test süreçlerini çalıştıran CI/CD hatlarını tasarlamak. Sistem sağlığı (`Health Check`), CPU, RAM ve ağ gecikmelerini anlık izlemek için Prometheus ve Grafana panelleri hazırlamak.

---

## 🗺️ 4. Rollerin Matris Görev Dağılım Özeti

| Ekip / Rol | Temel Sorumluluk Alanı | Kritik Entegrasyon Noktası |
| :--- | :--- | :--- |
| **Backend (Java)** | İş mantığı, Veritabanı CRUD, Polygon algoritması | API Gateway, Veri Bilimi modelleri |
| **Web Frontend** | Kullanıcı Arayüzü, Admin Paneli, Polygon çizim ekranı (Kütüphane veya Native JS) | Google Maps API, Backend REST API |
| **Mobil Ekip** | Mobil Rezervasyon Akışı, Push Notification altyapısı | Google Maps Mobile SDK, Backend REST API |
| **Veri Bilimi** | Dinamik Fiyatlandırma, Müşteri Segmentasyonu | Pricing Service veri beslemesi |
| **Siber Güvenlik** | Sızma testleri, JWT denetimi, Rate Limit doğrulama | API Gateway ve Kod güvenliği denetimi |
| **Network / DevOps** | Docker Ağları, CI/CD, Sistem İzleme (Grafana) | Tüm mikroservislerin yayına alınması |

---

## 🌿 5.Git & Branch Kullanım Kılavuzu

Projemizde takım çalışmasını sağlıklı yürütmek ve kod karışıklıklarını önlemek adına **Gitflow** stratejisi uygulanacaktır[cite: 1]. Ana dalımız (`main`) koruma altına alınmıştır; bu nedenle doğrudan `main` branch'ine kod gönderilemez.

Her ekip üyesinin aşağıdaki branch (dal) yapısına uygun şekilde çalışması gerekmektedir:

### 🚀 5.1. Branch (Dal) Dağılımı

Her uzmanlık alanı, geliştirmelerini kendilerine ait ana alt branch'ler üzerinden yürütecektir. Kendi alanınızla ilgili çalışmaya başlamadan önce lütfen ilgili branch'i oluşturun. Örneğin;

*   **Backend Ekibi:** Geliştirmeler için `backend` branch'ini kullanacaktır.
 
> 💡 **Kişisel Çalışma Notu:** Büyük özellikler veya kişisel görevler eklerken bu ana dallardan kendi adınıza geçici alt dallar açabilirsiniz (Örn: `backend/auth-service`, `frontend/login-screen`).

---

### 🔄 5.2 Çalışma ve Kod Birleştirme (PR) Akışı

Kodlarınızı projeye dahil etmek için şu adımları izlemelisiniz:

1.  **Kendi Branch'inizde Çalışın:** Asla `main` üzerinde değişiklik yapmayın. Kendi alanınıza ait branch'te kodunuzu yazın ve commitleyin.
2.  **Push Atın:** Değişikliklerinizi GitHub'a pushlayın (Örn: `git push origin backend`).
3.  **Pull Request (PR) Açın:** Kodunuz tamamlandığında, GitHub üzerinden `main` branch'ine doğru bir **Pull Request (PR)** oluşturun.
4.  **Kod İncelemesi (Code Review):** Açılan PR'ların `main` ile birleşebilmesi için **ekibinizden en az 1 arkadaşınızın** kodunuzu inceleyip onaylaması (*Approve*) gerekmektedir.
5.  **Merge:** Onay alındıktan sonra conflict (çelişki) yoksa PR'ı merge ederek kodunuzu ana projeye dahil edebilirsiniz.

## 🏆 Değerlendirme ve Başarı Kriterleri
Projenin nihai başarısı; yazılan kodun temizliği (**Clean Code / SOLID**), mikroservislerin birbiriyle uyumu, ağın güvenliği ve yalıtımı, güvenlik testlerinden başarıyla geçilmesi ve veri bilimi ekibinin ürettiği öngörülerin admin paneline yansıtılma derecesi ile ölçülecektir. 

⚠️ **Önemli Not:** Tüm ekiplerin ortak bir Git stratejisi (**Gitflow**) izlemesi zorunludur.
