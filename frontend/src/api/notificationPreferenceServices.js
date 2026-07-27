import apiClient from "@/api/apiClient";

export async function updateNotificationPreference(channel, enabled) {
  const response = await apiClient.put(
    `/notification-preferences/${channel}`,
    { enabled }
  );

  return response.data?.data ?? response.data;
}
