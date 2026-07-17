import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialFormData = {
  plateNumber: "",
  brand: "",
  model: "",
  year: "",
  color: "",
  photoUrl: "",
  capacity: "",
  vehicleClass: "STANDARD",
  openingPrice: "",
  basePriceMultiplier: "1.00",
};

function VehicleFormDialog({
  isOpen,
  vehicle,
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState(initialFormData);

  const isEditMode = Boolean(vehicle);

  useEffect(() => {
    if (vehicle) {
      setFormData({
        plateNumber: vehicle.plateNumber ?? "",
        brand: vehicle.brand ?? "",
        model: vehicle.model ?? "",
        year: vehicle.year !== null && vehicle.year !== undefined ? String(vehicle.year) : "",
        color: vehicle.color ?? "",
        photoUrl: vehicle.photoUrl ?? "",
        capacity: vehicle.capacity !== null && vehicle.capacity !== undefined ? String(vehicle.capacity) : "",       
        vehicleClass: vehicle.vehicleClass ?? "STANDARD",
        openingPrice:
          vehicle.openingPrice !== undefined
            ? String(vehicle.openingPrice)
            : "",
        basePriceMultiplier:
          vehicle.basePriceMultiplier !== undefined
            ? String(vehicle.basePriceMultiplier)
            : "1.00",
      });
    } else {
      setFormData(initialFormData);
    }
  }, [vehicle, isOpen]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSave({
      plateNumber: formData.plateNumber.trim().toUpperCase(),      brand: formData.brand.trim(),
      model: formData.model.trim(),
      year: formData.year ? Number(formData.year) : null,
      color: formData.color.trim(),
      photoUrl: formData.photoUrl.trim(),
      capacity: Number(formData.capacity),
      vehicleClass: formData.vehicleClass,
      openingPrice: Number(formData.openingPrice),
      basePriceMultiplier: Number(formData.basePriceMultiplier),
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Aracı Düzenle" : "Yeni Araç Ekle"}
          </DialogTitle>

          <DialogDescription>
            Araç bilgilerini backend veri modeliyle uyumlu şekilde girin.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <label htmlFor="plateNumber" className="text-sm font-medium">
              Plaka
            </label>

            <Input
              id="plateNumber"
              name="plateNumber"
              value={formData.plateNumber}
              onChange={handleInputChange}
              placeholder="06 VIP 001"
              maxLength={20}
              required
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="brand" className="text-sm font-medium">
                Marka
              </label>

              <Input
                id="brand"
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                placeholder="Mercedes"
                maxLength={50}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="model" className="text-sm font-medium">
                Model
              </label>

              <Input
                id="model"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                placeholder="Vito"
                maxLength={50}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="year" className="text-sm font-medium">
                Model yılı
              </label>

              <Input
                id="year"
                type="number"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                min="1900"
                max="2100"
                placeholder="2025"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="color" className="text-sm font-medium">
                Renk
              </label>

              <Input
                id="color"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                placeholder="Siyah"
                maxLength={30}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="capacity" className="text-sm font-medium">
                Kapasite
              </label>

              <Input
                id="capacity"
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                min="1"
                max="100"
                placeholder="7"
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">
                Araç sınıfı
              </label>

              <Select
                value={formData.vehicleClass}
                onValueChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    vehicleClass: value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Araç sınıfı seçin" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="ECONOMY">Economy</SelectItem>
                  <SelectItem value="STANDARD">Standard</SelectItem>
                  <SelectItem value="BUSINESS">Business</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="LUXURY">Luxury</SelectItem>
                  <SelectItem value="MINIVAN">Minivan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="openingPrice" className="text-sm font-medium">
                Açılış fiyatı
              </label>

              <Input
                id="openingPrice"
                type="number"
                name="openingPrice"
                value={formData.openingPrice}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                placeholder="500.00"
                required
              />
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="basePriceMultiplier"
                className="text-sm font-medium"
              >
                Fiyat katsayısı
              </label>

              <Input
                id="basePriceMultiplier"
                type="number"
                name="basePriceMultiplier"
                value={formData.basePriceMultiplier}
                onChange={handleInputChange}
                min="0.01"
                step="0.01"
                placeholder="1.00"
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label htmlFor="photoUrl" className="text-sm font-medium">
              Araç fotoğrafı URL
            </label>

            <Input
              id="photoUrl"
              type="url"
              name="photoUrl"
              value={formData.photoUrl}
              onChange={handleInputChange}
              placeholder="https://example.com/vehicle.jpg"
              maxLength={500}
            />
          </div>

          {formData.photoUrl && (
            <div className="overflow-hidden rounded-xl border bg-muted">
              <img
                src={formData.photoUrl}
                alt="Araç önizleme"
                className="h-48 w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Vazgeç
            </Button>

            <Button type="submit">
              {isEditMode ? "Değişiklikleri Kaydet" : "Aracı Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default VehicleFormDialog;