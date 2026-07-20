import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../theme/colors';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brandArea}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>VIP</Text>
          </View>
          <View>
            <Text style={styles.brandName}>VIP Transfer</Text>
            <Text style={styles.brandTagline}>PREMIUM ULAŞIM</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.accentLine} />
          <Text style={styles.title}>Yolculuğunuz Ayrıcalıkla Başlasın</Text>
          <Text style={styles.description}>
            Havalimanı, otel ve şehir içi transferlerinizi hızlı ve güvenli şekilde planlayın.
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('Login')}
              style={({ pressed }) => [styles.button, styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>Giriş Yap</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('GuestInfo')}
              style={({ pressed }) => [
                styles.button,
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Misafir Olarak Devam Et</Text>
            </Pressable>
          </View>

          <Text style={styles.trustText}>
            Güvenli rezervasyon • Profesyonel sürücüler • 7/24 destek
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 18,
  },
  brandArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 14,
    backgroundColor: colors.secondary,
  },
  logoText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  brandName: {
    color: colors.card,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  brandTagline: {
    marginTop: 3,
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  hero: {
    maxWidth: 560,
    paddingVertical: 24,
  },
  accentLine: {
    width: 44,
    height: 3,
    marginBottom: 22,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  title: {
    color: colors.card,
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 44,
    letterSpacing: -0.6,
  },
  description: {
    maxWidth: 520,
    marginTop: 18,
    color: colors.border,
    fontSize: 16,
    lineHeight: 25,
  },
  footer: {
    gap: 22,
  },
  actions: {
    gap: 12,
  },
  button: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  primaryButton: {
    backgroundColor: colors.accent,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
  trustText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
});
