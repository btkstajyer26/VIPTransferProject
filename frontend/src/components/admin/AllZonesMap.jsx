import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const COLOR_PALETTE = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#ec4899', // pink-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
];

export default function AllZonesMap({ zones }) {
  // Haritayı ilk bölgeye göre veya İstanbul'a göre ortala
  const mapCenter = useMemo(() => {
    if (zones && zones.length > 0 && zones[0].polygon?.coordinates?.length > 0) {
       const firstRing = zones[0].polygon.coordinates[0];
       if (firstRing && firstRing.length > 0) {
         return [firstRing[0][1], firstRing[0][0]]; // [lat, lng]
       }
    }
    return [41.0082, 28.9784]; // Varsayılan İstanbul
  }, [zones]);

  return (
    <div className="w-full h-full min-h-[400px] lg:min-h-[600px] rounded-xl overflow-hidden border border-slate-200 shadow-sm relative">
      <MapContainer 
        center={mapCenter} 
        zoom={10} 
        scrollWheelZoom={false} // Sayfa kaydırmasını engellememesi için kapalı (kullanıcı sadece +/- kullanabilir)
        style={{ height: '100%', width: '100%', position: 'absolute', inset: 0, zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {zones && zones.map((zone, index) => {
          if (!zone.polygon || !zone.polygon.coordinates || !zone.polygon.coordinates[0]) return null;
          
          const rawCoords = zone.polygon.coordinates[0];
          const leafletPoints = rawCoords.map(p => [p[1], p[0]]); // Leaflet [lat, lng] bekler
          
          // ID'ye veya sıraya göre renk seçimi
          const color = COLOR_PALETTE[index % COLOR_PALETTE.length];

          return (
            <Polygon 
              key={zone.id}
              positions={leafletPoints} 
              color={color} 
              fillColor={color} 
              fillOpacity={0.35} 
              weight={2}
            >
              <Popup>
                <div className="font-sans min-w-[150px]">
                  <h3 className="font-bold text-base mb-1 text-slate-900">{zone.name}</h3>
                  {zone.description && (
                    <div className="text-sm text-slate-500 mb-2">{zone.description}</div>
                  )}
                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100 text-sm">
                    <span className="font-semibold text-slate-700">Açılış:</span>
                    <span className="font-bold text-slate-900">{zone.basePrice} {zone.currency}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100 mt-1 text-sm">
                    <span className="font-semibold text-slate-700">Min. Tutar:</span>
                    <span className="font-bold text-slate-900">{zone.minPrice} {zone.currency}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100 mt-1 text-sm">
                    <span className="font-semibold text-slate-700">Km Fiyatı:</span>
                    <span className="font-bold text-slate-900">{zone.pricePerKm} {zone.currency}</span>
                  </div>
                </div>
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>
    </div>
  );
}
