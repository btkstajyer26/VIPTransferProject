import {
  Eye,
  Trash2,
} from "lucide-react";

import UserRoleBadge from "@/components/users/UserRoleBadge";
import UserStatusBadge from "@/components/users/UserStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getFullName(user) {
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return fullName || "İsimsiz kullanıcı";
}

function UserTable({
  users,
  deletingUserId,
  onView,
  onDelete,
}) {
  if (!users.length) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">
          Filtrelere uygun kullanıcı bulunamadı.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kullanıcı</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Tür</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Kayıt tarihi</TableHead>
            <TableHead className="text-right">
              İşlemler
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div>
                  <p className="font-medium">
                    {getFullName(user)}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {user.email || "E-posta bulunmuyor"}
                  </p>
                </div>
              </TableCell>

              <TableCell>
                {user.phoneNumber || "-"}
              </TableCell>

              <TableCell>
                <UserRoleBadge role={user.role} />
              </TableCell>

              <TableCell>
                {user.guest ? "Misafir" : "Üye"}
              </TableCell>

              <TableCell>
                <UserStatusBadge active={user.active} />
              </TableCell>

              <TableCell>
                {formatDate(user.createdAt)}
              </TableCell>

              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    title="Detayları görüntüle"
                    onClick={() => onView(user)}
                  >
                    <Eye className="size-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    title="Kullanıcıyı pasife al"
                    disabled={
                      deletingUserId === user.id ||
                      user.role === "ADMIN"
                    }
                    onClick={() => onDelete(user)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default UserTable;