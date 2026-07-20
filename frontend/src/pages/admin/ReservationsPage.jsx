import ReservationDetailDialog from "@/components/reservations/ReservationDetailDialog";
import ReservationHistoryDialog from "@/components/reservations/ReservationHistoryDialog";
import ReservationStatusDialog from "@/components/reservations/ReservationStatusDialog";
import ReservationTable from "@/components/reservations/ReservationTable";
import ReservationToolbar from "@/components/reservations/ReservationToolbar";

import useReservations from "@/hooks/useReservations";

function ReservationsPage() {
  const {
    filteredReservations,

    searchTerm,
    setSearchTerm,

    statusFilter,
    setStatusFilter,

    selectedReservation,

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
          Rezervasyon Yönetimi
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Tüm rezervasyonları görüntüleyin, filtreleyin ve durumlarını
          yönetin.
        </p>
      </div>

      <ReservationToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      <ReservationTable
        reservations={filteredReservations}
        onViewDetails={openDetailDialog}
        onChangeStatus={openStatusDialog}
        onViewHistory={openHistoryDialog}
      />

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
        onSubmit={updateReservationStatus}
        onOpenChange={(open) => {
          if (!open) {
            closeStatusDialog();
          }
        }}
      />

      <ReservationHistoryDialog
        open={isHistoryOpen}
        reservation={selectedReservation}
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