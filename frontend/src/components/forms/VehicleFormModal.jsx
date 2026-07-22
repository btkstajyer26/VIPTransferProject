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
  capacity: "",
  vehicleClass: "VIP",
};

function VehicleFormModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    if (!isOpen) {
      setFormData(initialFormData);
    }
  }, [isOpen]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSave({
      ...formData,
      capacity: Number(formData.capacity),
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Yeni Araç Ekle</DialogTitle>
          <DialogDescription>
            Araç bilgilerini eksiksiz girin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <div className="grid gap-2">
            <label htmlFor="plateNumber" className="text-sm font-medium">
              Plaka
            </label>
            <Input
              id="plateNumber"
              name="plateNumber"
              value={formData.plateNumber}
              onChange={handleChange}
              placeholder="06 VIP 001"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="brand" className="text-sm font-medium">
                Marka
              </label>
              <Input
                id="brand"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="Mercedes"
                required
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
                onChange={handleChange}
                placeholder="Vito"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="capacity" className="text-sm font-medium">
                Kapasite
              </label>
              <Input
                id="capacity"
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                placeholder="7"
                min="1"
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Araç sınıfı</label>

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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Vazgeç
            </Button>

            <Button type="submit">Aracı Kaydet</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default VehicleFormModal;