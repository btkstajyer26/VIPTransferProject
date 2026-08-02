import { Link } from "react-router-dom";
import {
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import brandMark from "@/assets/brand-mark.svg";

function PublicFooter() {
  const { t } = useTranslation();

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
            <img src={brandMark} alt="" className="size-11" />

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
            {t("footer.subtitle")}
          </p>
        </div>

        <FooterGroup title={t("footer.services")}>
          <FooterLink to="/#services">{t("footer.servicesLinks.airport")}</FooterLink>
          <FooterLink to="/#services">{t("footer.servicesLinks.city")}</FooterLink>
          <FooterLink to="/#services">{t("footer.servicesLinks.rent")}</FooterLink>
          <FooterLink to="/#services">{t("footer.servicesLinks.corporate")}</FooterLink>
        </FooterGroup>

        <FooterGroup title={t("footer.quickLinksTitle")}>
          <FooterLink to="/about">{t("footer.quickLinks.about")}</FooterLink>
          <FooterLink to="/fleet">{t("footer.quickLinks.vehicles")}</FooterLink>
          <FooterLink to="/#reservation-form">{t("footer.quickLinks.reservation")}</FooterLink>
          <FooterLink to="/reservation/track">Rezervasyon Takip</FooterLink>
          <FooterLink to="/faq">Sıkça Sorulan Sorular</FooterLink>
          <FooterLink to="/privacy">{t("footer.quickLinks.privacy")}</FooterLink>
          <FooterLink to="/terms">Kullanım Koşulları</FooterLink>
          <FooterLink to="/cookies">Çerez Politikası</FooterLink>
        </FooterGroup>

        <FooterGroup title={t("footer.contact")}>
          <ContactItem icon={Phone} href="tel:+905555555555">
            +90 555 555 55 55
          </ContactItem>

          <ContactItem icon={Mail} href="mailto:support@viptransfer.com">
            support@viptransfer.com
          </ContactItem>

          <ContactItem icon={MapPin} href="https://www.google.com/maps/search/?api=1&query=Istanbul%2C%20Turkey">
            İstanbul, Türkiye
          </ContactItem>
        </FooterGroup>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-white">
            Öne Çıkan Havalimanı Transferleri
          </h3>
          <div className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            {featuredTransfers.map((route) => (
              <Link
                key={route}
                to="/#reservation-form"
                className="text-sm text-slate-400 transition hover:text-blue-300"
              >
                {route}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-4 py-5 text-xs text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <span>
            {t("footer.rights")}
          </span>

          <span>
            {t("footer.slogan")}
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

function FooterLink({ children, to }) {
  return (
    <Link
      to={to}
      className="text-sm text-slate-400 transition hover:text-blue-300"
    >
      {children}
    </Link>
  );
}

function ContactItem({
  icon: Icon,
  children,
  href,
}) {
  return (
    <a
      href={href}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noreferrer" : undefined}
      className="flex items-start gap-3 text-sm text-slate-400 transition hover:text-blue-300"
    >
      <Icon
        size={17}
        className="mt-0.5 shrink-0 text-blue-400"
      />

      <span>{children}</span>
    </a>
  );
}

export default PublicFooter;

const featuredTransfers = [
  "İstanbul Havalimanı - Taksim",
  "İstanbul Havalimanı - Kadıköy",
  "İstanbul Havalimanı - Sultanahmet",
  "Sabiha Gökçen - Taksim",
  "Sabiha Gökçen - Kadıköy",
  "Antalya Havalimanı - Kemer",
  "Dalaman Havalimanı - Fethiye",
  "Adnan Menderes - Alaçatı",
];
