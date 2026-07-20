import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../theme/colors';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function handlePhoneChange(value) {
    const sanitizedPhone = value.replace(/\D/g, '').slice(0, 11);
    setPhone(sanitizedPhone);

    if (errors.phone) {
      setErrors((currentErrors) => ({ ...currentErrors, phone: undefined }));
    }
  }

  function handlePasswordChange(value) {
    setPassword(value);

    if (errors.password) {
      setErrors((currentErrors) => ({ ...currentErrors, password: undefined }));
    }
  }

  function validateForm() {
    const nextErrors = {};

    if (!phone) {
      nextErrors.phone = 'Telefon numarası gerekli.';
    } else if (!/^\d+$/.test(phone)) {
      nextErrors.phone = 'Telefon numarası yalnızca rakamlardan oluşmalı.';
    } else if (phone.length !== 11) {
      nextErrors.phone = 'Telefon numarası 11 haneli olmalı.';
    } else if (!phone.startsWith('0')) {
      nextErrors.phone = 'Telefon numarası 0 ile başlamalı.';
    }

    if (password.length === 0) {
      nextErrors.password = 'Şifre gerekli.';
    } else if (password.length < 6) {
      nextErrors.password = 'Şifre en az 6 karakter olmalı.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleLogin() {
    const isFormValid = validateForm();

    if (!isFormValid) {
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);

    // TODO: Simülasyon, Auth Service giriş entegrasyonu hazır olduğunda değiştirilecek.
    setTimeout(() => {
      setLoading(false);
      navigation.replace('Home');
    }, 800);
  }

  function handleForgotPassword() {
    Alert.alert('Bilgi', 'Bu özellik henüz hazırlanıyor.');
  }

  function handleRegister() {
    Alert.alert('Bilgi', 'Bu özellik henüz hazırlanıyor.');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.brandArea}>
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>VIP</Text>
              </View>
              <View>
                <Text style={styles.brandName}>VIP Transfer</Text>
                <Text style={styles.brandTagline}>PREMIUM ULAŞIM</Text>
              </View>
            </View>

            <View style={styles.headingArea}>
              <View style={styles.accentLine} />
              <Text style={styles.title}>Tekrar Hoş Geldiniz</Text>
              <Text style={styles.description}>
                Rezervasyonlarınıza ve sadakat avantajlarınıza erişmek için giriş yapın.
              </Text>
            </View>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Telefon numarası</Text>
              <TextInput
                accessibilityLabel="Telefon numarası"
                autoComplete="tel"
                editable={!loading}
                keyboardType="phone-pad"
                maxLength={11}
                onChangeText={handlePhoneChange}
                placeholder="05XX XXX XX XX"
                placeholderTextColor={colors.muted}
                style={[styles.input, errors.phone && styles.inputError]}
                value={phone}
              />
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Şifre</Text>
              <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
                <TextInput
                  accessibilityLabel="Şifre"
                  autoComplete="current-password"
                  editable={!loading}
                  onChangeText={handlePasswordChange}
                  placeholder="Şifrenizi girin"
                  placeholderTextColor={colors.muted}
                  secureTextEntry={!showPassword}
                  style={styles.passwordInput}
                  value={password}
                />
                <Pressable
                  accessibilityLabel={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => setShowPassword((currentValue) => !currentValue)}
                  style={({ pressed }) => [styles.passwordToggle, pressed && styles.pressed]}
                >
                  <Text style={styles.passwordToggleText}>
                    {showPassword ? 'Gizle' : 'Göster'}
                  </Text>
                </Pressable>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={handleForgotPassword}
              style={({ pressed }) => [styles.forgotButton, pressed && styles.pressed]}
            >
              <Text style={styles.forgotText}>Şifremi Unuttum</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={handleLogin}
              style={({ pressed }) => [
                styles.button,
                styles.primaryButton,
                loading && styles.disabledButton,
                pressed && !loading && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
              </Text>
            </Pressable>

            <View style={styles.registerArea}>
              <Text style={styles.registerPrompt}>Hesabın yok mu?</Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={handleRegister}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.registerLink}>Kayıt Ol</Text>
              </Pressable>
            </View>

            <View style={styles.dividerArea}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>veya</Text>
              <View style={styles.divider} />
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={() => navigation.navigate('GuestInfo')}
              style={({ pressed }) => [
                styles.button,
                styles.secondaryButton,
                loading && styles.disabledButton,
                pressed && !loading && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Misafir Olarak Devam Et</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
  },
  header: {
    gap: 34,
  },
  brandArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoPlaceholder: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    backgroundColor: colors.secondary,
  },
  logoText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  brandName: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '800',
  },
  brandTagline: {
    marginTop: 2,
    color: colors.accent,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  headingArea: {
    maxWidth: 520,
  },
  accentLine: {
    width: 40,
    height: 3,
    marginBottom: 18,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  title: {
    color: colors.card,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  description: {
    marginTop: 10,
    color: colors.border,
    fontSize: 15,
    lineHeight: 23,
  },
  form: {
    marginTop: 34,
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: colors.border,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    color: colors.card,
    fontSize: 16,
  },
  passwordContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  passwordInput: {
    minHeight: 52,
    flex: 1,
    paddingLeft: 16,
    paddingRight: 8,
    color: colors.card,
    fontSize: 16,
  },
  passwordToggle: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  passwordToggleText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  inputError: {
    borderColor: colors.warning,
  },
  errorText: {
    color: colors.warning,
    fontSize: 12,
    lineHeight: 17,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
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
    marginTop: 2,
    backgroundColor: colors.accent,
  },
  primaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  registerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  registerPrompt: {
    color: colors.border,
    fontSize: 14,
  },
  registerLink: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  dividerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },
  divider: {
    height: 1,
    flex: 1,
    backgroundColor: colors.muted,
  },
  dividerText: {
    color: colors.muted,
    fontSize: 12,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.primary,
  },
  secondaryButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
  disabledButton: {
    opacity: 0.55,
  },
});
