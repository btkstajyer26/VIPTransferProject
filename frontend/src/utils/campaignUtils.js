export function getApiErrorMessage(
  error,
  fallbackMessage = "Beklenmeyen bir hata oluştu.",
) {
  const responseData = error?.response?.data;

  if (typeof responseData === "string") {
    return responseData;
  }

  if (responseData?.message) {
    return responseData.message;
  }

  if (responseData?.error) {
    return responseData.error;
  }

  if (error?.message) {
    return error.message;
  }

  return fallbackMessage;
}

function toNullableNumber(value) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isNaN(parsedValue)
    ? null
    : parsedValue;
}

function toNullableInteger(value) {
  const parsedValue = toNullableNumber(value);

  if (parsedValue === null) {
    return null;
  }

  return Math.trunc(parsedValue);
}

function toApiDateTime(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function toDateTimeLocal(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffset =
    date.getTimezoneOffset() * 60_000;

  const localDate = new Date(
    date.getTime() - timezoneOffset,
  );

  return localDate.toISOString().slice(0, 16);
}

export function prepareCampaignPayload(form) {
  return {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    description:
      form.description?.trim() || null,

    discountType: form.discountType,

    discountValue: toNullableNumber(
      form.discountValue,
    ),

    maxDiscountAmount: toNullableNumber(
      form.maxDiscountAmount,
    ),

    minOrderAmount:
      toNullableNumber(form.minOrderAmount) ?? 0,

    maxUses: toNullableInteger(
      form.maxUses,
    ),

    maxUsesPerUser:
      toNullableInteger(form.maxUsesPerUser) ?? 1,

    validFrom: toApiDateTime(
      form.validFrom,
    ),

    validTo: toApiDateTime(
      form.validTo,
    ),

    createdById: toNullableInteger(
      form.createdById,
    ),
  };
}

export function validateCampaignForm(form) {
  const errors = {};

  const code = form.code?.trim() ?? "";
  const name = form.name?.trim() ?? "";
  const description =
    form.description?.trim() ?? "";

  if (!code) {
    errors.code =
      "Kampanya kodu zorunludur.";
  } else if (code.length > 50) {
    errors.code =
      "Kampanya kodu en fazla 50 karakter olabilir.";
  }

  if (!name) {
    errors.name =
      "Kampanya adı zorunludur.";
  } else if (name.length > 150) {
    errors.name =
      "Kampanya adı en fazla 150 karakter olabilir.";
  }

  if (description.length > 500) {
    errors.description =
      "Açıklama en fazla 500 karakter olabilir.";
  }

  if (!form.discountType) {
    errors.discountType =
      "İndirim türü zorunludur.";
  }

  const discountValue =
    toNullableNumber(form.discountValue);

  if (discountValue === null) {
    errors.discountValue =
      "İndirim değeri zorunludur.";
  } else if (discountValue < 0.01) {
    errors.discountValue =
      "İndirim değeri en az 0,01 olmalıdır.";
  } else if (
    form.discountType === "PERCENTAGE" &&
    discountValue > 100
  ) {
    errors.discountValue =
      "Yüzdesel indirim 100'den büyük olamaz.";
  }

  const maxDiscountAmount =
    toNullableNumber(
      form.maxDiscountAmount,
    );

  if (
    maxDiscountAmount !== null &&
    maxDiscountAmount < 0
  ) {
    errors.maxDiscountAmount =
      "Maksimum indirim tutarı negatif olamaz.";
  }

  const minOrderAmount =
    toNullableNumber(
      form.minOrderAmount,
    );

  if (
    minOrderAmount !== null &&
    minOrderAmount < 0
  ) {
    errors.minOrderAmount =
      "Minimum sipariş tutarı negatif olamaz.";
  }

  const maxUses =
    toNullableInteger(form.maxUses);

  if (
    maxUses !== null &&
    maxUses < 1
  ) {
    errors.maxUses =
      "Maksimum kullanım sayısı en az 1 olmalıdır.";
  }

  const maxUsesPerUser =
    toNullableInteger(
      form.maxUsesPerUser,
    );

  if (
    maxUsesPerUser !== null &&
    maxUsesPerUser < 1
  ) {
    errors.maxUsesPerUser =
      "Kullanıcı başına kullanım sayısı en az 1 olmalıdır.";
  }

  if (
    maxUses !== null &&
    maxUsesPerUser !== null &&
    maxUsesPerUser > maxUses
  ) {
    errors.maxUsesPerUser =
      "Kullanıcı başına kullanım, toplam kullanım limitini aşamaz.";
  }

  if (!form.validFrom) {
    errors.validFrom =
      "Başlangıç tarihi zorunludur.";
  }

  if (!form.validTo) {
    errors.validTo =
      "Bitiş tarihi zorunludur.";
  }

  if (
    form.validFrom &&
    form.validTo
  ) {
    const validFrom =
      new Date(form.validFrom);

    const validTo =
      new Date(form.validTo);

    if (
      Number.isNaN(validFrom.getTime())
    ) {
      errors.validFrom =
        "Başlangıç tarihi geçersiz.";
    }

    if (
      Number.isNaN(validTo.getTime())
    ) {
      errors.validTo =
        "Bitiş tarihi geçersiz.";
    }

    if (
      !Number.isNaN(validFrom.getTime()) &&
      !Number.isNaN(validTo.getTime()) &&
      validTo <= validFrom
    ) {
      errors.validTo =
        "Bitiş tarihi başlangıç tarihinden sonra olmalıdır.";
    }
  }

  return errors;
}

export function campaignToForm(campaign) {
  return {
    code: campaign.code ?? "",
    name: campaign.name ?? "",
    description:
      campaign.description ?? "",

    discountType:
      campaign.discountType ??
      "PERCENTAGE",

    discountValue:
      campaign.discountValue?.toString() ??
      "",

    maxDiscountAmount:
      campaign.maxDiscountAmount?.toString() ??
      "",

    minOrderAmount:
      campaign.minOrderAmount?.toString() ??
      "0",

    maxUses:
      campaign.maxUses?.toString() ??
      "",

    maxUsesPerUser:
      campaign.maxUsesPerUser?.toString() ??
      "1",

    validFrom: toDateTimeLocal(
      campaign.validFrom,
    ),

    validTo: toDateTimeLocal(
      campaign.validTo,
    ),

    createdById:
      campaign.createdById ?? null,
  };
}

export function formatCurrency(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "—";
  }

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

export function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

export function formatDiscount(campaign) {
  const discountValue = Number(
    campaign.discountValue,
  );

  if (Number.isNaN(discountValue)) {
    return "—";
  }

  if (
    campaign.discountType ===
    "PERCENTAGE"
  ) {
    return `%${discountValue}`;
  }

  return formatCurrency(discountValue);
}

export function getCampaignStatus(
  campaign,
) {
  if (!campaign.active) {
    return {
      key: "inactive",
      label: "Pasif",
    };
  }

  const now = new Date();

  const validFrom =
    new Date(campaign.validFrom);

  const validTo =
    new Date(campaign.validTo);

  if (
    !Number.isNaN(validFrom.getTime()) &&
    now < validFrom
  ) {
    return {
      key: "scheduled",
      label: "Planlandı",
    };
  }

  if (
    !Number.isNaN(validTo.getTime()) &&
    now > validTo
  ) {
    return {
      key: "expired",
      label: "Süresi doldu",
    };
  }

  const maxUses =
    campaign.maxUses;

  const usedCount =
    campaign.usedCount ?? 0;

  if (
    maxUses !== null &&
    maxUses !== undefined &&
    usedCount >= maxUses
  ) {
    return {
      key: "limit-reached",
      label: "Limit doldu",
    };
  }

  return {
    key: "active",
    label: "Aktif",
  };
}