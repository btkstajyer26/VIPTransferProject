import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  activateCampaign,
  createCampaign,
  deactivateCampaign,
  getCampaigns,
  updateCampaign,
} from "@/api/campaignApi";

import { getApiErrorMessage } from "@/utils/campaignUtils";

export default function useCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [statusChangingId, setStatusChangingId] =
    useState(null);

  const [error, setError] = useState("");

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getCampaigns();

      console.log(
        "Campaign API response:",
        response,
      );

      setCampaigns(
        Array.isArray(response)
          ? response
          : [],
      );
    } catch (requestError) {
      console.error(
        "Kampanyalar yüklenemedi:",
        requestError,
      );

      setError(
        getApiErrorMessage(
          requestError,
          "Kampanyalar yüklenemedi.",
        ),
      );

      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  async function addCampaign(payload) {
    setSaving(true);

    try {
      const createdCampaign =
        await createCampaign(payload);

      await fetchCampaigns();

      return createdCampaign;
    } finally {
      setSaving(false);
    }
  }

  async function editCampaign(id, payload) {
    setSaving(true);

    try {
      const updatedCampaign =
        await updateCampaign(id, payload);

      await fetchCampaigns();

      return updatedCampaign;
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id) {
    setStatusChangingId(id);

    try {
      const response =
        await deactivateCampaign(id);

      await fetchCampaigns();

      return response;
    } finally {
      setStatusChangingId(null);
    }
  }

  async function activate(id) {
    setStatusChangingId(id);

    try {
      const response =
        await activateCampaign(id);

      await fetchCampaigns();

      return response;
    } finally {
      setStatusChangingId(null);
    }
  }

  return {
    campaigns,
    loading,
    saving,
    statusChangingId,
    error,
    fetchCampaigns,
    addCampaign,
    editCampaign,
    deactivate,
    activate,
  };
}