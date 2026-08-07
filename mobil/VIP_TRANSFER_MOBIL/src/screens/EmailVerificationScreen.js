import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import { resendVerificationCode, verifyEmail } from '../services/authService';
import { useTheme } from '../theme/ThemeContext';

function getSafeMessage(error, fallback) {
  if (error?.status === 0) return 'Sunucuya bağlanılamadı. Lütfen bağlantınızı kontrol edin.';
  if (error?.status === 429) return 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.';
  return fallback;
}

export default function EmailVerificationScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const email = typeof route.params?.email === 'string' ? route.params.email.trim() : '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  function changeCode(value) {
    setCode(value.replace(/\D/g, '').slice(0, 6));
    if (error) setError('');
  }

  async function handleVerify() {
    if (!email || code.length !== 6 || verifying) {
      if (code.length !== 6) setError('Lütfen 6 haneli doğrulama kodunu girin.');
      return;
    }

    try {
      setVerifying(true);
      setError('');
      await verifyEmail(email, code);
      Alert.alert(
        'E-posta doğrulandı',
        'Hesabınız doğrulandı. Şimdi giriş yapabilirsiniz.',
        [{
          text: 'Giriş Yap',
          onPress: () => navigation.reset({
            index: 0,
            routes: [{
              name: 'Login',
              params: {
                fromReservationFlow: route.params?.fromReservationFlow === true,
                returnTo: route.params?.returnTo,
              },
            }],
          }),
        }],
      );
    } catch (requestError) {
      setError(getSafeMessage(requestError, 'Kod doğrulanamadı. Kodun doğru ve güncel olduğundan emin olun.'));
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (!email || resending) return;
    try {
      setResending(true);
      setError('');
      await resendVerificationCode(email);
      setCode('');
      Alert.alert('Kod gönderildi', 'Yeni doğrulama kodu e-posta adresinize gönderildi.');
    } catch (requestError) {
      setError(getSafeMessage(requestError, 'Yeni kod gönderilemedi. Lütfen tekrar deneyin.'));
    } finally {
      setResending(false);
    }
  }

  if (!email) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <View style={styles.missingState}>
          <Text style={styles.title}>E-posta bilgisi bulunamadı</Text>
          <Text style={styles.description}>Lütfen giriş ekranına dönüp tekrar deneyin.</Text>
          <Pressable onPress={() => navigation.replace('Login')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Giriş Ekranına Dön</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.icon}><Text style={styles.iconText}>@</Text></View>
          <Text style={styles.title}>E-postanı doğrula</Text>
          <Text style={styles.description}>
            <Text style={styles.email}>{email}</Text> adresine gönderilen 6 haneli kodu girin.
          </Text>

          <Text style={styles.label}>Doğrulama kodu</Text>
          <TextInput
            accessibilityLabel="Altı haneli e-posta doğrulama kodu"
            autoComplete="one-time-code"
            editable={!verifying}
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={changeCode}
            placeholder="000000"
            placeholderTextColor={theme.placeholder}
            style={[styles.codeInput, error && styles.inputError]}
            textContentType="oneTimeCode"
            value={code}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={verifying || code.length !== 6}
            onPress={handleVerify}
            style={({ pressed }) => [
              styles.primaryButton,
              (verifying || code.length !== 6) && styles.disabled,
              pressed && !verifying && styles.pressed,
            ]}
          >
            {verifying ? <ActivityIndicator color={theme.buttonText} /> : <Text style={styles.primaryButtonText}>E-postayı Doğrula</Text>}
          </Pressable>

          <View style={styles.resendArea}>
            <Text style={styles.resendPrompt}>Kod gelmedi mi?</Text>
            <Pressable accessibilityRole="button" disabled={resending} onPress={handleResend}>
              <Text style={[styles.resendText, resending && styles.disabledText]}>
                {resending ? 'Gönderiliyor...' : 'Tekrar Gönder'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>Kod 15 dakika geçerlidir.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    keyboardView: { flex: 1 },
    content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 36 },
    missingState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    icon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: theme.accentSoft },
    iconText: { color: theme.accent, fontSize: 28, fontWeight: '900' },
    title: { marginTop: 22, color: theme.text, fontSize: 28, fontWeight: '800' },
    description: { marginTop: 10, color: theme.textSecondary, fontSize: 15, lineHeight: 23 },
    email: { color: theme.text, fontWeight: '800' },
    label: { marginTop: 30, marginBottom: 9, color: theme.text, fontSize: 13, fontWeight: '700' },
    codeInput: { height: 64, borderWidth: 1, borderColor: theme.border, borderRadius: 16, paddingHorizontal: 18, backgroundColor: theme.inputBackground, color: theme.text, fontSize: 27, fontWeight: '800', letterSpacing: 10, textAlign: 'center' },
    inputError: { borderColor: theme.error },
    errorText: { marginTop: 9, color: theme.error, fontSize: 13, lineHeight: 19 },
    primaryButton: { minHeight: 54, marginTop: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingHorizontal: 20, backgroundColor: theme.accent },
    primaryButtonText: { color: theme.buttonText, fontSize: 15, fontWeight: '800' },
    resendArea: { flexDirection: 'row', justifyContent: 'center', marginTop: 25, gap: 6 },
    resendPrompt: { color: theme.textSecondary, fontSize: 14 },
    resendText: { color: theme.accent, fontSize: 14, fontWeight: '800' },
    hint: { marginTop: 12, color: theme.textSecondary, fontSize: 12, textAlign: 'center' },
    disabled: { opacity: 0.48 },
    disabledText: { opacity: 0.55 },
    pressed: { opacity: 0.76 },
  });
}
