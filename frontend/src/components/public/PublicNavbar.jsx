import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  Menu,
  UserRound,
  X,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import apiClient from "../../api/apiClient";
import CurrencySelector from "@/components/layout/CurrencySelector";
import trFlag from "@/assets/flags/tr.svg";
import enFlag from "@/assets/flags/en.svg";
import ruFlag from "@/assets/flags/ru.svg";
import alFlag from "@/assets/flags/albania.png";
import NotificationBell from "@/components/notifications/NotificationBell";
import brandMark from "@/assets/brand-mark.svg";

function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const {
    user,
    logout,
    isAuthenticated,
    isAuthLoading,
  } = useAuth();

  const handleLanguageChange = async (lang) => {
    i18n.changeLanguage(lang);
    if (isAuthenticated) {
      try {
        await apiClient.patch("/users/me", {
          preferredLang: lang.toLowerCase(),
        });
      } catch (err) {
        console.error("Failed to save language preference:", err);
      }
    }
  };

  const languageOptions = [
    { code: "TR", flag: trFlag, label: "Türkçe" },
    { code: "EN", flag: enFlag, label: "English" },
    { code: "RU", flag: ruFlag, label: "Русский" },
    { code: "AL", flag: alFlag, label: "Shqip" },
  ];

  const currentLanguage =
    languageOptions.find(
      (item) => item.code === i18n.language?.toUpperCase(),
    ) || languageOptions[0];

  const links = [
    {
      title: t("nav.services"),
      href: "/#services",
    },
    {
      title: t("nav.vehicles"),
      href: "/fleet",
    },
    {
      title: t("nav.howItWorks"),
      href: "/#how-it-works",
    },
    {
      title: "Rezervasyon Takip",
      href: "/reservation/track",
    },
    {
      title: t("nav.contact"),
      href: "/#contact",
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-[1700px] px-3 pt-3 sm:px-5 sm:pt-5">
        <div className="flex h-[74px] items-center justify-between rounded-3xl border border-white/10 bg-[#071a32]/85 px-4 backdrop-blur-2xl shadow-2xl sm:h-[82px] sm:px-8">

          {/* Logo */}
          <Link
            to="/"
            className="min-w-0 flex items-center gap-3 sm:gap-4"
          >
            <img src={brandMark} alt="" className="h-12 w-12 shrink-0 sm:h-14 sm:w-14" />

            <div className="min-w-0">
              <div className="whitespace-nowrap text-base font-bold tracking-[0.14em] text-white sm:text-xl sm:tracking-[0.18em]">
                VIP TRANSFER
              </div>

              <div className="mt-1 hidden whitespace-nowrap text-[11px] tracking-[0.25em] text-blue-200 sm:block">
                PREMIUM JOURNEY
              </div>
            </div>
          </Link>

          {/* Desktop */}
          <nav className="hidden xl:flex items-center gap-8">

            <Link
              to="/"
              className="text-white font-semibold hover:text-blue-300 transition"
            >
              {t("nav.home")}
            </Link>

            {links.map((item) => (
              <Link
                key={item.title}
                to={item.href}
                className="text-white/75 font-medium hover:text-white transition"
              >
                {item.title}
              </Link>
            ))}
          </nav>

          {/* Right */}
          <div className="hidden xl:flex items-center gap-2">
            <div className="flex items-center gap-3">
              {!isAuthLoading &&
              isAuthenticated ? (
                <>
                  <NotificationBell />
                  <Link
                    to={user?.role === "ADMIN" ? "/admin/dashboard" : "/account/dashboard"}
                    className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white"
                  >
                    <UserRound size={17} />
                    {t("nav.account")}
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#071a32]"
                  >
                    <LogOut size={16} />
                    {t("nav.logout")}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-sm text-white/80 transition hover:text-white">
                    {t("nav.login")}
                  </Link>
                  <Link to="/register" className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#071a32] transition hover:bg-blue-50">
                    {t("nav.register")}
                  </Link>
                </>
              )}
            </div>

            <div className="flex min-w-20 flex-col items-stretch gap-0.5 border-l border-white/15 pl-2">
              <CurrencySelector variant="public" compact />
              <DropdownMenu>
                <DropdownMenuTrigger className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-white/75 transition outline-none hover:bg-white/10 hover:text-white focus:outline-none">
                  <FlagImage src={currentLanguage.flag} alt={currentLanguage.label} compact />
                  {currentLanguage.code}
                  <ChevronDown size={13} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-2xl border-slate-100 bg-white p-2 text-slate-900 shadow-2xl">
                  {languageOptions.map((language) => (
                    <DropdownMenuItem
                      key={language.code}
                      className="flex cursor-pointer gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50 focus:bg-slate-50"
                      onClick={() => handleLanguageChange(language.code)}
                    >
                      <FlagImage src={language.flag} alt={language.label} />
                      <span className="font-semibold">{language.code}</span>
                      <span className="ml-auto text-xs text-slate-400">{language.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile */}

          <button
            onClick={() =>
              setMobileOpen(!mobileOpen)
            }
            className="xl:hidden text-white"
          >
            {mobileOpen ? (
              <X size={28} />
            ) : (
              <Menu size={28} />
            )}
          </button>
        </div>

        {mobileOpen && (
          <div className="mt-3 rounded-3xl bg-white p-5 xl:hidden shadow-xl">

            <div className="flex flex-col gap-3">

              <Link to="/">{t("nav.home")}</Link>

              {links.map((item) => (
                <Link
                  key={item.title}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.title}
                </Link>
              ))}

              <hr />

              {!isAuthLoading &&
              isAuthenticated ? (
                <>
                  <Link
                    to={
                      user?.role === "ADMIN"
                        ? "/admin/dashboard"
                        : "/account/dashboard"
                    }
                  >
                    {t("nav.account")}
                  </Link>

                  <button onClick={logout}>
                    {t("nav.logout")}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    {t("nav.login")}
                  </Link>

                  <Link to="/register">
                    {t("nav.register")}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function FlagImage({ src, alt, compact = false }) {
  return (
    <span className={`block shrink-0 overflow-hidden ${
      compact ? "h-4 w-6 rounded" : "h-6 w-8 rounded-md"
    }`}>
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
      />
    </span>
  );
}

export default PublicNavbar;
