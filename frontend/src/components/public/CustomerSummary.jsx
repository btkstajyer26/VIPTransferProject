import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Gift,
  History,
  LogIn,
  Sparkles,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

function CustomerSummary() {
  const {
    user,
    isAuthenticated,
    isAuthLoading,
  } = useAuth();

  if (isAuthLoading) {
    return null;
  }

  return (
    <section className="bg-[#f7faff] py-24 sm:py-28">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        {isAuthenticated ? (
          <AuthenticatedSummary user={user} />
        ) : (
          <GuestSummary />
        )}
      </div>
    </section>
  );
}

function GuestSummary() {
  return (
    <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#155eef] to-[#0b3d91] px-7 py-10 text-white shadow-[0_30px_80px_rgba(21,94,239,0.25)] sm:px-10 lg:px-14 lg:py-14">
      <div className="absolute -right-24 -top-24 size-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-28 left-1/3 size-72 rounded-full bg-cyan-300/10 blur-3xl" />

      <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium">
            <Sparkles size={16} />
            Üyelere özel ayrıcalıklar
          </div>

          <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Her yolculukta puan kazanın
          </h2>

          <p className="mt-5 max-w-xl leading-7 text-blue-100">
            Üye olarak rezervasyon geçmişinizi
            görüntüleyebilir, bilgilerinizi tekrar girmeden
            hızlı rezervasyon yapabilir ve sadakat puanı
            kazanabilirsiniz.
          </p>

          <div className="mt-7 flex flex-wrap gap-5 text-sm text-blue-50">
            <div className="flex items-center gap-2">
              <Gift size={18} />
              Sadakat puanı
            </div>

            <div className="flex items-center gap-2">
              <History size={18} />
              Rezervasyon geçmişi
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays size={18} />
              Hızlı rezervasyon
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Link
            to="/register"
            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-white px-7 text-sm font-semibold text-[#0b1f3a] transition hover:-translate-y-0.5 hover:bg-blue-50"
          >
            Ücretsiz kayıt ol
            <ArrowRight size={17} />
          </Link>

          <Link
            to="/login"
            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-7 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            <LogIn size={17} />
            Giriş yap
          </Link>
        </div>
      </div>
    </div>
  );
}

function AuthenticatedSummary({ user }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="rounded-[30px] border border-blue-100 bg-white p-8 shadow-[0_20px_60px_rgba(30,64,110,0.08)]">
        <div className="text-sm font-medium text-blue-600">
          Tekrar hoş geldiniz
        </div>

        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#0b1f3a]">
          Yolculuğunuzu planlamaya hazır mısınız?
        </h2>

        <p className="mt-4 max-w-xl leading-7 text-slate-600">
          Yaklaşan rezervasyonlarınızı kontrol edin veya
          yeni bir transfer oluşturun.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/reservation"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Yeni rezervasyon
            <ArrowRight size={16} />
          </Link>

          <Link
            to="/account/reservations"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 px-6 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            Rezervasyonlarım
          </Link>
        </div>
      </div>

      <div className="rounded-[30px] bg-[#071a32] p-8 text-white shadow-[0_20px_60px_rgba(7,26,50,0.22)]">
        <div className="flex items-center justify-between">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600">
            <Gift size={22} />
          </div>

          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-blue-100">
            Sadakat programı
          </span>
        </div>

        <div className="mt-8 text-sm text-slate-300">
          Mevcut puanınız
        </div>

        <div className="mt-2 text-4xl font-semibold">
          0
          <span className="ml-2 text-base font-medium text-blue-300">
            puan
          </span>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-300">
          Tamamlanan transferlerinizden puan kazanarak
          avantajlardan yararlanın.
        </p>

        <Link
          to="/account/loyalty"
          className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 transition hover:gap-3 hover:text-white"
        >
          Puan detaylarını gör
          <ArrowRight size={16} />
        </Link>

        <div className="mt-5 text-xs text-slate-500">
          Kullanıcı ID: {user?.userId ?? "-"}
        </div>
      </div>
    </div>
  );
}

export default CustomerSummary;