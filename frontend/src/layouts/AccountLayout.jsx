import { NavLink, Outlet } from "react-router-dom";
import {
  CalendarDays,
  Gift,
  LayoutDashboard,
  UserRound,
  KeyRound,
  Settings,
} from "lucide-react";

import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";

const navigation = [
  { to: "/account/dashboard", label: "Genel Bakış", icon: LayoutDashboard },
  { to: "/account/reservations", label: "Rezervasyonlarım", icon: CalendarDays },
  { to: "/account/loyalty", label: "Sadakat Programı", icon: Gift },
  { to: "/account/profile", label: "Profil Bilgilerim", icon: UserRound },
  { to: "/account/password", label: "Şifre Değiştir", icon: KeyRound },
  { to: "/account/settings", label: "Hesap Ayarları", icon: Settings },
];

function AccountLayout() {
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <PublicNavbar />

      <main className="mx-auto grid max-w-[1400px] gap-5 px-4 pb-16 pt-36 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-7 lg:px-8 lg:pt-36 xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.06)] lg:sticky lg:top-32 lg:h-fit lg:rounded-[28px] lg:p-3">
          <div className="hidden px-4 pb-4 pt-3 lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Müşteri paneli
            </p>
            <h1 className="mt-2 text-xl font-bold text-[#071a32]">Hesabım</h1>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
            {navigation.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  `flex shrink-0 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition lg:w-full lg:justify-start lg:gap-3 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 overflow-hidden">
          <Outlet />
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

export default AccountLayout;
