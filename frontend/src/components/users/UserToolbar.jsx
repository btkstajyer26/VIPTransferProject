import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function UserToolbar({
  searchTerm,
  roleFilter,
  typeFilter,
  onSearchChange,
  onRoleFilterChange,
  onTypeFilterChange,
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={searchTerm}
          placeholder={t("admin.usersList.searchPlaceholder")}
          className="pl-9"
          onChange={(event) =>
            onSearchChange(event.target.value)
          }
        />
      </div>

      <Select
        value={roleFilter}
        onValueChange={onRoleFilterChange}
      >
        <SelectTrigger className="w-full lg:w-48">
          <SelectValue placeholder={t("admin.usersList.roleFilter")} />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="ALL">{t("admin.usersList.allRoles")}</SelectItem>
          <SelectItem value="ADMIN">{t("admin.usersList.roles.ADMIN")}</SelectItem>
          <SelectItem value="CUSTOMER">{t("admin.usersList.roles.CUSTOMER")}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={typeFilter}
        onValueChange={onTypeFilterChange}
      >
        <SelectTrigger className="w-full lg:w-48">
          <SelectValue placeholder={t("admin.usersList.typeFilter")} />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="ALL">
            {t("admin.usersList.allTypes")}
          </SelectItem>

          <SelectItem value="MEMBER">
            {t("admin.usersList.types.MEMBER")}
          </SelectItem>

          <SelectItem value="GUEST">
            {t("admin.usersList.types.GUEST")}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default UserToolbar;