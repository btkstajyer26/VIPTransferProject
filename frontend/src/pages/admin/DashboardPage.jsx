import {
  CalendarDays,
  Car,
  Megaphone,
  TrendingUp,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

const stats = [
  {
    title: "Toplam Kullanıcı",
    value: "154",
    description: "Sisteme kayıtlı kullanıcı",
    change: "+12%",
    icon: Users,
  },
  {
    title: "Toplam Rezervasyon",
    value: "328",
    description: "Tüm rezervasyonlar",
    change: "+8%",
    icon: CalendarDays,
  },
  {
    title: "Aktif Araç",
    value: "26",
    description: "Kullanıma hazır araç",
    change: "+3",
    icon: Car,
  },
  {
    title: "Aktif Kampanya",
    value: "4",
    description: "Devam eden kampanya",
    change: "+1",
    icon: Megaphone,
  },
];

const reservations = [
  {
    id: 1,
    customer: "Ahmet Yılmaz",
    route: "Esenboğa Havalimanı → Kızılay",
    date: "15.07.2026 10:30",
    vehicle: "Mercedes Vito",
    status: "Bekliyor",
  },
  {
    id: 2,
    customer: "Elif Demir",
    route: "Çankaya → Esenboğa Havalimanı",
    date: "15.07.2026 12:15",
    vehicle: "BMW 5 Serisi",
    status: "Onaylandı",
  },
  {
    id: 3,
    customer: "Mehmet Kaya",
    route: "Keçiören → AŞTİ",
    date: "15.07.2026 14:00",
    vehicle: "Mercedes E Serisi",
    status: "Tamamlandı",
  },
];

function getStatusVariant(status) {
  if (status === "Tamamlandı") return "default";
  if (status === "Onaylandı") return "secondary";
  return "outline";
}

function DashboardPage() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sistemin genel durumunu buradan takip edebilirsiniz.
        </p>
      </div>

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
                <div className="text-3xl font-semibold">{stat.value}</div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>

                  <Badge variant="secondary" className="gap-1">
                    <TrendingUp className="size-3" />
                    {stat.change}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Son Rezervasyonlar</CardTitle>
          <CardDescription>
            En son oluşturulan rezervasyon kayıtları.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Güzergâh</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Araç</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {reservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="font-medium">
                      {reservation.customer}
                    </TableCell>
                    <TableCell>{reservation.route}</TableCell>
                    <TableCell>{reservation.date}</TableCell>
                    <TableCell>{reservation.vehicle}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(reservation.status)}>
                        {reservation.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default DashboardPage;