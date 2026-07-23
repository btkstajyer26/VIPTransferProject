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

function LoyaltyPage() {
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
          Sadakat Yönetimi
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Kullanıcıların sadakat puanlarını ve seviyelerini
          görüntüleyin.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kullanıcı Ara</CardTitle>

          <CardDescription>
            Sadakat hesabını görüntülemek için kullanıcı ID
            bilgisini girin.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
            onSubmit={handleSubmit}
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="loyalty-user-id">
                Kullanıcı ID
              </Label>

              <Input
                id="loyalty-user-id"
                type="number"
                min="1"
                value={userId}
                placeholder="Örneğin: 6"
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
                ? "Sorgulanıyor..."
                : "Hesabı Görüntüle"}
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