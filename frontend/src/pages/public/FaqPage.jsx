import { useState } from "react";
import { ChevronDown, CircleHelp, MessageCircle } from "lucide-react";

const questions = [
  ["Rezervasyonu nasıl oluşturabilirim?", "Ana sayfadaki hızlı rezervasyon formunda alış ve varış adreslerini, tarih, saat ve yolcu sayısını seçerek uygun araçları görüntüleyebilirsiniz."],
  ["Rezervasyonumu iptal edebilir miyim?", "Beklemede olan rezervasyonlarınızı Hesabım > Rezervasyonlarım alanından iptal edebilirsiniz. Operasyon aşamasına geçen rezervasyonlar için destek ekibiyle iletişime geçin."],
  ["Fiyat nasıl hesaplanıyor?", "Fiyat; rota mesafesi, seçilen araç sınıfı, aktif fiyat bölgesi, yoğunluk ve varsa kampanya veya sadakat indirimi dikkate alınarak hesaplanır."],
  ["Misafir olarak rezervasyon yapabilir miyim?", "Evet. Üye olmadan telefon numaranızla rezervasyon oluşturabilirsiniz. Üyelik, rezervasyon geçmişi ve sadakat puanı gibi ek avantajlar sağlar."],
  ["Havalimanında sürücümü nasıl bulurum?", "Rezervasyon onayından sonra transfer ve sürücü bilgileri hesabınızda görüntülenir; gerekli durumlarda iletişim kanallarından da paylaşılır."],
  ["Uçuşum gecikirse ne olur?", "Uçuş numaranızı rezervasyona eklediğinizde operasyon ekibi transfer planını güncel uçuş durumuna göre düzenleyebilir."],
  ["Hangi ödeme yöntemleri kullanılabilir?", "Kullanılabilir ödeme yöntemleri rezervasyonun son adımında gösterilir. Ödeme altyapısı etkin değilse destek ekibi alternatif yöntemleri bildirir."],
  ["Çocuk koltuğu talep edebilir miyim?", "Rezervasyon notuna çocuk koltuğu ve diğer özel taleplerinizi ekleyebilirsiniz. Uygunluk ekip tarafından teyit edilir."],
];

function FaqPage() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="min-h-screen bg-[#f4f7fb] px-4 pb-20 pt-36 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[980px]">
        <header className="text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <CircleHelp size={26} />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Yardım merkezi</p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-[#071a32] sm:text-5xl">Sıkça Sorulan Sorular</h1>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">Rezervasyon ve transfer süreciyle ilgili en çok merak edilen konular.</p>
        </header>

        <div className="mt-12 space-y-3">
          {questions.map(([question, answer], index) => {
            const isOpen = index === openIndex;
            return (
              <article key={question} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between gap-5 p-5 text-left sm:p-6"
                >
                  <span className="font-bold text-[#071a32]">{question}</span>
                  <ChevronDown className={`shrink-0 text-blue-600 transition ${isOpen ? "rotate-180" : ""}`} size={20} />
                </button>
                {isOpen && <p className="border-t border-slate-100 px-5 py-5 text-sm leading-7 text-slate-600 sm:px-6">{answer}</p>}
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-5 rounded-[26px] bg-[#071a32] p-7 text-white sm:flex-row">
          <div>
            <h2 className="text-xl font-bold">Aradığınız cevabı bulamadınız mı?</h2>
            <p className="mt-2 text-sm text-slate-300">Destek ekibimiz size yardımcı olsun.</p>
          </div>
          <a href="https://wa.me/905555555555" target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#25D366] px-6 text-sm font-bold">
            <MessageCircle size={18} /> WhatsApp desteği
          </a>
        </div>
      </div>
    </div>
  );
}

export default FaqPage;
