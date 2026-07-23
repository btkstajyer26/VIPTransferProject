import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import UserRoleBadge from "@/components/users/UserRoleBadge";
import UserStatusBadge from "@/components/users/UserStatusBadge";

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
      </DialogContent>
    </Dialog>
  );
}

export default UserDetailDialog;