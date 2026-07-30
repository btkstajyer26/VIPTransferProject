import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Şimdilik sadece statik boş kaynaklar tanımlıyoruz.
// Amacımız, uygulamanın aktif dil durumunu (state) yönetmek ve Backend'e iletmek.
// İleride statik metin çevirileri eklenmek istenirse buraya eklenebilir.
const resources = {
  TR: {
    translation: {
      nav: { home: "Ana Sayfa", services: "Hizmetlerimiz", vehicles: "Araçlarımız", howItWorks: "Nasıl Çalışır?", contact: "İletişim", account: "Hesabım", logout: "Çıkış", login: "Giriş Yap", register: "Kayıt Ol" },
      hero: { badge: "Premium VIP Transfer Deneyimi", titleMain: "Yolculuğunuzun her anında", titleHighlight: "konfor ve ayrıcalık.", subtitle: "Havalimanı ve şehir içi transferlerinizi profesyonel sürücüler, premium araçlar ve şeffaf fiyatlarla kolayca planlayın.", features: { support: "7/24 Hizmet", security: "Güvenli Yolculuk", fixedPrice: "Sabit Fiyat", liveSupport: "Canlı Destek" } },
      benefits: {
        badge: "Neden bizi tercih etmelisiniz?", title: "Yolculuğunuz için ihtiyacınız olan her şey", subtitle: "Konfor, güvenlik ve dakiklik odaklı premium transfer hizmeti.",
        items: { profDrivers: "Profesyonel Sürücüler", profDriversDesc: "Deneyimli ve özenle seçilmiş sürücülerle güvenli yolculuk.", onTime: "Zamanında Karşılama", onTimeDesc: "Uçuş ve rezervasyon bilgilerinize göre zamanında karşılama.", pricing: "Şeffaf Fiyatlandırma", pricingDesc: "Sürpriz ücretler olmadan önceden belirlenmiş sabit fiyatlar.", support: "7/24 Destek", supportDesc: "Rezervasyon öncesinde ve sonrasında kesintisiz destek." }
      },
      howItWorks: {
        badge: "Nasıl çalışır?", title: "Üç adımda transferinizi planlayın", subtitle: "Karmaşık işlemler olmadan, birkaç dakika içerisinde rezervasyonunuzu oluşturun.",
        steps: { step1Title: "Rotanızı belirleyin", step1Desc: "Alınış ve varış adresinizi, tarih ve saat bilgilerinizi girin.", step2Title: "Aracınızı seçin", step2Desc: "Yolcu sayınıza ve ihtiyacınıza uygun premium aracı seçin.", step3Title: "Rezervasyonu tamamlayın", step3Desc: "İletişim bilgilerinizi ekleyerek transferinizi güvence altına alın." }
      },
      vehicles: { badge: "Araç filomuz", title: "Her yolculuk için doğru araç", subtitle: "Bireysel, aile veya grup transferleri için konforlu ve modern araç seçeneklerini inceleyin.", viewAll: "Tüm araçları görüntüle", passenger: "yolcu", luggage: "bagaj", bookThis: "Bu araçla rezervasyon yap" },
      reservationForm: { badge: "Hızlı Rezervasyon", title: "Transferinizi planlayın", addReturn: "Dönüş transferi ekle", from: "Nereden", fromPlaceholder: "Havalimanı, otel veya adres seçin", to: "Nereye", toPlaceholder: "Havalimanı, otel veya adres seçin", date: "Tarih", time: "Saat", passengers: "Yolcu", passengerCount: "Yolcu", searchButton: "Araçları Gör" },
      customerSummary: {
        guest: { badge: "Üyelere özel ayrıcalıklar", title: "Her yolculukta puan kazanın", subtitle: "Üye olarak rezervasyon geçmişinizi görüntüleyebilir, bilgilerinizi tekrar girmeden hızlı rezervasyon yapabilir ve sadakat puanı kazanabilirsiniz.", features: { loyalty: "Sadakat puanı", history: "Rezervasyon geçmişi", quickRes: "Hızlı rezervasyon" }, registerBtn: "Ücretsiz kayıt ol", loginBtn: "Giriş yap" },
        auth: { welcomeBack: "Tekrar hoş geldiniz", title: "Yolculuğunuzu planlamaya hazır mısınız?", subtitle: "Yaklaşan rezervasyonlarınızı kontrol edin veya yeni bir transfer oluşturun.", newResBtn: "Yeni rezervasyon", myResBtn: "Rezervasyonlarım", loyaltyProgram: "Sadakat programı", currentPoints: "Mevcut puanınız", pointsSuffix: "puan", loyaltyDesc: "Tamamlanan transferlerinizden puan kazanarak avantajlardan yararlanın.", viewDetails: "Puan detaylarını gör", userId: "Kullanıcı ID:" }
      },
      authPage: {
        loginTitle: "Hoş geldiniz", loginSubtitle: "Devam etmek için telefon numaranız ve şifrenizle giriş yapın.", phoneLabel: "Telefon numarası", phonePlaceholder: "05XX XXX XX XX", passwordLabel: "Şifre", passwordPlaceholder: "Şifrenizi girin", loginBtn: "Giriş Yap", loggingIn: "Giriş yapılıyor", noAccount: "Henüz hesabınız yok mu?", registerLink: "Kayıt olun", secureText: "Giriş işlemleriniz güvenli bağlantı üzerinden gerçekleştirilmektedir.",
        registerTitle: "Yeni hesap oluşturun", registerSubtitle: "Rezervasyonlarınızı takip etmek ve sadakat avantajlarından yararlanmak için kayıt olun.", firstName: "Ad", firstNamePlaceholder: "Adınız", lastName: "Soyad", lastNamePlaceholder: "Soyadınız", email: "E-posta", emailPlaceholder: "ornek@mail.com", passwordConfirm: "Şifre tekrarı", passwordConfirmPlaceholder: "Şifrenizi tekrar girin", registerBtn: "Kayıt Ol", registering: "Hesap oluşturuluyor", hasAccount: "Zaten hesabınız var mı?", loginLink: "Giriş yapın",
        heroTitle: "Yolculuk deneyiminizi kolayca yönetin.", heroSubtitle: "Rezervasyonlarınıza erişin, transfer süreçlerinizi takip edin ve hesabınıza özel hizmetleri tek platform üzerinden kullanın.", heroNotice: "Hesabınıza güvenli şekilde giriş yaparak devam edin.",
        verifyTitle: "E-posta Doğrulama", verifySuccess: "E-posta Adresiniz Doğrulandı", verifySuccessDesc: "Hesabınız başarıyla aktifleştirildi. Artık giriş yapabilir ve tüm özelliklerden yararlanabilirsiniz.", verifyErrorTitle: "Doğrulama Başarısız", verifyErrorDesc: "Bağlantınız geçersiz veya süresi dolmuş olabilir. Lütfen destek ile iletişime geçin.", verifyPendingTitle: "E-postanızı doğrulayın", verifyPendingDesc: "adresine gönderilen 6 haneli kodu girin.", verifyPendingFooter: "Gelen kutunuzda bulamazsanız, lütfen Spam (İstenmeyen) klasörünü kontrol edin.", backToLogin: "Giriş sayfasına dön", verifyCodeLabel: "Doğrulama Kodu", verifyBtn: "Doğrula", verifyingBtn: "Doğrulanıyor...", didNotReceive: "Kodu almadınız mı?", registerAgain: "Tekrar kayıt olun"
      },
      reservationSystem: {
        title: "Rezervasyon Oluştur", subtitle: "Lütfen yolculuğunuz için gerekli bilgileri doldurun.",
        tabs: { selectVehicle: "Araç Seçimi", details: "Detaylar", payment: "Ödeme" },
        vehicleSelect: { title: "Araç Seçimi", subtitle: "Size en uygun aracı seçin." },
        details: { title: "Yolcu Detayları", subtitle: "Lütfen iletişim ve yolcu bilgilerini girin." },
        payment: { title: "Ödeme", subtitle: "Ödeme yönteminizi seçin." },
        buttons: { next: "Devam Et", back: "Geri", submit: "Rezervasyonu Tamamla" }
      },
      loyaltyPage: {
        title: "Sadakat Programım", subtitle: "Toplam puanınızı ve sadakat seviyenizi görüntüleyin.",
        currentPoints: "Mevcut Puanınız", totalEarned: "Toplam Kazanılan", totalSpent: "Toplam Harcanan",
        history: "Puan Geçmişi", noHistory: "Henüz bir puan geçmişiniz bulunmuyor.", earnMore: "Daha fazla puan kazanmak için yeni bir rezervasyon oluşturun.", loadingAccount: "Sadakat hesabı yükleniyor...", refreshBtn: "Yenile",
        cardTitle: "Sadakat Hesabı", cardDesc: "Kullanıcının toplam puanı ve mevcut seviyesi.", userId: "Kullanıcı ID", totalPoints: "Toplam Puan", tier: "Seviye"
      },
      footer: {
        subtitle: "Havalimanı ve şehir içi ulaşımda güvenli, konforlu ve premium transfer hizmeti.", services: "Hizmetler",
        servicesLinks: { airport: "Havalimanı Transferi", city: "Şehir İçi Transfer", rent: "Şoförlü Araç Kiralama", corporate: "Kurumsal Transfer" },
        quickLinksTitle: "Hızlı Bağlantılar", quickLinks: { about: "Hakkımızda", vehicles: "Araçlarımız", reservation: "Rezervasyon", privacy: "Gizlilik Politikası" },
        contact: "İletişim", rights: "© 2026 VIP Transfer. Tüm hakları saklıdır.", slogan: "Güvenli ve konforlu yolculuğun adresi."
      },
      admin: {
        topbar: { title: "Yönetim Paneli", subtitle: "VIP Transfer operasyonlarını yönetin.", admin: "Admin", manager: "Yönetici" },
        sidebar: { dashboard: "Dashboard", users: "Kullanıcılar", reservations: "Rezervasyonlar", vehicles: "Araçlar", campaigns: "Kampanyalar", loyalty: "Sadakat Sistemi", pricing: "Fiyat Bölgeleri", notifications: "Bildirimler" },
        dashboard: {
          title: "Dashboard", subtitle: "Sistemin genel durumunu ve son rezervasyonları takip edin.", refresh: "Yenile",
          stats: { totalUsers: "Toplam Kullanıcı", totalUsersDesc: "Sistemdeki aktif kullanıcılar", totalRes: "Toplam Rezervasyon", totalResDesc: "Tüm rezervasyon kayıtları", activeVehicles: "Aktif Araç", activeVehiclesDesc: "Kullanıma hazır araçlar", pendingRes: "Bekleyen Rezervasyon", pendingResDesc: "Onay bekleyen rezervasyonlar" },
          latestRes: { title: "Son Rezervasyonlar", desc: "En son oluşturulan 5 rezervasyon kaydı.", loading: "Dashboard verileri yükleniyor...", empty: "Henüz rezervasyon kaydı bulunmuyor.", cols: { ref: "Referans", customer: "Müşteri", route: "Güzergâh", date: "Planlanan Tarih", vehicle: "Araç", price: "Tutar", status: "Durum" } }
        },
        users: {
          title: "Kullanıcılar", subtitle: "Sisteme kayıtlı aktif kullanıcıları yönetin.", refresh: "Yenile", listTitle: "Kullanıcı Listesi", listDesc: "Sistemde toplam {{count}} aktif kullanıcı bulunmaktadır.", loading: "Kullanıcılar yükleniyor..."
        },
        reservations: {
          title: "Rezervasyon Yönetimi", subtitle: "Tüm rezervasyonları görüntüleyin, filtreleyin ve durumlarını yönetin.", retry: "Tekrar dene", loading: "Rezervasyonlar yükleniyor..."
        },
        reservationList: {
          notFound: 'Rezervasyon bulunamadı',
          tryAgain: 'Arama veya filtre kriterlerini değiştirerek tekrar deneyin.',
          table: {
            reservation: 'Rezervasyon', customer: 'Müşteri', route: 'Güzergâh', date: 'Tarih', vehicle: 'Araç', passengers: 'Yolcu', price: 'Fiyat', status: 'Durum', action: 'İşlem',
            registered: 'Kayıtlı kullanıcı', guest: 'Misafir', pickup: 'Alış', dropoff: 'Varış', flight: 'Uçuş:', actions: 'Rezervasyon işlemleri', viewDetails: 'Detayları görüntüle', statusHistory: 'Durum geçmişi', changeStatus: 'Durumu değiştir'
          },
          toolbar: { searchPlaceholder: 'Rezervasyon kodu, adres, araç veya telefon ara...', selectStatus: 'Durum seç', allStatuses: 'Tüm Durumlar' },
          status: { PENDING: 'Bekliyor', ASSIGNED: 'Araç Atandı', COMPLETED: 'Tamamlandı', CANCELLED: 'İptal Edildi', NO_SHOW: 'Gelmedi', CONFIRMED: 'Onaylandı', DRIVER_ASSIGNED: 'Sürücü Atandı', ON_THE_WAY: 'Yolda', IN_PROGRESS: 'Devam Ediyor', unknown: 'Bilinmiyor', customerNoShow: 'Müşteri Gelmedi' },
          dialog: { title: 'Rezervasyon Durumunu Değiştir', desc: '{{ref}} numaralı rezervasyonun durumunu güncelleyin.', currentStatus: 'Mevcut Durum', cannotChangeTitle: 'Durum değiştirilemez', cannotChangeDesc: 'Bu rezervasyon son durumuna ulaşmıştır. Yeni bir durum seçilemez.', newStatus: 'Yeni Durum', selectNewStatus: 'Yeni durumu seçin', noteLabel: 'Durum Değişikliği Notu', notePlaceholder: 'Örneğin: Şoför ve araç bilgileri müşteriye iletildi.', cancel: 'Vazgeç', update: 'Durumu Güncelle' },
          errors: { fetchFailed: 'Rezervasyonlar alınırken bir hata oluştu.', updateFailed: 'Rezervasyon durumu güncellenirken bir hata oluştu.' }
        },
        vehicles: {
          title: "Araçlar", subtitle: "Sistemde kayıtlı transfer araçlarını yönetin.", listTitle: "Araç Listesi", listDesc: "Sistemde toplam {{count}} araç bulunmaktadır."
        },
        loyalty: {
          title: "Sadakat Yönetimi", subtitle: "Kullanıcıların sadakat puanlarını ve seviyelerini görüntüleyin.", searchTitle: "Kullanıcı Ara", searchDesc: "Sadakat hesabını görüntülemek için kullanıcı ID bilgisini girin.", label: "Kullanıcı ID", placeholder: "Örneğin: 6", searching: "Sorgulanıyor...", searchBtn: "Hesabı Görüntüle"
        },
        errors: { network: "Ağ Hatası", default: "Bir hata oluştu" },
        usersList: { searchPlaceholder: "Ad, e-posta veya telefon ara...", roleFilter: "Rol", allRoles: "Tüm roller", roles: { ADMIN: "Admin", CUSTOMER: "Müşteri" }, typeFilter: "Kullanıcı türü", allTypes: "Tüm kullanıcılar", types: { MEMBER: "Kayıtlı üyeler", GUEST: "Misafir kullanıcılar" }, notFound: "Filtrelere uygun kullanıcı bulunamadı.", table: { user: "Kullanıcı", phone: "Telefon", role: "Rol", type: "Tür", status: "Durum", registeredAt: "Kayıt tarihi", actions: "İşlemler", unnamed: "İsimsiz kullanıcı", noEmail: "E-posta bulunmuyor", guest: "Misafir", member: "Üye" } },
        vehiclesList: { searchPlaceholder: "Marka, model veya plaka ara...", classFilter: "Sınıf", allClasses: "Tüm sınıflar", statusFilter: "Durum", allStatuses: "Tüm durumlar", statuses: { ACTIVE: "Aktif", MAINTENANCE: "Bakımda", INACTIVE: "Pasif" }, notFound: "Filtrelere uygun araç bulunamadı.", table: { vehicle: "Araç / Plaka", classCapacity: "Sınıf / Kapasite", status: "Durum", year: "Yıl", price: "Baz Fiyat / Km", actions: "İşlemler" } },
        notifications: { title: "Bildirimler", subtitle: "Sistemdeki tüm bildirimleri görüntüleyin ve yönetin.", refresh: "Yenile", stats: { pending: "Bekleyen", sent: "Gönderilen", failed: "Başarısız", total: "Toplam" }, listTitle: "Bildirim Listesi", listDesc: "Tüm kanallardaki bildirimler listelenmektedir.", pendingActions: "işlem bekliyor", searchPlaceholder: "Başlık, mesaj veya kullanıcı ID ara...", statusFilter: "Durum", allStatuses: "Tüm Durumlar", statuses: { PENDING: "Bekliyor", SENT: "Gönderildi", DELIVERED: "İletildi", FAILED: "Başarısız", READ: "Okundu" }, channelFilter: "Kanal", allChannels: "Tüm Kanallar", channels: { EMAIL: "E-posta", SMS: "SMS", PUSH: "Push", WHATSAPP: "WhatsApp" }, notFound: "Bildirim bulunamadı.", table: { id: "ID", title: "Başlık", user: "Kullanıcı", channel: "Kanal", status: "Durum", createdAt: "Oluşturulma", sentAt: "Gönderilme", actions: "İşlem", error: "Hata:", send: "Gönder", markAsRead: "Okundu işaretle", read: "Okundu" } }
      }
    }
  },
  EN: {
    translation: {
      nav: { home: "Home", services: "Services", vehicles: "Vehicles", howItWorks: "How it Works?", contact: "Contact", account: "My Account", logout: "Logout", login: "Login", register: "Sign Up" },
      hero: { badge: "Premium VIP Transfer Experience", titleMain: "At every moment of your journey,", titleHighlight: "comfort and privilege.", subtitle: "Easily plan your airport and intercity transfers with professional drivers, premium vehicles, and transparent pricing.", features: { support: "24/7 Service", security: "Safe Journey", fixedPrice: "Fixed Price", liveSupport: "Live Support" } },
      benefits: {
        badge: "Why choose us?", title: "Everything you need for your journey", subtitle: "Premium transfer service focused on comfort, safety, and punctuality.",
        items: { profDrivers: "Professional Drivers", profDriversDesc: "Safe journey with experienced and carefully selected drivers.", onTime: "On-time Pickup", onTimeDesc: "Punctual greeting based on your flight and reservation details.", pricing: "Transparent Pricing", pricingDesc: "Pre-determined fixed prices with no hidden fees.", support: "24/7 Support", supportDesc: "Uninterrupted support before and after your reservation." }
      },
      howItWorks: {
        badge: "How it works?", title: "Plan your transfer in three steps", subtitle: "Create your reservation in minutes without complex processes.",
        steps: { step1Title: "Set your route", step1Desc: "Enter your pickup and drop-off addresses, date, and time details.", step2Title: "Choose your vehicle", step2Desc: "Select the premium vehicle that suits your passenger count and needs.", step3Title: "Complete reservation", step3Desc: "Secure your transfer by adding your contact information." }
      },
      vehicles: { badge: "Our fleet", title: "The right vehicle for every journey", subtitle: "Explore our comfortable and modern vehicle options for individual, family, or group transfers.", viewAll: "View all vehicles", passenger: "passengers", luggage: "luggage", bookThis: "Book with this vehicle" },
      reservationForm: { badge: "Quick Reservation", title: "Plan your transfer", addReturn: "Add return transfer", from: "From", fromPlaceholder: "Select airport, hotel, or address", to: "To", toPlaceholder: "Select airport, hotel, or address", date: "Date", time: "Time", passengers: "Passengers", passengerCount: "Passenger(s)", searchButton: "See Vehicles" },
      customerSummary: {
        guest: { badge: "Exclusive privileges", title: "Earn points on every journey", subtitle: "As a member, you can view your reservation history, make quick reservations without re-entering your details, and earn loyalty points.", features: { loyalty: "Loyalty points", history: "Reservation history", quickRes: "Quick reservation" }, registerBtn: "Sign up for free", loginBtn: "Login" },
        auth: { welcomeBack: "Welcome back", title: "Ready to plan your journey?", subtitle: "Check your upcoming reservations or create a new transfer.", newResBtn: "New reservation", myResBtn: "My Reservations", loyaltyProgram: "Loyalty program", currentPoints: "Current points", pointsSuffix: "points", loyaltyDesc: "Enjoy benefits by earning points from your completed transfers.", viewDetails: "View point details", userId: "User ID:" }
      },
      authPage: {
        loginTitle: "Welcome", loginSubtitle: "Log in with your phone number and password to continue.", phoneLabel: "Phone number", phonePlaceholder: "05XX XXX XX XX", passwordLabel: "Password", passwordPlaceholder: "Enter your password", loginBtn: "Login", loggingIn: "Logging in", noAccount: "Don't have an account yet?", registerLink: "Sign up", secureText: "Your login is processed securely.",
        registerTitle: "Create new account", registerSubtitle: "Sign up to track reservations and enjoy loyalty benefits.", firstName: "First Name", firstNamePlaceholder: "Your first name", lastName: "Last Name", lastNamePlaceholder: "Your last name", email: "Email", emailPlaceholder: "example@mail.com", passwordConfirm: "Confirm Password", passwordConfirmPlaceholder: "Re-enter your password", registerBtn: "Sign Up", registering: "Creating account", hasAccount: "Already have an account?", loginLink: "Login",
        heroTitle: "Easily manage your travel experience.", heroSubtitle: "Access reservations, track transfers, and use personalized services on a single platform.", heroNotice: "Log in securely to your account to continue.",
        verifyTitle: "Email Verification", verifySuccess: "Your Email Has Been Verified", verifySuccessDesc: "Your account is active. You can now login.", verifyErrorTitle: "Verification Failed", verifyErrorDesc: "Your link might be invalid or expired. Please contact support.", verifyPendingTitle: "Verify your email", verifyPendingDesc: "enter the 6-digit code sent to", verifyPendingFooter: "If you can't find it, please check your Spam folder.", backToLogin: "Back to login", verifyCodeLabel: "Verification Code", verifyBtn: "Verify", verifyingBtn: "Verifying...", didNotReceive: "Didn't receive the code?", registerAgain: "Register again"
      },
      reservationSystem: {
        title: "Create Reservation", subtitle: "Please fill in the details for your journey.",
        tabs: { selectVehicle: "Vehicle Selection", details: "Details", payment: "Payment" },
        vehicleSelect: { title: "Vehicle Selection", subtitle: "Choose the vehicle that suits you best." },
        details: { title: "Passenger Details", subtitle: "Please enter contact and passenger details." },
        payment: { title: "Payment", subtitle: "Select your payment method." },
        buttons: { next: "Next", back: "Back", submit: "Complete Reservation" }
      },
      loyaltyPage: {
        title: "My Loyalty Program", subtitle: "View your total points and loyalty tier.",
        currentPoints: "Current Points", totalEarned: "Total Earned", totalSpent: "Total Spent",
        history: "Points History", noHistory: "You don't have a points history yet.", earnMore: "Create a new reservation to earn more points.", loadingAccount: "Loading loyalty account...", refreshBtn: "Refresh",
        cardTitle: "Loyalty Account", cardDesc: "User's total points and current tier.", userId: "User ID", totalPoints: "Total Points", tier: "Tier"
      },
      footer: {
        subtitle: "Safe, comfortable, and premium transfer service for airport and intercity transportation.", services: "Services",
        servicesLinks: { airport: "Airport Transfer", city: "Intercity Transfer", rent: "Chauffeured Car Rental", corporate: "Corporate Transfer" },
        quickLinksTitle: "Quick Links", quickLinks: { about: "About Us", vehicles: "Our Vehicles", reservation: "Reservation", privacy: "Privacy Policy" },
        contact: "Contact", rights: "© 2026 VIP Transfer. All rights reserved.", slogan: "The address of a safe and comfortable journey."
      },
      admin: {
        topbar: { title: "Admin Panel", subtitle: "Manage VIP Transfer operations.", admin: "Admin", manager: "Manager" },
        sidebar: { dashboard: "Dashboard", users: "Users", reservations: "Reservations", vehicles: "Vehicles", campaigns: "Campaigns", loyalty: "Loyalty System", pricing: "Pricing Zones", notifications: "Notifications" },
        dashboard: {
          title: "Dashboard", subtitle: "Monitor the overall system status and latest reservations.", refresh: "Refresh",
          stats: { totalUsers: "Total Users", totalUsersDesc: "Active users in the system", totalRes: "Total Reservations", totalResDesc: "All reservation records", activeVehicles: "Active Vehicles", activeVehiclesDesc: "Vehicles ready for use", pendingRes: "Pending Reservations", pendingResDesc: "Reservations awaiting approval" },
          latestRes: { title: "Latest Reservations", desc: "The last 5 created reservation records.", loading: "Loading dashboard data...", empty: "No reservation records yet.", cols: { ref: "Reference", customer: "Customer", route: "Route", date: "Scheduled Date", vehicle: "Vehicle", price: "Amount", status: "Status" } }
        },
        users: {
          title: "Users", subtitle: "Manage active users registered in the system.", refresh: "Refresh", listTitle: "User List", listDesc: "There are a total of {{count}} active users in the system.", loading: "Loading users..."
        },
        reservations: {
          title: "Reservation Management", subtitle: "View, filter, and manage statuses of all reservations.", retry: "Try again", loading: "Loading reservations..."
        },
        reservationList: {
          notFound: 'Reservation not found',
          tryAgain: 'Try again by changing search or filter criteria.',
          table: {
            reservation: 'Reservation', customer: 'Customer', route: 'Route', date: 'Date', vehicle: 'Vehicle', passengers: 'Passenger(s)', price: 'Price', status: 'Status', action: 'Action',
            registered: 'Registered user', guest: 'Guest', pickup: 'Pickup', dropoff: 'Drop-off', flight: 'Flight:', actions: 'Reservation actions', viewDetails: 'View details', statusHistory: 'Status history', changeStatus: 'Change status'
          },
          toolbar: { searchPlaceholder: 'Search reservation code, address, vehicle or phone...', selectStatus: 'Select status', allStatuses: 'All Statuses' },
          status: { PENDING: 'Pending', ASSIGNED: 'Driver Assigned', COMPLETED: 'Completed', CANCELLED: 'Cancelled', NO_SHOW: 'No Show', CONFIRMED: 'Confirmed', DRIVER_ASSIGNED: 'Driver Assigned', ON_THE_WAY: 'On The Way', IN_PROGRESS: 'In Progress', unknown: 'Unknown', customerNoShow: 'Customer No Show' },
          dialog: { title: 'Change Reservation Status', desc: 'Update status of reservation {{ref}}.', currentStatus: 'Current Status', cannotChangeTitle: 'Status cannot be changed', cannotChangeDesc: 'This reservation has reached its final status. A new status cannot be selected.', newStatus: 'New Status', selectNewStatus: 'Select new status', noteLabel: 'Status Change Note', notePlaceholder: 'Example: Driver and vehicle info sent to customer.', cancel: 'Cancel', update: 'Update Status' },
          errors: { fetchFailed: 'An error occurred while fetching reservations.', updateFailed: 'An error occurred while updating the reservation status.' }
        },
        vehicles: {
          title: "Vehicles", subtitle: "Manage transfer vehicles registered in the system.", listTitle: "Vehicle List", listDesc: "There are a total of {{count}} vehicles in the system."
        },
        loyalty: {
          title: "Loyalty Management", subtitle: "View users' loyalty points and tiers.", searchTitle: "Search User", searchDesc: "Enter the user ID to view the loyalty account.", label: "User ID", placeholder: "Example: 6", searching: "Searching...", searchBtn: "View Account"
        },
        errors: { network: "Network Error", default: "An error occurred" },
        usersList: { searchPlaceholder: "Search name, email or phone...", roleFilter: "Role", allRoles: "All roles", roles: { ADMIN: "Admin", CUSTOMER: "Customer" }, typeFilter: "User type", allTypes: "All users", types: { MEMBER: "Registered members", GUEST: "Guest users" }, notFound: "No user found matching the filters.", table: { user: "User", phone: "Phone", role: "Role", type: "Type", status: "Status", registeredAt: "Registered At", actions: "Actions", unnamed: "Unnamed user", noEmail: "No email", guest: "Guest", member: "Member" } },
        vehiclesList: { searchPlaceholder: "Search brand, model or plate...", classFilter: "Class", allClasses: "All classes", statusFilter: "Status", allStatuses: "All statuses", statuses: { ACTIVE: "Active", MAINTENANCE: "Maintenance", INACTIVE: "Inactive" }, notFound: "No vehicle found matching the filters.", table: { vehicle: "Vehicle / Plate", classCapacity: "Class / Capacity", status: "Status", year: "Year", price: "Base Price / Km", actions: "Actions" } },
        notifications: { title: "Notifications", subtitle: "View and manage all notifications in the system.", refresh: "Refresh", stats: { pending: "Pending", sent: "Sent", failed: "Failed", total: "Total" }, listTitle: "Notification List", listDesc: "Notifications across all channels are listed.", pendingActions: "pending actions", searchPlaceholder: "Search title, message or user ID...", statusFilter: "Status", allStatuses: "All Statuses", statuses: { PENDING: "Pending", SENT: "Sent", DELIVERED: "Delivered", FAILED: "Failed", READ: "Read" }, channelFilter: "Channel", allChannels: "All Channels", channels: { EMAIL: "Email", SMS: "SMS", PUSH: "Push", WHATSAPP: "WhatsApp" }, notFound: "No notifications found.", table: { id: "ID", title: "Title", user: "User", channel: "Channel", status: "Status", createdAt: "Created At", sentAt: "Sent At", actions: "Action", error: "Error:", send: "Send", markAsRead: "Mark as read", read: "Read" } }
      }
    }
  },
  RU: {
    translation: {
      nav: { home: "Главная", services: "Услуги", vehicles: "Автомобили", howItWorks: "Как это работает?", contact: "Контакты", account: "Мой аккаунт", logout: "Выйти", login: "Войти", register: "Регистрация" },
      hero: { badge: "Опыт премиум VIP-трансфера", titleMain: "В каждый момент вашей поездки", titleHighlight: "комфорт и привилегии.", subtitle: "Легко планируйте свои трансферы в аэропорт и по городу с профессиональными водителями, премиальными автомобилями и прозрачными ценами.", features: { support: "24/7 Обслуживание", security: "Безопасная Поездка", fixedPrice: "Фиксированная Цена", liveSupport: "Живая Поддержка" } },
      benefits: {
        badge: "Почему выбирают нас?", title: "Всё необходимое для вашей поездки", subtitle: "Премиум-трансфер, ориентированный на комфорт, безопасность и пунктуальность.",
        items: { profDrivers: "Профессиональные водители", profDriversDesc: "Безопасная поездка с опытными и тщательно отобранными водителями.", onTime: "Своевременная встреча", onTimeDesc: "Пунктуальная встреча в зависимости от деталей вашего рейса и бронирования.", pricing: "Прозрачные цены", pricingDesc: "Заранее определенные фиксированные цены без скрытых комиссий.", support: "Круглосуточная поддержка", supportDesc: "Бесперебойная поддержка до и после вашего бронирования." }
      },
      howItWorks: {
        badge: "Как это работает?", title: "Спланируйте трансфер в три этапа", subtitle: "Создайте бронирование за считанные минуты без сложных процедур.",
        steps: { step1Title: "Укажите маршрут", step1Desc: "Введите адреса посадки и высадки, дату и время.", step2Title: "Выберите автомобиль", step2Desc: "Выберите премиальный автомобиль в зависимости от количества пассажиров.", step3Title: "Завершите бронирование", step3Desc: "Обеспечьте свой трансфер, добавив контактную информацию." }
      },
      vehicles: { badge: "Наш автопарк", title: "Подходящий автомобиль для любой поездки", subtitle: "Ознакомьтесь с комфортабельными и современными автомобилями для индивидуальных и групповых поездок.", viewAll: "Посмотреть все автомобили", passenger: "пассажиров", luggage: "багажа", bookThis: "Забронировать этот автомобиль" },
      reservationForm: { badge: "Быстрое бронирование", title: "Спланируйте трансфер", addReturn: "Добавить обратный трансфер", from: "Откуда", fromPlaceholder: "Аэропорт, отель или адрес", to: "Куда", toPlaceholder: "Аэропорт, отель или адрес", date: "Дата", time: "Время", passengers: "Пассажиры", passengerCount: "Пассажир(ы)", searchButton: "Показать автомобили" },
      customerSummary: {
        guest: { badge: "Эксклюзивные привилегии", title: "Зарабатывайте баллы", subtitle: "Как участник, вы можете просматривать историю бронирований, делать быстрые бронирования и зарабатывать баллы лояльности.", features: { loyalty: "Баллы лояльности", history: "История бронирований", quickRes: "Быстрое бронирование" }, registerBtn: "Зарегистрироваться", loginBtn: "Войти" },
        auth: { welcomeBack: "С возвращением", title: "Готовы спланировать поездку?", subtitle: "Проверьте свои предстоящие бронирования или создайте новый трансфер.", newResBtn: "Новое бронирование", myResBtn: "Мои бронирования", loyaltyProgram: "Программа лояльности", currentPoints: "Ваши баллы", pointsSuffix: "баллов", loyaltyDesc: "Наслаждайтесь преимуществами, зарабатывая баллы за завершенные трансферы.", viewDetails: "Посмотреть детали", userId: "ID пользователя:" }
      },
      authPage: {
        loginTitle: "Добро пожаловать", loginSubtitle: "Войдите с вашим номером телефона и паролем.", phoneLabel: "Номер телефона", phonePlaceholder: "05XX XXX XX XX", passwordLabel: "Пароль", passwordPlaceholder: "Введите пароль", loginBtn: "Войти", loggingIn: "Вход...", noAccount: "Еще нет аккаунта?", registerLink: "Зарегистрироваться", secureText: "Ваш вход обрабатывается безопасно.",
        registerTitle: "Создать аккаунт", registerSubtitle: "Зарегистрируйтесь, чтобы отслеживать бронирования и получать баллы.", firstName: "Имя", firstNamePlaceholder: "Ваше имя", lastName: "Фамилия", lastNamePlaceholder: "Ваша фамилия", email: "Эл. почта", emailPlaceholder: "example@mail.com", passwordConfirm: "Повторите пароль", passwordConfirmPlaceholder: "Введите пароль еще раз", registerBtn: "Зарегистрироваться", registering: "Создание...", hasAccount: "Уже есть аккаунт?", loginLink: "Войти",
        heroTitle: "Управляйте поездками легко.", heroSubtitle: "Доступ к бронированиям, отслеживание трансферов и персонализированные услуги.", heroNotice: "Войдите безопасно, чтобы продолжить.",
        verifyTitle: "Подтверждение Email", verifySuccess: "Email подтвержден", verifySuccessDesc: "Ваш аккаунт активирован. Вы можете войти.", verifyErrorTitle: "Ошибка", verifyErrorDesc: "Ссылка недействительна. Обратитесь в поддержку.", verifyPendingTitle: "Подтвердите email", verifyPendingDesc: "введите 6-значный код, отправленный на", verifyPendingFooter: "Проверьте папку Спам, если не можете найти.", backToLogin: "Вернуться к входу", verifyCodeLabel: "Код подтверждения", verifyBtn: "Подтвердить", verifyingBtn: "Проверка...", didNotReceive: "Не получили код?", registerAgain: "Зарегистрироваться снова"
      },
      reservationSystem: {
        title: "Создать бронирование", subtitle: "Пожалуйста, заполните детали вашей поездки.",
        tabs: { selectVehicle: "Выбор авто", details: "Детали", payment: "Оплата" },
        vehicleSelect: { title: "Выбор авто", subtitle: "Выберите подходящий автомобиль." },
        details: { title: "Детали пассажиров", subtitle: "Введите контактные данные." },
        payment: { title: "Оплата", subtitle: "Выберите метод оплаты." },
        buttons: { next: "Далее", back: "Назад", submit: "Завершить бронирование" }
      },
      loyaltyPage: {
        title: "Моя программа лояльности", subtitle: "Просмотр ваших баллов и уровня лояльности.",
        currentPoints: "Текущие баллы", totalEarned: "Всего заработано", totalSpent: "Всего потрачено",
        history: "История баллов", noHistory: "У вас пока нет истории баллов.", earnMore: "Сделайте новое бронирование, чтобы заработать.", loadingAccount: "Загрузка аккаунта...", refreshBtn: "Обновить",
        cardTitle: "Аккаунт лояльности", cardDesc: "Всего баллов и текущий уровень.", userId: "ID пользователя", totalPoints: "Всего баллов", tier: "Уровень"
      },
      footer: {
        subtitle: "Безопасный, комфортный и премиальный сервис для трансферов.", services: "Услуги",
        servicesLinks: { airport: "Трансфер из аэропорта", city: "Междугородный трансфер", rent: "Аренда автомобиля", corporate: "Корпоративный трансфер" },
        quickLinksTitle: "Быстрые ссылки", quickLinks: { about: "О нас", vehicles: "Наши автомобили", reservation: "Бронирование", privacy: "Политика конфиденциальности" },
        contact: "Контакты", rights: "© 2026 VIP Transfer. Все права защищены.", slogan: "Адрес безопасного и комфортного путешествия."
      },
      admin: {
        topbar: { title: "Панель админа", subtitle: "Управление операциями VIP Transfer.", admin: "Админ", manager: "Менеджер" },
        sidebar: { dashboard: "Дашборд", users: "Пользователи", reservations: "Бронирования", vehicles: "Автомобили", campaigns: "Кампании", loyalty: "Система лояльности", pricing: "Ценовые зоны", notifications: "Уведомления" },
        dashboard: {
          title: "Дашборд", subtitle: "Контролируйте общее состояние системы и последние бронирования.", refresh: "Обновить",
          stats: { totalUsers: "Всего пользователей", totalUsersDesc: "Активные пользователи", totalRes: "Всего бронирований", totalResDesc: "Все записи", activeVehicles: "Активные авто", activeVehiclesDesc: "Автомобили готовы", pendingRes: "Ожидающие бронирования", pendingResDesc: "Бронирования, ожидающие утверждения" },
          latestRes: { title: "Последние бронирования", desc: "Последние 5 бронирований.", loading: "Загрузка данных...", empty: "Пока нет бронирований.", cols: { ref: "Референс", customer: "Клиент", route: "Маршрут", date: "Дата", vehicle: "Авто", price: "Сумма", status: "Статус" } }
        },
        users: {
          title: "Пользователи", subtitle: "Управление активными пользователями.", refresh: "Обновить", listTitle: "Список пользователей", listDesc: "Всего {{count}} активных пользователей.", loading: "Загрузка пользователей..."
        },
        reservations: {
          title: "Управление бронированиями", subtitle: "Просмотр и фильтрация всех бронирований.", retry: "Повторить", loading: "Загрузка бронирований..."
        },
        reservationList: {
          notFound: 'Бронирование не найдено',
          tryAgain: 'Попробуйте снова, изменив критерии поиска или фильтра.',
          table: {
            reservation: 'Бронирование', customer: 'Клиент', route: 'Маршрут', date: 'Дата', vehicle: 'Автомобиль', passengers: 'Пассажир(ы)', price: 'Цена', status: 'Статус', action: 'Действие',
            registered: 'Зарегистрированный пользователь', guest: 'Гость', pickup: 'Посадка', dropoff: 'Высадка', flight: 'Рейс:', actions: 'Действия', viewDetails: 'Смотреть детали', statusHistory: 'История статусов', changeStatus: 'Изменить статус'
          },
          toolbar: { searchPlaceholder: 'Поиск кода бронирования, адреса, автомобиля или телефона...', selectStatus: 'Выберите статус', allStatuses: 'Все статусы' },
          status: { PENDING: 'В ожидании', ASSIGNED: 'Автомобиль назначен', COMPLETED: 'Завершено', CANCELLED: 'Отменено', NO_SHOW: 'Не явился', CONFIRMED: 'Подтверждено', DRIVER_ASSIGNED: 'Водитель назначен', ON_THE_WAY: 'В пути', IN_PROGRESS: 'В процессе', unknown: 'Неизвестно', customerNoShow: 'Клиент не явился' },
          dialog: { title: 'Изменить статус бронирования', desc: 'Обновите статус бронирования {{ref}}.', currentStatus: 'Текущий статус', cannotChangeTitle: 'Статус не может быть изменен', cannotChangeDesc: 'Это бронирование достигло своего конечного статуса.', newStatus: 'Новый статус', selectNewStatus: 'Выберите новый статус', noteLabel: 'Заметка об изменении статуса', notePlaceholder: 'Например: Данные отправлены клиенту.', cancel: 'Отмена', update: 'Обновить статус' },
          errors: { fetchFailed: 'Произошла ошибка при получении бронирований.', updateFailed: 'Произошла ошибка при обновлении статуса бронирования.' }
        },
        vehicles: {
          title: "Автомобили", subtitle: "Управление автомобилями.", listTitle: "Список автомобилей", listDesc: "Всего {{count}} автомобилей."
        },
        loyalty: {
          title: "Управление лояльностью", subtitle: "Просмотр баллов и уровней лояльности.", searchTitle: "Поиск пользователя", searchDesc: "Введите ID пользователя.", label: "ID пользователя", placeholder: "Пример: 6", searching: "Поиск...", searchBtn: "Посмотреть аккаунт"
        },
        errors: { network: "Ошибка сети", default: "Произошла ошибка" },
        usersList: { searchPlaceholder: "Поиск по имени, email или телефону...", roleFilter: "Роль", allRoles: "Все роли", roles: { ADMIN: "Админ", CUSTOMER: "Клиент" }, typeFilter: "Тип пользователя", allTypes: "Все пользователи", types: { MEMBER: "Зарегистрированные", GUEST: "Гости" }, notFound: "Пользователи не найдены.", table: { user: "Пользователь", phone: "Телефон", role: "Роль", type: "Тип", status: "Статус", registeredAt: "Дата регистрации", actions: "Действия", unnamed: "Неизвестный", noEmail: "Нет email", guest: "Гость", member: "Участник" } },
        vehiclesList: { searchPlaceholder: "Поиск марки, модели или номера...", classFilter: "Класс", allClasses: "Все классы", statusFilter: "Статус", allStatuses: "Все статусы", statuses: { ACTIVE: "Активен", MAINTENANCE: "На ремонте", INACTIVE: "Неактивен" }, notFound: "Транспортные средства не найдены.", table: { vehicle: "ТС / Номер", classCapacity: "Класс / Места", status: "Статус", year: "Год", price: "Базовая цена / км", actions: "Действия" } },
        notifications: { title: "Уведомления", subtitle: "Просмотр и управление всеми уведомлениями в системе.", refresh: "Обновить", stats: { pending: "В ожидании", sent: "Отправлено", failed: "Ошибка", total: "Всего" }, listTitle: "Список уведомлений", listDesc: "Список уведомлений по всем каналам.", pendingActions: "ожидает действий", searchPlaceholder: "Поиск заголовка, сообщения или ID...", statusFilter: "Статус", allStatuses: "Все статусы", statuses: { PENDING: "В ожидании", SENT: "Отправлено", DELIVERED: "Доставлено", FAILED: "Ошибка", READ: "Прочитано" }, channelFilter: "Канал", allChannels: "Все каналы", channels: { EMAIL: "Email", SMS: "SMS", PUSH: "Push", WHATSAPP: "WhatsApp" }, notFound: "Уведомления не найдены.", table: { id: "ID", title: "Заголовок", user: "Пользователь", channel: "Канал", status: "Статус", createdAt: "Создано", sentAt: "Отправлено", actions: "Действие", error: "Ошибка:", send: "Отправить", markAsRead: "Отметить как прочитанное", read: "Прочитано" } }
      }
    }
  },
  AL: {
    translation: {
      nav: { home: "Kreu", services: "Shërbimet", vehicles: "Automjetet", howItWorks: "Si Funksionon?", contact: "Kontakt", account: "Llogaria Ime", logout: "Dil", login: "Hyr", register: "Regjistrohu" },
      hero: { badge: "Përvojë Premium e Transferimit VIP", titleMain: "Në çdo moment të udhëtimit tuaj", titleHighlight: "rehati dhe privilegj.", subtitle: "Planifikoni lehtësisht transferimet tuaja në aeroport dhe brenda qytetit me shoferë profesionistë, automjete premium dhe çmime transparente.", features: { support: "Shërbim 24/7", security: "Udhëtim i Sigurt", fixedPrice: "Çmim Fiks", liveSupport: "Mbështetje Live" } },
      benefits: {
        badge: "Pse të na zgjidhni ne?", title: "Gjithçka që ju nevojitet për udhëtimin tuaj", subtitle: "Shërbim premium i fokusuar në rehati, siguri dhe përpikmëri.",
        items: { profDrivers: "Shoferë Profesionistë", profDriversDesc: "Udhëtim i sigurt me shoferë me përvojë dhe të përzgjedhur me kujdes.", onTime: "Pritje në Kohë", onTimeDesc: "Pritje e përpiktë bazuar në detajet e fluturimit dhe rezervimit tuaj.", pricing: "Çmime Transparente", pricingDesc: "Çmime fikse të paracaktuara pa tarifa të fshehura.", support: "Mbështetje 24/7", supportDesc: "Mbështetje e pandërprerë para dhe pas rezervimit tuaj." }
      },
      howItWorks: {
        badge: "Si funksionon?", title: "Planifikoni transferimin tuaj në tre hapa", subtitle: "Krijoni rezervimin tuaj në pak minuta pa procedura komplekse.",
        steps: { step1Title: "Caktoni itinerarin tuaj", step1Desc: "Shkruani adresat e marrjes dhe zbritjes, detajet e datës dhe orës.", step2Title: "Zgjidhni automjetin tuaj", step2Desc: "Zgjidhni automjetin premium që i përshtatet numrit të pasagjerëve.", step3Title: "Përfundoni rezervimin", step3Desc: "Siguroni transferimin tuaj duke shtuar informacionin e kontaktit." }
      },
      vehicles: { badge: "Flota jonë", title: "Automjeti i duhur për çdo udhëtim", subtitle: "Eksploroni opsionet tona komode dhe moderne të automjeteve për transferime individuale, familjare ose në grup.", viewAll: "Shiko të gjitha automjetet", passenger: "pasagjerë", luggage: "bagazh", bookThis: "Rezervoni me këtë automjet" },
      reservationForm: { badge: "Rezervim i Shpejtë", title: "Planifikoni transferimin tuaj", addReturn: "Shto transferim kthimi", from: "Nga", fromPlaceholder: "Aeroport, hotel ose adresë", to: "Ku", toPlaceholder: "Aeroport, hotel ose adresë", date: "Data", time: "Koha", passengers: "Pasagjerët", passengerCount: "Pasagjer(ë)", searchButton: "Trego Automjetet" },
      customerSummary: {
        guest: { badge: "Privilegje Ekskluzive", title: "Fitoni pikë në çdo udhëtim", subtitle: "Si anëtar, mund të shikoni historikun e rezervimeve tuaja, të bëni rezervime të shpejta dhe të fitoni pikë besnikërie.", features: { loyalty: "Pikë besnikërie", history: "Historiku i rezervimeve", quickRes: "Rezervim i shpejtë" }, registerBtn: "Regjistrohu", loginBtn: "Hyr" },
        auth: { welcomeBack: "Mirë se u kthyet", title: "Gati për të planifikuar udhëtimin tuaj?", subtitle: "Kontrolloni rezervimet tuaja të ardhshme ose krijoni një transferim të ri.", newResBtn: "Rezervim i ri", myResBtn: "Rezervimet e mia", loyaltyProgram: "Programi i besnikërisë", currentPoints: "Pikët e tua", pointsSuffix: "pikë", loyaltyDesc: "Shijoni përfitimet duke fituar pikë nga transferimet e përfunduara.", viewDetails: "Shiko detajet", userId: "ID e përdoruesit:" }
      },
      authPage: {
        loginTitle: "Mirë se vini", loginSubtitle: "Hyni me numrin tuaj të telefonit dhe fjalëkalimin.", phoneLabel: "Numri i telefonit", phonePlaceholder: "05XX XXX XX XX", passwordLabel: "Fjalëkalimi", passwordPlaceholder: "Shkruani fjalëkalimin", loginBtn: "Hyr", loggingIn: "Duke hyrë...", noAccount: "Nuk keni ende një llogari?", registerLink: "Regjistrohu", secureText: "Hyrja juaj përpunohet në mënyrë të sigurt.",
        registerTitle: "Krijo llogari", registerSubtitle: "Regjistrohu për të ndjekur rezervimet dhe për të fituar pikë.", firstName: "Emri", firstNamePlaceholder: "Emri juaj", lastName: "Mbiemri", lastNamePlaceholder: "Mbiemri juaj", email: "Email", emailPlaceholder: "example@mail.com", passwordConfirm: "Konfirmo Fjalëkalimin", passwordConfirmPlaceholder: "Rishkruani fjalëkalimin", registerBtn: "Regjistrohu", registering: "Duke krijuar...", hasAccount: "Keni tashmë një llogari?", loginLink: "Hyr",
        heroTitle: "Menaxhoni udhëtimet lehtësisht.", heroSubtitle: "Qasje në rezervime, ndjekje transferimesh dhe shërbime të personalizuara.", heroNotice: "Hyni në mënyrë të sigurt për të vazhduar.",
        verifyTitle: "Verifikimi i Email-it", verifySuccess: "Email-i u Verifikua", verifySuccessDesc: "Llogaria juaj është aktive. Tani mund të hyni.", verifyErrorTitle: "Verifikimi Dështoi", verifyErrorDesc: "Lidhja mund të jetë e pavlefshme. Kontaktoni mbështetjen.", verifyPendingTitle: "Verifikoni email-in", verifyPendingDesc: "shkruani kodin 6-shifror dërguar në", verifyPendingFooter: "Kontrolloni dosjen Spam nëse nuk e gjeni.", backToLogin: "Kthehu te Hyrja", verifyCodeLabel: "Kodi i verifikimit", verifyBtn: "Verifiko", verifyingBtn: "Duke verifikuar...", didNotReceive: "Nuk e keni marrë kodin?", registerAgain: "Regjistrohu sërish"
      },
      reservationSystem: {
        title: "Krijo Rezervim", subtitle: "Ju lutem plotësoni detajet e udhëtimit tuaj.",
        tabs: { selectVehicle: "Zgjidh Automjet", details: "Detajet", payment: "Pagesa" },
        vehicleSelect: { title: "Zgjedhja e Automjetit", subtitle: "Zgjidhni automjetin e duhur." },
        details: { title: "Detajet e Pasagjerit", subtitle: "Shkruani detajet e kontaktit." },
        payment: { title: "Pagesa", subtitle: "Zgjidhni metodën e pagesës." },
        buttons: { next: "Vazhdo", back: "Kthehu", submit: "Përfundo Rezervimin" }
      },
      loyaltyPage: {
        title: "Programi i Besnikërisë", subtitle: "Shikoni pikët tuaja dhe përfitimet.",
        currentPoints: "Pikët aktuale", totalEarned: "Totali i Fituar", totalSpent: "Totali i Shpenzuar",
        history: "Historiku i Pikëve", noHistory: "Nuk keni historik pikësh ende.", earnMore: "Krijoni një rezervim për të fituar pikë.", loadingAccount: "Duke ngarkuar llogarinë...", refreshBtn: "Rifresko",
        cardTitle: "Llogaria e Besnikërisë", cardDesc: "Pikët totale dhe niveli aktual.", userId: "ID e përdoruesit", totalPoints: "Totali i Pikëve", tier: "Niveli"
      },
      footer: {
        subtitle: "Shërbim premium i sigurt dhe i rehatshëm për transferime.", services: "Shërbimet",
        servicesLinks: { airport: "Transferim Aeroporti", city: "Transferim Ndërqytetas", rent: "Makinë me Qira", corporate: "Transferim Korporativ" },
        quickLinksTitle: "Lidhje të Shpejta", quickLinks: { about: "Rreth Nesh", vehicles: "Automjetet Tona", reservation: "Rezervim", privacy: "Politika e Privatësisë" },
        contact: "Kontakt", rights: "© 2026 VIP Transfer. Të gjitha të drejtat e rezervuara.", slogan: "Adresa e një udhëtimi të sigurt."
      },
      admin: {
        topbar: { title: "Paneli i Adminit", subtitle: "Menaxhoni operacionet e VIP Transfer.", admin: "Admin", manager: "Menaxher" },
        sidebar: { dashboard: "Paneli", users: "Përdoruesit", reservations: "Rezervimet", vehicles: "Automjetet", campaigns: "Fushatat", loyalty: "Sistemi i Besnikërisë", pricing: "Zonat e Çmimeve", notifications: "Njoftimet" },
        dashboard: {
          title: "Paneli", subtitle: "Monitoroni statusin e përgjithshëm të sistemit dhe rezervimet.", refresh: "Rifresko",
          stats: { totalUsers: "Përdoruesit Total", totalUsersDesc: "Përdorues aktivë", totalRes: "Rezervimet Totale", totalResDesc: "Të gjitha rezervimet", activeVehicles: "Automjetet Aktive", activeVehiclesDesc: "Gati për përdorim", pendingRes: "Rezervime në Pritje", pendingResDesc: "Në pritje të miratimit" },
          latestRes: { title: "Rezervimet e Fundit", desc: "5 rezervimet e fundit.", loading: "Duke ngarkuar të dhënat...", empty: "Nuk ka rezervime ende.", cols: { ref: "Referencë", customer: "Klient", route: "Itinerari", date: "Data", vehicle: "Automjeti", price: "Çmimi", status: "Statusi" } }
        },
        users: {
          title: "Përdoruesit", subtitle: "Menaxhoni përdoruesit aktivë.", refresh: "Rifresko", listTitle: "Lista e Përdoruesve", listDesc: "Ka një total prej {{count}} përdoruesish.", loading: "Duke ngarkuar..."
        },
        reservations: {
          title: "Menaxhimi i Rezervimeve", subtitle: "Shikoni, filtroni dhe menaxhoni statuset.", retry: "Provo përsëri", loading: "Duke ngarkuar..."
        },
        reservationList: {
          notFound: 'Rezervimi nuk u gjet',
          tryAgain: 'Provoni përsëri duke ndryshuar kriteret e kërkimit ose filtrit.',
          table: {
            reservation: 'Rezervimi', customer: 'Klienti', route: 'Destinacioni', date: 'Data', vehicle: 'Automjeti', passengers: 'Pasagjerët', price: 'Çmimi', status: 'Statusi', action: 'Veprimi',
            registered: 'Përdorues i regjistruar', guest: 'Mysafir', pickup: 'Marrja', dropoff: 'Zbritja', flight: 'Fluturimi:', actions: 'Veprimet e rezervimit', viewDetails: 'Shiko detajet', statusHistory: 'Historiku i statusit', changeStatus: 'Ndrysho statusin'
          },
          toolbar: { searchPlaceholder: 'Kërko kodin e rezervimit, adresën, mjetin ose telefonin...', selectStatus: 'Zgjidh statusin', allStatuses: 'Të gjitha statuset' },
          status: { PENDING: 'Në pritje', ASSIGNED: 'Automjeti i caktuar', COMPLETED: 'E përfunduar', CANCELLED: 'E anuluar', NO_SHOW: 'Nuk u paraqit', CONFIRMED: 'E konfirmuar', DRIVER_ASSIGNED: 'Shoferi i caktuar', ON_THE_WAY: 'Në rrugë', IN_PROGRESS: 'Në vazhdim', unknown: 'E panjohur', customerNoShow: 'Klienti nuk u paraqit' },
          dialog: { title: 'Ndrysho statusin e rezervimit', desc: 'Përditëso statusin e rezervimit me numër {{ref}}.', currentStatus: 'Statusi aktual', cannotChangeTitle: 'Statusi nuk mund të ndryshohet', cannotChangeDesc: 'Ky rezervim ka arritur statusin përfundimtar. Nuk mund të zgjidhet një status i ri.', newStatus: 'Statusi i ri', selectNewStatus: 'Zgjidh statusin e ri', noteLabel: 'Shënim për ndryshimin e statusit', notePlaceholder: 'Për shembull: Të dhënat e shoferit dhe mjetit u janë dërguar klientit.', cancel: 'Anulo', update: 'Përditëso statusin' },
          errors: { fetchFailed: 'Ndodhi një gabim gjatë marrjes së rezervimeve.', updateFailed: 'Ndodhi një gabim gjatë përditësimit të statusit të rezervimit.' }
        },
        vehicles: {
          title: "Automjetet", subtitle: "Menaxhoni automjetet.", listTitle: "Lista e Automjeteve", listDesc: "Ka një total prej {{count}} automjetesh."
        },
        loyalty: {
          title: "Menaxhimi i Besnikërisë", subtitle: "Shikoni pikët e besnikërisë.", searchTitle: "Kërko Përdorues", searchDesc: "Shkruani ID-në e përdoruesit.", label: "ID e përdoruesit", placeholder: "Shembull: 6", searching: "Duke kërkuar...", searchBtn: "Shiko Llogarinë"
        },
        errors: { network: "Gabim Rrjeti", default: "Ndodhi një gabim" },
        usersList: { searchPlaceholder: "Kërko emër, email ose telefon...", roleFilter: "Roli", allRoles: "Të gjitha rolet", roles: { ADMIN: "Admin", CUSTOMER: "Klient" }, typeFilter: "Lloji i përdoruesit", allTypes: "Të gjithë përdoruesit", types: { MEMBER: "Anëtarë të regjistruar", GUEST: "Përdorues mysafirë" }, notFound: "Asnjë përdorues nuk u gjet sipas filtrave.", table: { user: "Përdoruesi", phone: "Telefoni", role: "Roli", type: "Lloji", status: "Statusi", registeredAt: "Regjistruar më", actions: "Veprimet", unnamed: "Përdorues i paemërtuar", noEmail: "Nuk ka email", guest: "Mysafir", member: "Anëtar" } },
        vehiclesList: { searchPlaceholder: "Kërko markën, modelin ose targën...", classFilter: "Klasa", allClasses: "Të gjitha klasat", statusFilter: "Statusi", allStatuses: "Të gjitha statuset", statuses: { ACTIVE: "Aktiv", MAINTENANCE: "Në mirëmbajtje", INACTIVE: "Joaktiv" }, notFound: "Asnjë mjet nuk u gjet sipas filtrave.", table: { vehicle: "Mjeti / Targa", classCapacity: "Klasa / Kapaciteti", status: "Statusi", year: "Viti", price: "Çmimi Bazë / Km", actions: "Veprimet" } },
        notifications: { title: "Njoftimet", subtitle: "Shiko dhe menaxho të gjitha njoftimet në sistem.", refresh: "Rifresko", stats: { pending: "Në pritje", sent: "Dërguar", failed: "Dështoi", total: "Totali" }, listTitle: "Lista e Njoftimeve", listDesc: "Lista e njoftimeve në të gjitha kanalet.", pendingActions: "veprime në pritje", searchPlaceholder: "Kërko titullin, mesazhin ose ID e përdoruesit...", statusFilter: "Statusi", allStatuses: "Të gjitha Statuset", statuses: { PENDING: "Në pritje", SENT: "Dërguar", DELIVERED: "Dorëzuar", FAILED: "Dështoi", READ: "Lexuar" }, channelFilter: "Kanali", allChannels: "Të gjitha Kanalet", channels: { EMAIL: "Email", SMS: "SMS", PUSH: "Push", WHATSAPP: "WhatsApp" }, notFound: "Asnjë njoftim nuk u gjet.", table: { id: "ID", title: "Titulli", user: "Përdoruesi", channel: "Kanali", status: "Statusi", createdAt: "Krijuar më", sentAt: "Dërguar më", actions: "Veprimi", error: "Gabim:", send: "Dërgo", markAsRead: "Shëno të lexuar", read: "Lexuar" } }
      }
    }
  }
};

// localStorage'dan önceden seçilmiş dili al, yoksa varsayılan TR olsun
const savedLanguage = localStorage.getItem('i18nextLng') || 'TR';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'TR',
    interpolation: {
      escapeValue: false // React zaten XSS korumasına sahiptir
    }
  });

// Dil değiştiğinde localStorage'a kaydet ki sayfa yenilendiğinde hatırlansın
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18nextLng', lng);
});

export default i18n;
