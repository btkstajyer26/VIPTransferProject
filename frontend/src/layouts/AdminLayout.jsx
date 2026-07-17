import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/layout/AdminSidebar";
import AdminTopbar from "../components/layout/AdminTopbar";
import "../assets/styles/admin.css";

function AdminLayout() {
  return (
    <div className="admin-layout">
      <AdminSidebar />

      <div className="admin-main">
        <AdminTopbar />

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;