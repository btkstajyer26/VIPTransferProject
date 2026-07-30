import { LoaderCircle } from "lucide-react";

import { DISCOUNT_TYPES } from "@/constants/campaign";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-1 text-sm text-destructive">
      {message}
    </p>
  );
}

export default function CampaignForm({
  form,
  errors,
  saving,
  editing,
  onChange,
  onSubmit,
  onCancel,
}) {
  const isPercentage =
    form.discountType === "PERCENTAGE";

  const descriptionLength =
    form.description?.length ?? 0;

  return (
    <form
      className="space-y-6"
      onSubmit={onSubmit}
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="campaign-code">
            Kampanya kodu
          </Label>

          <Input
            id="campaign-code"
            name="code"
            value={form.code ?? ""}
            onChange={onChange}
            maxLength={50}
            placeholder="YAZ2026"
            autoComplete="off"
            required
            aria-invalid={Boolean(errors.code)}
          />

          <FieldError message={errors.code} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="campaign-name">
            Kampanya adı
          </Label>

          <Input
            id="campaign-name"
            name="name"
            value={form.name ?? ""}
            onChange={onChange}
            maxLength={150}
            placeholder="Yaz indirimi"
            autoComplete="off"
            required
            aria-invalid={Boolean(errors.name)}
          />

          <FieldError message={errors.name} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaign-description">
          Açıklama
        </Label>

        <Textarea
          id="campaign-description"
          name="description"
          value={form.description ?? ""}
          onChange={onChange}
          maxLength={500}
          rows={4}
          placeholder="Kampanya açıklaması..."
          className="resize-none"
          aria-invalid={Boolean(errors.description)}
        />

        <div className="flex items-start justify-between gap-4">
          <FieldError
            message={errors.description}
          />

          <span className="ml-auto text-xs text-muted-foreground">
            {descriptionLength}/500
          </span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="discount-type">
            İndirim türü
          </Label>

          <select
            id="discount-type"
            name="discountType"
            value={form.discountType ?? "PERCENTAGE"}
            onChange={onChange}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            required
            aria-invalid={Boolean(errors.discountType)}
          >
            {DISCOUNT_TYPES.map((type) => (
              <option
                key={type.value}
                value={type.value}
              >
                {type.label}
              </option>
            ))}
          </select>

          <FieldError
            message={errors.discountType}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount-value">
            İndirim değeri
          </Label>

          <Input
            id="discount-value"
            type="number"
            name="discountValue"
            value={form.discountValue ?? ""}
            onChange={onChange}
            min="0.01"
            max={isPercentage ? "100" : undefined}
            step="0.01"
            placeholder={isPercentage ? "20" : "250"}
            required
            aria-invalid={Boolean(errors.discountValue)}
          />

          <FieldError
            message={errors.discountValue}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="max-discount">
            Maksimum indirim tutarı
          </Label>

          <Input
            id="max-discount"
            type="number"
            name="maxDiscountAmount"
            value={form.maxDiscountAmount ?? ""}
            onChange={onChange}
            min="0"
            step="0.01"
            placeholder="500"
            aria-invalid={Boolean(
              errors.maxDiscountAmount,
            )}
          />

          <FieldError
            message={errors.maxDiscountAmount}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="min-order">
            Minimum sipariş tutarı
          </Label>

          <Input
            id="min-order"
            type="number"
            name="minOrderAmount"
            value={form.minOrderAmount ?? "0"}
            onChange={onChange}
            min="0"
            step="0.01"
            placeholder="0"
            aria-invalid={Boolean(errors.minOrderAmount)}
          />

          <FieldError
            message={errors.minOrderAmount}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="max-uses">
            Maksimum kullanım
          </Label>

          <Input
            id="max-uses"
            type="number"
            name="maxUses"
            value={form.maxUses ?? ""}
            onChange={onChange}
            min="1"
            step="1"
            placeholder="Sınırsız"
            aria-invalid={Boolean(errors.maxUses)}
          />

          <FieldError message={errors.maxUses} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="max-uses-per-user">
            Kullanıcı başına kullanım
          </Label>

          <Input
            id="max-uses-per-user"
            type="number"
            name="maxUsesPerUser"
            value={form.maxUsesPerUser ?? "1"}
            onChange={onChange}
            min="1"
            step="1"
            aria-invalid={Boolean(
              errors.maxUsesPerUser,
            )}
          />

          <FieldError
            message={errors.maxUsesPerUser}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="valid-from">
            Başlangıç tarihi
          </Label>

          <Input
            id="valid-from"
            type="datetime-local"
            name="validFrom"
            value={form.validFrom ?? ""}
            onChange={onChange}
            required
            aria-invalid={Boolean(errors.validFrom)}
          />

          <FieldError message={errors.validFrom} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valid-to">
            Bitiş tarihi
          </Label>

          <Input
            id="valid-to"
            type="datetime-local"
            name="validTo"
            value={form.validTo ?? ""}
            onChange={onChange}
            required
            aria-invalid={Boolean(errors.validTo)}
          />

          <FieldError message={errors.validTo} />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          İptal
        </Button>

        <Button
          type="submit"
          disabled={saving}
        >
          {saving && (
            <LoaderCircle className="mr-2 size-4 animate-spin" />
          )}

          {saving
            ? "Kaydediliyor..."
            : editing
              ? "Değişiklikleri Kaydet"
              : "Kampanya Oluştur"}
        </Button>
      </div>
    </form>
  );
}