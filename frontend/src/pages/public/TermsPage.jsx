import { FileCheck2 } from "lucide-react";

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
    <div className="min-h-screen bg-[#f4f7fb] px-4 pb-20 pt-36 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[920px]">
        <header className="rounded-[30px] bg-[#071a32] p-8 text-white sm:p-10">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600"><Icon size={22} /></div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-blue-300">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">{title}</h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-300">{description}</p>
        </header>
        <main className="mt-6 rounded-[30px] border border-slate-200 bg-white p-7 sm:p-10">
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
        </main>
      </div>
    </div>
  );
}

export default TermsPage;
