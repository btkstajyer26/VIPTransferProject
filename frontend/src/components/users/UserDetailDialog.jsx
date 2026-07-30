import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import UserRoleBadge from "@/components/users/UserRoleBadge";
import UserStatusBadge from "@/components/users/UserStatusBadge";
import { Button } from "@/components/ui/button";
import { KeyRound, ShieldAlert } from "lucide-react";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 font-medium">
        {value || "-"}
      </p>
    </div>
  );
}

function UserDetailDialog({
  user,
  open,
  onOpenChange,
  onPasswordReset,
  resettingPassword,
  passwordFeedback,
}) {
  if (!user) {
    return null;
  }

  const fullName =
    `${user.firstName} ${user.lastName}`.trim() ||
    "İsimsiz kullanıcı";

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Kullanıcı Detayları</DialogTitle>

          <DialogDescription>
            Kullanıcı hesabına ait sistem bilgileri.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailItem
            label="Kullanıcı ID"
            value={`#${user.id}`}
          />

          <DetailItem
            label="Ad soyad"
            value={fullName}
          />

          <DetailItem
            label="Telefon"
            value={user.phoneNumber}
          />

          <DetailItem
            label="E-posta"
            value={user.email}
          />

          <DetailItem
            label="Dil"
            value={user.preferredLang}
          />

          <DetailItem
            label="Kullanıcı türü"
            value={user.guest ? "Misafir" : "Kayıtlı üye"}
          />

          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">
              Rol
            </p>

            <div className="mt-2">
              <UserRoleBadge role={user.role} />
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">
              Durum
            </p>

            <div className="mt-2">
              <UserStatusBadge active={user.active} />
            </div>
          </div>

          <DetailItem
            label="Kayıt tarihi"
            value={formatDate(user.createdAt)}
          />
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Üyelik yönetimi</p>
              <p className="mt-1 text-xs leading-5 text-amber-800">
                Mevcut backend başka bir kullanıcının adını, rolünü veya üyelik tipini düzenleme endpointi sunmuyor.
                Hesap görüntülenebilir, pasife alınabilir veya kullanıcıya güvenli şifre sıfırlama kodu gönderilebilir.
              </p>
            </div>
          </div>
        </div>

        {passwordFeedback && (
          <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
            {passwordFeedback}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={!user.email || resettingPassword}
            onClick={() => onPasswordReset(user)}
          >
            <KeyRound className="mr-2 size-4" />
            {resettingPassword ? "Gönderiliyor..." : "Şifre sıfırlama kodu gönder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UserDetailDialog;
