import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteAdminCampaign, getAdminCampaignById } from '../../api/admin/adminCampaignApi';
import useAuth from '../../hooks/useAuth';
import { ADMIN_ROUTES } from '../../navigation/adminRoutes';
import { createAdminManagementStyles } from '../../styles/admin/adminManagementStyles';
import { useTheme } from '../../theme/ThemeContext';
import {
  CAMPAIGN_VALIDITY_LABELS,
  campaignError,
  campaignTypeLabel,
  campaignValidity,
} from '../../utils/adminCampaign';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDateTime';

function Row({ label, styles, value }) {
  if (value === null || value === undefined || value === '') return null;
  return <View style={{ marginTop: 9 }}><Text style={styles.filterLabel}>{label}</Text><Text style={styles.metadataStrong}>{String(value)}</Text></View>;
}

export default function AdminCampaignDetailScreen({ navigation, route }) {
  const id = route.params?.campaignId;
  const { logout, role } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createAdminManagementStyles(theme), [theme]);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const isAdmin = role?.trim().toUpperCase() === 'ADMIN';

  const load = useCallback(async (refresh = false) => {
    if (!isAdmin) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      setCampaign(await getAdminCampaignById(id));
    } catch (requestError) {
      if (requestError?.status === 401) await logout();
      else setError(campaignError(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, isAdmin, logout]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function remove() {
    if (lock.current) return;
    lock.current = true;
    setDeleting(true);
    try {
      await deleteAdminCampaign(id);
      navigation.goBack();
    } catch (requestError) {
      if (requestError?.status === 401) await logout();
      else setError(campaignError(requestError, 'delete'));
    } finally {
      lock.current = false;
      setDeleting(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Kampanyayı sil', 'Bu kampanyayı silmek istediğinizden emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: remove },
    ]);
  }

  if (!isAdmin) return null;
  if (loading && !campaign) return <View style={styles.state}><ActivityIndicator color={theme.accent} size="large" /></View>;
  if (!campaign) return <View style={styles.state}><Text style={styles.stateTitle}>Kampanya alınamadı</Text><Text style={styles.stateText}>{error}</Text><Pressable onPress={load} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Tekrar Dene</Text></Pressable></View>;

  const remaining = campaign.maxUses != null && campaign.usedCount != null
    ? Math.max(0, campaign.maxUses - campaign.usedCount) : null;
  const discount = campaign.discountType === 'PERCENTAGE'
    ? `%${Number(campaign.discountValue).toLocaleString('tr-TR')}`
    : formatCurrency(campaign.discountValue, 'TRY');
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.formContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <Text style={styles.formTitle}>{campaign.name}</Text>
        <Text style={styles.formSubtitle}>{campaign.code}</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Temel Bilgiler</Text>
          <Row label="Açıklama" value={campaign.description} styles={styles} />
          <Row label="Durum" value={campaign.active ? 'Aktif' : 'Pasif'} styles={styles} />
          <Row label="Geçerlilik" value={CAMPAIGN_VALIDITY_LABELS[campaignValidity(campaign)]} styles={styles} />
          <Row label="Oluşturan" value={campaign.createdByName} styles={styles} />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>İndirim</Text>
          <Row label="İndirim tipi" value={campaignTypeLabel(campaign.discountType)} styles={styles} />
          <Row label="İndirim değeri" value={discount} styles={styles} />
          <Row label="Minimum tutar" value={formatCurrency(campaign.minOrderAmount, 'TRY')} styles={styles} />
          <Row label="Maksimum indirim" value={campaign.maxDiscountAmount != null ? formatCurrency(campaign.maxDiscountAmount, 'TRY') : null} styles={styles} />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tarihler</Text>
          <Row label="Başlangıç" value={formatDateTime(campaign.validFrom)} styles={styles} />
          <Row label="Bitiş" value={formatDateTime(campaign.validTo)} styles={styles} />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kullanım Limitleri</Text>
          <Row label="Toplam limit" value={campaign.maxUses ?? 'Sınırsız'} styles={styles} />
          <Row label="Kullanılan" value={campaign.usedCount} styles={styles} />
          <Row label="Kalan" value={remaining} styles={styles} />
          <Row label="Kullanıcı başına" value={campaign.maxUsesPerUser} styles={styles} />
        </View>
        {error ? <Text style={styles.formError}>{error}</Text> : null}
        <Pressable onPress={() => navigation.navigate(ADMIN_ROUTES.CAMPAIGN_FORM, { mode: 'edit', campaignId: id })} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Düzenle</Text>
        </Pressable>
        <Pressable disabled={deleting} onPress={confirmDelete} style={[styles.actionButton, styles.dangerButton, { alignItems: 'center', marginTop: 10 }, deleting && styles.disabled]}>
          <Text style={[styles.actionText, styles.dangerText]}>{deleting ? 'Siliniyor...' : 'Kampanyayı Sil'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
