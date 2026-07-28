import apiClient from '../apiClient';
import { unwrapList } from './adminApiUtils';

const RESERVATIONS_PATH = '/api/reservations';

function unwrapObject(response) {
  return response?.data && !Array.isArray(response.data) ? response.data : response;
}

export async function getAdminReservations() {
  return unwrapList(await apiClient.request(RESERVATIONS_PATH));
}

export async function getAdminReservationById(id) {
  return unwrapObject(
    await apiClient.request(`${RESERVATIONS_PATH}/${encodeURIComponent(id)}`),
  );
}

export async function getAdminReservationHistory(id) {
  return unwrapList(
    await apiClient.request(`${RESERVATIONS_PATH}/${encodeURIComponent(id)}/history`),
  );
}

export async function updateAdminReservationStatus(id, status) {
  return unwrapObject(
    await apiClient.request(`${RESERVATIONS_PATH}/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status },
    }),
  );
}

export async function deleteAdminReservation(id) {
  return apiClient.request(`${RESERVATIONS_PATH}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
