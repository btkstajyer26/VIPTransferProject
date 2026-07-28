export const RESERVATION_STATUS_LABELS = {
  PENDING: 'Bekliyor',
  ASSIGNED: 'Araç Atandı',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal Edildi',
  NO_SHOW: 'Yolcu Gelmedi',
};

export const RESERVATION_STATUSES = Object.keys(RESERVATION_STATUS_LABELS);

export function getReservationStatusLabel(status) {
  return RESERVATION_STATUS_LABELS[status] || status || '-';
}
