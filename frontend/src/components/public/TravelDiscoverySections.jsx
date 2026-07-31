import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Navigation,
  Plane,
  QrCode,
  ShieldCheck,
  Smartphone,
  Star,
} from "lucide-react";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import toggSlider from "@/assets/togg-slider.jpg";

const slides = [
  {
    eyebrow: "VIP Transfer ayrıcalığı",
    title: "Şehrin her noktasına konforlu ulaşım",
    description:
      "Profesyonel sürücüler, bakımlı araçlar ve önceden görünen fiyatlarla yolculuğunuzu güvenle planlayın.",
    image: toggSlider,
  },
  {
    eyebrow: "Havalimanı karşılama",
    title: "Uçaktan indiğiniz anda hazırız",
    description:
      "Uçuş saatinize uygun planlanan karşılama hizmetiyle beklemeden aracınıza geçin.",
    image:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1800&q=88",
  },
  {
    eyebrow: "Kurumsal yolculuk",
    title: "İş seyahatlerinde profesyonel çözüm",
    description:
      "Misafirleriniz ve ekipleriniz için düzenli, takip edilebilir ve prestijli transfer deneyimi.",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=88",
  },
];

const airports = [
  { city: "İstanbul", name: "İstanbul Havalimanı", code: "IST", latitude: 41.2753, longitude: 28.7519 },
  { city: "İstanbul", name: "Sabiha Gökçen", code: "SAW", latitude: 40.8986, longitude: 29.3092 },
  { city: "Antalya", name: "Antalya Havalimanı", code: "AYT", latitude: 36.8987, longitude: 30.8005 },
  { city: "İzmir", name: "Adnan Menderes", code: "ADB", latitude: 38.2924, longitude: 27.157 },
  { city: "Muğla", name: "Dalaman Havalimanı", code: "DLM", latitude: 36.7131, longitude: 28.7925 },
  { city: "Ankara", name: "Esenboğa Havalimanı", code: "ESB", latitude: 40.1281, longitude: 32.9951 },
];

const popularRoutes = [
  [airports[0], { name: "Taksim, İstanbul", latitude: 41.0369, longitude: 28.985 }],
  [airports[0], { name: "Kadıköy, İstanbul", latitude: 40.9909, longitude: 29.0221 }],
  [airports[1], { name: "Sultanahmet, İstanbul", latitude: 41.0054, longitude: 28.9768 }],
  [airports[1], { name: "Taksim, İstanbul", latitude: 41.0369, longitude: 28.985 }],
  [airports[2], { name: "Kemer, Antalya", latitude: 36.602, longitude: 30.5606 }],
  [airports[4], { name: "Fethiye, Muğla", latitude: 36.621, longitude: 29.1164 }],
];

