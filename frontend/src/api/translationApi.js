import apiClient from "@/api/apiClient";

export async function getAdminTranslations(langCode) {
  const response = await apiClient.get("/translations/admin/list", { params: { langCode } });
  return response.data;
}

export async function createTranslation(payload) {
  const response = await apiClient.post("/translations", payload);
  return response.data;
}

export async function updateTranslation(id, value) {
  const response = await apiClient.put(`/translations/${id}`, { value });
  return response.data;
}

export async function deleteTranslation(id) {
  await apiClient.delete(`/translations/${id}`);
}
