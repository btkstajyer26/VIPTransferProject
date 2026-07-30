import apiClient from '../apiClient';
import { unwrapList } from './adminApiUtils';

const PATH = '/api/pricing-zones';
const unwrapObject = (response) => response?.data && !Array.isArray(response.data) ? response.data : response;

export async function getAdminPricingZones() {
  return unwrapList(await apiClient.request(PATH));
}

export async function getAdminPricingZoneById(id) {
  return unwrapObject(await apiClient.request(`${PATH}/${encodeURIComponent(id)}`));
}

export async function createAdminPricingZone(payload) {
  return unwrapObject(await apiClient.request(PATH, { method: 'POST', body: payload }));
}

export async function updateAdminPricingZone(id, payload) {
  return unwrapObject(await apiClient.request(`${PATH}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: payload,
  }));
}

export async function deleteAdminPricingZone(id) {
  return apiClient.request(`${PATH}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
