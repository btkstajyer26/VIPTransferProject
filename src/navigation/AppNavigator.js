import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import GuestInfoScreen from '../screens/GuestInfoScreen';
import TransferSearchScreen from '../screens/TransferSearchScreen';
import HomeScreen from '../screens/HomeScreen';
import ReservationScreen from '../screens/ReservationScreen';
import ReservationsScreen from '../screens/ReservationsScreen';
import ThemeSettingsScreen from '../screens/ThemeSettingsScreen';
import { useTheme } from '../theme/ThemeContext';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { theme, isDark } = useTheme();
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

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerStyle: { backgroundColor: theme.headerBackground },
          headerTintColor: theme.headerText,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'Giris Yap' }}
        />
        <Stack.Screen
          name="TransferSearch"
          component={TransferSearchScreen}
          options={{ title: 'Transfer Planla' }}
        />
        <Stack.Screen
          name="ThemeSettings"
          component={ThemeSettingsScreen}
          options={{ title: 'Tema Seçimi' }}
        />
        <Stack.Screen
          name="GuestInfo"
          component={GuestInfoScreen}
          options={{ title: 'Misafir Bilgileri' }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'VIP Transfer' }}
        />
        <Stack.Screen
          name="Reservation"
          component={ReservationScreen}
          options={{ title: 'Rezervasyon' }}
        />
        <Stack.Screen
          name="Reservations"
          component={ReservationsScreen}
          options={{ title: 'Rezervasyonlarim' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
