import {
  AlertCircle,
  Bell,
  CheckCheck,
  Loader2,
  RefreshCw,
  Search,
  Send,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useNotifications from "@/hooks/useNotifications";

const STATUS_LABEL = {
  PENDING: "Bekliyor",
  SENT: "Gönderildi",
  DELIVERED: "İletildi",
  FAILED: "Başarısız",
  READ: "Okundu",
};

const STATUS_VARIANT = {
  PENDING: "outline",
  SENT: "secondary",
  DELIVERED: "default",
  FAILED: "destructive",
  READ: "outline",
};

const STATUS_CLASS = {
  PENDING: "border-amber-300 text-amber-700",
  SENT: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-green-100 text-green-700",
  FAILED: "",
  READ: "text-slate-400",
};

const CHANNEL_LABEL = {
  EMAIL: "E-posta",
  SMS: "SMS",
  PUSH: "Push",
  WHATSAPP: "WhatsApp",
};

const CHANNEL_CLASS = {
  EMAIL: "bg-violet-100 text-violet-700",
  SMS: "bg-sky-100 text-sky-700",
  PUSH: "bg-orange-100 text-orange-700",
  WHATSAPP: "bg-emerald-100 text-emerald-700",
};

function formatDate(dateString) {
  if (!dateString) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateString));
}

function NotificationsPage() {
  const {
    filteredNotifications,
    isLoading,
    isSending,
    error,
    unreadCount,

    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    channelFilter,
    setChannelFilter,

    fetchNotifications,
    markAsRead,
    sendNotification,
  } = useNotifications();

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">
            Bildirimler
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Sistemdeki tüm bildirimleri görüntüleyin ve yönetin.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchNotifications}
          disabled={isLoading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Yenile
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Bekleyen", status: "PENDING", color: "text-amber-600" },
          { label: "Gönderilen", status: "SENT", color: "text-blue-600" },
          { label: "Başarısız", status: "FAILED", color: "text-red-600" },
          { label: "Toplam", status: "ALL", color: "text-slate-700" },
        ].map(({ label, status, color }) => (
          <Card key={status} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(status)}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>
                {status === "ALL"
                  ? filteredNotifications.length
                  : filteredNotifications.filter((n) => n.status === status).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Bildirim Listesi
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {unreadCount} işlem bekliyor
              </Badge>
            )}
          </CardTitle>

          <CardDescription>
            Tüm kanallardaki bildirimler listelenmektedir.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                placeholder="Başlık, mesaj veya kullanıcı ID ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ALL">Tüm Durumlar</SelectItem>
                <SelectItem value="PENDING">Bekliyor</SelectItem>
                <SelectItem value="SENT">Gönderildi</SelectItem>
                <SelectItem value="DELIVERED">İletildi</SelectItem>
                <SelectItem value="FAILED">Başarısız</SelectItem>
                <SelectItem value="READ">Okundu</SelectItem>
              </SelectContent>
            </Select>

            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Kanal" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ALL">Tüm Kanallar</SelectItem>
                <SelectItem value="EMAIL">E-posta</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="PUSH">Push</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <Bell className="h-8 w-8 opacity-40" />
              <p className="text-sm">Bildirim bulunamadı.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">ID</TableHead>
                    <TableHead>Başlık</TableHead>
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead>Kanal</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Oluşturulma</TableHead>
                    <TableHead>Gönderilme</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredNotifications.map((n) => (
                    <TableRow
                      key={n.id}
                      className={n.status === "READ" ? "opacity-60" : ""}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {n.id}
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {n.title || "—"}
                          </p>

                          {n.message && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {n.message}
                            </p>
                          )}

                          {n.failureReason && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-red-500">
                              Hata: {n.failureReason}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-sm">
                        {n.userId ? `#${n.userId}` : "—"}
                      </TableCell>

                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CHANNEL_CLASS[n.channel] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {CHANNEL_LABEL[n.channel] ?? n.channel}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={STATUS_VARIANT[n.status] ?? "outline"}
                          className={STATUS_CLASS[n.status] ?? ""}
                        >
                          {STATUS_LABEL[n.status] ?? n.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(n.createdAt)}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(n.sentAt)}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {n.status === "PENDING" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 px-2 text-xs"
                              disabled={isSending}
                              onClick={() => sendNotification(n.id)}
                              title="Gönder"
                            >
                              {isSending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              Gönder
                            </Button>
                          )}

                          {n.status !== "READ" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 px-2 text-xs"
                              onClick={() => markAsRead(n.id)}
                              title="Okundu işaretle"
                            >
                              <CheckCheck className="h-3 w-3" />
                              Okundu
                            </Button>
                          )}
                        </div>
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

export default NotificationsPage;
