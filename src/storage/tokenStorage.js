import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_SESSION_STORAGE_KEY = '@vip_transfer/auth_session';

function normalizeAuthSession(authResponse) {
  if (!authResponse || typeof authResponse !== 'object') {
    return null;
  }

  const { accessToken, tokenType, role } = authResponse;

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

  return {
    accessToken: accessToken.trim(),
    tokenType: tokenType.trim(),
    role: role.trim(),
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
