import { getAdminErrorMessage } from '../api/admin/adminApiUtils';

export function getReservationErrorMessage(error, fallback = 'Rezervasyon işlemi tamamlanamadı.') {
  if (!error?.status) return 'Rezervasyon bilgileri alınamadı. Lütfen tekrar deneyin.';
  return getAdminErrorMessage(error, fallback, 'Rezervasyon bulunamadı.');
}
