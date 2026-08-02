import { useState } from "react";
import {
  AlertCircle,
  RefreshCw,
  Users,
} from "lucide-react";

import UserDetailDialog from "@/components/users/UserDetailDialog";
import UserTable from "@/components/users/UserTable";
import UserToolbar from "@/components/users/UserToolbar";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import useUsers from "@/hooks/useUsers";
import { useTranslation } from "react-i18next";
import { forgotPassword } from "@/api/authApi";
import ExportButtons from "@/components/admin/ExportButtons";

const userExportColumns = [
  { label: "ID", value: (u) => u.id, width: 8 },
  { label: "Ad Soyad", value: (u) => `${u.firstName || ""} ${u.lastName || ""}`.trim(), width: 24 },
  { label: "E-posta", value: (u) => u.email || "-", width: 30 },
  { label: "Telefon", value: (u) => u.phoneNumber || "-", width: 18 },
  { label: "Rol", value: (u) => u.role, width: 14 },
  { label: "Tür", value: (u) => u.guest ? "Misafir" : "Üye", width: 12 },
  { label: "Durum", value: (u) => u.active === false ? "Pasif" : "Aktif", width: 12 },
];

function UsersPage() {
  const { t } = useTranslation();
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState("");

  const {
    users,
    totalUsers,

    searchTerm,
    roleFilter,
    typeFilter,

    loading,
    deletingUserId,
    error,

    setSearchTerm,
    setRoleFilter,
    setTypeFilter,

    fetchUsers,
    removeUser,
  } = useUsers();

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setPasswordFeedback("");
    setDetailOpen(true);
  };

  const handlePasswordReset = async (user) => {
    if (!user?.email) {
      setPasswordFeedback("Bu kullanıcının kayıtlı e-posta adresi bulunmuyor.");
      return;
    }
    if (!window.confirm(`${user.email} adresine şifre sıfırlama kodu gönderilsin mi?`)) {
      return;
    }
    try {
      setResettingPassword(true);
      setPasswordFeedback("");
      await forgotPassword(user.email);
      setPasswordFeedback("Şifre sıfırlama kodu kullanıcının e-posta adresine gönderildi.");
    } catch (requestError) {
      setPasswordFeedback(
        requestError.response?.data?.message ||
          "Şifre sıfırlama kodu gönderilemedi.",
      );
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const fullName =
      `${user.firstName} ${user.lastName}`.trim() ||
      `#${user.id}`;

    const confirmed = window.confirm(
      `${fullName} kullanıcısını pasife almak istediğinize emin misiniz?`,
    );

    if (!confirmed) {
      return;
    }

    await removeUser(user);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">
            {t('admin.users.title')}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {t('admin.users.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ExportButtons title="Kullanıcılar" columns={userExportColumns} rows={users} />
          <Button type="button" variant="outline" disabled={loading} onClick={fetchUsers}>
          <RefreshCw
            className={`mr-2 size-4 ${
              loading ? "animate-spin" : ""
            }`}
          />

          {t('admin.users.refresh')}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />

          <AlertDescription>
            {error === "Network Error" || error === "Ağ Hatası" ? t("admin.errors.network") : error}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{t('admin.users.listTitle')}</CardTitle>

              <CardDescription>
                {t('admin.users.listDesc', { count: totalUsers })}
              </CardDescription>
            </div>

            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <UserToolbar
            searchTerm={searchTerm}
            roleFilter={roleFilter}
            typeFilter={typeFilter}
            onSearchChange={setSearchTerm}
            onRoleFilterChange={setRoleFilter}
            onTypeFilterChange={setTypeFilter}
          />

          {loading ? (
            <div className="flex min-h-56 items-center justify-center">
              <RefreshCw className="mr-2 size-5 animate-spin" />

              <span className="text-sm">
                {t('admin.users.loading')}
              </span>
            </div>
          ) : (
            <UserTable
              users={users}
              deletingUserId={deletingUserId}
              onView={handleViewUser}
              onDelete={handleDeleteUser}
            />
          )}
        </CardContent>
      </Card>

      <UserDetailDialog
        user={selectedUser}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onPasswordReset={handlePasswordReset}
        resettingPassword={resettingPassword}
        passwordFeedback={passwordFeedback}
      />
    </section>
  );
}

export default UsersPage;
