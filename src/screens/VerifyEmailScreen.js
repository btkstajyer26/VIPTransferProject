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

export default function VerifyEmailScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createLoginStyles(theme), [theme]);
  const email = route.params?.email ?? '';

  const [code, setCode] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  function handleCodeChange(value) {
    setCode(value.replace(/\D/g, '').slice(0, 6));
    setErrors((currentErrors) => ({ ...currentErrors, code: undefined }));
    setInfoMessage('');
  }

  async function handleVerify() {
    if (loading) return;

    if (code.length !== 6) {
      setErrors({ code: 'Doğrulama kodu 6 haneli olmalı.' });
      return;
    }

    try {
      setLoading(true);
      setErrors({});
      await authService.verifyEmail({ email, code });
      navigation.replace('Login');
    } catch (verifyError) {
      setErrors({
        form: verifyError?.message || 'Doğrulama tamamlanamadı. Lütfen kodu kontrol edin.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resending) return;

    try {
      setResending(true);
      setErrors({});
      await authService.resendVerificationCode(email);
      setInfoMessage('Yeni doğrulama kodu e-postanıza gönderildi.');
    } catch (resendError) {
      setErrors({
        form: resendError?.message || 'Kod tekrar gönderilemedi. Lütfen tekrar deneyin.',
      });
    } finally {
      setResending(false);
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
              <Text style={styles.title}>E-postanı Doğrula</Text>
              <Text style={styles.description}>
                {email
                  ? `${email} adresine gönderilen 6 haneli doğrulama kodunu girin.`
                  : 'E-postanıza gönderilen 6 haneli doğrulama kodunu girin.'}
              </Text>
            </View>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Doğrulama kodu</Text>
              <TextInput
                accessibilityLabel="Doğrulama kodu"
                editable={!loading}
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={handleCodeChange}
                placeholder="6 haneli kod"
                placeholderTextColor={theme.placeholder}
                style={[styles.input, errors.code && styles.inputError]}
                value={code}
              />
              {errors.code ? <Text style={styles.errorText}>{errors.code}</Text> : null}
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={handleVerify}
              style={({ pressed }) => [
                styles.button,
                styles.primaryButton,
                loading && styles.disabledButton,
                pressed && !loading && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Doğrulanıyor...' : 'Doğrula'}
              </Text>
            </Pressable>
            {errors.form ? <Text style={styles.errorText}>{errors.form}</Text> : null}
            {infoMessage ? <Text style={styles.description}>{infoMessage}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={resending}
              hitSlop={8}
              onPress={handleResend}
              style={({ pressed }) => [styles.forgotButton, pressed && styles.pressed]}
            >
              <Text style={styles.forgotText}>
                {resending ? 'Gönderiliyor...' : 'Kodu Tekrar Gönder'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
