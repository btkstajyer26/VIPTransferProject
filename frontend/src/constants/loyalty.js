export const LOYALTY_TIER_LABELS = {
  BRONZE: "Bronz",
  SILVER: "Gümüş",
  GOLD: "Altın",
  PLATINUM: "Platin",
  VIP: "VIP",
};

export function getLoyaltyTierLabel(tier) {
  return LOYALTY_TIER_LABELS[tier] ?? tier ?? "Bilinmiyor";
}