import { Text, View } from 'react-native';
import { formatDate, formatTime } from '../../utils/dateUtils';

export function TripSummaryCard({
  pickupLocation,
  dropoffLocation,
  selectedDate,
  selectedTime,
  passengerCount,
  styles,
}) {
  const hasRoute = Boolean(pickupLocation.placeId && dropoffLocation.placeId);
  const detailParts = [
    selectedDate ? formatDate(selectedDate) : null,
    selectedTime ? formatTime(selectedTime) : null,
    `${passengerCount} yolcu`,
  ].filter(Boolean);

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryAccent} />
      <View style={styles.summaryContent}>
        <Text style={styles.summaryTitle}>Yolculuk Özeti</Text>
        {hasRoute ? (
          <>
            <Text style={styles.summaryRoute}>
              {pickupLocation.displayName} → {dropoffLocation.displayName}
            </Text>
            <Text style={styles.summaryDetails}>{detailParts.join(' · ')}</Text>
          </>
        ) : (
          <Text style={styles.summaryEmpty}>
            Yolculuk özetini görmek için başlangıç ve varış noktalarını seçin.
          </Text>
        )}
        <Text style={styles.summaryInfo}>
          Bir sonraki adımda uygun araçları ve fiyatları görüntüleyeceksiniz.
        </Text>
      </View>
    </View>
  );
}
