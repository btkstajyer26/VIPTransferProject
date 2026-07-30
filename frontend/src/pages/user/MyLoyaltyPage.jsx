import { AlertCircle, RefreshCw } from "lucide-react";

import LoyaltyAccountCard from "@/components/loyalty/LoyaltyAccountCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import useLoyalty from "@/hooks/useLoyalty";
import { useTranslation } from "react-i18next";

function MyLoyaltyPage() {
  const { t } = useTranslation();
  const {
    account,
    loading,
    error,
    fetchMyAccount,
  } = useLoyalty({
    loadMyAccount: true,
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex min-h-56 items-center justify-center">
          <RefreshCw className="size-5 animate-spin" />
          <span className="ml-2 text-sm">
            {t("loyaltyPage.loadingAccount")}
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">
            {t("loyaltyPage.title")}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {t("loyaltyPage.subtitle")}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={fetchMyAccount}
        >
          <RefreshCw className="mr-2 size-4" />
          {t("loyaltyPage.refreshBtn")}
        </Button>
      </div>

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

export default MyLoyaltyPage;