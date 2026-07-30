import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAdminReservations } from '../../api/admin/adminReservationApi';
import AdminReservationCard from '../../components/admin/reservation/AdminReservationCard';
import useAuth from '../../hooks/useAuth';
import { ADMIN_ROUTES } from '../../navigation/adminRoutes';
import { createAdminReservationStyles } from '../../styles/admin/adminReservationStyles';
import { useTheme } from '../../theme/ThemeContext';
import { getReservationErrorMessage } from '../../utils/adminReservationError';
import {
  getReservationStatusLabel,
  RESERVATION_STATUSES,
} from '../../utils/reservationStatus';

const FILTERS = ['ALL', ...RESERVATION_STATUSES];

export default function AdminReservationsScreen({ navigation }) {
  const { logout, role } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createAdminReservationStyles(theme), [theme]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const isAdmin = role?.trim().toUpperCase() === 'ADMIN';

  const loadReservations = useCallback(async (refresh = false) => {
    if (!isAdmin) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      setReservations(await getAdminReservations());
    } catch (requestError) {
      if (requestError?.status === 401) await logout();
      else setError(getReservationErrorMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, logout]);

  useFocusEffect(useCallback(() => {
    loadReservations();
  }, [loadReservations]));

  const filteredReservations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return reservations.filter((reservation) => {
      const matchesSearch =
        !query ||
        [
          reservation.bookingReference,
          reservation.guestPhone,
          reservation.pickupAddress,
          reservation.dropoffAddress,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase('tr-TR').includes(query));
      return matchesSearch && (statusFilter === 'ALL' || reservation.status === statusFilter);
    });
  }, [reservations, search, statusFilter]);

  if (!isAdmin) return null;

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={filteredReservations}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadReservations(true)} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.headingRow}>
              <Text style={styles.heading}>Rezervasyonlar</Text>
              <Text style={styles.count}>{filteredReservations.length} kayıt</Text>
            </View>
            <TextInput
              onChangeText={setSearch}
              placeholder="Kod, telefon veya adres ara"
              placeholderTextColor={theme.placeholder}
              style={styles.search}
              value={search}
            />
            <View style={styles.filterRow}>
              {FILTERS.map((status) => {
                const selected = statusFilter === status;
                return (
                  <Pressable
                    key={status}
                    onPress={() => setStatusFilter(status)}
                    style={[styles.filter, selected && styles.filterSelected]}
                  >
                    <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                      {status === 'ALL' ? 'Tümü' : getReservationStatusLabel(status)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.state}>
            {loading ? <ActivityIndicator color={theme.accent} size="large" /> : null}
            <Text style={styles.stateTitle}>
              {loading ? 'Rezervasyonlar yükleniyor' : error ? 'Rezervasyonlar alınamadı' : 'Henüz rezervasyon bulunmuyor.'}
            </Text>
            {error ? <Text style={styles.stateText}>{error}</Text> : null}
            {error ? (
              <Pressable onPress={loadReservations} style={styles.retry}>
                <Text style={styles.retryText}>Tekrar Dene</Text>
              </Pressable>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <AdminReservationCard
            onDetail={() =>
              navigation.navigate(ADMIN_ROUTES.RESERVATION_DETAIL, { reservationId: item.id })
            }
            reservation={item}
            styles={styles}
          />
        )}
      />
    </SafeAreaView>
  );
}
