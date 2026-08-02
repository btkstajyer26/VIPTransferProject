import {
  AlertCircle,
  CalendarDays,
  Car,
  Clock3,
  CircleCheckBig,
  CircleX,
  ArrowRight,
  Banknote,
  RefreshCw,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useDashboard from "@/hooks/useDashboard";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/context/CurrencyContext";

const STATUS_LABELS = {
  PENDING: "admin.reservationList.status.PENDING",
  ASSIGNED: "admin.reservationList.status.ASSIGNED",
  CONFIRMED: "admin.reservationList.status.CONFIRMED",
  DRIVER_ASSIGNED: "admin.reservationList.status.DRIVER_ASSIGNED",
  ON_THE_WAY: "admin.reservationList.status.ON_THE_WAY",
  IN_PROGRESS: "admin.reservationList.status.IN_PROGRESS",
  COMPLETED: "admin.reservationList.status.COMPLETED",
  CANCELLED: "admin.reservationList.status.CANCELLED",
};

function getStatusLabel(status, t) {
  const labelKey = STATUS_LABELS[status];
  return labelKey ? t(labelKey) : (status ?? t('admin.reservationList.status.unknown'));
}

function getStatusVariant(status) {
  if (status === "COMPLETED") {
    return "default";
  }

  if (
    status === "CONFIRMED" ||
    status === "DRIVER_ASSIGNED" ||
    status === "ON_THE_WAY" ||
    status === "IN_PROGRESS"
  ) {
    return "secondary";
  }

  if (status === "CANCELLED") {
    return "destructive";
  }

  return "outline";
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}



function getCustomerLabel(reservation, t) {
  if (reservation.guestPhone) {
    return reservation.guestPhone;
  }

  if (reservation.userId) {
    return `${t('admin.reservationList.table.customer')} #${reservation.userId}`;
  }

  return t('admin.reservationList.table.guest');
}

function DashboardPage() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const {
    totalUsers,
    totalReservations,
    activeVehicleCount,
    pendingReservationCount,
    activeReservationCount,
    completedReservationCount,
    cancelledReservationCount,
    reservationStatusCounts,
    totalRevenue,
    latestReservations,

    isLoading,
    error,

    fetchDashboard,
  } = useDashboard();

  const stats = [
    {
      title: t('admin.dashboard.stats.totalUsers'),
      value: totalUsers,
      description: t('admin.dashboard.stats.totalUsersDesc'),
      icon: Users,
    },
    {
      title: t('admin.dashboard.stats.totalRes'),
      value: totalReservations,
      description: t('admin.dashboard.stats.totalResDesc'),
      icon: CalendarDays,
    },
    {
      title: t('admin.dashboard.stats.activeVehicles'),
      value: activeVehicleCount,
      description: t('admin.dashboard.stats.activeVehiclesDesc'),
      icon: Car,
    },
    {
      title: t('admin.dashboard.stats.pendingRes'),
      value: pendingReservationCount,
      description: t('admin.dashboard.stats.pendingResDesc'),
      icon: Clock3,
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">
            {t('admin.dashboard.title')}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {t('admin.dashboard.subtitle')}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={isLoading}
          onClick={fetchDashboard}
        >
          <RefreshCw
            className={`mr-2 size-4 ${
              isLoading ? "animate-spin" : ""
            }`}
          />

          {t('admin.dashboard.refresh')}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />

          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>

                <div className="rounded-lg bg-muted p-2">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
              </CardHeader>

              <CardContent>
                <div className="text-3xl font-semibold">
                  {isLoading ? (
                    <div className="h-9 w-16 animate-pulse rounded bg-muted" />
                  ) : (
                    stat.value
                  )}
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
          <CardContent className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                Operasyon özeti
              </p>
              <h3 className="mt-2 text-2xl font-semibold">
                {activeReservationCount} aktif yolculuk süreci
              </h3>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                {pendingReservationCount} rezervasyon onay bekliyor. Tamamlanan işlemlerin toplam değeri {formatPrice(totalRevenue)}.
              </p>
            </div>
            <Link
              to="/admin/reservations"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-medium text-white transition hover:bg-white hover:text-slate-950"
            >
              Rezervasyonları görüntüle <ArrowRight className="ml-2 size-4" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Hızlı işlemler</CardTitle>
            <CardDescription>Sık kullanılan yönetim ekranları</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              ["/admin/vehicles", "Araç ekle", Car],
              ["/admin/campaigns", "Kampanya", CalendarDays],
              ["/admin/pricing-zones", "Fiyat bölgesi", Banknote],
              ["/admin/notifications", "Bildirim", AlertCircle],
            ].map(([to, label, Icon]) => (
              <Link
                key={to}
                to={to}
                className="inline-flex min-h-11 items-center rounded-lg border bg-white px-3 py-3 text-sm font-medium transition hover:bg-slate-50"
              >
                <Icon className="mr-2 size-4" />{label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.dashboard.latestRes.title')}</CardTitle>

          <CardDescription>
            {t('admin.dashboard.latestRes.desc')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex min-h-56 items-center justify-center">
              <RefreshCw className="mr-2 size-5 animate-spin" />

              <span className="text-sm text-muted-foreground">
                {t('admin.dashboard.latestRes.loading')}
              </span>
            </div>
          ) : latestReservations.length === 0 ? (
            <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">
                {t('admin.dashboard.latestRes.empty')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.dashboard.latestRes.cols.ref')}</TableHead>
                    <TableHead>{t('admin.dashboard.latestRes.cols.customer')}</TableHead>
                    <TableHead>{t('admin.dashboard.latestRes.cols.route')}</TableHead>
                    <TableHead>{t('admin.dashboard.latestRes.cols.date')}</TableHead>
                    <TableHead>{t('admin.dashboard.latestRes.cols.vehicle')}</TableHead>
                    <TableHead>{t('admin.dashboard.latestRes.cols.price')}</TableHead>
                    <TableHead>{t('admin.dashboard.latestRes.cols.status')}</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {latestReservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-medium">
                        {reservation.bookingReference || `#${reservation.id}`}
                      </TableCell>

                      <TableCell>
                        {getCustomerLabel(reservation, t)}
                      </TableCell>

                      <TableCell>
                        <div className="max-w-72">
                          <p className="truncate">
                            {reservation.pickupAddress || "-"}
                          </p>

                          <p className="truncate text-xs text-muted-foreground">
                            → {reservation.dropoffAddress || "-"}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        {formatDate(reservation.scheduledTime)}
                      </TableCell>

                      <TableCell>
                        {reservation.vehicleName || "-"}
                      </TableCell>

                      <TableCell>
                        {formatPrice(
                          reservation.calculatedPrice,
                          reservation.currency,
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={getStatusVariant(
                            reservation.status,
                          )}
                        >
                          {getStatusLabel(reservation.status, t)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rezervasyon dağılımı</CardTitle>
          <CardDescription>Anlık operasyon durumu</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            ["PENDING", "Onay bekleyen", Clock3, "bg-amber-500"],
            ["CONFIRMED", "Onaylanan", CircleCheckBig, "bg-blue-500"],
            ["COMPLETED", "Tamamlanan", CircleCheckBig, "bg-emerald-500"],
            ["CANCELLED", "İptal edilen", CircleX, "bg-rose-500"],
          ].map(([status, label, Icon, color]) => {
            const count = reservationStatusCounts[status] || 0;
            const percent = totalReservations
              ? Math.round((count / totalReservations) * 100)
              : 0;
            return (
              <div key={status}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><Icon className="size-4 text-muted-foreground" />{label}</span>
                  <strong>{count} <span className="font-normal text-muted-foreground">· %{percent}</span></strong>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-2 gap-3 border-t pt-4 text-center">
            <div className="rounded-lg bg-emerald-50 p-3">
              <strong className="block text-xl text-emerald-700">{completedReservationCount}</strong>
              <span className="text-xs text-emerald-700">Tamamlanan</span>
            </div>
            <div className="rounded-lg bg-rose-50 p-3">
              <strong className="block text-xl text-rose-700">{cancelledReservationCount}</strong>
              <span className="text-xs text-rose-700">İptal</span>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </section>
  );
}

export default DashboardPage;
