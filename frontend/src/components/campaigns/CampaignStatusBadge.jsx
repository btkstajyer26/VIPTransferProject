import { getCampaignStatus } from "@/utils/campaignUtils";

const STATUS_CLASSES = {
  active:
    "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
  inactive:
    "bg-slate-500/10 text-slate-300 ring-slate-400/20",
  scheduled:
    "bg-blue-500/10 text-blue-300 ring-blue-400/20",
  expired:
    "bg-amber-500/10 text-amber-300 ring-amber-400/20",
  "limit-reached":
    "bg-orange-500/10 text-orange-300 ring-orange-400/20",
};

export default function CampaignStatusBadge({
  campaign,
}) {
  const status = getCampaignStatus(campaign);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        STATUS_CLASSES[status.key] ??
        STATUS_CLASSES.inactive
      }`}
    >
      {status.label}
    </span>
  );
}