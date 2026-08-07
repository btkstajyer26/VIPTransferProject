import { useEffect, useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createReservationLookupStyles } from '../styles/reservationLookupStyles';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';

const STATUS_LABELS = {
  PENDING: 'Bekliyor',
  ASSIGNED: 'Araç Atandı',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal Edildi',
  NO_SHOW: 'Yolcu Gelmedi',
};

function formatMoney(value, currency = 'TRY') {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const formatted = number.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === 'TRY' ? `${formatted} ₺` : `${formatted} ${currency}`;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' });
}

function DetailRow({ label, styles, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={styles.detailValue}>{value ?? '—'}</Text>
    </View>
  );
}

export default function ReservationDetailsScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const styles = useMemo(() => createReservationLookupStyles(theme), [theme]);
  const reservation = route.params?.reservation;

  useEffect(() => {
    if (!reservation || typeof reservation !== 'object') {
      navigation.replace('ReservationLookup');
    }
  }, [navigation, reservation]);

  if (!reservation || typeof reservation !== 'object') {
    return null;
  }

  const currency = reservation.currency || 'TRY';
  const finalPrice = reservation.finalPrice ?? reservation.calculatedPrice;
  const hasDistance = reservation.distanceKm !== null && reservation.distanceKm !== undefined;
  const distance = hasDistance ? Number(reservation.distanceKm) : null;

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headingArea}>
          <Text style={styles.eyebrow}>{t('details.eyebrow')}</Text>
          <Text style={styles.title}>{t('details.title')}</Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.codeLabel}>{t('details.code')}</Text>
          <Text selectable style={styles.codeValue}>{reservation.bookingReference || '—'}</Text>

          <View style={styles.divider} />
          <DetailRow
            label={t('details.status')}
            styles={styles}
            value={STATUS_LABELS[reservation.status] || reservation.status || '—'}
          />
          <DetailRow label={t('details.pickup')} styles={styles} value={reservation.pickupAddress} />
          <DetailRow label={t('details.dropoff')} styles={styles} value={reservation.dropoffAddress} />
          <DetailRow label={t('details.datetime')} styles={styles} value={formatDate(reservation.scheduledTime)} />
          <DetailRow label={t('details.passengers')} styles={styles} value={reservation.passengerCount} />
          {reservation.vehicleName ? (
            <DetailRow label={t('details.vehicle')} styles={styles} value={reservation.vehicleName} />
          ) : null}
          {Number.isFinite(distance) ? (
            <DetailRow
              label={t('details.distance')}
              styles={styles}
              value={`${distance.toLocaleString('tr-TR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })} km`}
            />
          ) : null}
          <DetailRow label={t('details.total')} styles={styles} value={formatMoney(finalPrice, currency)} />
          <DetailRow label={t('details.currency')} styles={styles} value={currency} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
