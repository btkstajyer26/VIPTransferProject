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
import alFlag from "@/assets/flags/al.svg";
import NotificationBell from "@/components/notifications/NotificationBell";

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
      title: t("nav.contact"),
      href: "/#contact",
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-[1700px] px-5 pt-5">
        <div className="flex h-[82px] items-center justify-between rounded-3xl border border-white/10 bg-[#071a32]/85 px-8 backdrop-blur-2xl shadow-2xl">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-4"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-2xl font-bold text-white">
              V
            </div>

            <div>
              <div className="text-white font-bold tracking-[0.18em] text-xl">
                VIP TRANSFER
              </div>

              <div className="text-blue-200 tracking-[0.25em] text-[11px] mt-1">
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
          <div className="hidden xl:flex items-center gap-4">
          
            <CurrencySelector variant="public" />

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-white/90 transition outline-none hover:bg-white/10 hover:text-white focus:outline-none">
                <FlagImage
                  src={currentLanguage.flag}
                  alt={currentLanguage.label}
                />
                {currentLanguage.code}
                <ChevronDown size={16} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-2xl border-slate-100 bg-white p-2 text-slate-900 shadow-2xl">
                {languageOptions.map((language) => (
                  <DropdownMenuItem
                    key={language.code}
                    className="flex cursor-pointer gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50 focus:bg-slate-50"
                    onClick={() => handleLanguageChange(language.code)}
                  >
                    <FlagImage
                      src={language.flag}
                      alt={language.label}
                    />
                    <span className="font-semibold">{language.code}</span>
                    <span className="ml-auto text-xs text-slate-400">
                      {language.label}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {!isAuthLoading &&
            isAuthenticated ? (
              <>
                <NotificationBell />

                <Link
                  to={
                    user?.role === "ADMIN"
                      ? "/admin/dashboard"
                      : "/account/dashboard"
                  }
                  className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-white"
                >
                  <UserRound size={18} />
                  {t("nav.account")}
                </Link>

                <button
                  onClick={logout}
                  className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#071a32]"
                >
                  <LogOut size={17} />
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-white/80 hover:text-white transition"
                >
                  {t("nav.login")}
                </Link>

                <Link
                  to="/register"
                  className="rounded-2xl bg-white px-7 py-4 font-semibold text-[#071a32] hover:bg-blue-50 transition"
                >
                  {t("nav.register")}
                </Link>
              </>
            )}
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

function FlagImage({ src, alt }) {
  return (
    <span className="block h-6 w-8 shrink-0 overflow-hidden rounded-md border border-slate-200/60 bg-white shadow-sm">
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
      />
    </span>
  );
}

export default PublicNavbar;
