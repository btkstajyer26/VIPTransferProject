import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Clock3,
  HeartHandshake,
  MapPinned,
  PlaneTakeoff,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

const values = [
  {
    icon: ShieldCheck,
    title: "Güvenli yolculuk",
    description:
      "Doğrulanmış sürücüler, düzenli araç kontrolleri ve uçtan uca takip edilen transfer süreci.",
  },
  {
    icon: Clock3,
    title: "Zamanında hizmet",
    description:
      "Uçuş ve rezervasyon saatlerine göre planlanan operasyonla bekleme süresini en aza indiriyoruz.",
  },
  {
    icon: HeartHandshake,
    title: "Kişisel deneyim",
    description:
      "Her yolculuğu yolcu sayısı, rota ve özel taleplere göre özenle planlıyoruz.",
  },
];

function AboutPage() {
  return (
    <div className="bg-white pt-28">
      <section className="relative overflow-hidden bg-[#071a32] px-4 py-20 text-white sm:px-6 sm:py-24 lg:px-8">
        <div className="absolute -right-32 -top-32 size-[440px] rounded-full bg-blue-500/15 blur-[110px]" />
        <div className="relative mx-auto grid max-w-[1320px] gap-12 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-blue-100">
              <BadgeCheck size={17} />
              Premium transfer standardı
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              Yolculuğun her anında güven ve konfor
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              VIP Transfer; havalimanı, şehir içi ve kurumsal ulaşım ihtiyaçlarını
              tek bir güvenilir hizmet deneyiminde birleştirir.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/#reservation-form"
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white"
              >
                Rezervasyon oluştur <ArrowRight size={17} />
              </Link>
              <Link
                to="/#contact"
                className="inline-flex min-h-12 items-center rounded-2xl border border-white/15 bg-white/10 px-6 text-sm font-bold"
              >
                Bize ulaşın
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Metric value="7/24" label="Kesintisiz destek" />
            <Metric value="VIP" label="Bakımlı araç filosu" />
            <Metric value="Şeffaf" label="Önceden fiyatlandırma" />
            <Metric value="Güvenli" label="Doğrulanmış sürücüler" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.17em] text-blue-600">
              Biz kimiz?
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#071a32] sm:text-4xl">
              Transferi yalnızca ulaşım olarak görmüyoruz
            </h2>
            <p className="mt-5 leading-7 text-slate-600">
              Amacımız, rezervasyon anından varışa kadar öngörülebilir, rahat ve
              profesyonel bir yolculuk sunmak. Teknolojiyle desteklenen operasyon
              yapımız sayesinde rezervasyon, fiyatlandırma ve müşteri iletişimini
              tek merkezden yönetiyoruz.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {values.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-[26px] border border-slate-200 bg-[#f8fbff] p-6"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
                  <Icon size={22} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-[#071a32]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[#071a32] px-4 py-20 text-white sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-[1320px] gap-12 lg:grid-cols-2 lg:items-center">
          <div className="relative min-h-[430px] overflow-hidden rounded-[34px]">
            <img
              src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=88"
              alt="Havalimanında VIP transfer hizmeti"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06162b]/85 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/15 bg-[#071a32]/75 p-5 backdrop-blur-xl">
              <p className="text-3xl font-extrabold">7/24</p>
              <p className="mt-1 text-sm text-blue-100">Rezervasyon ve operasyon desteği</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Kişisel ulaşım asistanınız</p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] sm:text-5xl">Herkes için ayrıcalıklı ulaşım</h2>
            <p className="mt-6 leading-8 text-slate-300">
              Havalimanı karşılamadan şehirler arası yolculuğa kadar tüm süreci tek merkezden planlıyoruz. Uçuş bilgisi, özel talepler ve araç seçimi rezervasyonunuzla birlikte operasyon ekibine ulaşır.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <AboutFeature icon={PlaneTakeoff} title="Uçuş odaklı planlama" text="Karşılama süreci uçuş ve rezervasyon bilgilerinize göre hazırlanır." />
              <AboutFeature icon={MapPinned} title="Geniş hizmet ağı" text="Önemli havalimanları ve popüler şehir güzergâhlarında hizmet." />
              <AboutFeature icon={ShieldCheck} title="Güvenli operasyon" text="Bakımlı VIP filo ve kayıt altındaki rezervasyon süreci." />
              <AboutFeature icon={HeartHandshake} title="Kişisel destek" text="Özel talepleriniz için ulaşılabilir destek ekibi." />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-[1320px] overflow-hidden rounded-[34px] border border-slate-200 bg-[#f4f7fb] lg:grid-cols-[1fr_0.8fr]">
          <div className="p-8 sm:p-12">
            <div className="flex size-13 items-center justify-center rounded-2xl bg-blue-600 text-white"><BriefcaseBusiness size={23} /></div>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Kurumsal hizmetler</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#071a32]">İş dünyası için yönetilebilir transfer</h2>
            <p className="mt-5 max-w-2xl leading-7 text-slate-600">Kurumsal misafirler, ekip transferleri ve düzenli ulaşım ihtiyaçları için merkezi rezervasyon, raporlanabilir operasyon ve profesyonel karşılama deneyimi.</p>
            <Link to="/#contact" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#071a32] px-6 text-sm font-bold text-white">Kurumsal bilgi alın <ArrowRight size={17} /></Link>
          </div>
          <div className="grid grid-cols-2 gap-px bg-slate-200">
            <MetricLight value="7/24" label="Operasyon desteği" />
            <MetricLight value="4" label="VIP araç sınıfı" />
            <MetricLight value="6+" label="Hizmet noktası" />
            <MetricLight value="Online" label="Rezervasyon takibi" />
          </div>
        </div>
      </section>

      <section className="bg-[#f4f7fb] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1100px] flex-col items-start justify-between gap-6 rounded-[30px] bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-10 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <UsersRound size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#071a32]">Yolculuğunuzu birlikte planlayalım</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Rota ve araç seçiminizi birkaç adımda tamamlayın.
              </p>
            </div>
          </div>
          <Link
            to="/#reservation-form"
            className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-2xl bg-[#071a32] px-6 text-sm font-bold text-white"
          >
            Hemen başlayın <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function AboutFeature({ icon: Icon, title, text }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5"><Icon size={20} className="text-blue-300" /><h3 className="mt-4 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></div>;
}

function MetricLight({ value, label }) {
  return <div className="flex min-h-44 flex-col justify-center bg-white p-7"><p className="text-3xl font-extrabold text-blue-600">{value}</p><p className="mt-2 text-sm font-medium text-slate-500">{label}</p></div>;
}

function Metric({ value, label }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.07] p-5 backdrop-blur-sm">
      <p className="text-2xl font-bold text-white sm:text-3xl">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-300 sm:text-sm">{label}</p>
    </div>
  );
}

export default AboutPage;
