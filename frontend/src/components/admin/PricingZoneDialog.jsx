import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import ZoneMapSelector from "./ZoneMapSelector";

export function PricingZoneDialog({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    polygonCoordinates: "[[[29.0, 41.0], [29.1, 41.0], [29.1, 41.1], [29.0, 41.1], [29.0, 41.0]]]",
    basePrice: "",
    minPrice: "",
    pricePerKm: "",
    currency: "TRY"
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
        polygonCoordinates: initialData.polygon?.coordinates 
          ? JSON.stringify(initialData.polygon.coordinates) 
          : "[[[29.0, 41.0], [29.1, 41.0], [29.1, 41.1], [29.0, 41.1], [29.0, 41.0]]]",
        basePrice: initialData.basePrice || "",
        minPrice: initialData.minPrice || "",
        pricePerKm: initialData.pricePerKm || "",
        currency: initialData.currency || "TRY",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        polygonCoordinates: "[[[29.0, 41.0], [29.1, 41.0], [29.1, 41.1], [29.0, 41.1], [29.0, 41.0]]]",
        basePrice: "",
        minPrice: "",
        pricePerKm: "",
        currency: "TRY"
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMapChange = (coordinates) => {
    if (coordinates) {
      setFormData((prev) => ({ 
        ...prev, 
        polygonCoordinates: JSON.stringify(coordinates) 
      }));
    } else {
      setFormData((prev) => ({ 
        ...prev, 
        polygonCoordinates: "" 
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // JSON yapı doğrulaması
      let parsedCoordinates;
      try {
        parsedCoordinates = JSON.parse(formData.polygonCoordinates);
      } catch {
        throw new Error(
          "Polygon koordinatları geçerli bir JSON array formatında olmalıdır. (Örn: [[[boylam,enlem],...]]])",
        );
      }

      // GeoJSON Polygon yapı kontrolü
      if (!Array.isArray(parsedCoordinates) || !Array.isArray(parsedCoordinates[0])) {
        throw new Error(
          "Koordinatlar [[[boylam, enlem], ...]]] formatında olmalıdır (iç içe üç dizi).",
        );
      }

      const ring = parsedCoordinates[0];

      if (ring.length < 4) {
        throw new Error(
          "Polygon en az 3 farklı köşe içermelidir (4 pozisyon — ilk ve son aynı olacak şekilde).",
        );
      }

      const allNumericPairs = ring.every(
        (pos) =>
          Array.isArray(pos) &&
          pos.length >= 2 &&
          typeof pos[0] === "number" &&
          typeof pos[1] === "number",
      );
      if (!allNumericPairs) {
        throw new Error(
          "Her koordinat [boylam, enlem] formatında iki sayı içermelidir.",
        );
      }

      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        throw new Error(
          "GeoJSON kuralı: Polygon'un ilk ve son noktası aynı olmalıdır (kapalı ring).",
        );
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        polygon: {
          type: "Polygon",
          coordinates: parsedCoordinates
        },
        basePrice: parseFloat(formData.basePrice),
        minPrice: parseFloat(formData.minPrice) || 0,
        pricePerKm: parseFloat(formData.pricePerKm),
        currency: formData.currency
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error("API Error:", err.response?.data);
      
      let errorMessage = "Bölge kaydedilirken bir hata oluştu";
      
      if (err.response?.data) {
        const data = err.response.data;
        if (data.errors && typeof data.errors === 'object') {
          // Spring Boot validation errors usually come as { fieldName: "error message" }
          const errorDetails = Object.entries(data.errors)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join(" | ");
          errorMessage = errorDetails;
        } else if (data.message) {
          errorMessage = data.message;
        } else {
          errorMessage = JSON.stringify(data);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Bölgeyi Düzenle" : "Yeni Bölge Ekle"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && <div className="p-3 bg-red-100 text-red-700 text-sm rounded-md">{error}</div>}
          
          <div className="space-y-2">
            <Label htmlFor="name">Bölge Adı</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Input id="description" name="description" value={formData.description} onChange={handleChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="polygonCoordinates">Polygon Koordinatları (Haritadan Seçin veya JSON Girin)</Label>
            
            <ZoneMapSelector 
              initialCoordinates={
                formData.polygonCoordinates && formData.polygonCoordinates !== ""
                  ? (() => {
                      try { return JSON.parse(formData.polygonCoordinates); } 
                      catch { return null; }
                    })()
                  : null
              }
              onChange={handleMapChange} 
            />

            <Textarea 
              id="polygonCoordinates" 
              name="polygonCoordinates" 
              value={formData.polygonCoordinates} 
              onChange={handleChange} 
              rows={2}
              required 
              className="font-mono text-sm mt-2"
              placeholder="[[[29.0, 41.0], [29.1, 41.0], ...]]]"
            />
            <p className="text-xs text-gray-500">
              Format: <code>[[[Boylam, Enlem], [Boylam, Enlem], ...]]]</code>. Başlangıç ve bitiş noktaları aynı olmalıdır. (Haritadan seçim yaptığınızda otomatik dolar).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="basePrice">Açılış Fiyatı</Label>
              <Input id="basePrice" name="basePrice" type="number" step="0.01" min="0" value={formData.basePrice} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricePerKm">Km Başına Fiyat</Label>
              <Input id="pricePerKm" name="pricePerKm" type="number" step="0.01" min="0" value={formData.pricePerKm} onChange={handleChange} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minPrice">Minimum Fiyat</Label>
              <Input id="minPrice" name="minPrice" type="number" step="0.01" min="0" value={formData.minPrice} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Para Birimi</Label>
              <Input id="currency" name="currency" value={formData.currency} onChange={handleChange} required maxLength={3} />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              İptal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800 text-white">
              {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
