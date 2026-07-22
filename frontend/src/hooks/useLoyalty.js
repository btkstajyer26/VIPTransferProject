import { useCallback, useEffect, useState } from "react";

import {
  getLoyaltyAccountByUserId,
  getMyLoyaltyAccount,
} from "@/api/loyaltyServices";

function normalizeLoyaltyAccount(account = {}) {
  return {
    userId: account.userId ?? null,

    lifetimePoints:
      account.lifetimePoints !== null &&
      account.lifetimePoints !== undefined
        ? Number(account.lifetimePoints)
        : 0,

    tier: account.tier ?? "BRONZE",
  };
}

function getErrorMessage(error, fallbackMessage) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallbackMessage
  );
}

function useLoyalty({ loadMyAccount = true } = {}) {
  const [account, setAccount] = useState(null);

  const [loading, setLoading] = useState(loadMyAccount);
  const [searching, setSearching] = useState(false);

  const [error, setError] = useState("");

  const fetchMyAccount = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getMyLoyaltyAccount();

      setAccount(normalizeLoyaltyAccount(response));

      return true;
    } catch (err) {
      console.error(
        "Sadakat hesabı alınamadı:",
        err?.response?.data || err,
      );

      setAccount(null);

      setError(
        getErrorMessage(
          err,
          "Sadakat hesabı yüklenirken bir hata oluştu.",
        ),
      );

      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAccountByUserId = async (userId) => {
    const numericUserId = Number(userId);

    if (
      !Number.isInteger(numericUserId) ||
      numericUserId <= 0
    ) {
      setError("Geçerli bir kullanıcı ID giriniz.");
      return false;
    }

    try {
      setSearching(true);
      setError("");

      const response =
        await getLoyaltyAccountByUserId(numericUserId);

      setAccount(normalizeLoyaltyAccount(response));

      return true;
    } catch (err) {
      console.error(
        "Kullanıcının sadakat hesabı alınamadı:",
        err?.response?.data || err,
      );

      setAccount(null);

      setError(
        getErrorMessage(
          err,
          "Kullanıcının sadakat hesabı bulunamadı.",
        ),
      );

      return false;
    } finally {
      setSearching(false);
    }
  };

  const clearAccount = () => {
    setAccount(null);
    setError("");
  };

  useEffect(() => {
    if (loadMyAccount) {
      fetchMyAccount();
    }
  }, [fetchMyAccount, loadMyAccount]);

  return {
    account,

    loading,
    searching,
    error,

    fetchMyAccount,
    fetchAccountByUserId,
    clearAccount,
  };
}

export default useLoyalty;