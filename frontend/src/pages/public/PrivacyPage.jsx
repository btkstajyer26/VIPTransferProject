import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";

const sections = [
  {
    title: "Toplanan bilgiler",
    content:
      "Rezervasyonun yürütülmesi için ad, soyad, telefon, e-posta, alış ve varış adresleri, yolculuk zamanı ve varsa uçuş bilgileri işlenebilir.",
  },
  {
    title: "Bilgilerin kullanım amacı",
    content:
      "Bilgileriniz rezervasyon oluşturma, transfer operasyonunu yürütme, fiyatlandırma, müşteri desteği ve yasal yükümlülüklerin yerine getirilmesi amacıyla kullanılır.",
  },
  {
    title: "Saklama ve güvenlik",
    content:
      "Kişisel veriler yalnızca gerekli süre boyunca saklanır ve yetkisiz erişime karşı teknik ve idari önlemlerle korunur.",
  },
  {
    title: "Haklarınız",
    content:
      "Profil bilgilerinizi hesabınızdan görüntüleyebilir ve güncelleyebilirsiniz. Veri talepleriniz için bizimle iletişime geçebilirsiniz.",
  },
];

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fb] px-4 pb-20 pt-36 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[980px]">
        <header className="rounded-[30px] bg-[#071a32] p-8 text-white shadow-[0_24px_70px_rgba(7,26,50,0.2)] sm:p-10">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600">
            <LockKeyhole size={22} />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.17em] text-blue-300">
            Veri güvenliği
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Gizlilik Politikası</h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-300">
            Kişisel bilgilerinizin hangi amaçlarla işlendiğini ve nasıl
            korunduğunu şeffaf biçimde açıklıyoruz.
          </p>
        </header>

        <main className="mt-6 rounded-[30px] border border-slate-200 bg-white p-7 shadow-[0_18px_55px_rgba(15,23,42,0.05)] sm:p-10">
          <div className="flex items-start gap-3 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            <ShieldCheck className="mt-0.5 shrink-0 text-blue-600" size={20} />
            Bu metin proje için bilgilendirme taslağıdır. Canlı kullanıma
            geçmeden önce KVKK ve ilgili mevzuata göre hukuk danışmanı tarafından
            gözden geçirilmelidir.
          </div>

          <div className="mt-8 space-y-8">
            {sections.map((section, index) => (
              <section key={section.title}>
                <div className="flex gap-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#071a32] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-[#071a32]">{section.title}</h2>
                    <p className="mt-3 leading-7 text-slate-600">{section.content}</p>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-3 border-t border-slate-100 pt-7 text-sm text-slate-600">
            <Mail className="text-blue-600" size={18} />
            Veri talepleri:{" "}
            <a className="font-bold text-blue-600" href="mailto:support@viptransfer.com">
              support@viptransfer.com
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}

export default PrivacyPage;
