import apiClient from "@/api/apiClient";

const unwrap = (response) => response.data?.data ?? response.data;

export async function getPricingRules(zoneId) {
  return unwrap(await apiClient.get("/pricing-rules", { params: { zoneId } }));
}

export async function createPricingRule(payload) {
  return unwrap(await apiClient.post("/pricing-rules", payload));
}

export async function updatePricingRule(id, payload) {
  return unwrap(await apiClient.put(`/pricing-rules/${id}`, payload));
}

export async function deletePricingRule(id) {
  await apiClient.delete(`/pricing-rules/${id}`);
}
