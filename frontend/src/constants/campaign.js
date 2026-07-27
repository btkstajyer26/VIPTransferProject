export const DISCOUNT_TYPES = [
  {
    value: "PERCENTAGE",
    label: "Yüzdesel indirim (%)",
  },
  {
    value: "FIXED_AMOUNT",
    label: "Sabit tutar (₺)",
  },
];

export const EMPTY_CAMPAIGN_FORM = {
  code: "",
  name: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  maxDiscountAmount: "",
  minOrderAmount: "0",
  maxUses: "",
  maxUsesPerUser: "1",
  validFrom: "",
  validTo: "",
  createdById: null,
};