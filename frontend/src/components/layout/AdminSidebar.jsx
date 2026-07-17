import { NavLink } from "react-router-dom";

function AdminSidebar() {
  const menuItems = [
    { path: "/admin", label: "Dashboard" },
    { path: "/admin/users", label: "Kullanıcılar" },
    { path: "/admin/reservations", label: "Rezervasyonlar" },
    { path: "/admin/vehicles", label: "Araçlar" },
    { path: "/admin/campaigns", label: "Kampanyalar" },
    { path: "/admin/loyalty", label: "Sadakat Sistemi" },
    { path: "/admin/pricing-zones", label: "Fiyat Bölgeleri" },
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