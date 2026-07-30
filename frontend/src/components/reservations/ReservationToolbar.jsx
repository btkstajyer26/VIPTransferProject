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

function ReservationToolbar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('admin.reservationList.toolbar.searchPlaceholder')}
          className="pl-9"
        />
      </div>

      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full md:w-52">
          <SelectValue placeholder={t('admin.reservationList.toolbar.selectStatus')} />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="ALL">{t('admin.reservationList.toolbar.allStatuses')}</SelectItem>
          <SelectItem value="PENDING">{t('admin.reservationList.status.PENDING')}</SelectItem>
          <SelectItem value="ASSIGNED">{t('admin.reservationList.status.ASSIGNED')}</SelectItem>
          <SelectItem value="COMPLETED">{t('admin.reservationList.status.COMPLETED')}</SelectItem>
          <SelectItem value="CANCELLED">{t('admin.reservationList.status.CANCELLED')}</SelectItem>
          <SelectItem value="NO_SHOW">{t('admin.reservationList.status.NO_SHOW')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default ReservationToolbar;