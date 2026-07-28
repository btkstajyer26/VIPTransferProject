import { Text, View } from 'react-native';
import { formatDateTime } from '../../../utils/formatDateTime';
import { getReservationStatusLabel } from '../../../utils/reservationStatus';

export default function ReservationHistoryTimeline({ error, history, loading, styles }) {
  if (loading) return <Text style={styles.sectionHint}>Durum geçmişi yükleniyor...</Text>;
  if (error) return <Text style={styles.historyError}>Durum geçmişi alınamadı.</Text>;
  if (!history.length) return <Text style={styles.sectionHint}>Durum geçmişi bulunmuyor.</Text>;

  return (
    <View style={styles.timeline}>
      {history.map((item, index) => {
        const previous = index > 0 ? history[index - 1].status : null;
        return (
          <View key={String(item.id)} style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineStatus}>
                {previous ? `${getReservationStatusLabel(previous)} → ` : ''}
                {getReservationStatusLabel(item.status)}
              </Text>
              <Text style={styles.timelineDate}>{formatDateTime(item.changedAt)}</Text>
              {item.changedByName ? <Text style={styles.timelineNote}>Değiştiren: {item.changedByName}</Text> : null}
              {item.note ? <Text style={styles.timelineNote}>{item.note}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
