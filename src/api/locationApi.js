import popularLocations from '../data/popularLocations';

function normalizeSearchText(value) {
  return String(value)
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');
}

// TODO: Backend location autocomplete endpoint'i hazır olduğunda
// searchLocations fonksiyonu apiClient üzerinden GET isteğine çevrilecek.
// GET /api/v1/locations/autocomplete?input={query}
export async function searchLocations(query) {
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery.length < 2) {
    return [];
  }

  return popularLocations
    .filter((location) => {
      const searchableText = normalizeSearchText(`${location.displayName} ${location.address}`);
      return searchableText.includes(normalizedQuery);
    })
    .slice(0, 5)
    .map((location) => ({ ...location }));
}

// TODO: Backend location details endpoint'i hazır olduğunda
// getLocationDetails fonksiyonu apiClient üzerinden GET isteğine çevrilecek.
// GET /api/v1/locations/{placeId}
export async function getLocationDetails(placeId) {
  if (typeof placeId !== 'string' || !placeId.trim()) {
    throw new Error('Konum kimliği gerekli.');
  }

  const location = popularLocations.find((item) => item.placeId === placeId.trim());

  if (!location) {
    throw new Error('Seçilen konumun detayları bulunamadı.');
  }

  return { ...location };
}
