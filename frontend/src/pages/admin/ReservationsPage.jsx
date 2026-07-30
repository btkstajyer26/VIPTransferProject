import ReservationDetailDialog from "@/components/reservations/ReservationDetailDialog";
import ReservationHistoryDialog from "@/components/reservations/ReservationHistoryDialog";
import ReservationStatusDialog from "@/components/reservations/ReservationStatusDialog";
import ReservationTable from "@/components/reservations/ReservationTable";
import ReservationToolbar from "@/components/reservations/ReservationToolbar";

import useReservations from "@/hooks/useReservations";
import { useTranslation } from "react-i18next";

function ReservationsPage() {
  const { t } = useTranslation();
  const {
    filteredReservations,
    reservationHistory,

    searchTerm,
    setSearchTerm,

    statusFilter,
    setStatusFilter,

    selectedReservation,

    isLoading,
    isHistoryLoading,
    isStatusUpdating,
    error,

    fetchReservations,

    isDetailOpen,
    openDetailDialog,
    closeDetailDialog,

    isStatusOpen,
    openStatusDialog,
    closeStatusDialog,

    isHistoryOpen,
    openHistoryDialog,
    closeHistoryDialog,

    updateReservationStatus,
  } = useReservations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('admin.reservations.title')}
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          {t('admin.reservations.subtitle')}
        </p>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>

          <button
            type="button"
            onClick={fetchReservations}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            {t('admin.reservations.retry')}
          </button>
        </div>
      )}

      <ReservationToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {isLoading ? (
        <div className="flex min-h-72 items-center justify-center rounded-xl border bg-white">
          <p className="text-sm text-muted-foreground">
            {t('admin.reservations.loading')}
          </p>
        </div>
      ) : (
        <ReservationTable
          reservations={filteredReservations}
          onViewDetails={openDetailDialog}
          onChangeStatus={openStatusDialog}
          onViewHistory={openHistoryDialog}
        />
      )}

      <ReservationDetailDialog
        open={isDetailOpen}
        reservation={selectedReservation}
        onOpenChange={(open) => {
          if (!open) {
            closeDetailDialog();
          }
        }}
      />

      <ReservationStatusDialog
        open={isStatusOpen}
        reservation={selectedReservation}
        isSubmitting={isStatusUpdating}
        onSubmit={updateReservationStatus}
        onOpenChange={(open) => {
          if (!open && !isStatusUpdating) {
            closeStatusDialog();
          }
        }}
      />

      <ReservationHistoryDialog
        open={isHistoryOpen}
        reservation={selectedReservation}
        history={reservationHistory}
        isLoading={isHistoryLoading}
        onOpenChange={(open) => {
          if (!open) {
            closeHistoryDialog();
          }
        }}
      />
    </div>
  );
}

export default ReservationsPage;