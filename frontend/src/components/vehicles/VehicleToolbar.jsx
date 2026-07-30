import { Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function VehicleToolbar({
  search,
  onSearchChange,
  classFilter,
  onClassFilterChange,
  onCreate,
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("admin.vehiclesList.searchPlaceholder")}
            className="pl-9"
          />
        </div>

        <Select
          value={classFilter}
          onValueChange={onClassFilterChange}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t("admin.vehiclesList.classFilter")} />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="ALL">{t("admin.vehiclesList.allClasses")}</SelectItem>
            <SelectItem value="ECONOMY">Economy</SelectItem>
            <SelectItem value="STANDARD">Standard</SelectItem>
            <SelectItem value="BUSINESS">Business</SelectItem>
            <SelectItem value="VIP">VIP</SelectItem>
            <SelectItem value="LUXURY">Luxury</SelectItem>
            <SelectItem value="MINIVAN">Minivan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={onCreate}>
        <Plus className="size-4" />
        Yeni Araç Ekle
      </Button>
    </div>
  );
}

export default VehicleToolbar;