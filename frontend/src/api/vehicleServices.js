import apiClient from "@/api/apiClient";

/*
 * Public araç listesi (rezervasyon ekranı)
 */
export async function getVehicles() {
  const response = await apiClient.get(
    "/vehicles",
    {
      allowAnonymous: true,
    }
  );

  return response.data;
}

/*
 * Admin araç listesi
 */
export async function getAllVehicles() {
  const response = await apiClient.get(
    "/vehicles/all"
  );

  return response.data;
}

export async function createVehicle(vehicleData) {
  const response = await apiClient.post(
    "/vehicles",
    vehicleData
  );

  return response.data;
}

export async function updateVehicle(
  vehicleId,
  vehicleData
) {
  const response = await apiClient.patch(
    `/vehicles/${vehicleId}`,
    vehicleData
  );

  return response.data;
}

export async function deleteVehicleById(vehicleId) {
  const response = await apiClient.delete(
    `/vehicles/${vehicleId}`
  );

  return response.data;
}

export async function updateVehicleStatus(vehicleId, active) {
  const response = await apiClient.patch(`/vehicles/${vehicleId}/status`, null, {
    params: { active },
  });
  return response.data;
}
