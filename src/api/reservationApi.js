import apiClient from './apiClient';

const RESERVATIONS_PATH = '/api/v1/reservations';

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