function selectTransfer(pickup, dropoff = null) {
  window.dispatchEvent(new CustomEvent("vip:prefill-reservation", {
    detail: {
      pickup: {
        address: pickup.name,
        latitude: pickup.latitude,
        longitude: pickup.longitude,
      },
      dropoff: dropoff
        ? {
            address: dropoff.name,
            latitude: dropoff.latitude,
            longitude: dropoff.longitude,
          }
        : null,
    },
  }));

  window.requestAnimationFrame(() => {
    document.getElementById("reservation-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

function TravelDiscoverySections() {
  return (
    <>
      <ServicePoints />
      <PopularRoutes />
      <MobileAppPromo />
    </>
  );
}

export function CampaignSlider() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, []);

  const slide = slides[activeIndex];
  const goTo = (next) => {
    setActiveIndex((next + slides.length) % slides.length);
  };

  return (
    <section id="campaigns" className="scroll-mt-28 bg-white px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
      <div className="relative mx-auto min-h-[480px] max-w-[1320px] overflow-hidden rounded-[34px] bg-[#071a32] shadow-[0_30px_90px_rgba(7,26,50,0.2)]">
        {slides.map((item, index) => (
          <img
            key={item.title}
            src={item.image}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition duration-700 ${
              index === activeIndex ? "scale-100 opacity-100" : "scale-105 opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-[#06162b]/95 via-[#06162b]/75 to-[#06162b]/20" />

        <div className="relative z-10 flex min-h-[480px] max-w-2xl flex-col justify-center p-7 text-white sm:p-10 lg:p-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
            {slide.eyebrow}
          </p>
          <h2 className="mt-5 text-3xl font-bold tracking-[-0.04em] sm:text-5xl">
            {slide.title}
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-200 sm:text-base">
            {slide.description}
          </p>
          <Link
            to="/#reservation-form"
            className="mt-8 inline-flex min-h-12 w-fit items-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-bold"
          >
            Transfer planla <ArrowRight size={17} />
          </Link>
        </div>

        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            aria-label="Önceki duyuru"
            className="flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-md"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            aria-label="Sonraki duyuru"
            className="flex size-11 items-center justify-center rounded-full bg-white text-[#071a32]"
          >
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="absolute bottom-7 left-7 z-20 flex gap-2 sm:left-10 lg:left-14">
          {slides.map((item, index) => (
            <button
              key={item.title}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`${index + 1}. duyuruyu göster`}
              className={`h-1.5 rounded-full transition-all ${
                index === activeIndex ? "w-9 bg-blue-400" : "w-4 bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicePoints() {
  return (
    <section className="bg-[#f4f7fb] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-[1320px]">
        <SectionHeading
          eyebrow="Hizmet noktaları"
          title="Türkiye'nin önemli havalimanlarında yanınızdayız"
          description="En sık kullanılan havalimanlarından şehir merkezlerine güvenli ve planlı transfer."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {airports.map((airport) => (
            <Link
              key={airport.code}
              to="/#reservation-form"
              onClick={() => selectTransfer(airport)}
              className="group flex items-center gap-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.04)] transition hover:-translate-y-1 hover:border-blue-200"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                <Plane size={21} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  {airport.city} · {airport.code}
                </p>
                <h3 className="mt-1 truncate font-bold text-[#071a32]">{airport.name}</h3>
              </div>
              <ArrowRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" size={18} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PopularRoutes() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-[1320px]">
        <SectionHeading
          eyebrow="Popüler rotalar"
          title="En çok tercih edilen transfer güzergâhları"
          description="Sık kullanılan rotalardan birini seçin ve rezervasyon formunda yolculuğunuzu tamamlayın."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {popularRoutes.map(([from, to]) => (
            <Link
              key={`${from.code}-${to.name}`}
              to="/#reservation-form"
              onClick={() => selectTransfer(from, to)}
              className="group flex items-center gap-4 rounded-[22px] border border-slate-200 p-5 transition hover:border-blue-200 hover:bg-blue-50/50"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#071a32] text-white">
                <Navigation size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#071a32]">{from.name}</p>
                <div className="my-1 flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  transfer
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <p className="truncate text-sm font-semibold text-blue-600">{to.name}</p>
              </div>
              <ArrowRight className="text-slate-300 group-hover:text-blue-600" size={18} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function MobileAppPromo() {
  return (
    <section id="mobile-app" className="scroll-mt-28 overflow-hidden bg-[#f7f9fc] px-4 py-20 text-[#071a32] sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto grid max-w-[1320px] gap-14 lg:grid-cols-[1fr_0.95fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            <Smartphone size={17} /> Mobil deneyim
          </div>
          <h2 className="mt-6 max-w-2xl text-3xl font-bold tracking-[-0.04em] sm:text-5xl lg:text-[54px]">
            Güvenli ve Akıllı Yolculuk Uygulaması
          </h2>
          <p className="mt-5 max-w-xl leading-7 text-slate-600">
            Rezervasyonlarınızı görüntüleyin, transfer durumunuzu takip edin ve
            sadakat puanlarınıza tek ekrandan ulaşın.
          </p>
          <div className="mt-8 space-y-5">
            <AppFeature icon={CheckCircle2} title="Herkes İçin Ayrıcalıklı Ulaşım" text="Havalimanı karşılama, özel talepler ve konforlu transfer seçenekleri." />
            <AppFeature icon={MapPin} title="Kolay Kullanım Tüm Türkiye'de" text="Web ve mobil deneyimle havalimanı ve şehirler arası ulaşım." />
            <AppFeature icon={ShieldCheck} title="Güvenli Rezervasyon Takibi" text="Transfer, araç ve sadakat bilgilerinize güvenli erişim." />
          </div>
          <p className="mt-8 font-bold">QR kodu okutun, uygulamayı indirin</p>
          <div className="mt-4 flex flex-wrap gap-5">
            <StoreQr icon={FaApple} label="App Store" />
            <StoreQr icon={FaGooglePlay} label="Google Play" />
          </div>
        </div>

        <div className="relative mx-auto min-h-[650px] w-full max-w-[560px]">
          <div className="absolute inset-x-4 bottom-0 top-24 rounded-[46px] bg-slate-200" />
          <div className="absolute left-1/2 top-0 w-[320px] -translate-x-1/2 rounded-[54px] border-[9px] border-black bg-white p-3 shadow-[0_35px_90px_rgba(15,23,42,0.22)] sm:w-[370px]">
            <div className="absolute left-1/2 top-3 z-20 h-7 w-28 -translate-x-1/2 rounded-full bg-black" />
            <div className="relative h-[590px] overflow-hidden rounded-[41px] bg-[#dfe7e8]">
              <div className="absolute inset-0 opacity-80 [background-image:linear-gradient(28deg,transparent_46%,rgba(255,255,255,.9)_47%,rgba(255,255,255,.9)_51%,transparent_52%),linear-gradient(112deg,transparent_46%,rgba(255,255,255,.8)_47%,rgba(255,255,255,.8)_50%,transparent_51%),linear-gradient(#ccd9d8_1px,transparent_1px),linear-gradient(90deg,#ccd9d8_1px,transparent_1px)] [background-size:160px_130px,180px_170px,44px_44px,44px_44px]" />
              <div className="relative z-10 px-5 pt-14">
                <div className="rounded-xl bg-white p-4 text-sm text-slate-400 shadow-lg">● &nbsp; Nereden?</div>
                <div className="mt-3 rounded-xl bg-white p-4 text-sm text-slate-400 shadow-lg">● &nbsp; Nereye?</div>
              </div>
              <div className="absolute left-[36%] top-[52%] size-4 rounded-full border-4 border-white bg-blue-600 shadow-lg" />
              <div className="absolute bottom-8 right-5 flex size-12 items-center justify-center rounded-full bg-black text-white shadow-lg">
                <Navigation size={20} fill="currentColor" />
              </div>
            </div>
          </div>
          <PhoneCallout className="left-0 top-72" text="Kolay rezervasyon" />
          <PhoneCallout className="right-0 top-[390px]" text="Konforlu araçlar" />
          <PhoneCallout className="left-2 top-[500px]" text="Güvenli ödeme" />
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-[#071a32] sm:text-4xl">{title}</h2>
      <p className="mt-4 leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function AppFeature({ icon: Icon, title, text }) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <Icon size={18} />
      </span>
      <div>
        <p className="font-bold text-[#071a32]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
      </div>
    </div>
  );
}

function StoreQr({ icon: Icon, label }) {
  return (
    <div>
      <div className="flex size-28 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <QrCode size={76} strokeWidth={1.8} />
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm font-bold">
        <Icon size={20} /> {label}
      </div>
    </div>
  );
}

function PhoneCallout({ className, text }) {
  return (
    <div className={`absolute z-20 hidden items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#071a32] shadow-xl sm:flex ${className}`}>
      <Star size={15} className="text-blue-600" /> {text}
    </div>
  );
}

export default TravelDiscoverySections;
