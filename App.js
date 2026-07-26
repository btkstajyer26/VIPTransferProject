import { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { ReservationDraftProvider } from './src/context/ReservationDraftContext';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

function AppContent() {
  const { isDark } = useTheme();

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setStyle(isDark ? 'dark' : 'light');
    }
  }, [isDark]);

  return (
    <AuthProvider>
      <ReservationDraftProvider>
        <AppNavigator />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </ReservationDraftProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
