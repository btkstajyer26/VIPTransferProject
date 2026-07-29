import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

// Bileşen haritadaki tıklamaları dinler
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick([e.latlng.lng, e.latlng.lat]); // Leaflet lat/lng verir, GeoJSON [lng, lat] ister
    },
  });
  return null;
}

// Geometrik şeklin kendi üstüne katlanıp iki üçgen (bow-tie) olmasını engeller.
// Noktaları merkez noktalarına göre saat yönünde (veya tersine) sıralar.
const sortPointsClockwise = (pts) => {
  if (pts.length < 3) return pts;
  
  // Merkez noktayı bul
  const center = pts.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
  center[0] /= pts.length;
  center[1] /= pts.length;

  // Açıya göre sırala (x = boylam, y = enlem)
  return [...pts].sort((a, b) => {
    const angleA = Math.atan2(a[1] - center[1], a[0] - center[0]);
    const angleB = Math.atan2(b[1] - center[1], b[0] - center[0]);
    return angleA - angleB; // Açısı küçükten büyüğe
  });
};

export default function ZoneMapSelector({ initialCoordinates, onChange }) {
  const [points, setPoints] = useState([]);

  // Dışarıdan initialCoordinates (GeoJSON) gelirse haritayı doldur
  useEffect(() => {
    if (initialCoordinates && Array.isArray(initialCoordinates) && initialCoordinates.length > 0) {
      // GeoJSON formatı [[[lng,lat], [lng,lat]...]] şeklindedir
      const firstRing = initialCoordinates[0];
      if (Array.isArray(firstRing)) {
        // GeoJSON'da ilk ve son nokta aynıdır, görsellikte son noktayı çıkartıyoruz ki çizime devam edilebilsin
        // Fakat şimdilik sadece var olanları göstereceğiz.
        // Eğer kullanıcı sıfırdan çiziyorsa points state'ini kullanacağız.
        const rawPoints = firstRing.slice(0, firstRing.length - 1); // son nokta tekrarı
        setPoints(rawPoints);
      }
    }
  }, []);

  const handleMapClick = (lngLat) => {
    const newPoints = sortPointsClockwise([...points, lngLat]);
    setPoints(newPoints);
    updateParent(newPoints);
  };

  const handleClear = () => {
    setPoints([]);
    updateParent([]);
  };

  const handleDeletePoint = (index) => {
    const remaining = points.filter((_, i) => i !== index);
    const newPoints = sortPointsClockwise(remaining); // Sildikten sonra tekrar sırala
    setPoints(newPoints);
    updateParent(newPoints);
  };

  const updateParent = (pts) => {
    if (pts.length < 3) {
      onChange(null); // Yeterli nokta yoksa null gönder (hata veya boş)
      return;
    }
    
    // GeoJSON polygon ring kuralı: İlk ve son nokta aynı olmalıdır
    const geoJsonRing = [...pts, pts[0]]; 
    onChange([geoJsonRing]);
  };

  // react-leaflet Polygon ve Marker bileşenleri [lat, lng] formatı bekler
  const leafletPoints = points.map(p => [p[1], p[0]]);

  return (
    <div className="relative w-full h-[250px] rounded-md overflow-hidden border border-gray-200 shadow-sm">
      <div className="absolute top-2 right-2 z-[400] flex gap-2">
        <Button 
          type="button" 
          variant="destructive" 
          size="sm" 
          onClick={handleClear}
          className="shadow-md"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Temizle
        </Button>
      </div>
      
      <MapContainer 
        center={[41.0082, 28.9784]} // İstanbul
        zoom={11} 
        scrollWheelZoom={false} // Mouse tekerleği ile zoom tamamen kapatıldı
        style={{ height: '100%', width: '100%', zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapClickHandler onMapClick={handleMapClick} />

        {/* Seçilen noktaları göster (CircleMarker imaj gerektirmez, sorunsuzdur) */}
        {leafletPoints.map((pos, idx) => (
          <CircleMarker 
            key={idx} 
            center={pos} 
            radius={6} 
            color="#2563eb" // Mavi çizgi
            fillColor="#3b82f6" // Açık mavi dolgu
            fillOpacity={0.8}
            eventHandlers={{
              contextmenu: (e) => {
                // Tarayıcı sağ tık menüsünü haritada engellemek için e.originalEvent.preventDefault() kullanabiliriz,
                // ama leaflet bunu otomatik yönetir, yine de noktayı silmek için fonksiyonu çağırıyoruz.
                handleDeletePoint(idx);
              }
            }}
          />
        ))}

        {/* 3 veya daha fazla nokta varsa Çokgeni (Polygon) çiz */}
        {leafletPoints.length >= 3 && (
          <Polygon 
            positions={leafletPoints} 
            color="#16a34a" 
            fillColor="#22c55e" 
            fillOpacity={0.3} 
          />
        )}
      </MapContainer>
    </div>
  );
}
