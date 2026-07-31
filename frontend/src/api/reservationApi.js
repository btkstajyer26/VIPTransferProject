import apiClient from "@/api/apiClient";

export async function getAllReservations() {
  const response = await apiClient.get("/reservations");
  return response.data;
}

export async function getMyReservations() {
  const response = await apiClient.get("/reservations/my");
  return response.data;
}

export async function getReservationById(id) {
  const response = await apiClient.get(
    `/reservations/${id}`,
  );

  return response.data;
}

export async function getReservationHistory(id) {
  const response = await apiClient.get(
    `/reservations/${id}/history`,
  );

  return response.data;
}

export async function updateReservationStatus(
  id,
  status,
  note = "",
) {
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
  const response = await apiClient.delete(
    `/reservations/${id}`,
  );

  return response.data;
}

export async function previewReservationPrice(payload) {
  const response = await apiClient.post(
    "/reservations/price-preview",
    payload,
    {
      allowAnonymous: true,
      skipAuthRefresh: true,
    },
  );

  return response.data;
}

export async function getGuestReservation(bookingReference, phone) {
  const response = await apiClient.get(
    `/reservations/guest/${encodeURIComponent(bookingReference)}`,
    {
      params: { phone },
      allowAnonymous: true,
      skipAuthRefresh: true,
    },
  );
  return response.data;
}

export async function createReservation(
  payload,
  phoneNumber = null,
) {
  const config = {
    allowAnonymous: true,
    skipAuthRefresh: true,
  };

  if (phoneNumber) {
    config.params = {
      phoneNumber,
    };
  }

  const response = await apiClient.post(
    "/reservations",
    payload,
    config,
  );

  return response.data;
}
