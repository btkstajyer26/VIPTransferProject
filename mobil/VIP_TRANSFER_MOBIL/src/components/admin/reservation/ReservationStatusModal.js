import { Modal, Pressable, Text, View } from 'react-native';
import {
  getReservationStatusLabel,
  RESERVATION_STATUSES,
} from '../../../utils/reservationStatus';

export default function ReservationStatusModal({
  currentStatus,
  onClose,
  onSelect,
  saving,
  styles,
  visible,
}) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.sectionTitle}>Durumu Güncelle</Text>
          <Text style={styles.sectionHint}>Backend geçiş kuralları uygulanacaktır.</Text>
          {RESERVATION_STATUSES.map((status) => {
            const selected = status === currentStatus;
            return (
              <Pressable
                disabled={saving || selected}
                key={status}
                onPress={() => onSelect(status)}
                style={[styles.modalOption, selected && styles.disabled]}
              >
                <Text style={styles.modalOptionText}>
                  {getReservationStatusLabel(status)}{selected ? ' (Mevcut)' : ''}
                </Text>
              </Pressable>
            );
          })}
          <Pressable disabled={saving} onPress={onClose} style={styles.modalCancel}>
            <Text style={styles.modalCancelText}>{saving ? 'Güncelleniyor...' : 'Vazgeç'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
