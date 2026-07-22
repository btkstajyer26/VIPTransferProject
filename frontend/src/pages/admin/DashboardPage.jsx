import {
  AlertCircle,
  CalendarDays,
  Car,
  Clock3,
  RefreshCw,
  Users,
} from "lucide-react";

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

const STATUS_LABELS = {
  PENDING: "Bekliyor",
  CONFIRMED: "Onaylandı",
  DRIVER_ASSIGNED: "Sürücü Atandı",
  ON_THE_WAY: "Yolda",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
};

function getStatusLabel(status) {
  return STATUS_LABELS[status] ?? status ?? "Bilinmiyor";
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

function formatPrice(value, currency = "TRY") {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "-";
  }

  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency || "TRY",
    }).format(numericValue);
  } catch {
    return `${numericValue.toLocaleString("tr-TR")} ${
      currency || ""
    }`;
  }
}

function getCustomerLabel(reservation) {
  if (reservation.guestPhone) {
    return reservation.guestPhone;
  }

  if (reservation.userId) {
    return `Kullanıcı #${reservation.userId}`;
  }

  return "Misafir kullanıcı";
}

function DashboardPage() {
  const {
    totalUsers,
    totalReservations,
    activeVehicleCount,
    pendingReservationCount,
    latestReservations,

    isLoading,
    error,

    fetchDashboard,
  } = useDashboard();

  const stats = [
    {
      title: "Toplam Kullanıcı",
      value: totalUsers,
      description: "Sistemdeki aktif kullanıcılar",
      icon: Users,
    },
    {
      title: "Toplam Rezervasyon",
      value: totalReservations,
      description: "Tüm rezervasyon kayıtları",
      icon: CalendarDays,
    },
    {
      title: "Aktif Araç",
      value: activeVehicleCount,
      description: "Kullanıma hazır araçlar",
      icon: Car,
    },
    {
      title: "Bekleyen Rezervasyon",
      value: pendingReservationCount,
      description: "Onay bekleyen rezervasyonlar",
      icon: Clock3,
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">
            Dashboard
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Sistemin genel durumunu ve son rezervasyonları takip
            edin.
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

          Yenile
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

      <Card>
        <CardHeader>
          <CardTitle>Son Rezervasyonlar</CardTitle>

          <CardDescription>
            En son oluşturulan 5 rezervasyon kaydı.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex min-h-56 items-center justify-center">
              <RefreshCw className="mr-2 size-5 animate-spin" />

              <span className="text-sm text-muted-foreground">
                Dashboard verileri yükleniyor...
              </span>
            </div>
          ) : latestReservations.length === 0 ? (
            <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">
                Henüz rezervasyon kaydı bulunmuyor.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referans</TableHead>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Güzergâh</TableHead>
                    <TableHead>Planlanan Tarih</TableHead>
                    <TableHead>Araç</TableHead>
                    <TableHead>Tutar</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {latestReservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-medium">
                        {reservation.bookingReference || `#${reservation.id}`}
                      </TableCell>

                      <TableCell>
                        {getCustomerLabel(reservation)}
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
                          {getStatusLabel(reservation.status)}
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
    </section>
  );
}

export default DashboardPage;