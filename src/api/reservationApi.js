import apiClient from './apiClient';

const RESERVATIONS_PATH = '/api/reservations';

function createValidationError(message) {
  return {
    status: 0,
    message,
    data: null,
  };
}

function getRequiredText(value, fieldMessage) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createValidationError(fieldMessage);
  }

  return value.trim();
}

function rethrowApiError(error, fallbackMessage) {
  throw {
    status: error?.status ?? 0,
    message: error?.message || fallbackMessage,
    data: error?.data ?? null,
  };
}

function getOffsetDateTime(value) {
  const scheduledDate = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(scheduledDate.getTime())) {
    throw createValidationError('Geçerli bir transfer tarihi gerekli.');
  }

  return scheduledDate.toISOString();
}

export async function createGuestReservation({ phoneNumber, reservationData } = {}) {
  const normalizedPhoneNumber = getRequiredText(phoneNumber, 'Telefon numarası gerekli.');

  if (!reservationData || typeof reservationData !== 'object' || Array.isArray(reservationData)) {
    throw createValidationError('Rezervasyon bilgileri gerekli.');
  }

  try {
    return await apiClient.request(RESERVATIONS_PATH, {
      method: 'POST',
      body: reservationData,
      params: { phoneNumber: normalizedPhoneNumber },
      requiresAuth: false,
    });
  } catch (error) {
    rethrowApiError(error, 'Rezervasyon oluşturulamadı. Lütfen tekrar deneyin.');
  }
}

export function buildGuestReservationData({
  guestInfo,
  notes = '',
  selectedVehicle,
  transferDetails,
} = {}) {
  const pickup = transferDetails?.pickupLocation;
  const dropoff = transferDetails?.dropoffLocation;
  const pickupAddress = pickup?.address || pickup?.displayName;
  const dropoffAddress = dropoff?.address || dropoff?.displayName;
  const passengerCount = Number(transferDetails?.passengerCount);
  const vehicleId = Number(selectedVehicle?.id);

  if (
    !pickupAddress ||
    !dropoffAddress ||
    !Number.isFinite(Number(pickup?.latitude)) ||
    !Number.isFinite(Number(pickup?.longitude)) ||
    !Number.isFinite(Number(dropoff?.latitude)) ||
    !Number.isFinite(Number(dropoff?.longitude)) ||
    !transferDetails?.scheduledTime ||
    !Number.isFinite(vehicleId) ||
    !Number.isFinite(passengerCount) ||
    passengerCount < 1
  ) {
    throw createValidationError('Transfer veya araç bilgileri eksik.');
  }

  const guestName = `${guestInfo?.firstName || ''} ${guestInfo?.lastName || ''}`.trim();
  getRequiredText(guestName, 'Misafir adı gerekli.');

  return {
    pickupAddress,
    pickupLat: Number(pickup.latitude),
    pickupLon: Number(pickup.longitude),
    dropoffAddress,
    dropoffLat: Number(dropoff.latitude),
    dropoffLon: Number(dropoff.longitude),
    scheduledTime: getOffsetDateTime(transferDetails.scheduledTime),
    vehicleId,
    passengerCount,
    guestName,
    campaignCode: '',
    flightNumber: '',
    notes: typeof notes === 'string' ? notes.trim() : '',
  };
}

export async function getGuestReservation({ bookingReference, phoneNumber } = {}) {
  const normalizedBookingReference = getRequiredText(
    bookingReference,
    'Rezervasyon referansı gerekli.',
  );
  const normalizedPhoneNumber = getRequiredText(phoneNumber, 'Telefon numarası gerekli.');

  try {
    return await apiClient.request(
      `${RESERVATIONS_PATH}/guest/${encodeURIComponent(normalizedBookingReference)}`,
      {
        params: { phone: normalizedPhoneNumber },
        requiresAuth: false,
      },
    );
  } catch (error) {
    rethrowApiError(error, 'Rezervasyon bilgileri alınamadı.');
  }
}
