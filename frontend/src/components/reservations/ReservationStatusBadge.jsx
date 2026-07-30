import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

const statusConfig = {
  PENDING: {
    labelKey: "admin.reservationList.status.PENDING",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50",
  },

  ASSIGNED: {
    labelKey: "admin.reservationList.status.ASSIGNED",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50",
  },

  COMPLETED: {
    labelKey: "admin.reservationList.status.COMPLETED",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  },

  CANCELLED: {
    labelKey: "admin.reservationList.status.CANCELLED",
    className:
      "border-red-200 bg-red-50 text-red-700 hover:bg-red-50",
  },

  NO_SHOW: {
    labelKey: "admin.reservationList.status.NO_SHOW",
    className:
      "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100",
  },
};

function ReservationStatusBadge({ status }) {
  const { t } = useTranslation();

  const config = statusConfig[status] ?? {
    labelKey: null,
    className:
      "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-50",
  };

  const label = config.labelKey 
    ? t(config.labelKey) 
    : (status || t('admin.reservationList.status.unknown'));

  return (
    <Badge variant="outline" className={config.className}>
      {label}
    </Badge>
  );
}

export default ReservationStatusBadge;