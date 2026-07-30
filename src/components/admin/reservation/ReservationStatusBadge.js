import { Text, View } from 'react-native';
import { getReservationStatusLabel } from '../../../utils/reservationStatus';

export default function ReservationStatusBadge({ status, styles }) {
  return (
    <View style={[styles.statusBadge, styles[`status${status}`]]}>
      <Text style={[styles.statusBadgeText, styles[`status${status}Text`]]}>
        {getReservationStatusLabel(status)}
      </Text>
    </View>
  );
}
