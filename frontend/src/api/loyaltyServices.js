import apiClient from "@/api/apiClient";

/**
 * Giriş yapan kullanıcının sadakat hesabını getirir.
 *
 * GET /api/loyalty/me
 */
export async function getMyLoyaltyAccount() {
  const response = await apiClient.get("/loyalty/me");
  return response.data;
}

/**
 * Admin tarafından belirtilen kullanıcının sadakat hesabını getirir.
 *
 * GET /api/loyalty/accounts/{userId}
 */
export async function getLoyaltyAccountByUserId(userId) {
  if (!userId) {
    throw new Error("Kullanıcı ID bilgisi gereklidir.");
  }

  const response = await apiClient.get(
    `/loyalty/accounts/${userId}`,
  );

  return response.data;
}