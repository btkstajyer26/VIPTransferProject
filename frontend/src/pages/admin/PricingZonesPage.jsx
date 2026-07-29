import { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { usePricingZones } from "@/hooks/usePricingZones";
import { PricingZoneDialog } from "@/components/admin/PricingZoneDialog";
import AllZonesMap from "@/components/admin/AllZonesMap";

function PricingZonesPage() {
  const { zones, loading, error, fetchZones, createZone, updateZone, deactivateZone } = usePricingZones();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const handleAddClick = () => {
    setEditingZone(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (zone) => {
    setEditingZone(zone);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm("Bu bölgeyi silmek (pasife almak) istediğinize emin misiniz? Eski kayıtlarda bu bölgenin verileri saklanmaya devam edecektir.")) {
      await deactivateZone(id);
    }
  };

  const handleSaveZone = async (zoneData) => {
    if (editingZone) {
      await updateZone(editingZone.id, zoneData);
    } else {
      await createZone(zoneData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Fiyat Bölgeleri</h2>
          <p className="text-slate-500">
            Hizmet verilen bölgeleri (polygon) ve fiyatlandırmalarını yönetin.
          </p>
        </div>
        <Button onClick={handleAddClick} className="bg-slate-900 hover:bg-slate-800 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Yeni Bölge Ekle
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sol Taraf: Harita */}
        <div className="h-[400px] lg:h-[600px] w-full">
          <AllZonesMap zones={zones} />
        </div>

        {/* Sağ Taraf: Tablo */}
        <div className="border rounded-xl bg-white shadow-sm flex flex-col lg:h-[600px]">
          <div className="overflow-y-auto flex-1">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="font-semibold text-slate-900">Bölge Adı</TableHead>
                  <TableHead className="font-semibold text-slate-900">Fiyat (Açılış/Min)</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10 text-slate-500">
                      Yükleniyor...
                    </TableCell>
                  </TableRow>
                ) : zones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10 text-slate-500">
                      Kayıtlı fiyat bölgesi bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  zones.map((zone) => (
                    <TableRow key={zone.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{zone.name}</span>
                          {zone.description && (
                            <span className="text-xs text-slate-500 line-clamp-1">{zone.description}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>{zone.basePrice} {zone.currency}</span>
                          <span className="text-xs text-slate-500">Min: {zone.minPrice} {zone.currency}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(zone)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(zone.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <PricingZoneDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveZone}
        initialData={editingZone}
      />
    </div>
  );
}

export default PricingZonesPage;