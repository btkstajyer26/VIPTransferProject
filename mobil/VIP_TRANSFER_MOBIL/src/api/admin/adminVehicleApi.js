import apiClient from '../apiClient';
import { unwrapList } from './adminApiUtils';

const VEHICLES_PATH = '/api/vehicles';

export async function getAllAdminVehicles() {
  return unwrapList(await apiClient.request(`${VEHICLES_PATH}/all`));
}

export async function createAdminVehicle(payload) {
  return apiClient.request(VEHICLES_PATH, { method: 'POST', body: payload });
}

export async function updateAdminVehicle(id, payload) {
  return apiClient.request(`${VEHICLES_PATH}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function updateAdminVehicleStatus(id) {
  return apiClient.request(`${VEHICLES_PATH}/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
  });
}

export async function deleteAdminVehicle(id) {
  return apiClient.request(`${VEHICLES_PATH}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
