import apiClient from "@/api/apiClient";

export async function getAllReservations() {
  const response = await apiClient.get("/api/v1/reservations");
  return response.data;
}

export async function getReservationById(id) {
  const response = await apiClient.get(`/api/v1/reservations/${id}`);
  return response.data;
}

export async function getReservationHistory(id) {
  const response = await apiClient.get(
    `/api/v1/reservations/${id}/history`,
  );

  return response.data;
}

export async function updateReservationStatus(id, status, note) {
  const response = await apiClient.patch(
    `/api/v1/reservations/${id}/status`,
    {
      status,
      note,
    },
  );

  return response.data;
}