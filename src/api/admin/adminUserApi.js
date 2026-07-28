import apiClient from '../apiClient';
import { unwrapList } from './adminApiUtils';

const USERS_PATH = '/api/users';

export async function getAdminUsers() {
  return unwrapList(await apiClient.request(USERS_PATH));
}

export async function getAdminUserById(id) {
  return apiClient.request(`${USERS_PATH}/${encodeURIComponent(id)}`);
}

export async function deleteAdminUser(id) {
  return apiClient.request(`${USERS_PATH}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
