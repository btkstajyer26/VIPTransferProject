import apiClient from "@/api/apiClient";

function requireValue(value, message) {
  if (value === null || value === undefined || value === "") {
    throw new Error(message);
  }
}

export async function getCampaigns() {
  const response = await apiClient.get("/campaigns");
  return response.data;
}

export async function getCampaignById(id) {
  requireValue(id, "Kampanya ID bilgisi zorunludur.");

  const response = await apiClient.get(`/campaigns/${id}`);
  return response.data;
}

export async function getCampaignByCode(code) {
  const normalizedCode = code?.trim();

  requireValue(
    normalizedCode,
    "Kampanya kodu zorunludur.",
  );

  const response = await apiClient.get(
    `/campaigns/code/${encodeURIComponent(normalizedCode)}`,
  );

  return response.data;
}

export async function createCampaign(payload) {
  const response = await apiClient.post(
    "/campaigns",
    payload,
  );

  return response.data;
}

export async function updateCampaign(id, payload) {
  requireValue(id, "Kampanya ID bilgisi zorunludur.");

  const response = await apiClient.put(
    `/campaigns/${id}`,
    payload,
  );

  return response.data;
}

export async function deactivateCampaign(id) {
  requireValue(id, "Kampanya ID bilgisi zorunludur.");

  const response = await apiClient.patch(
    `/campaigns/${id}/deactivate`,
  );

  return response.data;
}

export async function activateCampaign(id) {
  requireValue(id, "Kampanya ID bilgisi zorunludur.");

  const response = await apiClient.patch(
    `/campaigns/${id}/activate`,
  );

  return response.data;
}