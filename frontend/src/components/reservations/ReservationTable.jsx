import { Eye, History, MoreHorizontal, RefreshCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/context/CurrencyContext";

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

function getCustomerLabel(reservation, t) {
  if (reservation.userId) {
    return `${t('admin.reservationList.table.customer')} #${reservation.userId}`;
  }

  if (reservation.guestPhone) {
    return reservation.guestPhone;
  }

  return t('admin.reservationList.status.unknown');
}

function ReservationTable({
  reservations,
  onViewDetails,
  onChangeStatus,
  onViewHistory,
}) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  
  if (!reservations.length) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-xl border bg-white p-6 text-center">
        <div>
          <p className="font-medium text-foreground">
            {t('admin.reservationList.notFound')}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {t('admin.reservationList.tryAgain')}
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
              <TableHead>{t('admin.reservationList.table.reservation')}</TableHead>
              <TableHead>{t('admin.reservationList.table.customer')}</TableHead>
              <TableHead>{t('admin.reservationList.table.route')}</TableHead>
              <TableHead>{t('admin.reservationList.table.date')}</TableHead>
              <TableHead>{t('admin.reservationList.table.vehicle')}</TableHead>
              <TableHead>{t('admin.reservationList.table.passengers')}</TableHead>
              <TableHead>{t('admin.reservationList.table.price')}</TableHead>
              <TableHead>{t('admin.reservationList.table.status')}</TableHead>
              <TableHead className="w-16 text-right">{t('admin.reservationList.table.action')}</TableHead>
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
                      {getCustomerLabel(reservation, t)}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {reservation.userId ? t('admin.reservationList.table.registered') : t('admin.reservationList.table.guest')}
                    </p>
                  </div>
                </TableCell>

                <TableCell className="min-w-64">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {t('admin.reservationList.table.pickup')}
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
                        {t('admin.reservationList.table.dropoff')}
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
                        {t('admin.reservationList.table.flight')} {reservation.flightNumber}
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
                      aria-label={t('admin.reservationList.table.actions')}
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
                        {t('admin.reservationList.table.viewDetails')}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => onViewHistory(reservation)}
                      >
                        <History className="mr-2 h-4 w-4" />
                        {t('admin.reservationList.table.statusHistory')}
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
                        {t('admin.reservationList.table.changeStatus')}
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