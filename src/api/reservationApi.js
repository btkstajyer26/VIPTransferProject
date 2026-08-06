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

function getCoordinate(value, minimum, maximum) {
  const coordinate = Number(value);

  return Number.isFinite(coordinate) &&
    coordinate >= minimum &&
    coordinate <= maximum &&
    coordinate !== 0
    ? coordinate
    : null;
}

export async function createGuestReservation({ phoneNumber, reservationData } = {}) {
  const normalizedPhoneNumber = getRequiredText(
    typeof phoneNumber === 'string' ? phoneNumber.replace(/\D/g, '') : phoneNumber,
    'Telefon bilgisi bulunamadı. Lütfen bilgilerinizi yeniden kontrol edin.',
  );

  if (normalizedPhoneNumber.length !== 11 || !normalizedPhoneNumber.startsWith('05')) {
    throw createValidationError(
      'Telefon bilgisi bulunamadı. Lütfen bilgilerinizi yeniden kontrol edin.',
    );
  }

  if (!reservationData || typeof reservationData !== 'object' || Array.isArray(reservationData)) {
    throw createValidationError('Rezervasyon bilgileri gerekli.');
  }

  try {
    if (__DEV__) {
      console.info('[Reservation] POST payload özeti', {
        pickupLatitude: reservationData.pickupLat,
        pickupLongitude: reservationData.pickupLon,
        dropoffLatitude: reservationData.dropoffLat,
        dropoffLongitude: reservationData.dropoffLon,
        vehicleId: reservationData.vehicleId,
        pickupTime: reservationData.scheduledTime,
        passengerCount: reservationData.passengerCount,
      });
    }

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

export async function createAuthenticatedReservation({ reservationData } = {}) {
  if (!reservationData || typeof reservationData !== 'object' || Array.isArray(reservationData)) {
    throw createValidationError('Rezervasyon bilgileri gerekli.');
  }

  try {
    return await apiClient.request(RESERVATIONS_PATH, {
      method: 'POST',
      body: reservationData,
      requiresAuth: true,
    });
  } catch (error) {
    rethrowApiError(error, 'Rezervasyon oluşturulamadı. Lütfen tekrar deneyin.');
  }
}

function buildReservationData({
  campaignCode,
  guestInfo,
  includeGuestName,
  notes = '',
  selectedVehicle,
  transferDetails,
} = {}) {
  const pickup = transferDetails?.pickupLocation;
  const dropoff = transferDetails?.dropoffLocation;
  const pickupAddress = pickup?.address || pickup?.displayName;
  const dropoffAddress = dropoff?.address || dropoff?.displayName;
  const pickupLatitude = getCoordinate(pickup?.latitude, -90, 90);
  const pickupLongitude = getCoordinate(pickup?.longitude, -180, 180);
  const dropoffLatitude = getCoordinate(dropoff?.latitude, -90, 90);
  const dropoffLongitude = getCoordinate(dropoff?.longitude, -180, 180);
  const passengerCount = Number(transferDetails?.passengerCount);
  const vehicleId = Number(selectedVehicle?.id);

  if (
    pickupLatitude === null ||
    pickupLongitude === null ||
    dropoffLatitude === null ||
    dropoffLongitude === null ||
    (pickupLatitude === dropoffLatitude && pickupLongitude === dropoffLongitude)
  ) {
    throw createValidationError(
      'Başlangıç veya varış konumu koordinatları alınamadı. Lütfen konumları tekrar seçin.',
    );
  }

  if (
    !pickupAddress ||
    !dropoffAddress ||
    !transferDetails?.scheduledTime ||
    !Number.isFinite(vehicleId) ||
    !Number.isFinite(passengerCount) ||
    passengerCount < 1
  ) {
    throw createValidationError('Transfer veya araç bilgileri eksik.');
  }

  const reservationData = {
    pickupAddress,
    pickupLat: pickupLatitude,
    pickupLon: pickupLongitude,
    dropoffAddress,
    dropoffLat: dropoffLatitude,
    dropoffLon: dropoffLongitude,
    scheduledTime: getOffsetDateTime(transferDetails.scheduledTime),
    vehicleId,
    passengerCount,
    campaignCode:
      typeof campaignCode === 'string'
        ? campaignCode.trim()
        : transferDetails?.campaignCode?.trim() || '',
    flightNumber: transferDetails?.flightNumber || '',
    notes: typeof notes === 'string' ? notes.trim() : '',
  };

  if (includeGuestName) {
    const guestName = `${guestInfo?.firstName || ''} ${guestInfo?.lastName || ''}`.trim();
    reservationData.guestName = getRequiredText(guestName, 'Misafir adı gerekli.');
  }

  return reservationData;
}

export function buildGuestReservationData(options = {}) {
  return buildReservationData({ ...options, includeGuestName: true });
}

export function buildAuthenticatedReservationData(options = {}) {
  return buildReservationData({ ...options, includeGuestName: false });
}

export async function getMyReservations() {
  try {
    return await apiClient.request(`${RESERVATIONS_PATH}/my`);
  } catch (error) {
    rethrowApiError(error, 'Rezervasyonlarınız alınamadı.');
  }
}

export async function cancelMyReservation(reservationId) {
  try {
    return await apiClient.request(`${RESERVATIONS_PATH}/${reservationId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    rethrowApiError(error, 'Rezervasyon iptal edilemedi.');
  }
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
