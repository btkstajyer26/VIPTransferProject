import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteAdminPricingZone, getAdminPricingZones } from '../../api/admin/adminPricingZoneApi';
import { AdminFilterChips, AdminListState, AdminSearchInput, AdminStatusBadge } from '../../components/admin/AdminUi';
import useAuth from '../../hooks/useAuth';
import { ADMIN_ROUTES } from '../../navigation/adminRoutes';
import { createAdminManagementStyles } from '../../styles/admin/adminManagementStyles';
import { useTheme } from '../../theme/ThemeContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { pricingError } from '../../utils/adminPricing';
import { formatDateTime } from '../../utils/formatDateTime';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Tümü' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'PASSIVE', label: 'Pasif' },
];

export default function AdminPricingZonesScreen({ navigation }) {
  const { logout, role } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createAdminManagementStyles(theme), [theme]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [currency, setCurrency] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);
  const lock = useRef(false);
  const isAdmin = role?.trim().toUpperCase() === 'ADMIN';

  const load = useCallback(async (refresh = false) => {
    if (!isAdmin) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      setZones(await getAdminPricingZones());
    } catch (requestError) {
      if (requestError?.status === 401) await logout();
      else setError(pricingError(requestError, 'zone'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, logout]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const currencies = useMemo(
    () => ['ALL', ...new Set(zones.map((zone) => zone.currency).filter(Boolean))]
      .map((value) => ({ value, label: value === 'ALL' ? 'Tüm para birimleri' : value })),
    [zones],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return zones.filter((zone) => {
      const matchesSearch = !query || [zone.name, zone.description].filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('tr-TR').includes(query));
      const matchesStatus = status === 'ALL' || (status === 'ACTIVE' ? zone.active : !zone.active);
      return matchesSearch && matchesStatus && (currency === 'ALL' || zone.currency === currency);
    });
  }, [currency, search, status, zones]);

  async function remove(zone) {
    if (lock.current) return;
    lock.current = true;
    setDeletingId(zone.id);
    try {
      await deleteAdminPricingZone(zone.id);
      setZones((current) => current.filter((item) => item.id !== zone.id));
    } catch (requestError) {
      if (requestError?.status === 401) await logout();
      else Alert.alert('Silme işlemi tamamlanamadı', pricingError(requestError, 'zone', 'delete'));
    } finally {
      lock.current = false;
      setDeletingId(null);
    }
  }

  function confirmDelete(zone) {
    Alert.alert('Fiyat bölgesini sil', 'Bu fiyat bölgesini silmek istediğinizden emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => remove(zone) },
    ]);
  }

  if (!isAdmin) return null;
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.content}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <Text style={styles.heading}>Fiyat Bölgeleri</Text>
              <Pressable onPress={() => navigation.navigate(ADMIN_ROUTES.PRICING_ZONE_FORM, { mode: 'create' })} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Yeni Bölge</Text>
              </Pressable>
            </View>
            <AdminSearchInput onChangeText={setSearch} placeholder="Bölge adı veya açıklama ara" styles={styles} value={search} />
            <Text style={styles.filterLabel}>DURUM</Text>
            <AdminFilterChips options={STATUS_FILTERS} onSelect={setStatus} selected={status} styles={styles} />
            <Text style={styles.filterLabel}>PARA BİRİMİ</Text>
            <AdminFilterChips options={currencies} onSelect={setCurrency} selected={currency} styles={styles} />
          </>
        }
        ListEmptyComponent={
          <AdminListState
            emptyMessage="Henüz fiyat bölgesi bulunmuyor."
            error={error}
            loading={loading}
            onRetry={load}
            styles={styles}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.cardTitleArea}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.description ? <Text style={styles.cardSubtitle}>{item.description}</Text> : null}
              </View>
              <AdminStatusBadge active={item.active} styles={styles} />
            </View>
            <View style={styles.metadata}>
              <Text style={styles.metadataText}>Taban fiyat: <Text style={styles.metadataStrong}>{formatCurrency(item.basePrice, item.currency)}</Text></Text>
              <Text style={styles.metadataText}>Minimum: {formatCurrency(item.minPrice, item.currency)}</Text>
              <Text style={styles.metadataText}>Kilometre: {formatCurrency(item.pricePerKm, item.currency)}</Text>
              <Text style={styles.metadataText}>Güncelleme: {formatDateTime(item.updatedAt)}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable onPress={() => navigation.navigate(ADMIN_ROUTES.PRICING_ZONE_FORM, { mode: 'edit', pricingZoneId: item.id })} style={styles.actionButton}>
                <Text style={styles.actionText}>Düzenle</Text>
              </Pressable>
              <Pressable disabled={deletingId !== null} onPress={() => confirmDelete(item)} style={[styles.actionButton, styles.dangerButton, deletingId !== null && styles.disabled]}>
                <Text style={[styles.actionText, styles.dangerText]}>{deletingId === item.id ? 'Siliniyor...' : 'Sil'}</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
