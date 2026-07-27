import { useEffect, useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createReservationLookupStyles } from '../styles/reservationLookupStyles';
import { useTheme } from '../theme/ThemeContext';

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
          <Text style={styles.eyebrow}>REZERVASYON DETAYLARI</Text>
          <Text style={styles.title}>Yolculuğunuzun özeti</Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.codeLabel}>REZERVASYON KODUNUZ</Text>
          <Text selectable style={styles.codeValue}>{reservation.bookingReference || '—'}</Text>

          <View style={styles.divider} />
          <DetailRow
            label="Durum"
            styles={styles}
            value={STATUS_LABELS[reservation.status] || reservation.status || '—'}
          />
          <DetailRow label="Başlangıç" styles={styles} value={reservation.pickupAddress} />
          <DetailRow label="Varış" styles={styles} value={reservation.dropoffAddress} />
          <DetailRow label="Tarih ve Saat" styles={styles} value={formatDate(reservation.scheduledTime)} />
          <DetailRow label="Yolcu Sayısı" styles={styles} value={reservation.passengerCount} />
          {reservation.vehicleName ? (
            <DetailRow label="Araç" styles={styles} value={reservation.vehicleName} />
          ) : null}
          {Number.isFinite(distance) ? (
            <DetailRow
              label="Mesafe"
              styles={styles}
              value={`${distance.toLocaleString('tr-TR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })} km`}
            />
          ) : null}
          <DetailRow label="Toplam Tutar" styles={styles} value={formatMoney(finalPrice, currency)} />
          <DetailRow label="Para Birimi" styles={styles} value={currency} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
