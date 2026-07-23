import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  Menu,
  UserRound,
  X,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const {
    user,
    logout,
    isAuthenticated,
    isAuthLoading,
  } = useAuth();

  const links = [
    {
      title: "Hizmetlerimiz",
      href: "#services",
    },
    {
      title: "Araçlarımız",
      href: "#vehicles",
    },
    {
      title: "Nasıl Çalışır?",
      href: "#how-it-works",
    },
    {
      title: "İletişim",
      href: "#contact",
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
              Ana Sayfa
            </Link>

            {links.map((item) => (
              <a
                key={item.title}
                href={item.href}
                className="text-white/75 font-medium hover:text-white transition"
              >
                {item.title}
              </a>
            ))}
          </nav>

          {/* Right */}
          <div className="hidden xl:flex items-center gap-4">

            <button className="flex items-center gap-2 text-white/80 hover:text-white transition">
              TR
              <ChevronDown size={16} />
            </button>

            {!isAuthLoading &&
            isAuthenticated ? (
              <>
                <Link
                  to={
                    user?.role === "ADMIN"
                      ? "/admin/dashboard"
                      : "/account/dashboard"
                  }
                  className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-white"
                >
                  <UserRound size={18} />
                  Hesabım
                </Link>

                <button
                  onClick={logout}
                  className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#071a32]"
                >
                  <LogOut size={17} />
                  Çıkış
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-white/80 hover:text-white transition"
                >
                  Giriş Yap
                </Link>

                <Link
                  to="/register"
                  className="rounded-2xl bg-white px-7 py-4 font-semibold text-[#071a32] hover:bg-blue-50 transition"
                >
                  Kayıt Ol
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

              <Link to="/">Ana Sayfa</Link>

              {links.map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                >
                  {item.title}
                </a>
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
                    Hesabım
                  </Link>

                  <button onClick={logout}>
                    Çıkış Yap
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    Giriş Yap
                  </Link>

                  <Link to="/register">
                    Kayıt Ol
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

export default PublicNavbar;