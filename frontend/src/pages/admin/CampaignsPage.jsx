import { useMemo, useState } from "react";
import {
  AlertCircle,
  BadgePercent,
  Plus,
  Search,
} from "lucide-react";

import CampaignModal from "@/components/campaigns/CampaignModal";
import CampaignTable from "@/components/campaigns/CampaignTable";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { EMPTY_CAMPAIGN_FORM } from "@/constants/campaign";
import useCampaigns from "@/hooks/useCampaigns";

import {
  campaignToForm,
  getApiErrorMessage,
  prepareCampaignPayload,
  validateCampaignForm,
} from "@/utils/campaignUtils";

function CampaignsPage() {
  const {
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
  } = useCampaigns();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] =
    useState(null);

  const [form, setForm] = useState({
    ...EMPTY_CAMPAIGN_FORM,
  });

  const [formErrors, setFormErrors] = useState({});
  const [feedback, setFeedback] = useState(null);

  const filteredCampaigns = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLocaleLowerCase("tr-TR");

    if (!normalizedSearch) {
      return campaigns;
    }

    return campaigns.filter((campaign) => {
      const searchableText = [
        campaign.code,
        campaign.name,
        campaign.description,
        campaign.createdByName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return searchableText.includes(normalizedSearch);
    });
  }, [campaigns, searchTerm]);

  function openCreateModal() {
    setEditingCampaign(null);
    setForm({
      ...EMPTY_CAMPAIGN_FORM,
    });
    setFormErrors({});
    setFeedback(null);
    setModalOpen(true);
  }

  function openEditModal(campaign) {
    setEditingCampaign(campaign);
    setForm(campaignToForm(campaign));
    setFormErrors({});
    setFeedback(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditingCampaign(null);
    setForm({
      ...EMPTY_CAMPAIGN_FORM,
    });
    setFormErrors({});
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]:
        name === "code"
          ? value.toUpperCase()
          : value,
    }));

    setFormErrors((currentErrors) => {
      if (!currentErrors[name]) {
        return currentErrors;
      }

      const nextErrors = {
        ...currentErrors,
      };

      delete nextErrors[name];

      return nextErrors;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationErrors =
      validateCampaignForm(form);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    try {
      const payload =
        prepareCampaignPayload(form);

      if (editingCampaign) {
        await editCampaign(
          editingCampaign.id,
          payload,
        );

        setFeedback({
          type: "success",
          message:
            "Kampanya başarıyla güncellendi.",
        });
      } else {
        await addCampaign(payload);

        setFeedback({
          type: "success",
          message:
            "Kampanya başarıyla oluşturuldu.",
        });
      }

      setModalOpen(false);
      setEditingCampaign(null);
      setForm({
        ...EMPTY_CAMPAIGN_FORM,
      });
      setFormErrors({});
    } catch (requestError) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(
          requestError,
          "Kampanya kaydedilemedi.",
        ),
      });
    }
  }

  async function handleStatusChange(campaign) {
    const actionText = campaign.active
      ? "pasifleştirmek"
      : "aktifleştirmek";

    const confirmed = window.confirm(
      `"${campaign.name}" kampanyasını ${actionText} istediğinize emin misiniz?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      if (campaign.active) {
        await deactivate(campaign.id);

        setFeedback({
          type: "success",
          message:
            "Kampanya başarıyla pasifleştirildi.",
        });
      } else {
        await activate(campaign.id);

        setFeedback({
          type: "success",
          message:
            "Kampanya başarıyla aktifleştirildi.",
        });
      }
    } catch (requestError) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(
          requestError,
          campaign.active
            ? "Kampanya pasifleştirilemedi."
            : "Kampanya aktifleştirilemedi.",
        ),
      });
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <BadgePercent className="size-7" />
            Kampanya Yönetimi
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            İndirim kampanyalarını oluşturun,
            düzenleyin, aktifleştirin ve pasifleştirin.
          </p>
        </div>

        <Button onClick={openCreateModal}>
          <Plus className="mr-2 size-4" />
          Yeni Kampanya
        </Button>
      </div>

      {feedback && (
        <Alert
          variant={
            feedback.type === "error"
              ? "destructive"
              : "default"
          }
        >
          {feedback.type === "error" && (
            <AlertCircle className="size-4" />
          )}

          <AlertDescription>
            {feedback.message}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />

          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Kampanyalar</CardTitle>

          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Kod veya kampanya ara..."
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent>
          <CampaignTable
            campaigns={filteredCampaigns}
            loading={loading}
            error={error}
            statusChangingId={statusChangingId}
            onRetry={fetchCampaigns}
            onEdit={openEditModal}
            onStatusChange={handleStatusChange}
          />
        </CardContent>
      </Card>

      <CampaignModal
        open={modalOpen}
        form={form}
        errors={formErrors}
        saving={saving}
        editing={Boolean(editingCampaign)}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onClose={closeModal}
      />
    </section>
  );
}

export default CampaignsPage;