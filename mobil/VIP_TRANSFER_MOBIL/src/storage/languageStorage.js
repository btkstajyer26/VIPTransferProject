import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../localization/resources';

const LANGUAGE_STORAGE_KEY = '@vip_transfer/language';

export function normalizeLanguage(language) {
  const normalized = String(language || '').trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : DEFAULT_LANGUAGE;
}

export async function getStoredLanguage() {
  try {
    return normalizeLanguage(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export async function saveLanguage(language) {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, normalizeLanguage(language));
    return true;
  } catch {
    return false;
  }
}

