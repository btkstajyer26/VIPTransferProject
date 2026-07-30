import { useState, useCallback } from "react";
import apiClient from "../api/apiClient";

export function usePricingZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const fetchZones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/pricing-zones");
      setZones(response.data?.data ?? response.data);
    } catch (err) {
      console.error("Fiyat bölgeleri yüklenirken hata:", err);
      setError(err.response?.data?.message || "Bölgeler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  const createZone = async (zoneData) => {
    setSaving(true);
    try {
      const response = await apiClient.post("/pricing-zones", zoneData);
      const newZone = response.data?.data ?? response.data;
      setZones((prev) => [...prev, newZone]);
      return newZone;
    } catch (err) {
      console.error("Bölge oluşturulurken hata:", err);
      throw err; // Dialog inline hata göstersin
    } finally {
      setSaving(false);
    }
  };

  const updateZone = async (id, zoneData) => {
    setSaving(true);
    try {
      const response = await apiClient.put(`/pricing-zones/${id}`, zoneData);
      const updatedZone = response.data?.data ?? response.data;
      setZones((prev) =>
        prev.map((zone) => (zone.id === id ? updatedZone : zone)),
      );
      return updatedZone;
    } catch (err) {
      console.error("Bölge güncellenirken hata:", err);
      throw err; // Dialog inline hata göstersin
    } finally {
      setSaving(false);
    }
  };

  const deactivateZone = async (id) => {
    setDeletingId(id);
    setError(null);
    try {
      await apiClient.delete(`/pricing-zones/${id}`);
      setZones((prev) => prev.filter((zone) => zone.id !== id));
    } catch (err) {
      console.error("Bölge silinirken hata:", err);
      // Sayfa banner'ında görünsün + caller'a da fırlat ki feedback set edesin
      setError(err.response?.data?.message || "Bölge silinemedi");
      throw err;
    } finally {
      setDeletingId(null);
    }
  };

  return {
    zones,
    loading,
    saving,
    deletingId,
    error,
    fetchZones,
    createZone,
    updateZone,
    deactivateZone,
  };
}
