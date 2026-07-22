import { useEffect, useMemo, useState } from "react";

import {
  getAllReservations,
  getReservationHistory,
  updateReservationStatus as updateReservationStatusApi,
} from "@/api/reservationApi";

function useReservations() {
  const [reservations, setReservations] = useState([]);
  const [reservationHistory, setReservationHistory] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedReservation, setSelectedReservation] = useState(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const [error, setError] = useState("");

  const fetchReservations = async () => {
    try {
      setIsLoading(true);
      setError("");

      const data = await getAllReservations();

      setReservations(Array.isArray(data) ? data : []);
    } catch (requestError) {
      console.error("Rezervasyonlar alınamadı:", requestError);

      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "Rezervasyonlar alınırken bir hata oluştu.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const filteredReservations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return reservations.filter((reservation) => {
      const matchesStatus =
        statusFilter === "ALL" || reservation.status === statusFilter;

      const searchableValues = [
        reservation.bookingReference,
        reservation.pickupAddress,
        reservation.dropoffAddress,
        reservation.vehicleName,
        reservation.guestPhone,
        reservation.flightNumber,
        reservation.userId ? String(reservation.userId) : "",
      ];

      const matchesSearch =
        normalizedSearch === "" ||
        searchableValues.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(normalizedSearch),
        );

      return matchesStatus && matchesSearch;
    });
  }, [reservations, searchTerm, statusFilter]);

  const openDetailDialog = (reservation) => {
    setSelectedReservation(reservation);
    setIsDetailOpen(true);
  };

  const closeDetailDialog = () => {
    setIsDetailOpen(false);
    setSelectedReservation(null);
  };

  const openStatusDialog = (reservation) => {
    setSelectedReservation(reservation);
    setIsStatusOpen(true);
  };

  const closeStatusDialog = () => {
    setIsStatusOpen(false);
    setSelectedReservation(null);
  };

  const openHistoryDialog = async (reservation) => {
    setSelectedReservation(reservation);
    setReservationHistory([]);
    setIsHistoryOpen(true);

    try {
      setIsHistoryLoading(true);

      const data = await getReservationHistory(reservation.id);

      setReservationHistory(Array.isArray(data) ? data : []);
    } catch (requestError) {
      console.error("Durum geçmişi alınamadı:", requestError);
      setReservationHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const closeHistoryDialog = () => {
    setIsHistoryOpen(false);
    setSelectedReservation(null);
    setReservationHistory([]);
  };

  const updateReservationStatus = async (id, status, note) => {
    try {
      setIsStatusUpdating(true);
      setError("");

      const updatedReservation = await updateReservationStatusApi(
        id,
        status,
        note,
      );

      setReservations((currentReservations) =>
        currentReservations.map((reservation) =>
          reservation.id === id ? updatedReservation : reservation,
        ),
      );

      closeStatusDialog();
    } catch (requestError) {
      console.error(
        "Rezervasyon durumu güncellenemedi:",
        requestError,
      );

      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "Rezervasyon durumu güncellenirken bir hata oluştu.",
      );
    } finally {
      setIsStatusUpdating(false);
    }
  };

  return {
    reservations,
    filteredReservations,
    reservationHistory,

    searchTerm,
    setSearchTerm,

    statusFilter,
    setStatusFilter,

    selectedReservation,

    isLoading,
    isHistoryLoading,
    isStatusUpdating,
    error,

    fetchReservations,

    isDetailOpen,
    openDetailDialog,
    closeDetailDialog,

    isStatusOpen,
    openStatusDialog,
    closeStatusDialog,

    isHistoryOpen,
    openHistoryDialog,
    closeHistoryDialog,

    updateReservationStatus,
  };
}

export default useReservations;