import { Link } from "react-router-dom";
import {
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

function PublicFooter() {
  return (
    <footer
      id="contact"
      className="bg-[#06162b] text-white"
    >
      <div className="mx-auto grid max-w-[1320px] gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <Link
            to="/"
            className="flex items-center gap-3"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold">
              V
            </div>

            <div>
              <div className="font-bold tracking-[0.14em]">
                VIP TRANSFER
              </div>

              <div className="mt-1 text-[10px] tracking-[0.2em] text-blue-300">
                PREMIUM JOURNEY
              </div>
            </div>
          </Link>

          <p className="mt-5 max-w-xs text-sm leading-6 text-slate-400">
            Havalimanı ve şehir içi ulaşımda güvenli,
            konforlu ve premium transfer hizmeti.
          </p>
        </div>

        <FooterGroup title="Hizmetler">
          <FooterLink>Havalimanı Transferi</FooterLink>
          <FooterLink>Şehir İçi Transfer</FooterLink>
          <FooterLink>Şoförlü Araç Kiralama</FooterLink>
          <FooterLink>Kurumsal Transfer</FooterLink>
        </FooterGroup>

        <FooterGroup title="Hızlı Bağlantılar">
          <FooterLink>Hakkımızda</FooterLink>
          <FooterLink>Araçlarımız</FooterLink>
          <FooterLink>Rezervasyon</FooterLink>
          <FooterLink>Gizlilik Politikası</FooterLink>
        </FooterGroup>

        <FooterGroup title="İletişim">
          <ContactItem icon={Phone}>
            +90 555 555 55 55
          </ContactItem>

          <ContactItem icon={Mail}>
            support@viptransfer.com
          </ContactItem>

          <ContactItem icon={MapPin}>
            İstanbul, Türkiye
          </ContactItem>
        </FooterGroup>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-4 py-5 text-xs text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <span>
            © 2026 VIP Transfer. Tüm hakları saklıdır.
          </span>

          <span>
            Güvenli ve konforlu yolculuğun adresi.
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white">
        {title}
      </h3>

      <div className="mt-5 flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
}

function FooterLink({ children }) {
  return (
    <a
      href="#"
      className="text-sm text-slate-400 transition hover:text-blue-300"
    >
      {children}
    </a>
  );
}

function ContactItem({
  icon: Icon,
  children,
}) {
  return (
    <div className="flex items-start gap-3 text-sm text-slate-400">
      <Icon
        size={17}
        className="mt-0.5 shrink-0 text-blue-400"
      />

      <span>{children}</span>
    </div>
  );
}

export default PublicFooter;