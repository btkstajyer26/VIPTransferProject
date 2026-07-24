import apiClient from './apiClient';

const CURRENT_USER_PATH = '/api/users/me';

function rethrowApiError(error, fallbackMessage) {
  throw {
    status: error?.status ?? 0,
    message: error?.message || fallbackMessage,
    data: error?.data ?? null,
  };
}

export async function getCurrentUser() {
  try {
    return await apiClient.request(CURRENT_USER_PATH);
  } catch (error) {
    rethrowApiError(error, 'Kullanıcı bilgileri alınamadı.');
  }
}
