import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  isValidReservationDraft,
  useReservationDraft,
} from '../context/ReservationDraftContext';
import useAuth from '../hooks/useAuth';
import { useLocalization } from '../localization/LocalizationContext';
import { useTheme } from '../theme/ThemeContext';
import { createLoginStyles } from '../styles/loginStyles';

export default function LoginScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { login } = useAuth();
  const { clearReservationDraft, reservationDraft } = useReservationDraft();
  const styles = useMemo(() => createLoginStyles(theme), [theme]);
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
      nextErrors.phone = t('login.error.phoneRequired');
    } else if (!/^\d+$/.test(phone)) {
      nextErrors.phone = t('login.error.phoneDigits');
    } else if (phone.length !== 11) {
      nextErrors.phone = t('login.error.phoneLength');
    } else if (!phone.startsWith('0')) {
      nextErrors.phone = t('login.error.phoneStart');
    }

    if (password.length === 0) {
      nextErrors.password = t('login.error.passwordRequired');
    } else if (password.length < 6) {
      nextErrors.password = t('login.error.passwordLength');
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleLogin() {
    const isFormValid = validateForm();

    if (!isFormValid) {
      return;
    }

    if (loading) {
      return;
    }

    try {
      setLoading(true);
      const authenticatedSession = await login(phone, password);

      if (authenticatedSession.role?.trim().toUpperCase() === 'ADMIN') {
        return;
      }

      if (
        route.params?.fromReservationFlow === true &&
        isValidReservationDraft(reservationDraft)
      ) {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: route.params?.returnTo || 'Reservation',
              params: { fromReservationFlow: true, isGuest: false },
            },
          ],
        });
        return;
      }

      if (route.params?.fromReservationFlow === true) {
        clearReservationDraft();
      }

      navigation.replace('Home');
    } catch (loginError) {
      const errorCode = loginError?.data?.errorCode;
      const unverifiedEmail = loginError?.data?.data;

      if (errorCode === 'USER_UNVERIFIED' && typeof unverifiedEmail === 'string') {
        navigation.navigate('EmailVerification', {
          email: unverifiedEmail,
          fromReservationFlow: route.params?.fromReservationFlow === true,
          returnTo: route.params?.returnTo,
        });
        return;
      }

      setErrors((currentErrors) => ({
        ...currentErrors,
        form:
          loginError?.message ||
          t('login.error.general'),
      }));
    } finally {
      setLoading(false);
    }
  }

  function handleForgotPassword() {
    Alert.alert(t('login.info'), t('login.comingSoon'));
  }

  function handleRegister() {
    Alert.alert(t('login.info'), t('login.comingSoon'));
  }

  function handleContinueAsGuest() {
    clearReservationDraft();
    navigation.navigate('TransferSearch');
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
                  <Text style={styles.brandTagline}>{t('welcome.tagline')}</Text>
                </View>
              </View>
              <Pressable
                accessibilityLabel={t('welcome.settings')}
                accessibilityRole="button"
                onPress={() => navigation.navigate('ThemeSettings')}
                style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
              >
                <Text style={styles.settingsIcon}>⚙</Text>
              </Pressable>
            </View>

            <View style={styles.headingArea}>
              <View style={styles.accentLine} />
              <Text style={styles.title}>{t('login.title')}</Text>
              <Text style={styles.description}>{t('login.description')}</Text>
            </View>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('login.phone')}</Text>
              <TextInput
                accessibilityLabel={t('login.phone')}
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
              <Text style={styles.label}>{t('login.password')}</Text>
              <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
                <TextInput
                  accessibilityLabel={t('login.password')}
                  autoComplete="current-password"
                  editable={!loading}
                  onChangeText={handlePasswordChange}
                  placeholder={t('login.passwordPlaceholder')}
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry={!showPassword}
                  style={styles.passwordInput}
                  value={password}
                />
                <Pressable
                  accessibilityLabel={showPassword ? t('login.hide') : t('login.show')}
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => setShowPassword((currentValue) => !currentValue)}
                  style={({ pressed }) => [styles.passwordToggle, pressed && styles.pressed]}
                >
                  <Text style={styles.passwordToggleText}>
                    {showPassword ? t('login.hide') : t('login.show')}
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
              <Text style={styles.forgotText}>{t('login.forgot')}</Text>
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
                {loading ? t('login.submitting') : t('login.submit')}
              </Text>
            </Pressable>
            {errors.form ? <Text style={styles.errorText}>{errors.form}</Text> : null}

            <View style={styles.registerArea}>
              <Text style={styles.registerPrompt}>{t('login.noAccount')}</Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={handleRegister}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.registerLink}>{t('login.register')}</Text>
              </Pressable>
            </View>

            <View style={styles.dividerArea}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>{t('login.or')}</Text>
              <View style={styles.divider} />
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={handleContinueAsGuest}
              style={({ pressed }) => [
                styles.button,
                styles.secondaryButton,
                loading && styles.disabledButton,
                pressed && !loading && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>{t('login.guest')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
