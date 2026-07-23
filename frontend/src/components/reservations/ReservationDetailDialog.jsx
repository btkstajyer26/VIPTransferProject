import {
  CalendarDays,
  Car,
  Clock3,
  CreditCard,
  FileText,
  Hash,
  MapPin,
  Plane,
  UserRound,
  UsersRound,
} from "lucide-react";

import ReservationStatusBadge from "@/components/reservations/ReservationStatusBadge";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateTime(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPrice(price, currency = "TRY") {
  const numericPrice = Number(price);

  if (Number.isNaN(numericPrice)) {
    return "-";
  }

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(numericPrice);
}

function DetailItem({ icon: Icon, label, value, className = "" }) {
  return (
    <div className={`flex gap-3 ${className}`}>
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-foreground">
          {value || "-"}
        </p>
      </div>
    </div>
  );
}

function ReservationDetailDialog({
  open,
  onOpenChange,
  reservation,
}) {
  if (!reservation) {
    return null;
  }

  const customerLabel = reservation.userId
    ? `Kullanıcı #${reservation.userId}`
    : reservation.guestPhone || "Bilinmiyor";

  const customerType = reservation.userId
    ? "Kayıtlı kullanıcı"
    : "Misafir rezervasyonu";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <DialogTitle className="text-xl">
                Rezervasyon Detayı
              </DialogTitle>

              <DialogDescription className="mt-1">
                {reservation.bookingReference}
              </DialogDescription>
            </div>

            <ReservationStatusBadge status={reservation.status} />
          </div>
        </DialogHeader>

        <Separator />

        <div className="grid gap-5 sm:grid-cols-2">
          <DetailItem
            icon={Hash}
            label="Rezervasyon Kodu"
            value={reservation.bookingReference}
          />

          <DetailItem
            icon={Hash}
            label="Rezervasyon ID"
            value={`#${reservation.id}`}
          />

          <DetailItem
            icon={UserRound}
            label="Müşteri"
            value={customerLabel}
          />

          <DetailItem
            icon={UserRound}
            label="Müşteri Türü"
            value={customerType}
          />
        </div>

        <Separator />

        <div>
          <h3 className="mb-4 text-sm font-semibold">
            Yolculuk Bilgileri
          </h3>

          <div className="space-y-5">
            <DetailItem
              icon={MapPin}
              label="Alış Adresi"
              value={reservation.pickupAddress}
            />

            <DetailItem
              icon={MapPin}
              label="Varış Adresi"
              value={reservation.dropoffAddress}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <DetailItem
                icon={CalendarDays}
                label="Planlanan Tarih"
                value={formatDate(reservation.scheduledTime)}
              />

              <DetailItem
                icon={Clock3}
                label="Planlanan Saat"
                value={formatTime(reservation.scheduledTime)}
              />

              <DetailItem
                icon={Car}
                label="Araç"
                value={reservation.vehicleName}
              />

              <DetailItem
                icon={UsersRound}
                label="Yolcu Sayısı"
                value={`${reservation.passengerCount || 0} kişi`}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid gap-5 sm:grid-cols-2">
          <DetailItem
            icon={CreditCard}
            label="Toplam Fiyat"
            value={formatPrice(
              reservation.calculatedPrice,
              reservation.currency,
            )}
          />

          <DetailItem
            icon={Plane}
            label="Uçuş Numarası"
            value={reservation.flightNumber || "Belirtilmedi"}
          />
        </div>

        <Separator />

        <div>
          <DetailItem
            icon={FileText}
            label="Rezervasyon Notu"
            value={reservation.notes || "Not eklenmemiş."}
          />
        </div>

        <Separator />

        <div className="grid gap-5 sm:grid-cols-2">
          <DetailItem
            icon={CalendarDays}
            label="Oluşturulma Tarihi"
            value={formatDateTime(reservation.createdAt)}
          />

          <DetailItem
            icon={CalendarDays}
            label="Son Güncelleme"
            value={formatDateTime(reservation.updatedAt)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ReservationDetailDialog;