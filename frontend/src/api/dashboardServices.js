import { getAllReservations } from "@/api/reservationApi";
import { getUsers } from "@/api/userServices";
import { getVehicles } from "@/api/vehicleServices";

export async function getDashboardData() {
  const [usersResult, reservationsResult, vehiclesResult] =
    await Promise.allSettled([
      getUsers(),
      getAllReservations(),
      getVehicles(),
    ]);

  const users =
    usersResult.status === "fulfilled" &&
    Array.isArray(usersResult.value)
      ? usersResult.value
      : [];

  const reservations =
    reservationsResult.status === "fulfilled" &&
    Array.isArray(reservationsResult.value)
      ? reservationsResult.value
      : [];

  const vehicles =
    vehiclesResult.status === "fulfilled" &&
    Array.isArray(vehiclesResult.value)
      ? vehiclesResult.value
      : [];

  return {
    users,
    reservations,
    vehicles,

    errors: {
      users:
        usersResult.status === "rejected"
          ? usersResult.reason
          : null,

      reservations:
        reservationsResult.status === "rejected"
          ? reservationsResult.reason
          : null,

      vehicles:
        vehiclesResult.status === "rejected"
          ? vehiclesResult.reason
          : null,
    },
  };
}