import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteAdminPricingRule, getAdminPricingRules } from '../../api/admin/adminPricingRuleApi';
import { getAdminPricingZones } from '../../api/admin/adminPricingZoneApi';
import { AdminFilterChips, AdminListState, AdminSearchInput, AdminStatusBadge } from '../../components/admin/AdminUi';
import useAuth from '../../hooks/useAuth';
import { ADMIN_ROUTES } from '../../navigation/adminRoutes';
import { createAdminManagementStyles } from '../../styles/admin/adminManagementStyles';
import { useTheme } from '../../theme/ThemeContext';
import { dayLabel, pricingError, toIsoDate } from '../../utils/adminPricing';
import { formatDateTime } from '../../utils/formatDateTime';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Tümü' }, { value: 'ACTIVE', label: 'Aktif' }, { value: 'PASSIVE', label: 'Pasif' },
];
const VALIDITY_FILTERS = [
  { value: 'ALL', label: 'Tüm tarihler' }, { value: 'CURRENT', label: 'Geçerli' },
  { value: 'EXPIRED', label: 'Süresi dolmuş' }, { value: 'FUTURE', label: 'Gelecek' },
];

function validity(rule, today) {
  if (rule.validFrom && rule.validFrom > today) return 'FUTURE';
  if (rule.validTo && rule.validTo < today) return 'EXPIRED';
  return 'CURRENT';
}

export default function AdminPricingRulesScreen({ navigation }) {
  const { logout, role } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createAdminManagementStyles(theme), [theme]);
  const [rules, setRules] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [validityFilter, setValidityFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);
  const lock = useRef(false);
  const isAdmin = role?.trim().toUpperCase() === 'ADMIN';

  const load = useCallback(async (refresh = false) => {
    if (!isAdmin) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const zoneList = await getAdminPricingZones();
      const lists = await Promise.all(zoneList.map((zone) => getAdminPricingRules(zone.id)));
      setZones(zoneList);
      setRules(lists.flat());
    } catch (requestError) {
      if (requestError?.status === 401) await logout();
      else setError(pricingError(requestError, 'rule'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, logout]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const zoneOptions = useMemo(
    () => [{ value: 'ALL', label: 'Tüm bölgeler' }, ...zones.map((zone) => ({ value: String(zone.id), label: zone.name }))],
    [zones],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    const today = toIsoDate(new Date());
    return rules.filter((rule) => {
      const matchesSearch = !query || [rule.name, rule.zoneName, rule.reason].filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('tr-TR').includes(query));
      const matchesStatus = status === 'ALL' || (status === 'ACTIVE' ? rule.active : !rule.active);
      return matchesSearch && matchesStatus
        && (zoneFilter === 'ALL' || String(rule.zoneId) === zoneFilter)
        && (validityFilter === 'ALL' || validity(rule, today) === validityFilter);
    });
  }, [rules, search, status, validityFilter, zoneFilter]);

  async function remove(rule) {
    if (lock.current) return;
    lock.current = true;
    setDeletingId(rule.id);
    try {
      await deleteAdminPricingRule(rule.id);
      setRules((current) => current.filter((item) => item.id !== rule.id));
    } catch (requestError) {
      if (requestError?.status === 401) await logout();
      else Alert.alert('Silme işlemi tamamlanamadı', pricingError(requestError, 'rule', 'delete'));
    } finally {
      lock.current = false;
      setDeletingId(null);
    }
  }

  function confirmDelete(rule) {
    Alert.alert('Fiyat kuralını sil', 'Bu fiyat kuralını silmek istediğinizden emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => remove(rule) },
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
              <Text style={styles.heading}>Fiyat Kuralları</Text>
              <Pressable onPress={() => navigation.navigate(ADMIN_ROUTES.PRICING_RULE_FORM, { mode: 'create' })} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Yeni Kural</Text>
              </Pressable>
            </View>
            <AdminSearchInput onChangeText={setSearch} placeholder="Kural, bölge veya açıklama ara" styles={styles} value={search} />
            <Text style={styles.filterLabel}>DURUM</Text>
            <AdminFilterChips options={STATUS_FILTERS} onSelect={setStatus} selected={status} styles={styles} />
            <Text style={styles.filterLabel}>BÖLGE</Text>
            <AdminFilterChips options={zoneOptions} onSelect={setZoneFilter} selected={zoneFilter} styles={styles} />
            <Text style={styles.filterLabel}>TARİH GEÇERLİLİĞİ</Text>
            <AdminFilterChips options={VALIDITY_FILTERS} onSelect={setValidityFilter} selected={validityFilter} styles={styles} />
          </>
        }
        ListEmptyComponent={<AdminListState emptyMessage="Henüz fiyat kuralı bulunmuyor." error={error} loading={loading} onRetry={load} styles={styles} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.cardTitleArea}>
                <Text style={styles.cardTitle}>{item.name || 'İsimsiz kural'}</Text>
                <Text style={styles.cardSubtitle}>{item.zoneName}</Text>
              </View>
              <AdminStatusBadge active={item.active} styles={styles} />
            </View>
            <View style={styles.metadata}>
              <Text style={styles.metadataText}>Gün: <Text style={styles.metadataStrong}>{dayLabel(item.dayOfWeek)}</Text></Text>
              <Text style={styles.metadataText}>Saat: {item.startTime} – {item.endTime}</Text>
              <Text style={styles.metadataText}>Çarpan: <Text style={styles.metadataStrong}>{item.multiplier}</Text></Text>
              <Text style={styles.metadataText}>Tarih: {item.validFrom || 'Sınırsız'} – {item.validTo || 'Sınırsız'}</Text>
              {item.reason ? <Text style={styles.metadataText}>Açıklama: {item.reason}</Text> : null}
              <Text style={styles.metadataText}>Oluşturulma: {formatDateTime(item.createdAt)}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable onPress={() => navigation.navigate(ADMIN_ROUTES.PRICING_RULE_FORM, { mode: 'edit', pricingRuleId: item.id })} style={styles.actionButton}>
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
