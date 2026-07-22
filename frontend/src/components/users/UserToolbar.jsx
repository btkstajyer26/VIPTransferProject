import { Search } from "lucide-react";

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
  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={searchTerm}
          placeholder="Ad, e-posta veya telefon ara..."
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
          <SelectValue placeholder="Rol" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="ALL">Tüm roller</SelectItem>
          <SelectItem value="ADMIN">Admin</SelectItem>
          <SelectItem value="CUSTOMER">Müşteri</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={typeFilter}
        onValueChange={onTypeFilterChange}
      >
        <SelectTrigger className="w-full lg:w-48">
          <SelectValue placeholder="Kullanıcı türü" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="ALL">
            Tüm kullanıcılar
          </SelectItem>

          <SelectItem value="MEMBER">
            Kayıtlı üyeler
          </SelectItem>

          <SelectItem value="GUEST">
            Misafir kullanıcılar
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default UserToolbar;