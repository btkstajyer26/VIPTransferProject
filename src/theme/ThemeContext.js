import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import colors from './colors';
import { darkTheme, lightTheme } from './themes';

const THEME_STORAGE_KEY = 'vip_transfer_theme';
const SUPPORTED_THEME_MODES = ['light', 'dark'];

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState('dark');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function restoreTheme() {
      try {
        const storedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (isMounted && SUPPORTED_THEME_MODES.includes(storedMode)) {
          setThemeModeState(storedMode);
        }
      } catch {
        if (isMounted) setThemeModeState('dark');
      } finally {
        if (isMounted) setIsReady(true);
      }
    }

    restoreTheme();
    return () => {
      isMounted = false;
    };
  }, []);

  const setThemeMode = useCallback(async (nextMode) => {
    if (!SUPPORTED_THEME_MODES.includes(nextMode)) return;

    setThemeModeState(nextMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
    } catch {
      setThemeModeState('dark');
    }
  }, []);

  const theme = themeMode === 'light' ? lightTheme : darkTheme;
  const contextValue = useMemo(
    () => ({ theme, themeMode, setThemeMode, isDark: themeMode === 'dark' }),
    [setThemeMode, theme, themeMode],
  );

  if (!isReady) {
    return <View style={styles.loadingContainer} />;
  }

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme, ThemeProvider içinde kullanılmalıdır.');
  return context;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.primary,
  },
});
