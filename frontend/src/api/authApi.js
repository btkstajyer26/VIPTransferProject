import apiClient from "@/api/apiClient";

export async function login(credentials) {
  const response = await apiClient.post("/auth/login", credentials);
  return response.data?.data ?? response.data;
}

export async function register(payload) {
  const response = await apiClient.post("/auth/register", payload);
  return response.data;
}

export async function verifyEmail(email, code) {
  const response = await apiClient.post("/auth/verify-email", { email, code });
  return response.data;
}

export async function refreshToken(refreshTokenValue) {
  const response = await apiClient.post("/auth/refresh", {
    refreshToken: refreshTokenValue,
  });

  return response.data?.data ?? response.data;
}

export async function logout(refreshTokenValue) {
  const response = await apiClient.post("/auth/logout", {
    refreshToken: refreshTokenValue,
  });

  return response.data;
}