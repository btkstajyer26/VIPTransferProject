import { useState } from "react";
import {
  AlertCircle,
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

function LoyaltyPage() {
  const { t } = useTranslation();
  const [userId, setUserId] = useState("");

  const {
    account,
    searching,
    error,
    fetchAccountByUserId,
  } = useLoyalty({
    loadMyAccount: false,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    await fetchAccountByUserId(userId);
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
    </section>
  );
}

export default LoyaltyPage;