import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

import useAuth from "@/hooks/useAuth";

function AdminTopbar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

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
        <h1>Yönetim Paneli</h1>
        <p>VIP Transfer operasyonlarını yönetin.</p>
      </div>

      <div className="admin-profile">
        <div className="admin-avatar">A</div>

        <div className="admin-profile-info">
          <strong>Admin</strong>
          <span>Yönetici</span>
        </div>

        <button
          type="button"
          className="admin-logout-button"
          onClick={handleLogout}
          title="Çıkış yap"
          aria-label="Çıkış yap"
        >
          <LogOut size={19} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}

export default AdminTopbar;