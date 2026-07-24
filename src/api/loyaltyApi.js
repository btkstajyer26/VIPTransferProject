import apiClient from './apiClient';

const LOYALTY_ME_PATH = '/api/loyalty/me';

function rethrowApiError(error, fallbackMessage) {
  throw {
    status: error?.status ?? 0,
    message: error?.message || fallbackMessage,
    data: error?.data ?? null,
  };
}

export async function getMyLoyaltyAccount() {
  try {
    return await apiClient.request(LOYALTY_ME_PATH);
  } catch (error) {
    rethrowApiError(error, 'Sadakat bilgileri alınamadı.');
  }
}
