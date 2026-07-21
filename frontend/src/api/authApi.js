import apiClient from "@/api/apiClient";

export async function login(credentials) {
  const response = await apiClient.post("/auth/login", credentials);
  return response.data;
}

export async function refreshToken(refreshTokenValue) {
  const response = await apiClient.post("/auth/refresh", {
    refreshToken: refreshTokenValue,
  });

  return response.data;
}

export async function logout(refreshTokenValue) {
  const response = await apiClient.post("/auth/logout", {
    refreshToken: refreshTokenValue,
  });

  return response.data;
}