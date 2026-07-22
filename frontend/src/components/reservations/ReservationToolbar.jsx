import { Search } from "lucide-react";

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
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Rezervasyon kodu, adres, araç veya telefon ara..."
          className="pl-9"
        />
      </div>

      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full md:w-52">
          <SelectValue placeholder="Durum seç" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="ALL">Tüm Durumlar</SelectItem>
          <SelectItem value="PENDING">Bekliyor</SelectItem>
          <SelectItem value="ASSIGNED">Araç Atandı</SelectItem>
          <SelectItem value="COMPLETED">Tamamlandı</SelectItem>
          <SelectItem value="CANCELLED">İptal Edildi</SelectItem>
          <SelectItem value="NO_SHOW">Gelmedi</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default ReservationToolbar;