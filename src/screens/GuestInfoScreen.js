import { useState } from 'react';
import {
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

export default function GuestInfoScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function clearFieldError(fieldName) {
    if (errors[fieldName]) {
      setErrors((currentErrors) => ({ ...currentErrors, [fieldName]: undefined }));
    }
  }

  function handleFirstNameChange(value) {
    setFirstName(value);
    clearFieldError('firstName');
  }

  function handleLastNameChange(value) {
    setLastName(value);
    clearFieldError('lastName');
  }

  function handlePhoneNumberChange(value) {
    setPhoneNumber(value.replace(/\D/g, '').slice(0, 11));
    clearFieldError('phoneNumber');
  }

  function handleEmailChange(value) {
    setEmail(value);
    clearFieldError('email');
  }

  function validateForm() {
    const nextErrors = {};
    const normalizedEmail = email.trim();

    if (!firstName.trim()) {
      nextErrors.firstName = 'Ad gerekli.';
    }

    if (!lastName.trim()) {
      nextErrors.lastName = 'Soyad gerekli.';
    }

    if (!phoneNumber) {
      nextErrors.phoneNumber = 'Telefon numarası gerekli.';
    } else if (phoneNumber.length !== 11) {
      nextErrors.phoneNumber = 'Telefon numarası 11 haneli olmalı.';
    } else if (!phoneNumber.startsWith('0')) {
      nextErrors.phoneNumber = 'Telefon numarası 0 ile başlamalı.';
    }

    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = 'Geçerli bir e-posta adresi girin.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleContinue() {
    const isFormValid = validateForm();

    if (!isFormValid || loading) {
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      navigation.navigate('Reservation', {
        guestInfo: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber,
          email: email.trim(),
        },
        isGuest: true,
      });
    }, 500);
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
            <Text style={styles.title}>Misafir Olarak Devam Et</Text>
            <Text style={styles.description}>
              Rezervasyonunuzu oluşturabilmemiz ve size ulaşabilmemiz için iletişim
              bilgilerinizi girin.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Ad</Text>
              <TextInput
                accessibilityLabel="Ad"
                autoCapitalize="words"
                autoComplete="given-name"
                editable={!loading}
                onChangeText={handleFirstNameChange}
                placeholder="Adınızı girin"
                placeholderTextColor={colors.muted}
                style={[styles.input, errors.firstName && styles.inputError]}
                value={firstName}
              />
              {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Soyad</Text>
              <TextInput
                accessibilityLabel="Soyad"
                autoCapitalize="words"
                autoComplete="family-name"
                editable={!loading}
                onChangeText={handleLastNameChange}
                placeholder="Soyadınızı girin"
                placeholderTextColor={colors.muted}
                style={[styles.input, errors.lastName && styles.inputError]}
                value={lastName}
              />
              {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Telefon numarası</Text>
              <TextInput
                accessibilityLabel="Telefon numarası"
                autoComplete="tel"
                editable={!loading}
                keyboardType="phone-pad"
                maxLength={11}
                onChangeText={handlePhoneNumberChange}
                placeholder="05XX XXX XX XX"
                placeholderTextColor={colors.muted}
                style={[styles.input, errors.phoneNumber && styles.inputError]}
                value={phoneNumber}
              />
              {errors.phoneNumber ? (
                <Text style={styles.errorText}>{errors.phoneNumber}</Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>E-posta (opsiyonel)</Text>
              <TextInput
                accessibilityLabel="E-posta adresi, opsiyonel"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!loading}
                keyboardType="email-address"
                onChangeText={handleEmailChange}
                placeholder="ornek@email.com"
                placeholderTextColor={colors.muted}
                style={[styles.input, errors.email && styles.inputError]}
                value={email}
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Misafir rezervasyonlarında sadakat puanı ve üye indirimleri uygulanmaz.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={handleContinue}
              style={({ pressed }) => [
                styles.button,
                styles.primaryButton,
                loading && styles.disabledButton,
                pressed && !loading && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Hazırlanıyor...' : 'Rezervasyona Devam Et'}
              </Text>
            </Pressable>

            <View style={styles.loginArea}>
              <Text style={styles.loginPrompt}>Zaten hesabın var mı?</Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => navigation.navigate('Login')}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.loginLink}>Giriş Yap</Text>
              </Pressable>
            </View>
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 30,
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
    marginTop: 34,
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
    marginTop: 30,
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
  inputError: {
    borderColor: colors.warning,
  },
  errorText: {
    color: colors.warning,
    fontSize: 12,
    lineHeight: 17,
  },
  infoBox: {
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.secondary,
  },
  infoText: {
    color: colors.border,
    fontSize: 12,
    lineHeight: 18,
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
  loginArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  loginPrompt: {
    color: colors.border,
    fontSize: 14,
  },
  loginLink: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
  },
  disabledButton: {
    opacity: 0.55,
  },
});
