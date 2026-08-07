import apiClient from './apiClient';

export async function getTranslations(language) {
  const response = await apiClient.request(`/api/translations/${language}`, {
    requiresAuth: false,
  });
  const translations = response?.data ?? response;
  return translations && typeof translations === 'object' && !Array.isArray(translations)
    ? translations
    : {};
}

