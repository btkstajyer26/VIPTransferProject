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

import { useTranslation } from "react-i18next";
import { useState } from "react";
import { createNotification } from "@/api/notificationApi";

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

const CHANNEL_CLASS = {
  EMAIL: "bg-violet-100 text-violet-700",
  SMS: "bg-sky-100 text-sky-700",
  PUSH: "bg-orange-100 text-orange-700",
  WHATSAPP: "bg-emerald-100 text-emerald-700",
};

function formatDate(dateString, lng) {
  if (!dateString) return "—";

  return new Intl.DateTimeFormat(lng === "TR" ? "tr-TR" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateString));
}

function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [composerOpen, setComposerOpen] = useState(false);
  const [composer, setComposer] = useState({ userId: "", templateCode: "RESERVATION_STATUS_CHANGED", channel: "EMAIL", langCode: "tr", sendImmediately: true });
  const [composerBusy, setComposerBusy] = useState(false);

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
            {t("admin.notifications.title")}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {t("admin.notifications.subtitle")}
          </p>
        </div>

        <div className="flex gap-2"><Button onClick={() => setComposerOpen((x) => !x)}>Yeni bildirim</Button><Button
          variant="outline"
          size="sm"
          onClick={fetchNotifications}
          disabled={isLoading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          {t("admin.notifications.refresh")}
        </Button></div>
      </div>

      {composerOpen && <form onSubmit={async(e)=>{e.preventDefault();try{setComposerBusy(true);await createNotification({...composer,userId:Number(composer.userId),variables:{}});setComposerOpen(false);fetchNotifications();}finally{setComposerBusy(false);}}} className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:grid-cols-2 xl:grid-cols-5"><Input required type="number" value={composer.userId} onChange={e=>setComposer(x=>({...x,userId:e.target.value}))} placeholder="Kullanıcı ID"/><select value={composer.templateCode} onChange={e=>setComposer(x=>({...x,templateCode:e.target.value}))} className="h-9 rounded-lg border bg-white px-3 text-sm">{["RESERVATION_CREATED","RESERVATION_STATUS_CHANGED","RESERVATION_CANCELLED","RESERVATION_COMPLETED","LOYALTY_TIER_UPGRADED"].map(x=><option key={x}>{x}</option>)}</select><select value={composer.channel} onChange={e=>setComposer(x=>({...x,channel:e.target.value}))} className="h-9 rounded-lg border bg-white px-3 text-sm"><option>EMAIL</option><option>PUSH</option><option>WHATSAPP</option></select><select value={composer.langCode} onChange={e=>setComposer(x=>({...x,langCode:e.target.value}))} className="h-9 rounded-lg border bg-white px-3 text-sm"><option value="tr">TR</option><option value="en">EN</option></select><Button disabled={composerBusy} type="submit">Oluştur ve gönder</Button></form>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: t("admin.notifications.stats.pending"), status: "PENDING", color: "text-amber-600" },
          { label: t("admin.notifications.stats.sent"), status: "SENT", color: "text-blue-600" },
          { label: t("admin.notifications.stats.failed"), status: "FAILED", color: "text-red-600" },
          { label: t("admin.notifications.stats.total"), status: "ALL", color: "text-slate-700" },
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
          <AlertDescription>
            {error === "Network Error" || error === "Ağ Hatası" ? t("admin.errors.network") : error}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("admin.notifications.listTitle")}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {unreadCount} {t("admin.notifications.pendingActions")}
              </Badge>
            )}
          </CardTitle>

          <CardDescription>
            {t("admin.notifications.listDesc")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                placeholder={t("admin.notifications.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder={t("admin.notifications.statusFilter")} />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ALL">{t("admin.notifications.allStatuses")}</SelectItem>
                <SelectItem value="PENDING">{t("admin.notifications.statuses.PENDING")}</SelectItem>
                <SelectItem value="SENT">{t("admin.notifications.statuses.SENT")}</SelectItem>
                <SelectItem value="DELIVERED">{t("admin.notifications.statuses.DELIVERED")}</SelectItem>
                <SelectItem value="FAILED">{t("admin.notifications.statuses.FAILED")}</SelectItem>
                <SelectItem value="READ">{t("admin.notifications.statuses.READ")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder={t("admin.notifications.channelFilter")} />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ALL">{t("admin.notifications.allChannels")}</SelectItem>
                <SelectItem value="EMAIL">{t("admin.notifications.channels.EMAIL")}</SelectItem>
                <SelectItem value="PUSH">{t("admin.notifications.channels.PUSH")}</SelectItem>
                <SelectItem value="WHATSAPP">{t("admin.notifications.channels.WHATSAPP")}</SelectItem>
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
              <p className="text-sm">{t("admin.notifications.notFound")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">{t("admin.notifications.table.id")}</TableHead>
                    <TableHead>{t("admin.notifications.table.title")}</TableHead>
                    <TableHead>{t("admin.notifications.table.user")}</TableHead>
                    <TableHead>{t("admin.notifications.table.channel")}</TableHead>
                    <TableHead>{t("admin.notifications.table.status")}</TableHead>
                    <TableHead>{t("admin.notifications.table.createdAt")}</TableHead>
                    <TableHead>{t("admin.notifications.table.sentAt")}</TableHead>
                    <TableHead className="text-right">{t("admin.notifications.table.actions")}</TableHead>
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
                              {t("admin.notifications.table.error")} {n.failureReason}
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
                          {t(`admin.notifications.channels.${n.channel}`) || n.channel}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={STATUS_VARIANT[n.status] ?? "outline"}
                          className={STATUS_CLASS[n.status] ?? ""}
                        >
                          {t(`admin.notifications.statuses.${n.status}`) || n.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(n.createdAt, currentLang)}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(n.sentAt, currentLang)}
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
                              title={t("admin.notifications.table.send")}
                            >
                              {isSending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              {t("admin.notifications.table.send")}
                            </Button>
                          )}

                          {n.status !== "READ" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 px-2 text-xs"
                              onClick={() => markAsRead(n.id)}
                              title={t("admin.notifications.table.markAsRead")}
                            >
                              <CheckCheck className="h-3 w-3" />
                              {t("admin.notifications.table.read")}
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
