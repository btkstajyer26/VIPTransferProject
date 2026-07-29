const NOMINATIM_BASE_URL =
  "https://nominatim.openstreetmap.org";

const DEFAULT_HEADERS = {
  Accept: "application/json",
};

function normalizeLocation(item) {
  return {
    address: item.display_name || "",
    latitude: Number(item.lat),
    longitude: Number(item.lon),
    placeId: item.place_id
      ? String(item.place_id)
      : "",
    osmId: item.osm_id
      ? String(item.osm_id)
      : "",
    osmType: item.osm_type || "",
    type: item.type || "",
    category: item.category || "",
  };
}

export async function searchAddress(
  query,
  signal,
) {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 3) {
    return [];
  }

  const params = new URLSearchParams({
    q: normalizedQuery,
    format: "jsonv2",
    addressdetails: "1",
    limit: "6",
    countrycodes: "tr",
    "accept-language": "tr",
  });

  const response = await fetch(
    `${NOMINATIM_BASE_URL}/search?${params.toString()}`,
    {
      method: "GET",
      headers: DEFAULT_HEADERS,
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      "Adres arama servisine ulaşılamadı.",
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map(normalizeLocation)
    .filter(
      (location) =>
        Number.isFinite(location.latitude) &&
        Number.isFinite(location.longitude),
    );
}

export async function reverseGeocode(
  latitude,
  longitude,
  signal,
) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    throw new Error(
      "Geçerli koordinat bilgisi bulunamadı.",
    );
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: "jsonv2",
    addressdetails: "1",
    zoom: "18",
    "accept-language": "tr",
  });

  const response = await fetch(
    `${NOMINATIM_BASE_URL}/reverse?${params.toString()}`,
    {
      method: "GET",
      headers: DEFAULT_HEADERS,
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      "Koordinata ait adres bulunamadı.",
    );
  }

  const data = await response.json();

  if (!data?.display_name) {
    throw new Error(
      "Bu koordinat için adres sonucu bulunamadı.",
    );
  }

  return normalizeLocation(data);
}