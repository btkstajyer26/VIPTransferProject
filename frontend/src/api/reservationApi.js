import apiClient from "@/api/apiClient";

export async function getAllReservations() {
  const response = await apiClient.get("/reservations");
  return response.data;
}

export async function getReservationById(id) {
  const response = await apiClient.get(`/reservations/${id}`);
  return response.data;
}

export async function getReservationHistory(id) {
  const response = await apiClient.get(
    `/reservations/${id}/history`,
  );

  return response.data;
}

export async function updateReservationStatus(id, status, note = "") {
  const response = await apiClient.patch(
    `/reservations/${id}/status`,
    {
      status,
      note,
    },
  );

  return response.data;
}

export async function deleteReservation(id) {
  const response = await apiClient.delete(`/reservations/${id}`);
  return response.data;
}