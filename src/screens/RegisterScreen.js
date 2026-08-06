import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as authService from '../services/authService';
import { useTheme } from '../theme/ThemeContext';
import { createLoginStyles } from '../styles/loginStyles';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createLoginStyles(theme), [theme]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function clearFieldError(fieldName) {
    setErrors((currentErrors) => ({ ...currentErrors, [fieldName]: undefined }));
  }

  function handlePhoneChange(value) {
    setPhone(value.replace(/\D/g, '').slice(0, 11));
    clearFieldError('phone');
  }

  function validateForm() {
    const nextErrors = {};

    if (!firstName.trim()) {
      nextErrors.firstName = 'Ad gerekli.';
    }

    if (!lastName.trim()) {
      nextErrors.lastName = 'Soyad gerekli.';
    }

    if (!email.trim()) {
      nextErrors.email = 'E-posta gerekli.';
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = 'Geçerli bir e-posta adresi girin.';
    }

    if (!phone) {
      nextErrors.phone = 'Telefon numarası gerekli.';
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

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Şifreler eşleşmiyor.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleRegister() {
    if (!validateForm() || loading) {
      return;
    }

    try {
      setLoading(true);
      await authService.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phone,
        password,
      });

      navigation.replace('VerifyEmail', { email: email.trim() });
    } catch (registerError) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        form:
          registerError?.message ||
          'Kayıt işlemi tamamlanamadı. Lütfen bilgilerinizi kontrol edin.',
      }));
    } finally {
      setLoading(false);
    }
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
            <View style={styles.headerTop}>
              <View style={styles.brandArea}>
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoText}>VIP</Text>
                </View>
                <View>
                  <Text style={styles.brandName}>VIP Transfer</Text>
                  <Text style={styles.brandTagline}>PREMIUM ULAŞIM</Text>
                </View>
              </View>
            </View>

            <View style={styles.headingArea}>
              <View style={styles.accentLine} />
              <Text style={styles.title}>Hesap Oluştur</Text>
              <Text style={styles.description}>
                Sadakat puanlarınızı ve rezervasyon geçmişinizi takip etmek için üye olun.
              </Text>
            </View>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Ad</Text>
              <TextInput
                accessibilityLabel="Ad"
                autoComplete="given-name"
                editable={!loading}
                onChangeText={(value) => {
                  setFirstName(value);
                  clearFieldError('firstName');
                }}
                placeholder="Adınız"
                placeholderTextColor={theme.placeholder}
                style={[styles.input, errors.firstName && styles.inputError]}
                value={firstName}
              />
              {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Soyad</Text>
              <TextInput
                accessibilityLabel="Soyad"
                autoComplete="family-name"
                editable={!loading}
                onChangeText={(value) => {
                  setLastName(value);
                  clearFieldError('lastName');
                }}
                placeholder="Soyadınız"
                placeholderTextColor={theme.placeholder}
                style={[styles.input, errors.lastName && styles.inputError]}
                value={lastName}
              />
              {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>E-posta</Text>
              <TextInput
                accessibilityLabel="E-posta"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
                keyboardType="email-address"
                onChangeText={(value) => {
                  setEmail(value);
                  clearFieldError('email');
                }}
                placeholder="ornek@eposta.com"
                placeholderTextColor={theme.placeholder}
                style={[styles.input, errors.email && styles.inputError]}
                value={email}
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

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
                placeholderTextColor={theme.placeholder}
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
                  autoComplete="new-password"
                  editable={!loading}
                  onChangeText={(value) => {
                    setPassword(value);
                    clearFieldError('password');
                  }}
                  placeholder="En az 6 karakter"
                  placeholderTextColor={theme.placeholder}
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

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Şifre tekrar</Text>
              <TextInput
                accessibilityLabel="Şifre tekrar"
                autoComplete="new-password"
                editable={!loading}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  clearFieldError('confirmPassword');
                }}
                placeholder="Şifrenizi tekrar girin"
                placeholderTextColor={theme.placeholder}
                secureTextEntry={!showPassword}
                style={[styles.input, errors.confirmPassword && styles.inputError]}
                value={confirmPassword}
              />
              {errors.confirmPassword ? (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={handleRegister}
              style={({ pressed }) => [
                styles.button,
                styles.primaryButton,
                loading && styles.disabledButton,
                pressed && !loading && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Kayıt Olunuyor...' : 'Kayıt Ol'}
              </Text>
            </Pressable>
            {errors.form ? <Text style={styles.errorText}>{errors.form}</Text> : null}

            <View style={styles.registerArea}>
              <Text style={styles.registerPrompt}>Zaten hesabın var mı?</Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => navigation.navigate('Login')}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.registerLink}>Giriş Yap</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
