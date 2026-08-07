import apiClient from './apiClient';
import { API_BASE_URL } from '../constants/api';

const VEHICLES_PATH = '/api/vehicles';

function getPhotoUrl(photoUrl) {
  if (typeof photoUrl !== 'string' || !photoUrl.trim()) {
    return null;
  }

  const normalizedPhotoUrl = photoUrl.trim();

  if (/^https?:\/\//i.test(normalizedPhotoUrl)) {
    return normalizedPhotoUrl;
  }

  const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, '');
  return `${normalizedBaseUrl}/${normalizedPhotoUrl.replace(/^\/+/, '')}`;
}

function normalizeVehicle(vehicle) {
  return {
    id: vehicle?.id,
    brand: vehicle?.brand?.trim?.() || 'VIP',
    model: vehicle?.model?.trim?.() || 'Transfer Aracı',
    vehicleClass: vehicle?.vehicleClass || 'STANDARD',
    year: Number(vehicle?.year) || null,
    color: vehicle?.color?.trim?.() || null,
    photoUrl: getPhotoUrl(vehicle?.photoUrl),
    capacity: Math.max(0, Number(vehicle?.capacity) || 0),
    openingPrice: Math.max(0, Number(vehicle?.openingPrice) || 0),
  };
}

export async function getVehicles() {
  try {
    const response = await apiClient.request(VEHICLES_PATH, {
      requiresAuth: false,
    });
    const vehicles = Array.isArray(response)
      ? response
      : Array.isArray(response?.content)
        ? response.content
        : [];

    return vehicles.filter((vehicle) => vehicle?.id !== undefined).map(normalizeVehicle);
  } catch (error) {
    throw {
      status: error?.status ?? 0,
      message: error?.message || 'Araçlar yüklenemedi. Lütfen tekrar deneyin.',
      data: error?.data ?? null,
    };
  }
}
