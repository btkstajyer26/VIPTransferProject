import { Text, View } from 'react-native';

function getLocationName(location, fallback) {
  return location?.displayName || location?.address || fallback;
}

export default function VehicleTripSummary({ styles, transferDetails }) {
  const pickup = getLocationName(transferDetails?.pickupLocation, 'Başlangıç');
  const dropoff = getLocationName(transferDetails?.dropoffLocation, 'Varış');
  const passengerCount = transferDetails?.passengerCount || 1;

  return (
    <View style={styles.tripSummary}>
      <View style={styles.summaryAccent} />
      <View style={styles.summaryRoute}>
        <Text style={styles.summaryEyebrow}>SEÇİLEN TRANSFER</Text>
        <View style={styles.routeRow}>
          <View style={styles.routeMarkerColumn}>
            <View style={styles.pickupMarker} />
            <View style={styles.routeLine} />
            <View style={styles.dropoffMarker} />
          </View>
          <View style={styles.routeNames}>
            <Text numberOfLines={1} style={styles.routeName}>
              {pickup}
            </Text>
            <Text numberOfLines={1} style={styles.routeName}>
              {dropoff}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.tripMeta}>
        <Text style={styles.tripMetaValue}>{passengerCount}</Text>
        <Text style={styles.tripMetaLabel}>YOLCU</Text>
      </View>
    </View>
  );
}
