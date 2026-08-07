import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  deleteAdminReservation,
  getAdminReservationById,
  getAdminReservationHistory,
  updateAdminReservationStatus,
} from '../../api/admin/adminReservationApi';
import ReservationHistoryTimeline from '../../components/admin/reservation/ReservationHistoryTimeline';
import ReservationStatusBadge from '../../components/admin/reservation/ReservationStatusBadge';
import ReservationStatusModal from '../../components/admin/reservation/ReservationStatusModal';
import useAuth from '../../hooks/useAuth';
import { createAdminReservationStyles } from '../../styles/admin/adminReservationStyles';
import { useTheme } from '../../theme/ThemeContext';
import { getReservationErrorMessage } from '../../utils/adminReservationError';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDateTime';

function InfoRow({ label, styles, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{String(value)}</Text>
    </View>
  );
}

function Section({ children, styles, title }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function AdminReservationDetailScreen({ navigation, route }) {
  const reservationId = route.params?.reservationId;
  const { logout, role } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createAdminReservationStyles(theme), [theme]);
  const [reservation, setReservation] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const actionLock = useRef(false);
  const isAdmin = role?.trim().toUpperCase() === 'ADMIN';

  const handleRequestError = useCallback(async (requestError, fallback) => {
    if (requestError?.status === 401) await logout();
    else setError(getReservationErrorMessage(requestError, fallback));
  }, [logout]);

  const loadDetail = useCallback(async () => {
    if (!isAdmin || reservationId === undefined) return;
    setLoading(true);
    setHistoryLoading(true);
    setError('');
    setHistoryError(false);
    const [detailResult, historyResult] = await Promise.allSettled([
      getAdminReservationById(reservationId),
      getAdminReservationHistory(reservationId),
    ]);

    if (detailResult.status === 'fulfilled') setReservation(detailResult.value);
    else await handleRequestError(detailResult.reason, 'Rezervasyon bilgileri alınamadı.');

    if (historyResult.status === 'fulfilled') setHistory(historyResult.value);
    else {
      if (historyResult.reason?.status === 401) await logout();
      setHistoryError(true);
    }
    setLoading(false);
    setHistoryLoading(false);
  }, [handleRequestError, isAdmin, logout, reservationId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  async function updateStatus(status) {
    if (actionLock.current || status === reservation?.status) return;
    actionLock.current = true;
    setSaving(true);
    setError('');
    try {
      const updated = await updateAdminReservationStatus(reservationId, status);
      setReservation((current) => ({ ...current, ...updated }));
      setModalVisible(false);
      try {
        setHistory(await getAdminReservationHistory(reservationId));
        setHistoryError(false);
      } catch (historyRequestError) {
        if (historyRequestError?.status === 401) await logout();
        setHistoryError(true);
      }
    } catch (requestError) {
      await handleRequestError(requestError, 'Rezervasyon durumu güncellenemedi.');
    } finally {
      actionLock.current = false;
      setSaving(false);
    }
  }

  async function performDelete() {
    if (actionLock.current || reservation?.status !== 'PENDING') return;
    actionLock.current = true;
    setDeleting(true);
    setError('');
    try {
      await deleteAdminReservation(reservationId);
      navigation.goBack();
    } catch (requestError) {
      await handleRequestError(requestError, 'Silme işlemi tamamlanamadı.');
    } finally {
      actionLock.current = false;
      setDeleting(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Rezervasyonu Sil', 'Bu rezervasyonu silmek istediğinizden emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: performDelete },
    ]);
  }

  if (!isAdmin) return null;
  if (loading && !reservation) {
    return <View style={styles.state}><ActivityIndicator color={theme.accent} size="large" /></View>;
  }
  if (!reservation) {
    return (
      <View style={styles.state}>
        <Text style={styles.stateTitle}>Rezervasyon alınamadı</Text>
        <Text style={styles.stateText}>{error}</Text>
        <Pressable onPress={loadDetail} style={styles.retry}><Text style={styles.retryText}>Tekrar Dene</Text></Pressable>
      </View>
    );
  }

  const price = reservation.finalPrice ?? reservation.calculatedPrice;
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.detailContent}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailReference}>{reservation.bookingReference || `#${reservation.id}`}</Text>
          <View style={styles.detailStatusRow}>
            <ReservationStatusBadge status={reservation.status} styles={styles} />
          </View>
        </View>

        <Section styles={styles} title="Temel Bilgiler">
          <InfoRow label="Oluşturulma" value={formatDateTime(reservation.createdAt)} styles={styles} />
          <InfoRow label="Planlanan zaman" value={formatDateTime(reservation.scheduledTime)} styles={styles} />
          <InfoRow label="Yolcu sayısı" value={reservation.passengerCount} styles={styles} />
        </Section>
        <Section styles={styles} title="Müşteri Bilgileri">
          <InfoRow label="Kullanıcı ID" value={reservation.userId} styles={styles} />
          <InfoRow label="Misafir telefonu" value={reservation.guestPhone} styles={styles} />
          {!reservation.guestPhone ? <Text style={styles.sectionHint}>Backend yanıtında ad, telefon ve e-posta bilgisi bulunmuyor.</Text> : null}
        </Section>
        <Section styles={styles} title="Rota Bilgileri">
          <InfoRow label="Başlangıç" value={reservation.pickupAddress} styles={styles} />
          <InfoRow label="Varış" value={reservation.dropoffAddress} styles={styles} />
          <InfoRow label="Mesafe" value={reservation.distanceKm != null ? `${reservation.distanceKm} km` : null} styles={styles} />
        </Section>
        <Section styles={styles} title="Araç Bilgileri">
          <InfoRow label="Araç" value={reservation.vehicleName} styles={styles} />
        </Section>
        <Section styles={styles} title="Fiyat Bilgileri">
          <InfoRow label="Açılış ücreti" value={reservation.flagFee != null ? formatCurrency(reservation.flagFee, reservation.currency) : null} styles={styles} />
          <InfoRow label="Mesafe ücreti" value={reservation.distanceFee != null ? formatCurrency(reservation.distanceFee, reservation.currency) : null} styles={styles} />
          <InfoRow label="Kampanya indirimi" value={reservation.campaignDiscount != null ? formatCurrency(reservation.campaignDiscount, reservation.currency) : null} styles={styles} />
          <InfoRow label="Sadakat indirimi" value={reservation.loyaltyDiscount != null ? formatCurrency(reservation.loyaltyDiscount, reservation.currency) : null} styles={styles} />
          <InfoRow label="Toplam" value={formatCurrency(price, reservation.currency)} styles={styles} />
        </Section>
        {(reservation.flightNumber || reservation.notes) ? (
          <Section styles={styles} title="Notlar">
            <InfoRow label="Uçuş numarası" value={reservation.flightNumber} styles={styles} />
            <InfoRow label="Not" value={reservation.notes} styles={styles} />
          </Section>
        ) : null}
        <Section styles={styles} title="Durum Geçmişi">
          <ReservationHistoryTimeline error={historyError} history={history} loading={historyLoading} styles={styles} />
        </Section>

        {error ? <Text style={styles.errorBox}>{error}</Text> : null}
        <Pressable disabled={saving || deleting} onPress={() => setModalVisible(true)} style={[styles.actionButton, (saving || deleting) && styles.disabled]}>
          <Text style={styles.actionText}>{saving ? 'Güncelleniyor...' : 'Durumu Güncelle'}</Text>
        </Pressable>
        <Pressable
          disabled={saving || deleting || reservation.status !== 'PENDING'}
          onPress={confirmDelete}
          style={[styles.deleteButton, (saving || deleting || reservation.status !== 'PENDING') && styles.disabled]}
        >
          <Text style={styles.deleteText}>{deleting ? 'Siliniyor...' : 'Rezervasyonu Sil'}</Text>
        </Pressable>
        {reservation.status !== 'PENDING' ? <Text style={styles.sectionHint}>Backend yalnızca bekleyen rezervasyonların silinmesine (iptal edilmesine) izin verir.</Text> : null}
      </ScrollView>
      <ReservationStatusModal
        currentStatus={reservation.status}
        onClose={() => !saving && setModalVisible(false)}
        onSelect={updateStatus}
        saving={saving}
        styles={styles}
        visible={modalVisible}
      />
    </SafeAreaView>
  );
}
