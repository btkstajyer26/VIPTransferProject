import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getGuestReservation } from '../api/reservationApi';
import { createReservationLookupStyles } from '../styles/reservationLookupStyles';
import { useTheme } from '../theme/ThemeContext';

function getLookupError(error) {
  if (error?.status === 403 || error?.status === 404) {
    return 'Rezervasyon bulunamadı. Kod ve telefon numarasını kontrol edin.';
  }

  return 'Rezervasyon bilgileri alınamadı. Lütfen tekrar deneyin.';
}

export default function ReservationLookupScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createReservationLookupStyles(theme), [theme]);
  const [bookingReference, setBookingReference] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  async function handleLookup() {
    if (submittingRef.current || loading) return;

    const normalizedReference = bookingReference.trim().toUpperCase();
    const normalizedPhone = phoneNumber.replace(/\D/g, '').slice(0, 11);
    const nextErrors = {};

    if (!normalizedReference) {
      nextErrors.bookingReference = 'Rezervasyon kodu gerekli.';
    }
    if (!normalizedPhone) {
      nextErrors.phoneNumber = 'Telefon numarası gerekli.';
    } else if (normalizedPhone.length !== 11 || !normalizedPhone.startsWith('05')) {
      nextErrors.phoneNumber = 'Geçerli bir 11 haneli telefon numarası girin.';
    }

    setBookingReference(normalizedReference);
    setPhoneNumber(normalizedPhone);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    submittingRef.current = true;
    setLoading(true);
    try {
      const reservation = await getGuestReservation({
        bookingReference: normalizedReference,
        phoneNumber: normalizedPhone,
      });
      navigation.navigate('ReservationDetails', { reservation });
    } catch (error) {
      setErrors({ form: getLookupError(error) });
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headingArea}>
            <Text style={styles.eyebrow}>REZERVASYON SORGULAMA</Text>
            <Text style={styles.title}>Yolculuk bilgilerinize ulaşın.</Text>
            <Text style={styles.description}>
              Rezervasyon kodunuzu ve rezervasyonda kullandığınız telefon numarasını girin.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Rezervasyon kodu</Text>
            <TextInput
              accessibilityLabel="Rezervasyon kodu"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
              onChangeText={(value) => {
                setBookingReference(value.toUpperCase());
                setErrors((current) => ({ ...current, bookingReference: undefined, form: undefined }));
              }}
              placeholder="BTK-2026-XXXXXXXX"
              placeholderTextColor={theme.placeholder}
              style={[styles.input, errors.bookingReference && styles.inputError]}
              value={bookingReference}
            />
            {errors.bookingReference ? (
              <Text style={styles.errorText}>{errors.bookingReference}</Text>
            ) : null}

            <Text style={styles.label}>Telefon numarası</Text>
            <TextInput
              accessibilityLabel="Telefon numarası"
              autoComplete="tel"
              editable={!loading}
              keyboardType="phone-pad"
              maxLength={11}
              onChangeText={(value) => {
                setPhoneNumber(value.replace(/\D/g, '').slice(0, 11));
                setErrors((current) => ({ ...current, phoneNumber: undefined, form: undefined }));
              }}
              placeholder="05XX XXX XX XX"
              placeholderTextColor={theme.placeholder}
              style={[styles.input, errors.phoneNumber && styles.inputError]}
              value={phoneNumber}
            />
            {errors.phoneNumber ? (
              <Text style={styles.errorText}>{errors.phoneNumber}</Text>
            ) : null}

            {errors.form ? (
              <View accessibilityLiveRegion="polite" style={styles.errorBox}>
                <Text style={styles.errorText}>{errors.form}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={handleLookup}
              style={({ pressed }) => [
                styles.primaryButton,
                loading && styles.disabledButton,
                pressed && !loading && styles.pressedButton,
              ]}
            >
              {loading ? <ActivityIndicator color={theme.buttonText} size="small" /> : null}
              <Text style={styles.primaryButtonText}>
                {loading ? 'Rezervasyon Getiriliyor...' : 'Rezervasyonu Getir'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
