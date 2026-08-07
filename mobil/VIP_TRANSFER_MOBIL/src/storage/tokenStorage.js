import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_SESSION_STORAGE_KEY = '@vip_transfer/auth_session';

function decodeJwtPayload(accessToken) {
  const payload = accessToken.split('.')[1];

  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = globalThis.atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function hasCurrentAccessToken(accessToken) {
  const payload = decodeJwtPayload(accessToken);
  return Number.isFinite(Number(payload?.exp)) && Number(payload.exp) * 1000 > Date.now();
}

function normalizeAuthSession(authResponse) {
  if (!authResponse || typeof authResponse !== 'object') {
    return null;
  }

  const { accessToken, refreshToken, tokenType, role, userId } = authResponse;

  if (
    typeof accessToken !== 'string' ||
    !accessToken.trim() ||
    typeof tokenType !== 'string' ||
    !tokenType.trim() ||
    typeof role !== 'string' ||
    !role.trim()
  ) {
    return null;
  }

  const normalizedTokenType = tokenType.trim();
  const tokenPrefixPattern = new RegExp(`^${normalizedTokenType}\\s+`, 'i');
  const normalizedAccessToken = accessToken.trim().replace(tokenPrefixPattern, '');

  if (!normalizedAccessToken || !hasCurrentAccessToken(normalizedAccessToken)) {
    return null;
  }

  return {
    accessToken: normalizedAccessToken,
    refreshToken:
      typeof refreshToken === 'string' && refreshToken.trim() ? refreshToken.trim() : null,
    tokenType: normalizedTokenType,
    role: role.trim().toUpperCase(),
    userId: Number.isFinite(Number(userId)) ? Number(userId) : null,
  };
}

export async function saveAuthSession(authResponse) {
  const session = normalizeAuthSession(authResponse);

  if (!session) {
    return null;
  }

  try {
    await AsyncStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  } catch (error) {
    console.warn('Oturum bilgileri kaydedilemedi.', error);
    return null;
  }
}

export async function getAuthSession() {
  try {
    const storedSession = await AsyncStorage.getItem(AUTH_SESSION_STORAGE_KEY);

    if (!storedSession) {
      return null;
    }

    const session = normalizeAuthSession(JSON.parse(storedSession));

    if (!session) {
      await AsyncStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      return null;
    }

    return session;
  } catch (error) {
    console.warn('Oturum bilgileri okunamadı.', error);
    return null;
  }
}

export async function getAccessToken() {
  const session = await getAuthSession();
  return session?.accessToken ?? null;
}

export async function clearAuthSession() {
  try {
    await AsyncStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch (error) {
    console.warn('Oturum bilgileri temizlenemedi.', error);
  }
}
