import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getAllNotifications,
  sendNotification as sendNotificationApi,
  updateNotificationStatus as updateNotificationStatusApi,
} from "@/api/notificationApi";

function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const data = await getAllNotifications();

      setNotifications(Array.isArray(data) ? data : []);
    } catch (requestError) {
      console.error("Bildirimler alınamadı:", requestError);

      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "Bildirimler alınırken bir hata oluştu.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (n) => n.status === "PENDING" || n.status === "FAILED",
      ).length,
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return notifications.filter((n) => {
      const matchesStatus =
        statusFilter === "ALL" || n.status === statusFilter;

      const matchesChannel =
        channelFilter === "ALL" || n.channel === channelFilter;

      const matchesSearch =
        normalizedSearch === "" ||
        [n.title, n.message, String(n.userId ?? ""), String(n.id)]
          .some((v) => String(v ?? "").toLowerCase().includes(normalizedSearch));

      return matchesStatus && matchesChannel && matchesSearch;
    });
  }, [notifications, searchTerm, statusFilter, channelFilter]);

  const markAsRead = useCallback(async (id) => {
    try {
      const updated = await updateNotificationStatusApi(id, "READ");

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? updated : n)),
      );
    } catch (requestError) {
      console.error("Bildirim durumu güncellenemedi:", requestError);
    }
  }, []);

  const sendNotification = useCallback(async (id) => {
    try {
      setIsSending(true);
      setError("");

      const updated = await sendNotificationApi(id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? updated : n)),
      );
    } catch (requestError) {
      console.error("Bildirim gönderilemedi:", requestError);

      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "Bildirim gönderilirken bir hata oluştu.",
      );
    } finally {
      setIsSending(false);
    }
  }, []);

  return {
    notifications,
    filteredNotifications,
    isLoading,
    isSending,
    error,
    unreadCount,

    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    channelFilter,
    setChannelFilter,

    fetchNotifications,
    markAsRead,
    sendNotification,
  };
}

export default useNotifications;
