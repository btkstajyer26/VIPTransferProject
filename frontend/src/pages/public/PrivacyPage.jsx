import { LockKeyhole } from "lucide-react";
import { LegalDocument } from "./TermsPage";

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
    <LegalDocument
      icon={LockKeyhole}
      eyebrow="Veri güvenliği"
      title="Gizlilik Politikası"
      description="Kişisel bilgilerinizin hangi amaçlarla işlendiğini ve nasıl korunduğunu şeffaf biçimde açıklıyoruz."
      notice="Bu metin proje için bilgilendirme taslağıdır. Canlı kullanıma geçmeden önce KVKK ve ilgili mevzuata göre hukuk danışmanı tarafından gözden geçirilmelidir. Veri talepleri: support@viptransfer.com"
      sections={sections.map(({ title, content }) => [title, content])}
    />
  );
}

export default PrivacyPage;
