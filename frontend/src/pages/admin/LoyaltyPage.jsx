import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Save,
  Search,
} from "lucide-react";

import LoyaltyAccountCard from "@/components/loyalty/LoyaltyAccountCard";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useLoyalty from "@/hooks/useLoyalty";
import { useTranslation } from "react-i18next";
import {
  getLoyaltyTierConfigs,
  updateLoyaltyTierConfig,
} from "@/api/loyaltyServices";

const initialTierForm = {
  tier: "BRONZE",
  minPoints: "0",
  earnRate: "1.00",
  discountPercentage: "0.00",
  prioritySupport: false,
  description: "",
};

const TIER_ORDER = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "VIP"];

function LoyaltyPage() {
  const { t } = useTranslation();
  const [userId, setUserId] = useState("");
  const [tierForm, setTierForm] = useState(initialTierForm);
  const [tierSaving, setTierSaving] = useState(false);
  const [tierLoading, setTierLoading] = useState(true);
  const [tierConfigs, setTierConfigs] = useState([]);
  const [tierFeedback, setTierFeedback] = useState(null);

  const {
    account,
    searching,
    error,
    fetchAccountByUserId,
  } = useLoyalty({
    loadMyAccount: false,
  });

  useEffect(() => {
    getLoyaltyTierConfigs()
      .then((configs) => {
        const list = Array.isArray(configs) ? configs : [];
        setTierConfigs(list);
        const bronze = list.find((config) => config.tier === "BRONZE") || list[0];
        if (bronze) {
          setTierForm(configToForm(bronze));
        }
      })
      .catch((requestError) => {
        setTierFeedback({
          type: "error",
          message:
            requestError.response?.data?.message ||
            "Kademe ayarları yüklenemedi.",
        });
      })
      .finally(() => setTierLoading(false));
  }, []);

  const handleTierChange = (tier) => {
    const config = tierConfigs.find((item) => item.tier === tier);
    setTierForm(config ? configToForm(config) : { ...initialTierForm, tier });
    setTierFeedback(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await fetchAccountByUserId(userId);
  };

  const handleTierSubmit = async (event) => {
    event.preventDefault();
    setTierSaving(true);
    setTierFeedback(null);
    try {
      const updated = await updateLoyaltyTierConfig(tierForm.tier, {
        minPoints: Number(tierForm.minPoints),
        earnRate: Number(tierForm.earnRate),
        discountPercentage: Number(tierForm.discountPercentage),
        prioritySupport: tierForm.prioritySupport,
        description: tierForm.description.trim(),
      });
      setTierConfigs((current) =>
        current.map((config) =>
          config.tier === updated.tier ? updated : config,
        ),
      );
      setTierForm(configToForm(updated));
      setTierFeedback({
        type: "success",
        message: `${tierForm.tier} kademe ayarları güncellendi.`,
      });
    } catch (requestError) {
      setTierFeedback({
        type: "error",
        message:
          requestError.response?.data?.message ||
          "Kademe ayarları güncellenemedi.",
      });
    } finally {
      setTierSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">
          {t('admin.loyalty.title')}
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          {t('admin.loyalty.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.loyalty.searchTitle')}</CardTitle>

          <CardDescription>
            {t('admin.loyalty.searchDesc')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
            onSubmit={handleSubmit}
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="loyalty-user-id">
                {t('admin.loyalty.label')}
              </Label>

              <Input
                id="loyalty-user-id"
                type="number"
                min="1"
                value={userId}
                placeholder={t('admin.loyalty.placeholder')}
                onChange={(event) =>
                  setUserId(event.target.value)
                }
              />
            </div>

            <Button
              type="submit"
              disabled={searching}
            >
              <Search className="mr-2 size-4" />

              {searching
                ? t('admin.loyalty.searching')
                : t('admin.loyalty.searchBtn')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {account && (
        <LoyaltyAccountCard account={account} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Kademe yapılandırması</CardTitle>
          <CardDescription>
            Puan eşiği, kazanım oranı, indirim ve öncelikli destek kurallarını güncelleyin.
            Bir kademe seçtiğinizde mevcut ayarlar otomatik olarak forma yüklenir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tierFeedback && (
            <div className={`mb-5 flex items-center gap-2 rounded-lg border p-3 text-sm ${
              tierFeedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}>
              {tierFeedback.type === "success"
                ? <CheckCircle2 className="size-5" />
                : <AlertCircle className="size-5" />}
              {tierFeedback.message}
            </div>
          )}
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleTierSubmit}>
            <TierField label="Kademe">
              <select
                className="h-10 w-full rounded-md border bg-white px-3"
                value={tierForm.tier}
                onChange={(event) => handleTierChange(event.target.value)}
                disabled={tierLoading}
              >
                {TIER_ORDER.map((tier) => (
                  <option key={tier}>{tier}</option>
                ))}
              </select>
            </TierField>
            <TierField label="Minimum puan">
              <Input type="number" min="0" value={tierForm.minPoints} onChange={(event) => setTierForm({ ...tierForm, minPoints: event.target.value })} required />
            </TierField>
            <TierField label="Puan kazanım oranı">
              <Input type="number" min="0" step="0.01" value={tierForm.earnRate} onChange={(event) => setTierForm({ ...tierForm, earnRate: event.target.value })} required />
            </TierField>
            <TierField label="İndirim yüzdesi">
              <Input type="number" min="0" max="100" step="0.01" value={tierForm.discountPercentage} onChange={(event) => setTierForm({ ...tierForm, discountPercentage: event.target.value })} required />
            </TierField>
            <TierField label="Açıklama">
              <Input value={tierForm.description} maxLength={255} onChange={(event) => setTierForm({ ...tierForm, description: event.target.value })} placeholder="Kademe avantajları" />
            </TierField>
            <div className="flex flex-col justify-end gap-3">
              <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
                <input type="checkbox" checked={tierForm.prioritySupport} onChange={(event) => setTierForm({ ...tierForm, prioritySupport: event.target.checked })} />
                Öncelikli destek
              </label>
              <Button type="submit" disabled={tierSaving || tierLoading}>
                <Save className="mr-2 size-4" />
                {tierLoading
                  ? "Ayarlar yükleniyor..."
                  : tierSaving
                    ? "Kaydediliyor..."
                    : "Kademe ayarlarını kaydet"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

function TierField({ label, children }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function configToForm(config) {
  return {
    tier: config.tier,
    minPoints: String(config.minPoints ?? 0),
    earnRate: String(config.earnRate ?? 1),
    discountPercentage: String(config.discountPercentage ?? 0),
    prioritySupport: Boolean(config.prioritySupport),
    description: config.description || "",
  };
}

export default LoyaltyPage;
