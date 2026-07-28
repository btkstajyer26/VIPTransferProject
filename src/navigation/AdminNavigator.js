import { createNativeStackNavigator } from '@react-navigation/native-stack';

import useAuth from '../hooks/useAuth';
import AdminCampaignsScreen from '../screens/admin/AdminCampaignsScreen';
import AdminCampaignFormScreen from '../screens/admin/AdminCampaignFormScreen';
import AdminCampaignDetailScreen from '../screens/admin/AdminCampaignDetailScreen';
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import AdminPricingRulesScreen from '../screens/admin/AdminPricingRulesScreen';
import AdminPricingRuleFormScreen from '../screens/admin/AdminPricingRuleFormScreen';
import AdminPricingZonesScreen from '../screens/admin/AdminPricingZonesScreen';
import AdminPricingZoneFormScreen from '../screens/admin/AdminPricingZoneFormScreen';
import AdminReservationsScreen from '../screens/admin/AdminReservationsScreen';
import AdminReservationDetailScreen from '../screens/admin/AdminReservationDetailScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminVehiclesScreen from '../screens/admin/AdminVehiclesScreen';
import AdminVehicleFormScreen from '../screens/admin/AdminVehicleFormScreen';
import { useTheme } from '../theme/ThemeContext';
import { ADMIN_ROUTES } from './adminRoutes';

const Stack = createNativeStackNavigator();

export default function AdminNavigator() {
  const { isAuthenticated, role } = useAuth();
  const { theme } = useTheme();
  const isAdmin = isAuthenticated && role?.trim().toUpperCase() === 'ADMIN';

  if (!isAdmin) {
    return null;
  }

  return (
    <Stack.Navigator
      initialRouteName={ADMIN_ROUTES.HOME}
      screenOptions={{
        headerStyle: { backgroundColor: theme.headerBackground },
        headerTintColor: theme.headerText,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen
        name={ADMIN_ROUTES.HOME}
        component={AdminHomeScreen}
        options={{ title: 'Yönetim Paneli', headerBackVisible: false }}
      />
      <Stack.Screen
        name={ADMIN_ROUTES.USERS}
        component={AdminUsersScreen}
        options={{ title: 'Kullanıcı Yönetimi' }}
      />
      <Stack.Screen
        name={ADMIN_ROUTES.VEHICLES}
        component={AdminVehiclesScreen}
        options={{ title: 'Araç Yönetimi' }}
      />
      <Stack.Screen
        name={ADMIN_ROUTES.VEHICLE_FORM}
        component={AdminVehicleFormScreen}
        options={({ route }) => ({
          title: route.params?.mode === 'edit' ? 'Aracı Düzenle' : 'Yeni Araç',
        })}
      />
      <Stack.Screen
        name={ADMIN_ROUTES.RESERVATIONS}
        component={AdminReservationsScreen}
        options={{ title: 'Rezervasyon Yönetimi' }}
      />
      <Stack.Screen
        name={ADMIN_ROUTES.RESERVATION_DETAIL}
        component={AdminReservationDetailScreen}
        options={{ title: 'Rezervasyon Detayı' }}
      />
      <Stack.Screen
        name={ADMIN_ROUTES.PRICING_ZONES}
        component={AdminPricingZonesScreen}
        options={{ title: 'Fiyat Bölgeleri' }}
      />
      <Stack.Screen
        name={ADMIN_ROUTES.PRICING_ZONE_FORM}
        component={AdminPricingZoneFormScreen}
        options={({ route }) => ({
          title: route.params?.mode === 'edit' ? 'Bölgeyi Düzenle' : 'Yeni Fiyat Bölgesi',
        })}
      />
      <Stack.Screen
        name={ADMIN_ROUTES.PRICING_RULES}
        component={AdminPricingRulesScreen}
        options={{ title: 'Fiyat Kuralları' }}
      />
      <Stack.Screen
        name={ADMIN_ROUTES.PRICING_RULE_FORM}
        component={AdminPricingRuleFormScreen}
        options={({ route }) => ({
          title: route.params?.mode === 'edit' ? 'Kuralı Düzenle' : 'Yeni Fiyat Kuralı',
        })}
      />
      <Stack.Screen
        name={ADMIN_ROUTES.CAMPAIGNS}
        component={AdminCampaignsScreen}
        options={{ title: 'Kampanyalar' }}
      />
      <Stack.Screen
        name={ADMIN_ROUTES.CAMPAIGN_FORM}
        component={AdminCampaignFormScreen}
        options={({ route }) => ({
          title: route.params?.mode === 'edit' ? 'Kampanyayı Düzenle' : 'Yeni Kampanya',
        })}
      />
      <Stack.Screen
        name={ADMIN_ROUTES.CAMPAIGN_DETAIL}
        component={AdminCampaignDetailScreen}
        options={{ title: 'Kampanya Detayı' }}
      />
    </Stack.Navigator>
  );
}
