import { ChevronDown, KeyRound, LogOut, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

import apiClient from "../../api/apiClient";

import NotificationBell from "@/components/notifications/NotificationBell";
import CurrencySelector from "@/components/layout/CurrencySelector";
import useAuth from "@/hooks/useAuth";

function AdminTopbar() {
  const navigate = useNavigate();
  const { logout, isAuthenticated, user } = useAuth();
  const { t, i18n } = useTranslation();

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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Çıkış işlemi sırasında hata oluştu:", error);
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-title">
        <h1>{t('admin.topbar.title')}</h1>
        <p>{t('admin.topbar.subtitle')}</p>
      </div>

      <div className="admin-profile flex items-center gap-4">
        <CurrencySelector />
        
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 text-[#071a32]/80 hover:text-[#071a32] transition outline-none focus:outline-none font-semibold">
            {i18n.language?.toUpperCase() || 'TR'}
            <ChevronDown size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border-gray-200 rounded-xl mt-2 p-2 shadow-xl z-50">
            <DropdownMenuItem 
              className="hover:bg-slate-100 focus:bg-slate-100 cursor-pointer rounded-lg py-2 px-4 transition-colors text-sm font-medium text-slate-700"
              onClick={() => handleLanguageChange('TR')}
            >
              TR - Türkçe
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="hover:bg-slate-100 focus:bg-slate-100 cursor-pointer rounded-lg py-2 px-4 transition-colors text-sm font-medium text-slate-700"
              onClick={() => handleLanguageChange('EN')}
            >
              EN - English
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="hover:bg-slate-100 focus:bg-slate-100 cursor-pointer rounded-lg py-2 px-4 transition-colors text-sm font-medium text-slate-700"
              onClick={() => handleLanguageChange('RU')}
            >
              RU - Русский
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="hover:bg-slate-100 focus:bg-slate-100 cursor-pointer rounded-lg py-2 px-4 transition-colors text-sm font-medium text-slate-700"
              onClick={() => handleLanguageChange('AL')}
            >
              AL - Shqip
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <NotificationBell scope="admin" />
        <DropdownMenu>
          <DropdownMenuTrigger className="admin-account-trigger">
            <div className="admin-avatar">
              {(user?.firstName?.[0] || "A").toUpperCase()}
            </div>
            <div className="admin-profile-info">
              <strong>
                {[user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
                  t("admin.topbar.admin")}
              </strong>
              <span>{t("admin.topbar.manager")}</span>
            </div>
            <ChevronDown size={16} className="text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-xl bg-white p-2 shadow-xl">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span className="block text-sm">Yönetici hesabı</span>
                <span className="block truncate text-xs font-normal text-slate-500">
                  {user?.email || "Profil ve güvenlik ayarları"}
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => navigate("/admin/account")}>
              <UserRound className="mr-2 size-4" /> Profil bilgilerini düzenle
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => navigate("/admin/password")}>
              <KeyRound className="mr-2 size-4" /> Şifreyi değiştir
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer rounded-lg text-red-600 focus:text-red-600" onClick={handleLogout}>
              <LogOut className="mr-2 size-4" /> Güvenli çıkış
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          className="admin-logout-button"
          onClick={handleLogout}
          title={t('nav.logout')}
          aria-label={t('nav.logout')}
        >
          <LogOut size={19} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}

export default AdminTopbar;
