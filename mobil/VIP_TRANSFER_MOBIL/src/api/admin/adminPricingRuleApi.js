import apiClient from '../apiClient';
import { unwrapList } from './adminApiUtils';

const PATH = '/api/pricing-rules';
const unwrapObject = (response) => response?.data && !Array.isArray(response.data) ? response.data : response;

export async function getAdminPricingRules(zoneId) {
  return unwrapList(await apiClient.request(PATH, { params: { zoneId } }));
}

export async function getAdminPricingRuleById(id) {
  return unwrapObject(await apiClient.request(`${PATH}/${encodeURIComponent(id)}`));
}

export async function createAdminPricingRule(payload) {
  return unwrapObject(await apiClient.request(PATH, { method: 'POST', body: payload }));
}

export async function updateAdminPricingRule(id, payload) {
  return unwrapObject(await apiClient.request(`${PATH}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: payload,
  }));
}

export async function deleteAdminPricingRule(id) {
  return apiClient.request(`${PATH}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
