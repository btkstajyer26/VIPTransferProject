import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import useAuth from '../hooks/useAuth';
import { useLocalization } from '../localization/LocalizationContext';
import { useTheme } from '../theme/ThemeContext';
import AdminNavigator from './AdminNavigator';
import EmailVerificationScreen from '../screens/EmailVerificationScreen';
import GuestInfoScreen from '../screens/GuestInfoScreen';
import HomeScreen from '../screens/HomeScreen';
import LanguageSettingsScreen from '../screens/LanguageSettingsScreen';
import LoginScreen from '../screens/LoginScreen';
import NotificationPreferencesScreen from '../screens/NotificationPreferencesScreen';
import ReservationDetailsScreen from '../screens/ReservationDetailsScreen';
import ReservationLookupScreen from '../screens/ReservationLookupScreen';
import ReservationScreen from '../screens/ReservationScreen';
import ReservationsScreen from '../screens/ReservationsScreen';
import ThemeSettingsScreen from '../screens/ThemeSettingsScreen';
import TransferSearchScreen from '../screens/TransferSearchScreen';
import VehicleSelectionScreen from '../screens/VehicleSelectionScreen';
import WelcomeScreen from '../screens/WelcomeScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { theme, isDark } = useTheme();
  const { t } = useLocalization();
  const { isAuthenticated, isInitializing, role } = useAuth();
  const isAdmin = isAuthenticated && role?.trim().toUpperCase() === 'ADMIN';
  const navigationTheme = useMemo(() => {
    const baseTheme = isDark ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: theme.accent,
        background: theme.background,
        card: theme.headerBackground,
        text: theme.headerText,
        border: theme.border,
      },
    };
  }, [isDark, theme]);

  if (isInitializing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {isAdmin ? (
        <AdminNavigator />
      ) : (
        <Stack.Navigator
          initialRouteName="Welcome"
          screenOptions={{
            headerStyle: { backgroundColor: theme.headerBackground },
            headerTintColor: theme.headerText,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: theme.background },
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: t('nav.login') }} />
          <Stack.Screen name="TransferSearch" component={TransferSearchScreen} options={{ title: t('nav.transferSearch') }} />
          <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} options={{ title: t('nav.appearance') }} />
          <Stack.Screen name="LanguageSettings" component={LanguageSettingsScreen} options={{ title: t('nav.language') }} />
          <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} options={{ title: t('nav.notifications') }} />
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} options={{ title: t('nav.emailVerification') }} />
          <Stack.Screen name="VehicleSelection" component={VehicleSelectionScreen} options={{ title: t('nav.vehicleSelection') }} />
          <Stack.Screen name="GuestInfo" component={GuestInfoScreen} options={{ title: t('nav.guestInfo') }} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'VIP Transfer' }} />
          <Stack.Screen name="Reservation" component={ReservationScreen} options={{ title: t('nav.reservation') }} />
          <Stack.Screen name="Reservations" component={ReservationsScreen} options={{ title: t('nav.reservations') }} />
          <Stack.Screen name="ReservationLookup" component={ReservationLookupScreen} options={{ title: t('nav.reservationLookup') }} />
          <Stack.Screen name="ReservationDetails" component={ReservationDetailsScreen} options={{ title: t('nav.reservationDetails') }} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

