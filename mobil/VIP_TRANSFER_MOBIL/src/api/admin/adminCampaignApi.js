import apiClient from '../apiClient';
import { unwrapList } from './adminApiUtils';

const PATH = '/api/campaigns';
const unwrapObject = (response) => response?.data && !Array.isArray(response.data) ? response.data : response;

export async function getAdminCampaigns() {
  return unwrapList(await apiClient.request(PATH));
}

export async function getAdminCampaignById(id) {
  return unwrapObject(await apiClient.request(`${PATH}/${encodeURIComponent(id)}`));
}

export async function createAdminCampaign(payload) {
  return unwrapObject(await apiClient.request(PATH, { method: 'POST', body: payload }));
}

export async function updateAdminCampaign(id, payload) {
  return unwrapObject(await apiClient.request(`${PATH}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: payload,
  }));
}

export async function deleteAdminCampaign(id) {
  return apiClient.request(`${PATH}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
