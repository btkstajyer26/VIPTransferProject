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

export default function ForgotPasswordScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createLoginStyles(theme), [theme]);

  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (loading) return;

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrors({ email: 'E-posta gerekli.' });
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setErrors({ email: 'Geçerli bir e-posta adresi girin.' });
      return;
    }

    try {
      setLoading(true);
      setErrors({});
      await authService.forgotPassword(trimmedEmail);
      navigation.replace('ResetPassword', { email: trimmedEmail });
    } catch (requestError) {
      setErrors({
        form: requestError?.message || 'İstek tamamlanamadı. Lütfen tekrar deneyin.',
      });
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
            <View style={styles.headingArea}>
              <View style={styles.accentLine} />
              <Text style={styles.title}>Şifremi Unuttum</Text>
              <Text style={styles.description}>
                Hesabınıza kayıtlı e-posta adresini girin, size 6 haneli bir sıfırlama
                kodu gönderelim.
              </Text>
            </View>
          </View>

          <View style={styles.form}>
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
                  setErrors((currentErrors) => ({ ...currentErrors, email: undefined }));
                }}
                placeholder="ornek@eposta.com"
                placeholderTextColor={theme.placeholder}
                style={[styles.input, errors.email && styles.inputError]}
                value={email}
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
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
                {loading ? 'Gönderiliyor...' : 'Sıfırlama Kodu Gönder'}
              </Text>
            </Pressable>
            {errors.form ? <Text style={styles.errorText}>{errors.form}</Text> : null}

            <View style={styles.registerArea}>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => navigation.navigate('Login')}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.registerLink}>Giriş ekranına dön</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
