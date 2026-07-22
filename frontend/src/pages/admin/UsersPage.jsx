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

function UsersPage() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

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
    setDetailOpen(true);
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
            Kullanıcılar
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Sisteme kayıtlı aktif kullanıcıları yönetin.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={fetchUsers}
        >
          <RefreshCw
            className={`mr-2 size-4 ${
              loading ? "animate-spin" : ""
            }`}
          />

          Yenile
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />

          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Kullanıcı Listesi</CardTitle>

              <CardDescription>
                Sistemde toplam {totalUsers} aktif kullanıcı
                bulunmaktadır.
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
                Kullanıcılar yükleniyor...
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
      />
    </section>
  );
}

export default UsersPage;