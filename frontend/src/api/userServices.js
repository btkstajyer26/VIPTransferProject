import apiClient from "@/api/apiClient";

export async function getUsers() {
  const response = await apiClient.get("/users");
  return response.data;
}

export async function getUserById(userId) {
  const response = await apiClient.get(`/users/${userId}`);
  return response.data;
}

export async function deleteUserById(userId) {
  await apiClient.delete(`/users/${userId}`);
}