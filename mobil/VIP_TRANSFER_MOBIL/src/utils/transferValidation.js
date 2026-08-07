import { createScheduledDate } from './dateUtils';

export const MIN_PASSENGER_COUNT = 1;
export const MAX_PASSENGER_COUNT = 20;

function hasCoordinates(location) {
  return location.latitude !== null && location.longitude !== null;
}

function validateLocation(location, otherLocation, label) {
  if (!location.placeId || !hasCoordinates(location)) {
    return 'Lütfen listeden bir konum seçin.';
  }

  if (
    otherLocation.placeId &&
    (location.placeId === otherLocation.placeId ||
      (location.latitude === otherLocation.latitude && location.longitude === otherLocation.longitude))
  ) {
    return `${label} konumu diğer konumla aynı olamaz.`;
  }

  return null;
}

export function validateTransferForm({
  pickupLocation,
  dropoffLocation,
  selectedDate,
  selectedTime,
  passengerCount,
}) {
  const nextErrors = {};
  const pickupError = validateLocation(pickupLocation, dropoffLocation, 'Başlangıç');
  const dropoffError = validateLocation(dropoffLocation, pickupLocation, 'Bitiş');

  if (pickupError) nextErrors.pickupLocation = pickupError;
  if (dropoffError) nextErrors.dropoffLocation = dropoffError;
  if (!selectedDate) nextErrors.date = 'Tarih seçin.';
  if (!selectedTime) nextErrors.time = 'Saat seçin.';

  const scheduledDate = createScheduledDate(selectedDate, selectedTime);
  if (scheduledDate && scheduledDate <= new Date()) {
    nextErrors.time = 'Geçmiş bir tarih veya saat seçilemez.';
  }

  if (passengerCount < MIN_PASSENGER_COUNT || passengerCount > MAX_PASSENGER_COUNT) {
    nextErrors.passengerCount = `Yolcu sayısı ${MIN_PASSENGER_COUNT}-${MAX_PASSENGER_COUNT} arasında olmalı.`;
  }

  return nextErrors;
}
