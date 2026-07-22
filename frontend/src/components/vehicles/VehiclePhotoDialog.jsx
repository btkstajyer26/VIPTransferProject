import { ImageOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function VehiclePhotoDialog({
  isOpen,
  vehicle,
  onClose,
}) {
  const hasPhoto = Boolean(vehicle?.photoUrl?.trim());

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Araç Fotoğrafı</DialogTitle>

          <DialogDescription>
            {vehicle
              ? `${vehicle.plateNumber} • ${vehicle.brand || "-"} ${
                  vehicle.model || ""
                }`
              : "Araç fotoğrafı önizlemesi"}
          </DialogDescription>
        </DialogHeader>

        {hasPhoto ? (
          <div className="overflow-hidden rounded-xl border bg-muted">
            <img
              src={vehicle.photoUrl}
              alt={`${vehicle.brand || "Araç"} ${
                vehicle.model || ""
              }`}
              className="max-h-[60vh] w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed text-center">
            <ImageOff className="mb-3 size-10 text-muted-foreground" />

            <p className="font-medium">Fotoğraf bulunamadı</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Bu araç için henüz bir fotoğraf URL&apos;si eklenmemiş.
            </p>
          </div>
        )}

        {hasPhoto && (
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Fotoğraf URL
            </p>

            <p className="mt-1 break-all text-sm">
              {vehicle.photoUrl}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default VehiclePhotoDialog;