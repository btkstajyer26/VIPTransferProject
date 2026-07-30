import { Pressable, Text, View } from 'react-native';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDateTime } from '../../../utils/formatDateTime';
import ReservationStatusBadge from './ReservationStatusBadge';

export default function AdminReservationCard({ onDetail, reservation, styles }) {
  const price = reservation.finalPrice ?? reservation.calculatedPrice;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.titleArea}>
          <Text style={styles.reference}>{reservation.bookingReference || `#${reservation.id}`}</Text>
          <Text style={styles.date}>{formatDateTime(reservation.scheduledTime)}</Text>
        </View>
        <ReservationStatusBadge status={reservation.status} styles={styles} />
      </View>
      <View style={styles.route}>
        <Text style={styles.routeLabel}>Başlangıç</Text>
        <Text style={styles.routeText}>{reservation.pickupAddress || '-'}</Text>
        <Text style={styles.routeArrow}>↓</Text>
        <Text style={styles.routeLabel}>Varış</Text>
        <Text style={styles.routeText}>{reservation.dropoffAddress || '-'}</Text>
      </View>
      <View style={styles.metaGrid}>
        {reservation.guestPhone ? <Text style={styles.metaText}>Telefon: {reservation.guestPhone}</Text> : null}
        <Text style={styles.metaText}>Araç: {reservation.vehicleName || '-'}</Text>
        <Text style={styles.metaText}>Yolcu: {reservation.passengerCount}</Text>
        <Text style={styles.price}>{formatCurrency(price, reservation.currency)}</Text>
      </View>
      <Pressable onPress={onDetail} style={styles.detailButton}>
        <Text style={styles.detailButtonText}>Detay</Text>
      </Pressable>
    </View>
  );
}
