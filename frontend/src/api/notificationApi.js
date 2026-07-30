import apiClient from "@/api/apiClient";

export async function getAllNotifications() {
  const response = await apiClient.get("/notifications");
  return response.data?.data ?? response.data;
}

export async function getMyNotifications() {
  const response = await apiClient.get("/notifications/my");
  return response.data?.data ?? response.data;
}

export async function markMyNotificationRead(id) {
  const response = await apiClient.post(`/notifications/my/${id}/read`);
  return response.data?.data ?? response.data;
}

export async function getNotificationById(id) {
  const response = await apiClient.get(`/notifications/${id}`);
  return response.data?.data ?? response.data;
}

export async function createNotification(payload) {
  const response = await apiClient.post("/notifications", payload);
  return response.data?.data ?? response.data;
}

export async function sendNotification(id) {
  const response = await apiClient.post(`/notifications/${id}/send`);
  return response.data?.data ?? response.data;
}

export async function updateNotificationStatus(id, status) {
  const response = await apiClient.patch(`/notifications/${id}/status`, {
    status,
  });
  return response.data?.data ?? response.data;
}
