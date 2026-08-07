import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getTranslations } from '../api/translationApi';
import { getStoredLanguage, normalizeLanguage, saveLanguage } from '../storage/languageStorage';
import { DEFAULT_LANGUAGE, resources } from './resources';

const LocalizationContext = createContext(null);

function interpolate(value, params) {
  return Object.entries(params || {}).reduce(
    (text, [key, replacement]) =>
      text.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(replacement)),
    value,
  );
}

export function LocalizationProvider({ children }) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [translations, setTranslations] = useState(resources[DEFAULT_LANGUAGE]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [usesLocalFallback, setUsesLocalFallback] = useState(false);

  const loadLanguage = useCallback(async (nextLanguage) => {
    const normalized = normalizeLanguage(nextLanguage);
    setLanguageState(normalized);
    setTranslations(resources[normalized]);

    try {
      const remoteTranslations = await getTranslations(normalized);
      setTranslations({ ...resources[normalized], ...remoteTranslations });
      setUsesLocalFallback(false);
    } catch {
      setUsesLocalFallback(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    getStoredLanguage()
      .then((storedLanguage) => (mounted ? loadLanguage(storedLanguage) : null))
      .finally(() => {
        if (mounted) setIsInitializing(false);
      });
    return () => {
      mounted = false;
    };
  }, [loadLanguage]);

  const changeLanguage = useCallback(
    async (nextLanguage) => {
      const normalized = normalizeLanguage(nextLanguage);
      const wasSaved = await saveLanguage(normalized);
      await loadLanguage(normalized);
      return wasSaved;
    },
    [loadLanguage],
  );

  const t = useCallback(
    (key, params) => interpolate(translations[key] ?? resources[language]?.[key] ?? key, params),
    [language, translations],
  );

  const value = useMemo(
    () => ({
      language,
      locale: language === 'en' ? 'en-US' : 'tr-TR',
      isInitializing,
      usesLocalFallback,
      setLanguage: changeLanguage,
      t,
    }),
    [changeLanguage, isInitializing, language, t, usesLocalFallback],
  );

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) throw new Error('useLocalization must be used inside LocalizationProvider.');
  return context;
}

