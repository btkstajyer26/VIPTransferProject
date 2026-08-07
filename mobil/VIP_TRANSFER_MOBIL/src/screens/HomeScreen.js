import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReservationDraft } from '../context/ReservationDraftContext';
import { mockUser } from '../data/mockData';
import colors from '../theme/colors';

export default function HomeScreen({ navigation }) {
  const { clearReservationDraft } = useReservationDraft();

  function handleNewReservation() {
    clearReservationDraft();
    navigation.navigate('TransferSearch');
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>VIP TRANSFER HESABIM</Text>
          <Text style={styles.greeting}>Merhaba, {mockUser.name}</Text>
          <Text style={styles.subtitle}>Yolculuklarını tek yerden planla ve takip et.</Text>
        </View>

        <View style={styles.loyaltyCard}>
          <View style={styles.loyaltyIcon}><Text style={styles.loyaltyIconText}>★</Text></View>
          <View style={styles.loyaltyContent}>
            <Text style={styles.cardLabel}>Sadakat puanı</Text>
            <Text style={styles.point}>{mockUser.loyaltyPoint} puan</Text>
            <Text style={styles.level}>{mockUser.loyaltyLevel} seviye</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Hızlı işlemler</Text>
        <View style={styles.actionGroup}>
          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={handleNewReservation}>
            <View>
              <Text style={styles.primaryButtonText}>Yeni rezervasyon</Text>
              <Text style={styles.primaryButtonHint}>Rotanı belirle, aracını seç</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => navigation.navigate('Reservations')}>
            <View>
              <Text style={styles.secondaryButtonText}>Rezervasyonlarım</Text>
              <Text style={styles.secondaryButtonHint}>Geçmiş ve aktif yolculuklar</Text>
            </View>
            <Text style={styles.secondaryArrow}>›</Text>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => navigation.navigate('NotificationPreferences')}>
            <View>
              <Text style={styles.secondaryButtonText}>Bildirim Tercihleri</Text>
              <Text style={styles.secondaryButtonHint}>E-posta, SMS, anlık bildirim ve WhatsApp</Text>
            </View>
            <Text style={styles.secondaryArrow}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: 20, paddingBottom: 36 },
  heroCard: { marginHorizontal: -20, marginTop: -1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 34, backgroundColor: colors.secondary },
  eyebrow: { color: '#A8C3D8', fontSize: 10, fontWeight: '800', letterSpacing: 1.7 },
  greeting: {
    marginTop: 12,
    color: colors.card,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    color: '#CBD5E1',
    fontSize: 15,
  },
  loyaltyCard: {
    flexDirection: 'row', alignItems: 'center', marginTop: -16, padding: 20,
    borderWidth: 1, borderColor: colors.border, borderRadius: 22, backgroundColor: colors.card,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 5,
  },
  loyaltyIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: colors.accentSoft },
  loyaltyIconText: { color: colors.accent, fontSize: 21 },
  loyaltyContent: { flex: 1, marginLeft: 14 },
  cardLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
  point: {
    marginTop: 5,
    color: colors.text,
    fontSize: 27,
    fontWeight: '800',
  },
  level: {
    marginTop: 6,
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: { marginTop: 30, color: colors.text, fontSize: 18, fontWeight: '800' },
  actionGroup: { marginTop: 14, gap: 12 },
  primaryButton: {
    minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.accent, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 16,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 14, elevation: 5,
  },
  primaryButtonText: {
    color: colors.card,
    fontSize: 16, fontWeight: '800',
  },
  primaryButtonHint: { marginTop: 4, color: '#E2ECF3', fontSize: 12 },
  arrow: { color: colors.card, fontSize: 24, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 18, paddingHorizontal: 20, paddingVertical: 16,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonHint: { marginTop: 4, color: colors.muted, fontSize: 12 },
  secondaryArrow: { color: colors.accent, fontSize: 27 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
