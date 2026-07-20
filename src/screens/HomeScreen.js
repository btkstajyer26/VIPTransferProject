import { Pressable, StyleSheet, Text, View } from 'react-native';
import { mockUser } from '../data/mockData';
import colors from '../theme/colors';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Merhaba, {mockUser.name}</Text>
      <Text style={styles.subtitle}>VIP transfer hesabina hos geldin.</Text>

      <View style={styles.loyaltyCard}>
        <Text style={styles.cardLabel}>Sadakat Puani</Text>
        <Text style={styles.point}>{mockUser.loyaltyPoint} puan</Text>
        <Text style={styles.level}>{mockUser.loyaltyLevel} seviye</Text>
      </View>

      <View style={styles.actionGroup}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Reservation')}
        >
          <Text style={styles.primaryButtonText}>Yeni Rezervasyon Olustur</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Reservations')}
        >
          <Text style={styles.secondaryButtonText}>Gecmis Rezervasyonlarim</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background,
  },
  greeting: {
    marginTop: 24,
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 15,
  },
  loyaltyCard: {
    marginTop: 28,
    padding: 22,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  cardLabel: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
  },
  point: {
    marginTop: 12,
    color: colors.accent,
    fontSize: 34,
    fontWeight: '800',
  },
  level: {
    marginTop: 6,
    color: colors.card,
    fontSize: 16,
    fontWeight: '700',
  },
  actionGroup: {
    marginTop: 28,
    gap: 14,
  },
  primaryButton: {
    backgroundColor: colors.secondary,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '700',
  },
});
