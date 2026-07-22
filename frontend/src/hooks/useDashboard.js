import { useCallback, useEffect, useMemo, useState } from "react";

import { getDashboardData } from "@/api/dashboardServices";

function useDashboard() {
  const [users, setUsers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const data = await getDashboardData();

      setUsers(data.users);
      setReservations(data.reservations);
      setVehicles(data.vehicles);

      const failedSections = Object.entries(data.errors)
        .filter(([, sectionError]) => sectionError)
        .map(([section]) => section);

      if (failedSections.length > 0) {
        console.error("Yüklenemeyen dashboard bölümleri:", data.errors);

        setError(
          "Dashboard verilerinin bazı bölümleri yüklenemedi.",
        );
      }
    } catch (requestError) {
      console.error("Dashboard yüklenemedi:", requestError);

      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "Dashboard verileri yüklenirken bir hata oluştu.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const activeVehicleCount = useMemo(
    () =>
      vehicles.filter((vehicle) => vehicle.active).length,
    [vehicles],
  );

  const pendingReservationCount = useMemo(
    () =>
      reservations.filter(
        (reservation) => reservation.status === "PENDING",
      ).length,
    [reservations],
  );

  const latestReservations = useMemo(() => {
    return [...reservations]
      .sort((firstReservation, secondReservation) => {
        const firstDate = new Date(
          firstReservation.createdAt ?? 0,
        ).getTime();

        const secondDate = new Date(
          secondReservation.createdAt ?? 0,
        ).getTime();

        return secondDate - firstDate;
      })
      .slice(0, 5);
  }, [reservations]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    totalUsers: users.length,
    totalReservations: reservations.length,
    activeVehicleCount,
    pendingReservationCount,
    latestReservations,

    isLoading,
    error,

    fetchDashboard,
  };
}

export default useDashboard;