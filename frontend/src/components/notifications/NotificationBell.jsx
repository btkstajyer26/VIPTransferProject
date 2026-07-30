import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Loader2, MailWarning, RefreshCw, Send } from "lucide-react";

import {
  getAllNotifications,
  getMyNotifications,
  markMyNotificationRead,
  sendNotification,
  updateNotificationStatus,
} from "@/api/notificationApi";

const STATUS_LABEL = {
  PENDING: "Bekliyor",
  SENT: "Gönderildi",
  DELIVERED: "İletildi",
  FAILED: "Başarısız",
  READ: "Okundu",
};

const STATUS_COLOR = {
  PENDING: "bg-amber-100 text-amber-700",
  SENT: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  READ: "bg-slate-100 text-slate-500",
};

const CHANNEL_LABEL = {
  EMAIL: "E-posta",
  SMS: "SMS",
  PUSH: "Push",
  WHATSAPP: "WhatsApp",
};

function formatRelativeTime(dateString) {
  if (!dateString) return "";

  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "az önce";
  if (minutes < 60) return `${minutes}dk önce`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}sa önce`;

  const days = Math.floor(hours / 24);

  return `${days}g önce`;
}

export default function NotificationBell({ scope = "user" }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(
    (n) =>
      scope === "admin"
        ? n.status === "PENDING" || n.status === "FAILED"
        : n.status !== "READ",
  ).length;

  const recent = notifications.slice(0, 8);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);

      const data =
        scope === "admin"
          ? await getAllNotifications()
          : await getMyNotifications();
      const sorted = (Array.isArray(data) ? data : []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );

      setNotifications(sorted);
    } catch {
      // sessiz hata — badge görünmez kalır
    } finally {
      setIsLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }

    setIsOpen((prev) => !prev);
  };

  const handleMarkRead = async (id) => {
    setActionLoadingId(id);

    try {
      const updated =
        scope === "admin"
          ? await updateNotificationStatus(id, "READ")
          : await markMyNotificationRead(id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? updated : n)),
      );
    } catch {
      // sessiz
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSend = async (id) => {
    setActionLoadingId(id);

    try {
      const updated = await sendNotification(id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? updated : n)),
      );
    } catch {
      // sessiz
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        aria-label="Bildirimler"
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-900">
              Bildirimler
            </span>

            <button
              type="button"
              onClick={fetchNotifications}
              disabled={isLoading}
              className="text-slate-400 hover:text-slate-700 disabled:opacity-50"
              aria-label="Yenile"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <ul className="max-h-[28rem] overflow-y-auto divide-y divide-slate-50">
            {recent.length === 0 && (
              <li className="flex flex-col items-center gap-2 py-10 text-slate-400">
                <MailWarning className="h-7 w-7" />
                <span className="text-sm">Bildirim bulunamadı</span>
              </li>
            )}

            {recent.map((n) => (
              <li
                key={n.id}
                className={`px-4 py-3 ${n.status === "READ" ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {n.title || "—"}
                    </p>

                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                      {n.message || "—"}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[n.status] ?? "bg-slate-100 text-slate-500"}`}
                      >
                        {STATUS_LABEL[n.status] ?? n.status}
                      </span>

                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                        {CHANNEL_LABEL[n.channel] ?? n.channel}
                      </span>

                      <span className="text-[10px] text-slate-400">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-1">
                    {scope === "admin" && n.status === "PENDING" && (
                      <button
                        type="button"
                        onClick={() => handleSend(n.id)}
                        disabled={actionLoadingId === n.id}
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50"
                        title="Gönder"
                      >
                        {actionLoadingId === n.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}

                    {scope === "user" && n.status !== "READ" && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n.id)}
                        disabled={actionLoadingId === n.id}
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-50 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                        title="Okundu işaretle"
                      >
                        {actionLoadingId === n.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCheck className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {scope === "admin" && (
            <div className="border-t border-slate-100 px-4 py-2.5">
              <a
                href="/admin/notifications"
                className="block text-center text-xs font-medium text-blue-600 hover:text-blue-500"
                onClick={() => setIsOpen(false)}
              >
                Tüm bildirimleri gör →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
