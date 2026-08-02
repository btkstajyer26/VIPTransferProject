import { FileCheck2, ArrowRight, CircleHelp, Cookie, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const terms = [
  ["Hizmet kapsamı", "VIP Transfer, kullanıcı tarafından girilen rota, tarih, saat ve yolcu bilgilerine göre transfer rezervasyonu oluşturulmasını sağlar."],
  ["Rezervasyon sorumluluğu", "Kullanıcı, rezervasyon sırasında paylaştığı iletişim, rota, uçuş ve yolcu bilgilerinin doğru ve güncel olmasından sorumludur."],
  ["Fiyatlandırma", "Gösterilen ücret; araç sınıfı, rota, bölge, yoğunluk, kampanya ve sadakat kurallarına göre hesaplanır. Onay öncesindeki nihai tutar esas alınır."],
  ["İptal ve değişiklik", "İptal edilebilir durumdaki rezervasyonlar hesap alanından iptal edilebilir. Operasyon başladıktan sonraki talepler destek ekibi tarafından değerlendirilir."],
  ["Kullanıcı hesabı", "Kullanıcı, hesap bilgilerinin ve şifresinin güvenliğini korumakla; yetkisiz kullanım şüphesini gecikmeden bildirmekle yükümlüdür."],
  ["Hizmet kesintileri", "Teknik bakım, mücbir sebep veya üçüncü taraf servislerdeki kesintiler nedeniyle hizmet geçici olarak kullanılamayabilir."],
];

function TermsPage() {
  return (
    <LegalDocument
      icon={FileCheck2}
      eyebrow="Kullanıcı sözleşmesi"
      title="Kullanım Koşulları"
      description="VIP Transfer platformunu kullanırken geçerli temel kurallar ve sorumluluklar."
      sections={terms}
    />
  );
}

export function LegalDocument({ icon: Icon, eyebrow, title, description, sections, notice }) {
  return (
    <div className="min-h-screen bg-[#f4f7fb] px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1180px]">
        <header className="relative overflow-hidden rounded-[34px] bg-[#071a32] p-8 text-white shadow-[0_24px_70px_rgba(7,26,50,0.18)] sm:p-12">
          <div className="absolute -right-20 -top-28 size-80 rounded-full bg-blue-600/20 blur-3xl" />
          <p className="relative mb-8 text-xs font-semibold text-slate-400"><Link to="/" className="hover:text-white">Ana Sayfa</Link> <span className="mx-2">/</span> {title}</p>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600"><Icon size={22} /></div>
          <p className="relative mt-6 text-xs font-bold uppercase tracking-[0.18em] text-blue-300">{eyebrow}</p>
          <h1 className="relative mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="relative mt-4 max-w-2xl leading-7 text-slate-300">{description}</p>
        </header>
        <div className="mt-7 grid items-start gap-7 lg:grid-cols-[250px_1fr]">
          <InfoPageNavigation />
          <article className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-[0_18px_55px_rgba(15,23,42,0.04)] sm:p-10">
          {notice && <div className="mb-8 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">{notice}</div>}
          <div className="space-y-8">
            {sections.map(([heading, content], index) => (
              <section key={heading} className="grid gap-3 sm:grid-cols-[40px_1fr]">
                <span className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{index + 1}</span>
                <div>
                  <h2 className="text-xl font-bold text-[#071a32]">{heading}</h2>
                  <p className="mt-3 leading-7 text-slate-600">{content}</p>
                </div>
              </section>
            ))}
          </div>
          <p className="mt-10 border-t border-slate-100 pt-6 text-xs text-slate-400">Son güncelleme: 30 Temmuz 2026 · Bu metin canlı kullanım öncesinde hukuki incelemeden geçirilmelidir.</p>
          </article>
        </div>
      </div>
    </div>
  );
}

export function InfoPageNavigation() {
  const { pathname } = useLocation();
  const links = [
    { to: "/privacy", label: "Gizlilik Politikası", icon: ShieldCheck },
    { to: "/terms", label: "Kullanım Koşulları", icon: FileCheck2 },
    { to: "/cookies", label: "Çerez Politikası", icon: Cookie },
    { to: "/faq", label: "Sıkça Sorulanlar", icon: CircleHelp },
  ];

  return (
    <aside className="rounded-[26px] border border-slate-200 bg-white p-3 lg:sticky lg:top-28">
      <p className="px-3 pb-3 pt-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Bilgi merkezi</p>
      <nav className="space-y-1">
        {links.map(({ to, label, icon: NavIcon }) => {
          const active = pathname === to;
          return (
            <Link key={to} to={to} className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-[#071a32]"}`}>
              <NavIcon size={17} /> <span className="flex-1">{label}</span> <ArrowRight size={15} />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default TermsPage;
