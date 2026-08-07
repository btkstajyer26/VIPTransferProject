import { getAdminErrorMessage } from '../api/admin/adminApiUtils';

export const CAMPAIGN_TYPE_LABELS = {
  PERCENTAGE: 'Yüzde İndirim',
  FIXED_AMOUNT: 'Sabit Tutar İndirimi',
};

export const CAMPAIGN_TYPES = Object.entries(CAMPAIGN_TYPE_LABELS)
  .map(([value, label]) => ({ value, label }));

export const campaignTypeLabel = (type) => CAMPAIGN_TYPE_LABELS[type] || type || '-';

export function campaignValidity(campaign, now = new Date()) {
  const current = now.getTime();
  const from = new Date(campaign.validFrom).getTime();
  const to = new Date(campaign.validTo).getTime();
  if (Number.isFinite(from) && from > current) return 'FUTURE';
  if (Number.isFinite(to) && to < current) return 'EXPIRED';
  return campaign.active ? 'CURRENT' : 'PASSIVE';
}

export const CAMPAIGN_VALIDITY_LABELS = {
  CURRENT: 'Geçerli',
  FUTURE: 'Gelecek',
  EXPIRED: 'Süresi Dolmuş',
  PASSIVE: 'Pasif',
};

export function campaignError(error, action = 'load') {
  if (error?.status === 409) return 'Kampanya kodu zaten kullanılıyor.';
  if (!error?.status) {
    if (action === 'save') return 'Kampanya kaydedilemedi.';
    if (action === 'delete') return 'Kampanya silinemedi.';
    return 'Kampanya bilgileri alınamadı. Lütfen tekrar deneyin.';
  }
  const fallback = action === 'save'
    ? 'Kampanya kaydedilemedi.'
    : action === 'delete' ? 'Kampanya silinemedi.' : 'Kampanyalar alınamadı.';
  return getAdminErrorMessage(error, fallback, 'Kampanya bulunamadı.');
}

export function toOffsetDateTime(date, endOfDay = false) {
  const local = new Date(date);
  local.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, 0);
  const offsetMinutes = -local.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const hours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0');
  const minutes = String(Math.abs(offsetMinutes) % 60).padStart(2, '0');
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, '0');
  const day = String(local.getDate()).padStart(2, '0');
  const time = endOfDay ? '23:59:59' : '00:00:00';
  return `${year}-${month}-${day}T${time}${sign}${hours}:${minutes}`;
}
