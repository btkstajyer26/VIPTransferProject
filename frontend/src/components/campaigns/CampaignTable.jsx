import {
  BadgePercent,
  LoaderCircle,
  Pencil,
  Power,
  PowerOff,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import CampaignStatusBadge from "./CampaignStatusBadge";
import DiscountTypeBadge from "./DiscountTypeBadge";

import {
  formatCurrency,
  formatDateTime,
} from "@/utils/campaignUtils";

export default function CampaignTable({
  campaigns = [],
  loading,
  error,
  statusChangingId,
  onRetry,
  onEdit,
  onStatusChange,
}) {
  if (loading) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-4">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />

        <p className="text-sm text-muted-foreground">
          Kampanyalar yükleniyor...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-4">
        <p className="text-sm text-destructive">
          {error}
        </p>

        <Button
          variant="outline"
          onClick={onRetry}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Tekrar Dene
        </Button>
      </div>
    );
  }

  if (!campaigns.length) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-4">
        <BadgePercent className="h-10 w-10 text-muted-foreground" />

        <div className="text-center">
          <h3 className="font-semibold">
            Kampanya bulunamadı
          </h3>

          <p className="text-sm text-muted-foreground">
            Henüz oluşturulmuş kampanya yok.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[1150px]">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
              Kampanya
            </th>

            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
              İndirim
            </th>

            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
              Minimum Sipariş
            </th>

            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
              Kullanım
            </th>

            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
              Tarih
            </th>

            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
              Durum
            </th>

            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
              Oluşturan
            </th>

            <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
              İşlemler
            </th>
          </tr>
        </thead>

        <tbody>
          {campaigns.map((campaign, index) => {
            const rowKey =
              campaign.id && campaign.id !== 0
                ? campaign.id
                : `${campaign.code}-${index}`;

            const changing =
              statusChangingId === campaign.id;

            return (
              <tr
                key={rowKey}
                className="border-t transition-colors hover:bg-muted/40"
              >
                <td className="px-4 py-4 align-top">
                  <div className="space-y-2">
                    <span className="rounded bg-muted px-2 py-1 font-mono text-xs">
                      {campaign.code}
                    </span>

                    <div className="font-medium">
                      {campaign.name}
                    </div>

                    {campaign.description && (
                      <p
                        className="max-w-xs truncate text-xs text-muted-foreground"
                        title={
                          campaign.description
                        }
                      >
                        {campaign.description}
                      </p>
                    )}
                  </div>
                </td>

                <td className="px-4 py-4 align-top">
                  <DiscountTypeBadge
                    campaign={campaign}
                  />

                  {campaign.maxDiscountAmount !=
                    null && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Üst Limit
                      <br />
                      <span className="font-medium text-foreground">
                        {formatCurrency(
                          campaign.maxDiscountAmount,
                        )}
                      </span>
                    </div>
                  )}
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  {formatCurrency(
                    campaign.minOrderAmount,
                  )}
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="font-medium">
                    {campaign.usedCount ?? 0} /{" "}
                    {campaign.maxUses ??
                      "Sınırsız"}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Kişi başı:{" "}
                    {campaign.maxUsesPerUser ??
                      1}
                  </div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  <div>
                    {formatDateTime(
                      campaign.validFrom,
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(
                      campaign.validTo,
                    )}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <CampaignStatusBadge
                    campaign={campaign}
                  />
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  <div>
                    {campaign.createdByName ??
                      "-"}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(
                      campaign.createdAt,
                    )}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        onEdit(campaign)
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      disabled={changing}
                      onClick={() =>
                        onStatusChange(
                          campaign,
                        )
                      }
                    >
                      {changing ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : campaign.active ? (
                        <PowerOff className="h-4 w-4 text-red-500" />
                      ) : (
                        <Power className="h-4 w-4 text-emerald-600" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}