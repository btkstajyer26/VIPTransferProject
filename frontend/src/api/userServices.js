import apiClient from "@/api/apiClient";

export async function getUsers() {
  const response = await apiClient.get("/users");
  return response.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get("/users/me");
  return response.data;
}

export async function updateCurrentUser(payload) {
  const response = await apiClient.patch("/users/me", payload);
  return response.data;
}

export async function changeCurrentUserPassword(payload) {
  await apiClient.patch("/users/me/password", payload);
}

export async function deleteCurrentUser() {
  await apiClient.delete("/users/me");
}

export async function getUserById(userId) {
  const response = await apiClient.get(`/users/${userId}`);
  return response.data;
}

export async function deleteUserById(userId) {
  await apiClient.delete(`/users/${userId}`);
}
