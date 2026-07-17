import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import DeleteVehicleDialog from "@/components/vehicles/DeleteVehicleDialog";
import VehicleFormDialog from "@/components/vehicles/VehicleFormDialog";
import VehiclePhotoDialog from "@/components/vehicles/VehiclePhotoDialog";
import VehicleTable from "@/components/vehicles/VehicleTable";
import VehicleToolbar from "@/components/vehicles/VehicleToolbar";
import useVehicles from "@/hooks/useVehicles";

function VehiclesPage() {
  const {
    vehicles,
    totalVehicleCount,

    search,
    setSearch,

    classFilter,
    setClassFilter,

    selectedVehicle,

    isFormOpen,
    isDeleteOpen,
    isPhotoOpen,

    openCreateDialog,
    openEditDialog,
    closeFormDialog,

    openDeleteDialog,
    closeDeleteDialog,

    openPhotoDialog,
    closePhotoDialog,

    saveVehicle,
    deleteVehicle,
    toggleVehicleStatus,
  } = useVehicles();

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">
          Araçlar
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Sistemde kayıtlı transfer araçlarını yönetin.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-5">
          <div>
            <CardTitle>Araç Listesi</CardTitle>

            <CardDescription>
              Sistemde toplam {totalVehicleCount} araç bulunmaktadır.
            </CardDescription>
          </div>

          <VehicleToolbar
            search={search}
            onSearchChange={setSearch}
            classFilter={classFilter}
            onClassFilterChange={setClassFilter}
            onCreate={openCreateDialog}
          />
        </CardHeader>

        <CardContent>
          <VehicleTable
            vehicles={vehicles}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            onToggleStatus={toggleVehicleStatus}
            onViewPhoto={openPhotoDialog}
          />
        </CardContent>
      </Card>

      <VehicleFormDialog
        isOpen={isFormOpen}
        vehicle={selectedVehicle}
        onClose={closeFormDialog}
        onSave={saveVehicle}
      />

      <DeleteVehicleDialog
        isOpen={isDeleteOpen}
        vehicle={selectedVehicle}
        onClose={closeDeleteDialog}
        onConfirm={deleteVehicle}
      />

      <VehiclePhotoDialog
        isOpen={isPhotoOpen}
        vehicle={selectedVehicle}
        onClose={closePhotoDialog}
      />
    </section>
  );
}

export default VehiclesPage;