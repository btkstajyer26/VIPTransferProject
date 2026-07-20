import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import GuestInfoScreen from '../screens/GuestInfoScreen';
import HomeScreen from '../screens/HomeScreen';
import ReservationScreen from '../screens/ReservationScreen';
import ReservationsScreen from '../screens/ReservationsScreen';
import colors from '../theme/colors';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.card,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
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
