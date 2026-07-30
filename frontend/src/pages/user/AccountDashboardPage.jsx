import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Gift,
  LoaderCircle,
  MapPin,
  RefreshCw,
  UserRound,
} from "lucide-react";

import { getMyReservations } from "@/api/reservationApi";
import { getMyLoyaltyAccount } from "@/api/loyaltyServices";
import { getCurrentUser } from "@/api/userServices";

function AccountDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    const [profileResult, reservationsResult, loyaltyResult] =
      await Promise.allSettled([
        getCurrentUser(),
        getMyReservations(),
        getMyLoyaltyAccount(),
      ]);

    if (profileResult.status === "fulfilled") {
      setProfile(profileResult.value);
    }
    if (reservationsResult.status === "fulfilled") {
      setReservations(reservationsResult.value || []);
    }
    if (loyaltyResult.status === "fulfilled") {
      setLoyalty(loyaltyResult.value);
    }

    if (
      profileResult.status === "rejected" &&
      reservationsResult.status === "rejected"
    ) {
      setError(getErrorMessage(profileResult.reason));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      getCurrentUser(),
      getMyReservations(),
      getMyLoyaltyAccount(),
    ]).then(([profileResult, reservationsResult, loyaltyResult]) => {
      if (!active) return;

      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value);
      }
      if (reservationsResult.status === "fulfilled") {
        setReservations(reservationsResult.value || []);
      }
      if (loyaltyResult.status === "fulfilled") {
        setLoyalty(loyaltyResult.value);
      }
      if (
        profileResult.status === "rejected" &&
        reservationsResult.status === "rejected"
      ) {
        setError(getErrorMessage(profileResult.reason));
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const upcoming = useMemo(
    () =>
      reservations
        .filter(
          (item) =>
            !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(item.status),
        )
        .sort(
          (a, b) =>
            new Date(a.scheduledTime).getTime() -
            new Date(b.scheduledTime).getTime(),
        )[0],
    [reservations],
  );

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#071a32] via-[#0b2b55] to-[#155eef] p-7 text-white shadow-[0_24px_70px_rgba(7,26,50,0.22)] sm:p-9">
        <div className="absolute -right-20 -top-28 size-72 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-200">Tekrar hoş geldiniz</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {getFullName(profile) || "Değerli yolcumuz"}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Yaklaşan transferlerinizi, sadakat puanlarınızı ve profilinizi tek
              yerden yönetin.
            </p>
          </div>
          <Link
            to="/#reservation-form"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-bold text-[#071a32] transition hover:-translate-y-0.5"
          >
            Yeni rezervasyon
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {error && <ErrorBox message={error} onRetry={loadDashboard} />}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={CalendarDays}
          label="Toplam rezervasyon"
          value={reservations.length}
        />
        <StatCard
          icon={CalendarCheck}
          label="Tamamlanan yolculuk"
          value={reservations.filter((item) => item.status === "COMPLETED").length}
        />
        <StatCard
          icon={Gift}
          label="Sadakat puanı"
          value={Number(loyalty?.lifetimePoints || 0).toLocaleString("tr-TR")}
          detail={loyalty?.tier || "BRONZE"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-600">Sıradaki yolculuk</p>
              <h3 className="mt-1 text-xl font-bold text-[#071a32]">
                Yaklaşan transferiniz
              </h3>
            </div>
            <Link
              to="/account/reservations"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Tümünü gör
            </Link>
          </div>

          {upcoming ? (
            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                  {statusLabel(upcoming.status)}
                </span>
                <span className="text-sm font-semibold text-slate-600">
                  {formatDate(upcoming.scheduledTime)}
                </span>
              </div>
              <RouteLine label="Alış" value={upcoming.pickupAddress} />
              <RouteLine label="Varış" value={upcoming.dropoffAddress} />
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 pt-4 text-sm">
                <span className="font-medium text-slate-600">
                  {upcoming.vehicleName || "VIP Transfer aracı"}
                </span>
                <span className="font-bold text-[#071a32]">
                  {formatMoney(upcoming.calculatedPrice, upcoming.currency)}
                </span>
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)]">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-[#071a32]">
            <UserRound size={22} />
          </div>
          <h3 className="mt-5 text-xl font-bold text-[#071a32]">Profil özeti</h3>
          <dl className="mt-5 space-y-4 text-sm">
            <ProfileRow label="Telefon" value={profile?.phoneNumber} />
            <ProfileRow label="E-posta" value={profile?.email} />
            <ProfileRow label="Dil" value={profile?.preferredLang?.toUpperCase()} />
          </dl>
          <Link
            to="/account/profile"
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-600"
          >
            Profili düzenle <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-[28px] bg-white">
      <LoaderCircle className="mr-3 animate-spin text-blue-600" />
      <span className="font-medium text-slate-600">Hesabınız hazırlanıyor...</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-[#071a32]">{value}</p>
          {detail && <p className="mt-1 text-xs font-bold text-blue-600">{detail}</p>}
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function RouteLine({ label, value }) {
  return (
    <div className="mt-4 flex gap-3">
      <MapPin className="mt-0.5 shrink-0 text-blue-600" size={18} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-medium text-slate-700">{value || "-"}</p>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="truncate font-semibold text-slate-800">{value || "Belirtilmemiş"}</dd>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
      <CalendarDays className="mx-auto text-slate-300" size={32} />
      <p className="mt-3 font-semibold text-slate-700">Yaklaşan transferiniz yok</p>
      <Link to="/#reservation-form" className="mt-3 inline-block text-sm font-bold text-blue-600">
        Rezervasyon oluştur
      </Link>
    </div>
  );
}

function ErrorBox({ message, onRetry }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
      <span>{message}</span>
      <button onClick={onRetry} className="inline-flex items-center gap-2 font-bold">
        <RefreshCw size={15} /> Tekrar dene
      </button>
    </div>
  );
}

function getFullName(profile) {
  return [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(value, currency = "TRY") {
  if (value == null) return "-";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency || "TRY",
  }).format(Number(value));
}

function statusLabel(status) {
  return (
    {
      PENDING: "Bekliyor",
      CONFIRMED: "Onaylandı",
      ASSIGNED: "Araç atandı",
      DRIVER_ASSIGNED: "Sürücü atandı",
      ON_THE_WAY: "Yolda",
      IN_PROGRESS: "Devam ediyor",
      COMPLETED: "Tamamlandı",
      CANCELLED: "İptal edildi",
      NO_SHOW: "Gerçekleşmedi",
    }[status] || status
  );
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Hesap bilgileri yüklenemedi."
  );
}

export default AccountDashboardPage;
