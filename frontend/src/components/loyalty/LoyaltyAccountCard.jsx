import { Award, Star, UserRound } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getLoyaltyTierLabel } from "@/constants/loyalty";

function LoyaltyAccountCard({ account }) {
  if (!account) {
    return null;
  }

  const formattedPoints = new Intl.NumberFormat(
    "tr-TR",
  ).format(account.lifetimePoints);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Sadakat Hesabı</CardTitle>

            <CardDescription>
              Kullanıcının toplam puanı ve mevcut seviyesi.
            </CardDescription>
          </div>

          <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Award className="size-5" />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserRound className="size-4" />
              Kullanıcı ID
            </div>

            <p className="mt-2 text-2xl font-semibold">
              #{account.userId}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="size-4" />
              Toplam Puan
            </div>

            <p className="mt-2 text-2xl font-semibold">
              {formattedPoints}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Award className="size-4" />
              Seviye
            </div>

            <p className="mt-2 text-2xl font-semibold">
              {getLoyaltyTierLabel(account.tier)}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {account.tier}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default LoyaltyAccountCard;