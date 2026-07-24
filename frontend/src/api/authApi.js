import apiClient from "@/api/apiClient";

export async function login(credentials) {
  const response = await apiClient.post("/auth/login", credentials);
  return response.data;
}

export async function register(payload) {
  const response = await apiClient.post("/auth/register", payload);
  return response.data;
}

export async function verifyEmail(token) {
    const response = await apiClient.get("/auth/verify-email", {
        params: {
            token,
        },
    });

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