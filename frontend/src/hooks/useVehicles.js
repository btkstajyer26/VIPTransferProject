import { useMemo, useState } from "react";

const initialVehicles = [
  {
    id: 1,
    plateNumber: "06 VIP 001",
    brand: "Mercedes",
    model: "Vito",
    capacity: 7,
    vehicleClass: "VIP",
    active: true,
  },
  {
    id: 2,
    plateNumber: "06 VIP 002",
    brand: "BMW",
    model: "5 Serisi",
    capacity: 5,
    vehicleClass: "BUSINESS",
    active: true,
  },
  {
    id: 3,
    plateNumber: "34 TC 003",
    brand: "AUDI",
    model: "A6",
    year: 2025,
    color: "Siyah",
    photoUrl: "",
    capacity: 5,
    vehicleClass: "LUXURY",
    openingPrice: 750,
    basePriceMultiplier: 1.5,
    active: true,
  },
  ];

function useVehicles() {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const filteredVehicles = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");

    return vehicles.filter((vehicle) => {
      const searchableText = [
        vehicle.plateNumber,
        vehicle.brand,
        vehicle.model,
        vehicle.vehicleClass,
      ]
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
    setSelectedVehicle(null);
    setIsFormOpen(true);
  };

  const openEditDialog = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsFormOpen(true);
  };

  const closeFormDialog = () => {
    setSelectedVehicle(null);
    setIsFormOpen(false);
  };

  const openDeleteDialog = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDeleteOpen(true);
  };

  const closeDeleteDialog = () => {
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

  const saveVehicle = (vehicleData) => {
    if (selectedVehicle) {
      setVehicles((currentVehicles) =>
        currentVehicles.map((vehicle) =>
          vehicle.id === selectedVehicle.id
            ? {
                ...vehicle,
                ...vehicleData,
              }
            : vehicle,
        ),
      );
    } else {
      setVehicles((currentVehicles) => [
        ...currentVehicles,
        {
          id: Date.now(),
          ...vehicleData,
          active: true,
        },
      ]);
    }

    closeFormDialog();
  };

  const deleteVehicle = () => {
    if (!selectedVehicle) {
      return;
    }

    setVehicles((currentVehicles) =>
      currentVehicles.filter(
        (vehicle) => vehicle.id !== selectedVehicle.id,
      ),
    );

    closeDeleteDialog();
  };

  const toggleVehicleStatus = (vehicleId) => {
    setVehicles((currentVehicles) =>
      currentVehicles.map((vehicle) =>
        vehicle.id === vehicleId
          ? {
              ...vehicle,
              active: !vehicle.active,
            }
          : vehicle,
      ),
    );
  };

  return {
    vehicles: filteredVehicles,
    totalVehicleCount: vehicles.length,

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

    saveVehicle,
    deleteVehicle,
    toggleVehicleStatus,

    openPhotoDialog,
    closePhotoDialog,
  };
}

export default useVehicles;