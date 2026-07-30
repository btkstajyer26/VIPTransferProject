import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

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



function ReservationStatusDialog({
  open,
  onOpenChange,
  reservation,
  onSubmit,
}) {
  const { t } = useTranslation();
  const [selectedStatus, setSelectedStatus] = useState("");
  const [note, setNote] = useState("");

  const transitionConfig = useMemo(() => ({
    PENDING: [
      {
        value: "ASSIGNED",
        label: t('admin.reservationList.status.ASSIGNED'),
      },
      {
        value: "CANCELLED",
        label: t('admin.reservationList.status.CANCELLED'),
      },
    ],
  
    ASSIGNED: [
      {
        value: "COMPLETED",
        label: t('admin.reservationList.status.COMPLETED'),
      },
      {
        value: "NO_SHOW",
        label: t('admin.reservationList.dialog.noShow'),
      },
    ],
  
    COMPLETED: [],
    CANCELLED: [],
    NO_SHOW: [],
  }), [t]);

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
            <DialogTitle>{t('admin.reservationList.dialog.title')}</DialogTitle>

            <DialogDescription>
              {t('admin.reservationList.dialog.desc', { ref: reservation.bookingReference })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-5">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">
                {t('admin.reservationList.dialog.currentStatus')}
              </p>

              <div className="mt-2">
                <ReservationStatusBadge status={reservation.status} />
              </div>
            </div>

            {!hasAvailableTransition ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />

                <AlertTitle>{t('admin.reservationList.dialog.cannotChangeTitle')}</AlertTitle>

                <AlertDescription>
                  {t('admin.reservationList.dialog.cannotChangeDesc')}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reservation-status">{t('admin.reservationList.dialog.newStatus')}</Label>

                  <Select
                    value={selectedStatus}
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger id="reservation-status">
                      <SelectValue placeholder={t('admin.reservationList.dialog.selectNewStatus')} />
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
                    {t('admin.reservationList.dialog.noteLabel')}
                  </Label>

                  <Textarea
                    id="reservation-status-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={t('admin.reservationList.dialog.notePlaceholder')}
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
              {t('admin.reservationList.dialog.cancel')}
            </Button>

            <Button
              type="submit"
              disabled={!hasAvailableTransition || !selectedStatus}
            >
              {t('admin.reservationList.dialog.update')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ReservationStatusDialog;