import {
  CalendarClock,
  Circle,
  LoaderCircle,
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
  history = [],
  isLoading = false,
}) {
  if (!reservation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Durum Geçmişi</DialogTitle>

          <DialogDescription>
            {reservation.bookingReference}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
            <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Durum geçmişi yükleniyor...
          </div>
        ) : history.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Bu rezervasyon için durum kaydı bulunamadı.
          </div>
        ) : (
          <div className="relative mt-5 ml-3 border-l">
          {history.map((item, index) => (
            <div
              key={item.id || `${item.status}-${item.changedAt}-${index}`}
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

                  {item.changedByName || item.changedBy || "Sistem"}
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
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReservationHistoryDialog;
