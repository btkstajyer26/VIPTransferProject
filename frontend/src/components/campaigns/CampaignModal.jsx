import CampaignForm from "./CampaignForm";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CampaignModal({
  open,
  form,
  errors,
  saving,
  editing,
  onChange,
  onSubmit,
  onClose,
}) {
  const handleOpenChange = (nextOpen) => {
    if (!nextOpen && !saving) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? "Kampanyayı Düzenle"
              : "Yeni Kampanya"}
          </DialogTitle>

          <DialogDescription>
            Kampanya bilgilerini eksiksiz doldurun.
          </DialogDescription>
        </DialogHeader>

        <CampaignForm
          form={form}
          errors={errors}
          saving={saving}
          editing={editing}
          onChange={onChange}
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}