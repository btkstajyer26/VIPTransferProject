import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteAdminCampaign, getAdminCampaigns } from '../../api/admin/adminCampaignApi';
import AdminCampaignCard from '../../components/admin/campaign/AdminCampaignCard';
import { AdminFilterChips, AdminListState, AdminSearchInput } from '../../components/admin/AdminUi';
import useAuth from '../../hooks/useAuth';
import { ADMIN_ROUTES } from '../../navigation/adminRoutes';
import { createAdminManagementStyles } from '../../styles/admin/adminManagementStyles';
import { useTheme } from '../../theme/ThemeContext';
import {
  CAMPAIGN_TYPES,
  campaignError,
  campaignValidity,
} from '../../utils/adminCampaign';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Tümü' }, { value: 'ACTIVE', label: 'Aktif' }, { value: 'PASSIVE', label: 'Pasif' },
];
const VALIDITY_FILTERS = [
  { value: 'ALL', label: 'Tüm tarihler' }, { value: 'CURRENT', label: 'Geçerli' },
  { value: 'EXPIRED', label: 'Süresi dolmuş' }, { value: 'FUTURE', label: 'Gelecek' },
];

export default function AdminCampaignsScreen({ navigation }) {
  const { logout, role } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createAdminManagementStyles(theme), [theme]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [validityFilter, setValidityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);
  const lock = useRef(false);
  const isAdmin = role?.trim().toUpperCase() === 'ADMIN';

  const load = useCallback(async (refresh = false) => {
    if (!isAdmin) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      setCampaigns(await getAdminCampaigns());
    } catch (requestError) {
      if (requestError?.status === 401) await logout();
      else setError(campaignError(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, logout]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return campaigns.filter((campaign) => {
      const matchesSearch = !query || [campaign.name, campaign.code, campaign.description]
        .filter(Boolean).some((value) => String(value).toLocaleLowerCase('tr-TR').includes(query));
      const matchesStatus = status === 'ALL' || (status === 'ACTIVE' ? campaign.active : !campaign.active);
      return matchesSearch && matchesStatus
        && (validityFilter === 'ALL' || campaignValidity(campaign) === validityFilter)
        && (typeFilter === 'ALL' || campaign.discountType === typeFilter);
    });
  }, [campaigns, search, status, typeFilter, validityFilter]);

  async function remove(campaign) {
    if (lock.current) return;
    lock.current = true;
    setDeletingId(campaign.id);
    try {
      await deleteAdminCampaign(campaign.id);
      setCampaigns((current) => current.map((item) => item.id === campaign.id ? { ...item, active: false } : item));
    } catch (requestError) {
      if (requestError?.status === 401) await logout();
      else Alert.alert('Silme işlemi tamamlanamadı', campaignError(requestError, 'delete'));
    } finally {
      lock.current = false;
      setDeletingId(null);
    }
  }

  function confirmDelete(campaign) {
    Alert.alert('Kampanyayı sil', 'Bu kampanyayı silmek istediğinizden emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => remove(campaign) },
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
              <Text style={styles.heading}>Kampanyalar</Text>
              <Pressable onPress={() => navigation.navigate(ADMIN_ROUTES.CAMPAIGN_FORM, { mode: 'create' })} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Yeni Kampanya</Text>
              </Pressable>
            </View>
            <AdminSearchInput onChangeText={setSearch} placeholder="Ad, kod veya açıklama ara" styles={styles} value={search} />
            <Text style={styles.filterLabel}>DURUM</Text>
            <AdminFilterChips options={STATUS_FILTERS} onSelect={setStatus} selected={status} styles={styles} />
            <Text style={styles.filterLabel}>GEÇERLİLİK</Text>
            <AdminFilterChips options={VALIDITY_FILTERS} onSelect={setValidityFilter} selected={validityFilter} styles={styles} />
            <Text style={styles.filterLabel}>İNDİRİM TİPİ</Text>
            <AdminFilterChips options={[{ value: 'ALL', label: 'Tümü' }, ...CAMPAIGN_TYPES]} onSelect={setTypeFilter} selected={typeFilter} styles={styles} />
          </>
        }
        ListEmptyComponent={<AdminListState emptyMessage="Henüz kampanya bulunmuyor." error={error} loading={loading} onRetry={load} styles={styles} />}
        renderItem={({ item }) => (
          <AdminCampaignCard
            campaign={item}
            deleting={deletingId === item.id}
            onDelete={() => confirmDelete(item)}
            onDetail={() => navigation.navigate(ADMIN_ROUTES.CAMPAIGN_DETAIL, { campaignId: item.id })}
            onEdit={() => navigation.navigate(ADMIN_ROUTES.CAMPAIGN_FORM, { mode: 'edit', campaignId: item.id })}
            styles={styles}
          />
        )}
      />
    </SafeAreaView>
  );
}
