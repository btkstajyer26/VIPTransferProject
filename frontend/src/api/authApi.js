import apiClient from "./apiClient";

/**
 * Kullanıcı girişi
 */
export const login = async ({ phoneNumber, password }) => {
  const response = await apiClient.post("/auth/login", {
    phoneNumber,
    password,
  });

  return response.data;
};

/**
 * Yeni Access Token al
 */
export const refreshToken = async () => {
  const response = await apiClient.post("/auth/refresh");

  return response.data;
};

/**
 * Çıkış yap
 */
export const logout = async () => {
  const response = await apiClient.post("/auth/logout");

  return response.data;
};