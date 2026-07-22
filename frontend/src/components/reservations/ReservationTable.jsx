import { Eye, History, MoreHorizontal, RefreshCcw } from "lucide-react";

import ReservationStatusBadge from "@/components/reservations/ReservationStatusBadge";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

function getCustomerLabel(reservation) {
  if (reservation.userId) {
    return `Kullanıcı #${reservation.userId}`;
  }

  if (reservation.guestPhone) {
    return reservation.guestPhone;
  }

  return "Bilinmiyor";
}

function ReservationTable({
  reservations,
  onViewDetails,
  onChangeStatus,
  onViewHistory,
}) {
  if (!reservations.length) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-xl border bg-white p-6 text-center">
        <div>
          <p className="font-medium text-foreground">
            Rezervasyon bulunamadı
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Arama veya filtre kriterlerini değiştirerek tekrar deneyin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rezervasyon</TableHead>
              <TableHead>Müşteri</TableHead>
              <TableHead>Güzergâh</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Araç</TableHead>
              <TableHead>Yolcu</TableHead>
              <TableHead>Fiyat</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-16 text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {reservations.map((reservation) => (
              <TableRow key={reservation.id}>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">
                      {reservation.bookingReference}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      ID: {reservation.id}
                    </p>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">
                      {getCustomerLabel(reservation)}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {reservation.userId ? "Kayıtlı kullanıcı" : "Misafir"}
                    </p>
                  </div>
                </TableCell>

                <TableCell className="min-w-64">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Alış
                      </p>

                      <p
                        className="max-w-64 truncate text-sm"
                        title={reservation.pickupAddress}
                      >
                        {reservation.pickupAddress || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Varış
                      </p>

                      <p
                        className="max-w-64 truncate text-sm"
                        title={reservation.dropoffAddress}
                      >
                        {reservation.dropoffAddress || "-"}
                      </p>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="whitespace-nowrap">
                  {formatDateTime(reservation.scheduledTime)}
                </TableCell>

                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">
                      {reservation.vehicleName || "-"}
                    </p>

                    {reservation.flightNumber && (
                      <p className="text-xs text-muted-foreground">
                        Uçuş: {reservation.flightNumber}
                      </p>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  {reservation.passengerCount || "-"}
                </TableCell>

                <TableCell className="whitespace-nowrap font-medium">
                  {formatPrice(
                    reservation.calculatedPrice,
                    reservation.currency,
                  )}
                </TableCell>

                <TableCell>
                  <ReservationStatusBadge status={reservation.status} />
                </TableCell>

                <TableCell className="text-right">
                  <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Rezervasyon işlemleri"
                    />
                  }
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onViewDetails(reservation)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Detayları görüntüle
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => onViewHistory(reservation)}
                      >
                        <History className="mr-2 h-4 w-4" />
                        Durum geçmişi
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        disabled={[
                          "COMPLETED",
                          "CANCELLED",
                          "NO_SHOW",
                        ].includes(reservation.status)}
                        onClick={() => onChangeStatus(reservation)}
                      >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Durumu değiştir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default ReservationTable;