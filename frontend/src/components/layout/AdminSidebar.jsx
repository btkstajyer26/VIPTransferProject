import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

function AdminSidebar() {
  const { t } = useTranslation();

  const menuItems = [
    { path: "/admin", label: t("admin.sidebar.dashboard") },
    { path: "/admin/users", label: t("admin.sidebar.users") },
    { path: "/admin/reservations", label: t("admin.sidebar.reservations") },
    { path: "/admin/vehicles", label: t("admin.sidebar.vehicles") },
    { path: "/admin/campaigns", label: t("admin.sidebar.campaigns") },
    { path: "/admin/loyalty", label: t("admin.sidebar.loyalty") },
    { path: "/admin/pricing-zones", label: t("admin.sidebar.pricing") },
    { path: "/admin/notifications", label: t("admin.sidebar.notifications") },
  ];

  return (
    <aside className="admin-sidebar">
      <h2>VIP Transfer</h2>

      <nav>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/admin"}
            className={({ isActive }) =>
              isActive ? "sidebar-link active" : "sidebar-link"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default AdminSidebar;