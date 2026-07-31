import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  CarFront,
  LoaderCircle,
  MapPin,
  Phone,
  Search,
  UsersRound,
  PlaneTakeoff,
  StickyNote,
  ReceiptText,
} from "lucide-react";

import { getGuestReservation } from "@/api/reservationApi";
import ReservationStatusBadge from "@/components/reservations/ReservationStatusBadge";

const STATUS_LABELS = {
  PENDING: "Onay Bekleniyor",
  ASSIGNED: "Sürücü Atandı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
  NO_SHOW: "Gelmedi",
};

function formatDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(amount, currency) {
  if (amount == null) return "-";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency || "TRY",
    minimumFractionDigits: 2,
  }).format(amount);
}

function GuestLookupPage() {
  const [searchParams] = useSearchParams();

  const [bookingRef, setBookingRef] = useState(
    searchParams.get("ref") || "",
  );
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reservation, setReservation] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setReservation(null);

    const ref = bookingRef.trim();
    const ph = phone.trim();
    if (!ref || !ph) {
      setError("Rezervasyon numarası ve telefon numaranızı girin.");
      return;
    }

    try {
      setLoading(true);
      const data = await getGuestReservation(ref, ph);
      setReservation(data);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404 || status === 403) {
        setError(
          "Rezervasyon bulunamadı. Numarayı ve telefon numaranızı kontrol edin.",
        );
      } else {
        setError(
          err?.response?.data?.message ||
            "Bir hata oluştu. Lütfen tekrar deneyin.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-slate-50 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <p className="text-sm font-semibold text-blue-600">Misafir Takip</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#071a32]">
            Rezervasyon Sorgula
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Rezervasyon numaranız ve kayıtlı telefon numaranızla durumunuzu
            sorgulayabilirsiniz.
          </p>
        </header>

        {/* Search form */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="mt-0.5 shrink-0" size={18} />
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-bold text-slate-700">
                Rezervasyon numarası
              </label>
              <input
                type="text"
                value={bookingRef}
                onChange={(e) => setBookingRef(e.target.value)}
                placeholder="VIP-XXXXXXXX"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Telefon numarası
              </label>
              <div className="relative mt-2">
                <Phone
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+90 5xx xxx xx xx"
                  className="h-12 w-full rounded-2xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <Search size={17} />
              )}
              Sorgula
            </button>
          </form>
        </div>

        {/* Result card */}
        {reservation && (
          <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Rezervasyon numarası
                </p>
                <p className="mt-1 text-lg font-extrabold text-[#071a32]">
                  {reservation.bookingReference}
                </p>
              </div>
              <ReservationStatusBadge status={reservation.status} />
            </div>

            <div className="mt-6 space-y-4 text-sm">
              <DetailRow
                icon={<MapPin size={16} className="text-blue-500" />}
                label="Alış noktası"
                value={reservation.pickupAddress}
              />
              <DetailRow
                icon={<MapPin size={16} className="text-rose-500" />}
                label="Bırakış noktası"
                value={reservation.dropoffAddress}
              />
              <DetailRow
                icon={<CalendarDays size={16} className="text-slate-500" />}
                label="Transfer zamanı"
                value={formatDateTime(reservation.scheduledTime)}
              />
              <DetailRow
                icon={<CarFront size={16} className="text-slate-500" />}
                label="Araç"
                value={reservation.vehicleName || "-"}
              />
              <DetailRow
                icon={<UsersRound size={16} className="text-slate-500" />}
                label="Yolcu sayısı"
                value={reservation.passengerCount}
              />
              {reservation.flightNumber && (
                <DetailRow
                  icon={<PlaneTakeoff size={16} className="text-slate-500" />}
                  label="Uçuş numarası"
                  value={reservation.flightNumber}
                />
              )}
              {reservation.notes && (
                <DetailRow
                  icon={<StickyNote size={16} className="text-slate-500" />}
                  label="Notlar"
                  value={reservation.notes}
                />
              )}
              <DetailRow
                icon={<ReceiptText size={16} className="text-slate-500" />}
                label="Tutar"
                value={formatPrice(
                  reservation.calculatedPrice,
                  reservation.currency,
                )}
              />
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
              Oluşturulma:{" "}
              {formatDateTime(reservation.createdAt)}
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-slate-500">
          Üye misiniz?{" "}
          <Link
            to="/login"
            className="font-semibold text-blue-600 hover:underline"
          >
            Giriş yaparak tüm rezervasyonlarınızı görün
          </Link>
        </p>
      </div>
    </section>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-400">{label}</p>
        <p className="mt-0.5 break-words font-medium text-slate-800">
          {value ?? "-"}
        </p>
      </div>
    </div>
  );
}

export default GuestLookupPage;
