import { Cookie } from "lucide-react";
import { LegalDocument } from "./TermsPage";

const cookieSections = [
  ["Zorunlu depolama", "Oturumun korunması, güvenli giriş ve rezervasyon adımlarının sürdürülebilmesi için erişim belirteçleri ve rezervasyon taslakları tarayıcı depolamasında tutulabilir."],
  ["Tercihler", "Seçtiğiniz dil ve para birimi gibi tercihler sonraki ziyaretinizde aynı deneyimi sunmak için saklanabilir."],
  ["Üçüncü taraf hizmetler", "Harita ve adres önerileri için Google Maps gibi üçüncü taraf hizmetler kullanılabilir. Bu sağlayıcıların kendi gizlilik ve çerez kuralları geçerlidir."],
  ["Kontrol seçenekleri", "Tarayıcı ayarlarınızdan çerezleri ve site verilerini silebilir veya engelleyebilirsiniz. Zorunlu verilerin engellenmesi giriş ve rezervasyon işlevlerini etkileyebilir."],
];

function CookiePolicyPage() {
  return (
    <LegalDocument
      icon={Cookie}
      eyebrow="Tarayıcı verileri"
      title="Çerez Politikası"
      description="Platformun çalışması ve tercihlerinizin hatırlanması için kullanılan tarayıcı verileri hakkında bilgi."
      sections={cookieSections}
      notice="Bu projede ağırlıklı olarak localStorage ve sessionStorage kullanılmaktadır. Analitik veya reklam çerezi eklenirse açık rıza yönetimi ayrıca uygulanmalıdır."
    />
  );
}

export default CookiePolicyPage;
