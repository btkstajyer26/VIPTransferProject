import { Text, View } from 'react-native';

function getLocationName(location, fallback) {
  return location?.displayName || location?.address || fallback;
}

export default function GuestBookingSummary({
  selectedVehicle,
  styles,
  transferDetails,
}) {
  const pickup = getLocationName(transferDetails?.pickupLocation, 'Başlangıç');
  const dropoff = getLocationName(transferDetails?.dropoffLocation, 'Varış');

  return (
    <View style={styles.bookingSummary}>
      <View style={styles.summaryAccent} />
      <Text style={styles.summaryEyebrow}>REZERVASYON ÖZETİ</Text>

      <View style={styles.summaryRouteRow}>
        <View style={styles.summaryMarkerColumn}>
          <View style={styles.pickupMarker} />
          <View style={styles.summaryRouteLine} />
          <View style={styles.dropoffMarker} />
        </View>
        <View style={styles.summaryLocations}>
          <Text numberOfLines={1} style={styles.summaryLocation}>
            {pickup}
          </Text>
          <Text numberOfLines={1} style={styles.summaryLocation}>
            {dropoff}
          </Text>
        </View>
      </View>

      <View style={styles.summaryDivider} />

      <View style={styles.vehicleSummaryRow}>
        <View style={styles.vehicleMonogram}>
          <Text style={styles.vehicleMonogramText}>VIP</Text>
        </View>
        <View style={styles.vehicleSummaryText}>
          <Text style={styles.vehicleSummaryLabel}>SEÇİLEN ARAÇ</Text>
          <Text numberOfLines={1} style={styles.vehicleSummaryName}>
            {selectedVehicle
              ? `${selectedVehicle.brand} ${selectedVehicle.model}`
              : 'Araç bilgisi bulunamadı'}
          </Text>
        </View>
        <View style={styles.passengerBadge}>
          <Text style={styles.passengerBadgeValue}>{transferDetails?.passengerCount || 1}</Text>
          <Text style={styles.passengerBadgeLabel}>YOLCU</Text>
        </View>
      </View>
    </View>
  );
}
