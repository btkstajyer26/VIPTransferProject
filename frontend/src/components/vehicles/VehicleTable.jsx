import {
  Edit,
  Power,
  Eye,
  PowerOff,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import VehicleStatusBadge from "./VehicleStatusBadge";




function VehicleTable({
  vehicles,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewPhoto,
}) {
  if (vehicles.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed text-center">
        <p className="font-medium">Araç bulunamadı</p>

        <p className="mt-1 text-sm text-muted-foreground">
          Arama veya filtre kriterlerini değiştirmeyi deneyin.
        </p>
      </div>
    );
  }

  const formatPrice = (price) => {
    const numericPrice = Number(price);

    if (Number.isNaN(numericPrice)) {
      return "-";
    }

    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(numericPrice);
  };

  const formatMultiplier = (multiplier) => {
    const numericMultiplier = Number(multiplier);

    if (Number.isNaN(numericMultiplier)) {
      return "-";
    }

    return `${numericMultiplier.toFixed(2)}x`;
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plaka</TableHead>
            <TableHead>Araç</TableHead>
            <TableHead>Yıl / Renk</TableHead>
            <TableHead>Kapasite</TableHead>
            <TableHead>Sınıf</TableHead>
            <TableHead>Açılış fiyatı</TableHead>
            <TableHead>Katsayı</TableHead>
            <TableHead>Fotoğraf</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead className="text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {vehicles.map((vehicle) => (
            <TableRow key={vehicle.id}>
              <TableCell className="whitespace-nowrap font-medium">
                {vehicle.plateNumber}
              </TableCell>

              <TableCell>
                <div className="min-w-36">
                  <p className="font-medium">
                    {vehicle.brand || "-"}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {vehicle.model || "-"}
                  </p>
                </div>
              </TableCell>

              <TableCell>
                <div className="min-w-24">
                  <p>{vehicle.year || "-"}</p>

                  <p className="text-sm text-muted-foreground">
                    {vehicle.color || "-"}
                  </p>
                </div>
              </TableCell>

              <TableCell>
                {vehicle.capacity
                  ? `${vehicle.capacity} kişi`
                  : "-"}
              </TableCell>

              <TableCell>{vehicle.vehicleClass}</TableCell>

              <TableCell className="whitespace-nowrap">
                {formatPrice(vehicle.openingPrice)}
              </TableCell>

              <TableCell>
                {formatMultiplier(vehicle.basePriceMultiplier)}
              </TableCell>

              <TableCell>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!vehicle.photoUrl?.trim()}
                  onClick={() => onViewPhoto(vehicle)}
                >
                  <Eye className="mr-2 size-4" />
                  Gör
                </Button>
              </TableCell>
              
              <TableCell>
                <VehicleStatusBadge active={vehicle.active} />
              </TableCell>

              <TableCell>
                <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                title={vehicle.active ? "Pasife al" : "Aktif yap"}
                aria-label={
                  vehicle.active
                    ? "Aracı pasife al"
                    : "Aracı aktif yap"
                }
                onClick={() => onToggleStatus(vehicle)}
              >
                {vehicle.active ? (
                  <PowerOff className="size-4" />
                ) : (
                  <Power className="size-4" />
                )}
              </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Düzenle"
                    aria-label="Aracı düzenle"
                    onClick={() => onEdit(vehicle)}
                  >
                    <Edit className="size-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    title="Sil"
                    aria-label="Aracı sil"
                    onClick={() => onDelete(vehicle)}
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

export default VehicleTable;