import { getAdminErrorMessage } from '../api/admin/adminApiUtils';

export const DAYS = [
  { value: null, label: 'Her gün' },
  { value: 0, label: 'Pazar' },
  { value: 1, label: 'Pazartesi' },
  { value: 2, label: 'Salı' },
  { value: 3, label: 'Çarşamba' },
  { value: 4, label: 'Perşembe' },
  { value: 5, label: 'Cuma' },
  { value: 6, label: 'Cumartesi' },
];

export const parseDecimal = (value) => Number(String(value).trim().replace(',', '.'));
export const dayLabel = (value) => DAYS.find((day) => day.value === value)?.label || '-';

export function pricingError(error, kind, action = 'load') {
  const noun = kind === 'zone' ? 'Fiyat bölgesi' : 'Fiyat kuralı';
  if (!error?.status) {
    if (action === 'save') return `${noun} kaydedilemedi.`;
    if (action === 'delete') return `${noun} silinemedi.`;
    return kind === 'zone'
      ? 'Fiyat bölgeleri alınamadı. Lütfen tekrar deneyin.'
      : 'Fiyat kuralları alınamadı. Lütfen tekrar deneyin.';
  }
  const fallback = action === 'save'
    ? `${noun} kaydedilemedi.`
    : action === 'delete'
      ? `${noun} silinemedi.`
      : `${noun} alınamadı.`;
  return getAdminErrorMessage(error, fallback, `${noun} bulunamadı.`);
}

export function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toIsoTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
}

export function parseLocalDate(value) {
  if (!value) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function parseLocalTime(value) {
  const [hour, minute] = String(value || '00:00').split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}
