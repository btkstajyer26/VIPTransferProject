import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AdminDashboardCard from '../../components/admin/AdminDashboardCard';
import useAuth from '../../hooks/useAuth';
import { ADMIN_ROUTES } from '../../navigation/adminRoutes';
import { createAdminHomeStyles } from '../../styles/admin/adminHomeStyles';
import { useTheme } from '../../theme/ThemeContext';

const MANAGEMENT_CARDS = [
  {
    route: ADMIN_ROUTES.USERS,
    title: 'Kullanıcılar',
    description: 'Sistemdeki kullanıcıları görüntüleyin ve yönetin.',
  },
  {
    route: ADMIN_ROUTES.VEHICLES,
    title: 'Araçlar',
    description: 'Filo araçlarını ekleyin, düzenleyin ve durumlarını yönetin.',
  },
  {
    route: ADMIN_ROUTES.RESERVATIONS,
    title: 'Rezervasyonlar',
    description: 'Rezervasyonları görüntüleyin ve durumlarını güncelleyin.',
  },
  {
    route: ADMIN_ROUTES.PRICING_ZONES,
    title: 'Fiyat Bölgeleri',
    description: 'Transfer bölgelerini ve bölgesel fiyat yapılarını yönetin.',
  },
  {
    route: ADMIN_ROUTES.PRICING_RULES,
    title: 'Fiyat Kuralları',
    description: 'Tarih, saat ve yoğunluğa bağlı fiyat kurallarını yönetin.',
  },
  {
    route: ADMIN_ROUTES.CAMPAIGNS,
    title: 'Kampanyalar',
    description: 'Kampanya kodlarını, indirimleri ve geçerlilik durumlarını yönetin.',
  },
];

export default function AdminHomeScreen({ navigation }) {
  const { logout } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createAdminHomeStyles(theme), [theme]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      await logout();
    } catch {
      setIsLoggingOut(false);
      Alert.alert('Çıkış yapılamadı', 'Lütfen tekrar deneyin.');
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>VIP TRANSFER</Text>
        <Text style={styles.title}>Yönetim merkezi</Text>
        <Text style={styles.subtitle}>
          Operasyon, filo ve fiyatlandırma süreçlerine tek noktadan erişin.
        </Text>

        {MANAGEMENT_CARDS.map((card) => (
          <AdminDashboardCard
            key={card.route}
            {...card}
            onPress={() => navigation.navigate(card.route)}
            styles={styles}
          />
        ))}

        <Pressable
          accessibilityRole="button"
          disabled={isLoggingOut}
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            isLoggingOut && styles.logoutButtonDisabled,
            pressed && !isLoggingOut && styles.logoutButtonPressed,
          ]}
        >
          <Text style={styles.logoutText}>
            {isLoggingOut ? 'Çıkış yapılıyor...' : 'Çıkış Yap'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
