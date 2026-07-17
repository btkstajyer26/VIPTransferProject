import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function DeleteVehicleDialog({
  isOpen,
  vehicle,
  onClose,
  onConfirm,
}) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aracı silmek istiyor musunuz?</DialogTitle>

          <DialogDescription>
            {vehicle
              ? `${vehicle.plateNumber} plakalı araç sistemden kaldırılacaktır.`
              : "Seçilen araç sistemden kaldırılacaktır."}
            Bu işlem geri alınamaz.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Vazgeç
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
          >
            Aracı Sil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteVehicleDialog;