import { Badge } from "@/components/ui/badge";

function VehicleStatusBadge({ active }) {
  return (
    <Badge variant={active ? "default" : "secondary"}>
      {active ? "Aktif" : "Pasif"}
    </Badge>
  );
}

export default VehicleStatusBadge;