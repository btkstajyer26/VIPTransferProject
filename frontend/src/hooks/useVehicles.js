import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createVehicle,
  deleteVehicleById,
  getVehicles,
  updateVehicle,
} from "@/api/vehicleServices";

/**
 * Backend'den gelen araç nesnesini frontend'de kullanılan
 * standart yapıya dönüştürür.
 */
function normalizeVehicle(vehicle = {}) {
  return {
    id: vehicle.id,

    plateNumber:
      vehicle.plateNumber ??
      vehicle.plate_number ??
      "",

    brand: vehicle.brand ?? "",
    model: vehicle.model ?? "",

    year:
      vehicle.year !== null && vehicle.year !== undefined
        ? Number(vehicle.year)
        : null,

    color: vehicle.color ?? "",

    photoUrl:
      vehicle.photoUrl ??
      vehicle.photo_url ??
      "",

    capacity:
      vehicle.capacity !== null && vehicle.capacity !== undefined
        ? Number(vehicle.capacity)
        : 0,

    vehicleClass:
      vehicle.vehicleClass ??
      vehicle.vehicle_class ??
      "",

    openingPrice:
      vehicle.openingPrice ??
      vehicle.opening_price ??
      0,

    basePriceMultiplier:
      vehicle.basePriceMultiplier ??
      vehicle.base_price_multiplier ??
      1,

    /*
     * Backend bunlardan hangisini döndürürse döndürsün,
     * frontend içinde sadece vehicle.active kullanacağız.
     */
    active:
      vehicle.active ??
      vehicle.isActive ??
      vehicle.is_active ??
      false,

    createdAt:
      vehicle.createdAt ??
      vehicle.created_at ??
      null,

    updatedAt:
      vehicle.updatedAt ??
      vehicle.updated_at ??
      null,
  };
}

/**
 * API cevabının liste, data veya content formatında gelmesini destekler.
 */
function normalizeVehicleResponse(response) {
  const data = response?.data ?? response;

  let vehicleList = [];

  if (Array.isArray(data)) {
    vehicleList = data;
  } else if (Array.isArray(data?.content)) {
    vehicleList = data.content;
  } else if (Array.isArray(data?.data)) {
    vehicleList = data.data;
  }

  return vehicleList.map(normalizeVehicle);
}

/**
 * Frontend araç verisini backend request gövdesine dönüştürür.
 *
 * active ve isActive birlikte gönderiliyor. Böylece backend DTO'su
 * hangi ismi kullanıyorsa onu okuyabilir.
 */
function createVehiclePayload(vehicleData = {}, currentVehicle = {}) {
  const mergedVehicle = {
    ...currentVehicle,
    ...vehicleData,
  };

  const activeValue =
    mergedVehicle.active ??
    mergedVehicle.isActive ??
    true;

  return {
    plateNumber: mergedVehicle.plateNumber?.trim() || "",
    brand: mergedVehicle.brand?.trim() || "",
    model: mergedVehicle.model?.trim() || "",

    year:
      mergedVehicle.year === "" ||
      mergedVehicle.year === null ||
      mergedVehicle.year === undefined
        ? null
        : Number(mergedVehicle.year),

    color: mergedVehicle.color?.trim() || null,
    photoUrl: mergedVehicle.photoUrl?.trim() || null,

    capacity: Number(mergedVehicle.capacity),

    vehicleClass: mergedVehicle.vehicleClass,

    openingPrice: Number(mergedVehicle.openingPrice),

    basePriceMultiplier: Number(
      mergedVehicle.basePriceMultiplier,
    ),

    active: Boolean(activeValue),
    isActive: Boolean(activeValue),
  };
}

function getErrorMessage(error, fallbackMessage) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallbackMessage
  );
}

