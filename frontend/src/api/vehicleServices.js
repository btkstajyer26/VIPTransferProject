import apiClient from "@/api/apiClient";

export async function getVehicles() {
  const response = await apiClient.get("/vehicles");
  return response.data;
}

export async function createVehicle(vehicleData) {
  const response = await apiClient.post("/vehicles", vehicleData);
  return response.data;
}

export async function updateVehicle(vehicleId, vehicleData) {
  const response = await apiClient.patch(
    `/vehicles/${vehicleId}`,
    vehicleData,
  );

  return response.data;
}

export async function deleteVehicleById(vehicleId) {
  const response = await apiClient.delete(`/vehicles/${vehicleId}`);
  return response.data;
}