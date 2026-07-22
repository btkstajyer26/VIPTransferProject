import { Badge } from "@/components/ui/badge";

function UserRoleBadge({ role }) {
  const label = role === "ADMIN" ? "Admin" : "Müşteri";

  return (
    <Badge variant={role === "ADMIN" ? "default" : "outline"}>
      {label}
    </Badge>
  );
}

export default UserRoleBadge;