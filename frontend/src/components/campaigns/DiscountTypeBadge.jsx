import { formatDiscount } from "@/utils/campaignUtils";

export default function DiscountTypeBadge({
  campaign,
}) {
  const isPercentage =
    campaign.discountType === "PERCENTAGE";

  return (
    <div>
      <span className="inline-flex rounded-lg bg-violet-500/10 px-2.5 py-1 text-sm font-semibold text-violet-300 ring-1 ring-violet-400/20">
        {formatDiscount(campaign)}
      </span>

      <p className="mt-1 text-xs text-slate-500">
        {isPercentage
          ? "Yüzdesel indirim"
          : "Sabit tutar"}
      </p>
    </div>
  );
}