function useVehicles() {
  const [vehicles, setVehicles] = useState([]);

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");

  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const [error, setError] = useState("");

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getVehicles();
      const vehicleList = normalizeVehicleResponse(response);

      setVehicles(vehicleList);
    } catch (err) {
      console.error("Araçlar alınamadı:", err);

      setError(
        getErrorMessage(
          err,
          "Araçlar yüklenirken bir hata oluştu.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const filteredVehicles = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    return vehicles.filter((vehicle) => {
      const searchableText = [
        vehicle.plateNumber,
        vehicle.brand,
        vehicle.model,
        vehicle.vehicleClass,
        vehicle.color,
        vehicle.year,
      ]
        .filter(
          (value) =>
            value !== null &&
            value !== undefined &&
            value !== "",
        )
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      const matchesSearch =
        normalizedSearch === "" ||
        searchableText.includes(normalizedSearch);

      const matchesClass =
        classFilter === "ALL" ||
        vehicle.vehicleClass === classFilter;

      return matchesSearch && matchesClass;
    });
  }, [vehicles, search, classFilter]);

  const openCreateDialog = () => {
    setError("");
    setSelectedVehicle(null);
    setIsFormOpen(true);
  };

  const openEditDialog = (vehicle) => {
    setError("");
    setSelectedVehicle(vehicle);
    setIsFormOpen(true);
  };

  const closeFormDialog = () => {
    if (saving) {
      return;
    }

    setSelectedVehicle(null);
    setIsFormOpen(false);
  };

  const openDeleteDialog = (vehicle) => {
    setError("");
    setSelectedVehicle(vehicle);
    setIsDeleteOpen(true);
  };

  const closeDeleteDialog = () => {
    if (deleting) {
      return;
    }

    setSelectedVehicle(null);
    setIsDeleteOpen(false);
  };

  const openPhotoDialog = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsPhotoOpen(true);
  };

  const closePhotoDialog = () => {
    setSelectedVehicle(null);
    setIsPhotoOpen(false);
  };

  const saveVehicle = async (vehicleData) => {
    try {
      setSaving(true);
      setError("");

      const payload = createVehiclePayload(
        vehicleData,
        selectedVehicle ?? {},
      );

      if (selectedVehicle?.id) {
        await updateVehicle(selectedVehicle.id, payload);
      } else {
        await createVehicle(payload);
      }

      await fetchVehicles();

      setSelectedVehicle(null);
      setIsFormOpen(false);

      return true;
    } catch (err) {
      console.error("Araç kaydedilemedi:", err);

      setError(
        getErrorMessage(
          err,
          "Araç kaydedilirken bir hata oluştu.",
        ),
      );

      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteVehicle = async () => {
    if (!selectedVehicle?.id) {
      return false;
    }

    try {
      setDeleting(true);
      setError("");

      await deleteVehicleById(selectedVehicle.id);
      await fetchVehicles();

      setSelectedVehicle(null);
      setIsDeleteOpen(false);

      return true;
    } catch (err) {
      console.error("Araç silinemedi:", err);

      setError(
        getErrorMessage(
          err,
          "Araç silinirken bir hata oluştu.",
        ),
      );

      return false;
    } finally {
      setDeleting(false);
    }
  };

  const toggleVehicleStatus = async (vehicle) => {
    if (!vehicle?.id) {
      return false;
    }

    const newStatus = !vehicle.active;

    try {
      setUpdatingStatusId(vehicle.id);
      setError("");

      /*
       * PATCH endpoint'i tüm alanları bekliyorsa hata almamak için
       * mevcut aracın bütün bilgilerini gönderiyoruz.
       */
      const payload = createVehiclePayload(
        {
          active: newStatus,
          isActive: newStatus,
        },
        vehicle,
      );

      await updateVehicle(vehicle.id, payload);

      /*
       * Başarılı olunca local state'i güncelliyoruz.
       */
      setVehicles((currentVehicles) =>
        currentVehicles.map((currentVehicle) =>
          currentVehicle.id === vehicle.id
            ? {
                ...currentVehicle,
                active: newStatus,
              }
            : currentVehicle,
        ),
      );

      return true;
    } catch (err) {
      console.error(
        "Araç durumu değiştirilemedi:",
        err,
      );

      setError(
        getErrorMessage(
          err,
          "Araç durumu değiştirilirken bir hata oluştu.",
        ),
      );

      return false;
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return {
    vehicles: filteredVehicles,
    totalVehicleCount: vehicles.length,

    loading,
    saving,
    deleting,
    updatingStatusId,
    error,

    search,
    setSearch,

    classFilter,
    setClassFilter,

    selectedVehicle,

    isFormOpen,
    isDeleteOpen,
    isPhotoOpen,

    openCreateDialog,
    openEditDialog,
    closeFormDialog,

    openDeleteDialog,
    closeDeleteDialog,

    openPhotoDialog,
    closePhotoDialog,

    saveVehicle,
    deleteVehicle,
    toggleVehicleStatus,

    fetchVehicles,
  };
}

export default useVehicles;