import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Eye,
  History,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Trash2,
} from "lucide-react";

import {
  deleteReservation,
  getReservationHistory,
  getMyReservations,
} from "@/api/reservationApi";
import ReservationDetailDialog from "@/components/reservations/ReservationDetailDialog";
import ReservationHistoryDialog from "@/components/reservations/ReservationHistoryDialog";

function MyReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState("");
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadReservations = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setReservations((await getMyReservations()) || []);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    getMyReservations()
      .then((data) => {
        if (active) {
          setReservations(data || []);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleCancel = async (reservation) => {
    if (
      !window.confirm(
        `${reservation.bookingReference || "Bu"} rezervasyonu iptal edilsin mi?`,
      )
    ) {
      return;
    }

    try {
      setCancellingId(reservation.id);
      setError("");
      await deleteReservation(reservation.id);
      await loadReservations();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setCancellingId(null);
    }
  };

  const openHistory = async (reservation) => {
    setSelectedReservation(reservation);
    setHistory([]);
    setHistoryOpen(true);
    try {
      setHistoryLoading(true);
      const data = await getReservationHistory(reservation.id);
      setHistory(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">Yolculuk geçmişi</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-[#071a32]">
            Rezervasyonlarım
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Yaklaşan ve geçmiş transferlerinizi görüntüleyin.
          </p>
        </div>
        <Link
          to="/#reservation-form"
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20"
        >
          Yeni rezervasyon
        </Link>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-[28px] bg-white">
          <LoaderCircle className="mr-2 animate-spin text-blue-600" />
          Rezervasyonlar yükleniyor...
        </div>
      ) : reservations.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center">
          <CalendarDays className="mx-auto text-slate-300" size={40} />
          <h3 className="mt-4 text-lg font-bold text-slate-800">Henüz rezervasyonunuz yok</h3>
          <p className="mt-2 text-sm text-slate-500">İlk VIP transferinizi birkaç adımda oluşturabilirsiniz.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {[...reservations]
            .sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime))
            .map((reservation) => (
              <article
                key={reservation.id}
                className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_14px_45px_rgba(15,23,42,0.04)] sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(reservation.status)}`}>
                        {statusLabel(reservation.status)}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {reservation.bookingReference || `#${reservation.id}`}
                      </span>
                    </div>
                    <p className="mt-3 font-bold text-[#071a32]">
                      {formatDate(reservation.scheduledTime)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {reservation.vehicleName || "VIP Transfer aracı"} · {reservation.passengerCount || 1} yolcu
                    </p>
                  </div>
                  <p className="text-xl font-bold text-[#071a32]">
                    {formatMoney(reservation.calculatedPrice, reservation.currency)}
                  </p>
                </div>

                <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
                  <Address label="Alış noktası" value={reservation.pickupAddress} />
                  <Address label="Varış noktası" value={reservation.dropoffAddress} />
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => { setSelectedReservation(reservation); setDetailOpen(true); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                    <Eye size={16} /> Detay
                  </button>
                  <button type="button" onClick={() => openHistory(reservation)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-sm font-bold text-blue-600 transition hover:bg-blue-50">
                    <History size={16} /> Zaman çizelgesi
                  </button>
                  {reservation.status === "PENDING" && (
                    <button
                      type="button"
                      disabled={cancellingId === reservation.id}
                      onClick={() => handleCancel(reservation)}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {cancellingId === reservation.id ? (
                        <LoaderCircle className="animate-spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      Rezervasyonu iptal et
                    </button>
                  )}
                </div>
              </article>
            ))}
        </div>
      )}

      {!loading && reservations.length > 0 && (
        <button
          onClick={loadReservations}
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600"
        >
          <RefreshCw size={16} /> Listeyi yenile
        </button>
      )}

      <ReservationDetailDialog open={detailOpen} reservation={selectedReservation} onOpenChange={(open) => { setDetailOpen(open); if (!open) setSelectedReservation(null); }} />
      <ReservationHistoryDialog open={historyOpen} reservation={selectedReservation} history={history} isLoading={historyLoading} onOpenChange={(open) => { setHistoryOpen(open); if (!open) { setSelectedReservation(null); setHistory([]); } }} />
    </div>
  );
}

function Address({ label, value }) {
  return (
    <div className="flex gap-3">
      <MapPin className="mt-0.5 shrink-0 text-blue-600" size={18} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-medium text-slate-700">{value || "-"}</p>
      </div>
    </div>
  );
}

function statusClass(status) {
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700";
  if (status === "CANCELLED" || status === "NO_SHOW") return "bg-red-50 text-red-700";
  if (status === "PENDING") return "bg-amber-50 text-amber-700";
  return "bg-blue-50 text-blue-700";
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

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(value))
    : "-";
}

function formatMoney(value, currency = "TRY") {
  return value == null
    ? "-"
    : new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: currency || "TRY",
      }).format(Number(value));
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Rezervasyonlar yüklenemedi."
  );
}

export default MyReservationsPage;
