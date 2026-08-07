const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const MIN_REQUEST_INTERVAL_MS = 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_HEADERS = {
  Accept: 'application/json',
  'Accept-Language': 'tr',
  Referer: 'https://vip-transfer.app',
  'User-Agent': 'VIPTransferMobile/1.0',
};

const searchCache = new Map();
const reverseCache = new Map();
let requestQueue = Promise.resolve();
let lastRequestStartedAt = 0;

function createAbortError() {
  const error = new Error('İstek iptal edildi.');
  error.name = 'AbortError';
  return error;
}

function wait(ms, signal) {
  if (ms <= 0) return Promise.resolve();
  if (signal?.aborted) return Promise.reject(createAbortError());

  return new Promise((resolve, reject) => {
    function handleAbort() {
      clearTimeout(timer);
      reject(createAbortError());
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

function runRateLimited(request, signal) {
  const run = async () => {
    if (signal?.aborted) throw createAbortError();

    const elapsed = Date.now() - lastRequestStartedAt;
    await wait(Math.max(0, MIN_REQUEST_INTERVAL_MS - elapsed), signal);

    if (signal?.aborted) throw createAbortError();
    lastRequestStartedAt = Date.now();
    return request();
  };

  const result = requestQueue.then(run, run);
  requestQueue = result.catch(() => undefined);
  return result;
}

function getCached(cache, key) {
  const cached = cache.get(key);

  if (!cached) return null;
  if (Date.now() - cached.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return cached.value;
}

function setCached(cache, key, value) {
  cache.set(key, { value, createdAt: Date.now() });
  return value;
}

function normalizeCoordinate(value) {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

function createPlaceId(placeId, latitude, longitude) {
  if (placeId !== null && placeId !== undefined) return `nominatim:${placeId}`;
  return `nominatim:${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}

function pickDisplayName(item) {
  const address = item?.address;
  return (
    item?.name ||
    address?.amenity ||
    address?.building ||
    address?.road ||
    address?.suburb ||
    address?.town ||
    address?.city ||
    String(item?.display_name || '').split(',')[0].trim()
  );
}

function normalizeLocation(item) {
  const latitude = normalizeCoordinate(item?.lat);
  const longitude = normalizeCoordinate(item?.lon);
  const address = typeof item?.display_name === 'string' ? item.display_name.trim() : '';

  if (latitude === null || longitude === null || !address) return null;

  const id = item?.place_id ?? null;
  return {
    id,
    placeId: createPlaceId(id, latitude, longitude),
    displayName: pickDisplayName(item) || address,
    address,
    latitude,
    longitude,
    type: typeof item?.type === 'string' ? item.type : null,
    source: 'nominatim',
  };
}

async function readResponse(response) {
  if (response.status === 403) {
    throw new Error('Adres servisi bu isteğe izin vermedi. Lütfen daha sonra tekrar deneyin.');
  }
  if (response.status === 429) {
    throw new Error('Adres servisi şu anda yoğun. Lütfen kısa bir süre sonra tekrar deneyin.');
  }
  if (!response.ok) {
    throw new Error('Adres servisine ulaşılamadı. İnternet bağlantınızı kontrol edin.');
  }

  return response.json().catch(() => {
    throw new Error('Adres servisinden geçersiz bir yanıt alındı.');
  });
}

export async function searchLocations(query, { signal } = {}) {
  const normalizedQuery = String(query ?? '').trim();
  if (normalizedQuery.length < 3) {
    throw new Error('Adres aramak için en az 3 karakter yazın.');
  }

  const cacheKey = normalizedQuery.toLocaleLowerCase('tr-TR');
  const cached = getCached(searchCache, cacheKey);
  if (cached) return cached.map((item) => ({ ...item }));

  const params = new URLSearchParams({
    q: normalizedQuery,
    format: 'json',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'tr',
    'accept-language': 'tr',
  });

  const data = await runRateLimited(
    async () => {
      const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
        headers: REQUEST_HEADERS,
        signal,
      });
      return readResponse(response);
    },
    signal,
  );

  const results = Array.isArray(data)
    ? data.map(normalizeLocation).filter(Boolean).slice(0, 5)
    : [];

  return setCached(searchCache, cacheKey, results).map((item) => ({ ...item }));
}

export async function reverseGeocode(latitude, longitude, { signal } = {}) {
  const normalizedLatitude = normalizeCoordinate(latitude);
  const normalizedLongitude = normalizeCoordinate(longitude);

  if (normalizedLatitude === null || normalizedLongitude === null) {
    throw new Error('Haritadan geçerli bir konum seçilemedi.');
  }

  const cacheKey = `${normalizedLatitude.toFixed(5)},${normalizedLongitude.toFixed(5)}`;
  const cached = getCached(reverseCache, cacheKey);
  if (cached) return { ...cached };

  const params = new URLSearchParams({
    lat: String(normalizedLatitude),
    lon: String(normalizedLongitude),
    format: 'json',
    addressdetails: '1',
    'accept-language': 'tr',
  });

  const data = await runRateLimited(
    async () => {
      const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params}`, {
        headers: REQUEST_HEADERS,
        signal,
      });
      return readResponse(response);
    },
    signal,
  );
  const location = normalizeLocation(data);

  if (!location) {
    throw new Error('Seçilen koordinat için adres bulunamadı.');
  }

  return { ...setCached(reverseCache, cacheKey, location) };
}
