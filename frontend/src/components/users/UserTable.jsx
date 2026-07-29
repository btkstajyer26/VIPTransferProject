import {
  Eye,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

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

function formatDate(value, lng) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(lng === "TR" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getFullName(user, t) {
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return fullName || t("admin.usersList.table.unnamed");
}

function UserTable({
  users,
  deletingUserId,
  onView,
  onDelete,
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  if (!users.length) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">
          {t("admin.usersList.notFound")}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("admin.usersList.table.user")}</TableHead>
            <TableHead>{t("admin.usersList.table.phone")}</TableHead>
            <TableHead>{t("admin.usersList.table.role")}</TableHead>
            <TableHead>{t("admin.usersList.table.type")}</TableHead>
            <TableHead>{t("admin.usersList.table.status")}</TableHead>
            <TableHead>{t("admin.usersList.table.registeredAt")}</TableHead>
            <TableHead className="text-right">
              {t("admin.usersList.table.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div>
                  <p className="font-medium">
                    {getFullName(user, t)}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {user.email || t("admin.usersList.table.noEmail")}
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
                {user.guest ? t("admin.usersList.table.guest") : t("admin.usersList.table.member")}
              </TableCell>

              <TableCell>
                <UserStatusBadge active={user.active} />
              </TableCell>

              <TableCell>
                {formatDate(user.createdAt, currentLang)}
              </TableCell>

              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    title={t("admin.reservationList.table.viewDetails")}
                    onClick={() => onView(user)}
                  >
                    <Eye className="size-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
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