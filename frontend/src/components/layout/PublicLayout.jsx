import { Outlet } from "react-router-dom";

import PublicNavbar from "../components/public/PublicNavbar";
import PublicFooter from "../components/public/PublicFooter";

function PublicLayout() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <main>
        <Outlet />
      </main>

      <PublicFooter />
    </div>
  );
}

export default PublicLayout;