import { Badge } from "@/components/ui/badge";

function UserStatusBadge({ active }) {
  return (
    <Badge variant={active ? "default" : "secondary"}>
      {active ? "Aktif" : "Pasif"}
    </Badge>
  );
}

export default UserStatusBadge;