import apiClient from '../api/apiClient';

const PATH = '/api/notification-preferences';
const EDITABLE_CHANNELS = new Set(['PUSH', 'WHATSAPP']);

export async function getNotificationPreferences() {
  const response = await apiClient.request(PATH);
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

export function updateNotificationPreference(channel, enabled) {
  if (!EDITABLE_CHANNELS.has(channel)) {
    throw new Error('Bu bildirim kanalı değiştirilemez.');
  }
  return apiClient.request(`${PATH}/${encodeURIComponent(channel)}`, {
    method: 'PUT',
    body: { enabled: Boolean(enabled) },
  });
}
