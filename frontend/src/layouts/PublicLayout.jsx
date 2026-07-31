import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import PublicNavbar from "../components/public/PublicNavbar";
import PublicFooter from "../components/public/PublicFooter";
import WhatsAppButton from "../components/public/WhatsAppButton";

function PublicLayout() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const target = document.getElementById(location.hash.slice(1));
    if (target) {
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <main>
        <Outlet />
      </main>

      <PublicFooter />
      <WhatsAppButton />
    </div>
  );
}

export default PublicLayout;
