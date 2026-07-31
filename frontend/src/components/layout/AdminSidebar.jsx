import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bell, CalendarDays, Car, ChartNoAxesCombined, Gift,
  LayoutDashboard, MapPinned, PanelLeftClose, PanelLeftOpen,
  SlidersHorizontal, Users, WalletCards, Languages,
} from "lucide-react";
import brandMark from "@/assets/brand-mark.svg";

function AdminSidebar({ collapsed, onToggle }) {
  const { t } = useTranslation();
  const menuItems = [
    { path: "/admin/dashboard", label: t("admin.sidebar.dashboard"), icon: LayoutDashboard },
    { path: "/admin/users", label: t("admin.sidebar.users"), icon: Users },
    { path: "/admin/reservations", label: t("admin.sidebar.reservations"), icon: CalendarDays },
    { path: "/admin/vehicles", label: t("admin.sidebar.vehicles"), icon: Car },
    { path: "/admin/campaigns", label: t("admin.sidebar.campaigns"), icon: Gift },
    { path: "/admin/loyalty", label: t("admin.sidebar.loyalty"), icon: WalletCards },
    { path: "/admin/pricing-zones", label: t("admin.sidebar.pricing"), icon: MapPinned },
    { path: "/admin/pricing-rules", label: "Fiyat Kuralları", icon: SlidersHorizontal },
    { path: "/admin/notifications", label: t("admin.sidebar.notifications"), icon: Bell },
    { path: "/admin/translations", label: "Çeviriler", icon: Languages },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <img src={brandMark} alt="" className="admin-brand-mark" />
        <div className="admin-brand-copy">
          <h2>VIP Transfer</h2>
          <small>Yönetim Merkezi</small>
        </div>
        <button
          type="button"
          className="admin-sidebar-toggle"
          onClick={onToggle}
          title={collapsed ? "Menüyü aç" : "Menüyü daralt"}
          aria-label={collapsed ? "Menüyü aç" : "Menüyü daralt"}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                isActive ? "sidebar-link active" : "sidebar-link"
              }
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="admin-sidebar-summary">
        <ChartNoAxesCombined size={18} />
        <div>
          <strong>Canlı operasyon</strong>
          <span>Tüm modüller tek panelde</span>
        </div>
      </div>
    </aside>
  );
}

export default AdminSidebar;
