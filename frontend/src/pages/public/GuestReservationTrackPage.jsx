import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  AlertCircle, CalendarDays, CarFront, CheckCircle2, Hash,
  LoaderCircle, MapPin, Phone, Search, UsersRound,
} from "lucide-react";

import { getGuestReservation, getGuestReservationHistory } from "@/api/reservationApi";

const STATUS_META = {
  PENDING: ["Beklemede", "bg-amber-100 text-amber-700"],
  ASSIGNED: ["Sürücü ve Araç Atandı", "bg-indigo-100 text-indigo-700"],
  COMPLETED: ["Tamamlandı", "bg-emerald-100 text-emerald-700"],
  CANCELLED: ["İptal Edildi", "bg-red-100 text-red-700"],
  NO_SHOW: ["Gerçekleşmedi", "bg-red-100 text-red-700"],
};

function GuestReservationTrackPage() {
  const { state } = useLocation();
  const [bookingReference, setBookingReference] = useState(state?.bookingReference || "");
  const [phone, setPhone] = useState(state?.phone || "");
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const reference = bookingReference.trim();
    const normalizedPhone = phone.trim();

    if (!reference || !normalizedPhone) {
      setError("Rezervasyon numarası ve telefon numarası zorunludur.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setReservation(null);
      const [reservationData, historyData] = await Promise.all([
        getGuestReservation(reference, normalizedPhone),
        getGuestReservationHistory(reference, normalizedPhone),
      ]);
      setReservation(reservationData);
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          "Rezervasyon bulunamadı. Bilgilerinizi kontrol edip tekrar deneyin.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-20 pt-36 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Misafir İşlemleri</span>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-[#0b1f3a]">Rezervasyonunuzu Takip Edin</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-500">
            Rezervasyon numaranız ve rezervasyonda kullandığınız telefon numarasıyla güncel transfer bilgilerinize ulaşın.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mx-auto mt-10 grid max-w-3xl gap-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <Field label="Rezervasyon numarası" icon={Hash}>
            <input value={bookingReference} onChange={(e) => setBookingReference(e.target.value.toUpperCase())} placeholder="Örn. VIP-ABC123" autoComplete="off" className={inputClass} />
          </Field>
          <Field label="Telefon numarası" icon={Phone}>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+90 5XX XXX XX XX" type="tel" autoComplete="tel" className={inputClass} />
          </Field>
          <button type="submit" disabled={loading} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60">
            {loading ? <LoaderCircle className="animate-spin" size={19} /> : <Search size={19} />}
            Sorgula
          </button>
        </form>

        {error && (
          <div className="mx-auto mt-5 flex max-w-3xl items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={19} />{error}
          </div>
        )}
        {reservation && <ReservationResult reservation={reservation} history={history} />}
      </div>
    </main>
  );
}

function ReservationResult({ reservation, history }) {
  const [statusLabel, statusClass] = STATUS_META[reservation.status] || [reservation.status || "Bilinmiyor", "bg-slate-100 text-slate-700"];
  return (
    <section className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
      <div className="flex flex-col gap-4 bg-[#0b1f3a] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">Rezervasyon</p>
          <h2 className="mt-1 text-2xl font-extrabold">{reservation.bookingReference}</h2>
        </div>
        <span className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${statusClass}`}>{statusLabel}</span>
      </div>
      <div className="p-6 sm:p-8">
        <div className="relative space-y-6 border-l-2 border-dashed border-blue-200 pl-8">
          <RoutePoint label="Alış noktası" value={reservation.pickupAddress} />
          <RoutePoint label="Varış noktası" value={reservation.dropoffAddress} />
        </div>
        <div className="mt-8 grid gap-4 border-t border-slate-100 pt-7 sm:grid-cols-2">
          <Info icon={CalendarDays} label="Tarih ve saat" value={formatDate(reservation.scheduledTime)} />
          <Info icon={CarFront} label="Araç" value={reservation.vehicleName || "Henüz belirtilmedi"} />
          {reservation.vehiclePlateNumber && <Info icon={CarFront} label="Plaka" value={reservation.vehiclePlateNumber} />}
          <Info icon={UsersRound} label="Yolcu" value={`${reservation.passengerCount || 1} kişi`} />
          <Info icon={CheckCircle2} label="Tutar" value={formatMoney(reservation.calculatedPrice, reservation.currency)} />
        </div>
        {reservation.flightNumber && <Detail label="Uçuş numarası" value={reservation.flightNumber} />}
        {reservation.notes && <Detail label="Not" value={reservation.notes} />}
        {history.length > 0 && <div className="mt-7 border-t border-slate-100 pt-6"><h3 className="font-bold text-[#071a32]">Durum zaman çizelgesi</h3><div className="mt-4 space-y-4 border-l-2 border-blue-100 pl-5">{history.map((item, index) => <div key={item.id || index} className="relative"><span className="absolute -left-[27px] top-1.5 size-3 rounded-full bg-blue-600 ring-4 ring-blue-50"/><p className="text-sm font-bold text-slate-800">{STATUS_META[item.status]?.[0] || item.status}</p><p className="mt-1 text-xs text-slate-500">{formatDate(item.changedAt)}{item.note ? ` · ${item.note}` : ""}</p></div>)}</div></div>}
      </div>
    </section>
  );
}

function Field({ label, icon: Icon, children }) {
  return <label><span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><Icon size={16} className="text-blue-600" />{label}</span>{children}</label>;
}

function RoutePoint({ label, value }) {
  return <div className="relative"><span className="absolute -left-[41px] top-0.5 flex size-5 items-center justify-center rounded-full bg-blue-600 ring-4 ring-blue-50"><MapPin size={11} className="text-white" /></span><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 font-semibold text-slate-800">{value || "-"}</p></div>;
}

function Info({ icon: Icon, label, value }) {
  return <div className="flex gap-3 rounded-2xl bg-slate-50 p-4"><Icon className="mt-0.5 shrink-0 text-blue-600" size={20} /><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value}</p></div></div>;
}

function Detail({ label, value }) {
  return <div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-sm text-slate-700">{value}</p></div>;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

function formatMoney(value, currency = "TRY") {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: currency || "TRY" }).format(Number(value));
}

const inputClass = "min-h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default GuestReservationTrackPage;
