import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";

import ReservationStatusBadge from "@/components/reservations/ReservationStatusBadge";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const transitionConfig = {
  PENDING: [
    {
      value: "ASSIGNED",
      label: "Araç Atandı",
    },
    {
      value: "CANCELLED",
      label: "İptal Edildi",
    },
  ],

  ASSIGNED: [
    {
      value: "COMPLETED",
      label: "Tamamlandı",
    },
    {
      value: "NO_SHOW",
      label: "Müşteri Gelmedi",
    },
  ],

  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

function ReservationStatusDialog({
  open,
  onOpenChange,
  reservation,
  onSubmit,
}) {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [note, setNote] = useState("");

  const availableStatuses = useMemo(() => {
    if (!reservation) {
      return [];
    }

    return transitionConfig[reservation.status] ?? [];
  }, [reservation]);

  useEffect(() => {
    if (open) {
      setSelectedStatus("");
      setNote("");
    }
  }, [open, reservation]);

  if (!reservation) {
    return null;
  }

  const hasAvailableTransition = availableStatuses.length > 0;

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!selectedStatus) {
      return;
    }

    onSubmit(reservation.id, selectedStatus, note.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rezervasyon Durumunu Değiştir</DialogTitle>

            <DialogDescription>
              {reservation.bookingReference} numaralı rezervasyonun durumunu
              güncelleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-5">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Mevcut Durum
              </p>

              <div className="mt-2">
                <ReservationStatusBadge status={reservation.status} />
              </div>
            </div>

            {!hasAvailableTransition ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />

                <AlertTitle>Durum değiştirilemez</AlertTitle>

                <AlertDescription>
                  Bu rezervasyon son durumuna ulaşmıştır. Yeni bir durum
                  seçilemez.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reservation-status">Yeni Durum</Label>

                  <Select
                    value={selectedStatus}
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger id="reservation-status">
                      <SelectValue placeholder="Yeni durumu seçin" />
                    </SelectTrigger>

                    <SelectContent>
                      {availableStatuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reservation-status-note">
                    Durum Değişikliği Notu
                  </Label>

                  <Textarea
                    id="reservation-status-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Örneğin: Şoför ve araç bilgileri müşteriye iletildi."
                    rows={4}
                    maxLength={500}
                  />

                  <p className="text-right text-xs text-muted-foreground">
                    {note.length}/500
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Vazgeç
            </Button>

            <Button
              type="submit"
              disabled={!hasAvailableTransition || !selectedStatus}
            >
              Durumu Güncelle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ReservationStatusDialog;