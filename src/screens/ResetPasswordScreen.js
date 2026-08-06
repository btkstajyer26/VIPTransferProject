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

export default function ResetPasswordScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createLoginStyles(theme), [theme]);
  const email = route.params?.email ?? '';

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  function validateForm() {
    const nextErrors = {};

    if (code.length !== 6) {
      nextErrors.code = 'Doğrulama kodu 6 haneli olmalı.';
    }

    if (newPassword.length < 6) {
      nextErrors.newPassword = 'Şifre en az 6 karakter olmalı.';
    }

    if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = 'Şifreler eşleşmiyor.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (loading || !validateForm()) return;

    try {
      setLoading(true);
      setErrors({});
      await authService.resetPassword({ email, code, newPassword });
      navigation.replace('Login');
    } catch (resetError) {
      setErrors({
        form: resetError?.message || 'Şifre sıfırlanamadı. Lütfen kodu kontrol edin.',
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
      await authService.forgotPassword(email);
      setInfoMessage('Yeni sıfırlama kodu e-postanıza gönderildi.');
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
            <View style={styles.headingArea}>
              <View style={styles.accentLine} />
              <Text style={styles.title}>Yeni Şifre Belirle</Text>
              <Text style={styles.description}>
                {email
                  ? `${email} adresine gönderilen 6 haneli kodu ve yeni şifrenizi girin.`
                  : 'E-postanıza gönderilen 6 haneli kodu ve yeni şifrenizi girin.'}
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
                onChangeText={(value) => {
                  setCode(value.replace(/\D/g, '').slice(0, 6));
                  setErrors((currentErrors) => ({ ...currentErrors, code: undefined }));
                }}
                placeholder="6 haneli kod"
                placeholderTextColor={theme.placeholder}
                style={[styles.input, errors.code && styles.inputError]}
                value={code}
              />
              {errors.code ? <Text style={styles.errorText}>{errors.code}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Yeni şifre</Text>
              <View style={[styles.passwordContainer, errors.newPassword && styles.inputError]}>
                <TextInput
                  accessibilityLabel="Yeni şifre"
                  autoComplete="new-password"
                  editable={!loading}
                  onChangeText={(value) => {
                    setNewPassword(value);
                    setErrors((currentErrors) => ({ ...currentErrors, newPassword: undefined }));
                  }}
                  placeholder="En az 6 karakter"
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry={!showPassword}
                  style={styles.passwordInput}
                  value={newPassword}
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
              {errors.newPassword ? (
                <Text style={styles.errorText}>{errors.newPassword}</Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Yeni şifre tekrar</Text>
              <TextInput
                accessibilityLabel="Yeni şifre tekrar"
                autoComplete="new-password"
                editable={!loading}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  setErrors((currentErrors) => ({ ...currentErrors, confirmPassword: undefined }));
                }}
                placeholder="Yeni şifrenizi tekrar girin"
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
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.button,
                styles.primaryButton,
                loading && styles.disabledButton,
                pressed && !loading && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Kaydediliyor...' : 'Şifreyi Sıfırla'}
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
