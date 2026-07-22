import {
  CalendarClock,
  Circle,
  User,
  MessageSquareText,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import ReservationStatusBadge from "./ReservationStatusBadge";

function formatDate(date) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function ReservationHistoryDialog({
  open,
  onOpenChange,
  reservation,
}) {
  if (!reservation) return null;

  /**
   * Şimdilik Mock
   * API bağlanınca
   * GET /api/v1/reservations/{id}/history
   * gelecek.
   */

  const history = [
    {
      id: 1,
      status: "PENDING",
      changedByName: "System",
      note: "Rezervasyon oluşturuldu.",
      changedAt: reservation.createdAt,
    },

    ...(reservation.status !== "PENDING"
      ? [
          {
            id: 2,
            status: reservation.status,
            changedByName: "Admin",
            note:
              reservation.statusNote ||
              "Rezervasyon durumu güncellendi.",
            changedAt: reservation.updatedAt,
          },
        ]
      : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Durum Geçmişi</DialogTitle>

          <DialogDescription>
            {reservation.bookingReference}
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-5 ml-3 border-l">
          {history.map((item) => (
            <div
              key={item.id}
              className="relative mb-8 ml-6"
            >
              <span className="absolute -left-[34px] flex h-6 w-6 items-center justify-center rounded-full border bg-background">
                <Circle className="h-3 w-3 fill-current" />
              </span>

              <div className="space-y-3 rounded-xl border p-4 shadow-sm">
                <ReservationStatusBadge status={item.status} />

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />

                  {formatDate(item.changedAt)}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />

                  {item.changedByName || "-"}
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <MessageSquareText className="mt-0.5 h-4 w-4" />

                  <span>
                    {item.note || "-"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ReservationHistoryDialog;