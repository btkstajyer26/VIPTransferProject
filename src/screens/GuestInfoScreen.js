import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GuestBookingSummary from '../components/guest/GuestBookingSummary';
import VehicleBookingSteps from '../components/vehicle/VehicleBookingSteps';
import { createGuestInfoStyles } from '../styles/guestInfoStyles';
import { useTheme } from '../theme/ThemeContext';

function getAnimatedStyle(animation, translateDistance = 16) {
  return {
    opacity: animation,
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [translateDistance, 0],
        }),
      },
    ],
  };
}

function FormField({
  error,
  inputProps,
  label,
  onChangeText,
  styles,
  theme,
  value,
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        onChangeText={onChangeText}
        placeholderTextColor={theme.placeholder}
        style={[styles.input, error && styles.inputError]}
        value={value}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export default function GuestInfoScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createGuestInfoStyles(theme), [theme]);
  const transferDetails = route.params?.transferDetails;
  const selectedVehicle = route.params?.selectedVehicle;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const headingAnimation = useRef(new Animated.Value(0)).current;
  const summaryAnimation = useRef(new Animated.Value(0)).current;
  const formAnimation = useRef(new Animated.Value(0)).current;
  const actionsAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (value, duration = 400) =>
      Animated.timing(value, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      });

    Animated.stagger(90, [
      animate(headingAnimation, 440),
      animate(summaryAnimation),
      animate(formAnimation),
      animate(actionsAnimation),
    ]).start();
  }, [actionsAnimation, formAnimation, headingAnimation, summaryAnimation]);

  function clearFieldError(fieldName) {
    setErrors((currentErrors) => ({ ...currentErrors, [fieldName]: undefined }));
  }

  function validateForm() {
    const nextErrors = {};
    const normalizedEmail = email.trim();

    if (!firstName.trim()) nextErrors.firstName = 'Ad gerekli.';
    if (!lastName.trim()) nextErrors.lastName = 'Soyad gerekli.';

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
    if (!validateForm() || loading) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('Reservation', {
        transferDetails,
        selectedVehicle,
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
      <View pointerEvents="none" style={styles.decorations}>
        <View style={styles.topOrb} />
        <View style={styles.topRing} />
        <View style={styles.bottomOrb} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <VehicleBookingSteps activeStep={2} styles={styles} />

          <Animated.View style={[styles.headingArea, getAnimatedStyle(headingAnimation)]}>
            <Text style={styles.eyebrow}>SON BİR ADIM</Text>
            <Text style={styles.title}>
              Sizi tanıyalım,{'\n'}
              <Text style={styles.highlightedTitle}>yolculuğu tamamlayalım.</Text>
            </Text>
            <Text style={styles.description}>
              Sürücünüzün size ulaşabilmesi ve rezervasyonunuzu hazırlayabilmemiz için
              iletişim bilgilerinizi girin.
            </Text>
          </Animated.View>

          <Animated.View style={getAnimatedStyle(summaryAnimation, 18)}>
            <GuestBookingSummary
              selectedVehicle={selectedVehicle}
              styles={styles}
              transferDetails={transferDetails}
            />
          </Animated.View>

          <Animated.View style={[styles.formCard, getAnimatedStyle(formAnimation, 20)]}>
            <View style={styles.formHeader}>
              <View>
                <Text style={styles.formEyebrow}>MİSAFİR BİLGİLERİ</Text>
                <Text style={styles.formTitle}>İletişim Bilgileri</Text>
              </View>
              <View style={styles.secureBadge}>
                <Text style={styles.secureBadgeIcon}>✓</Text>
                <Text style={styles.secureBadgeText}>GÜVENLİ</Text>
              </View>
            </View>

            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <FormField
                  error={errors.firstName}
                  inputProps={{
                    accessibilityLabel: 'Ad',
                    autoCapitalize: 'words',
                    autoComplete: 'given-name',
                    editable: !loading,
                    placeholder: 'Adınız',
                  }}
                  label="Ad"
                  onChangeText={(value) => {
                    setFirstName(value);
                    clearFieldError('firstName');
                  }}
                  styles={styles}
                  theme={theme}
                  value={firstName}
                />
              </View>
              <View style={styles.nameField}>
                <FormField
                  error={errors.lastName}
                  inputProps={{
                    accessibilityLabel: 'Soyad',
                    autoCapitalize: 'words',
                    autoComplete: 'family-name',
                    editable: !loading,
                    placeholder: 'Soyadınız',
                  }}
                  label="Soyad"
                  onChangeText={(value) => {
                    setLastName(value);
                    clearFieldError('lastName');
                  }}
                  styles={styles}
                  theme={theme}
                  value={lastName}
                />
              </View>
            </View>

            <FormField
              error={errors.phoneNumber}
              inputProps={{
                accessibilityLabel: 'Telefon numarası',
                autoComplete: 'tel',
                editable: !loading,
                keyboardType: 'phone-pad',
                maxLength: 11,
                placeholder: '05XX XXX XX XX',
              }}
              label="Telefon numarası"
              onChangeText={(value) => {
                setPhoneNumber(value.replace(/\D/g, '').slice(0, 11));
                clearFieldError('phoneNumber');
              }}
              styles={styles}
              theme={theme}
              value={phoneNumber}
            />

            <FormField
              error={errors.email}
              inputProps={{
                accessibilityLabel: 'E-posta adresi, opsiyonel',
                autoCapitalize: 'none',
                autoComplete: 'email',
                autoCorrect: false,
                editable: !loading,
                keyboardType: 'email-address',
                placeholder: 'ornek@email.com',
              }}
              label="E-posta (opsiyonel)"
              onChangeText={(value) => {
                setEmail(value);
                clearFieldError('email');
              }}
              styles={styles}
              theme={theme}
              value={email}
            />

            <View style={styles.privacyBox}>
              <Text style={styles.privacyIcon}>◆</Text>
              <Text style={styles.privacyText}>
                Bilgileriniz yalnızca rezervasyon ve sürücü iletişimi için kullanılır.
              </Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.actions, getAnimatedStyle(actionsAnimation, 18)]}>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={handleContinue}
              style={({ pressed }) => [
                styles.continueButton,
                loading && styles.disabledButton,
                pressed && !loading && styles.continueButtonPressed,
              ]}
            >
              <Text style={styles.continueButtonText}>
                {loading ? 'Hazırlanıyor...' : 'Rezervasyona Devam Et'}
              </Text>
              <Text style={styles.continueArrow}>→</Text>
            </Pressable>

            <View style={styles.loginArea}>
              <Text style={styles.loginPrompt}>Zaten hesabınız var mı?</Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => navigation.navigate('Login')}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.loginLink}>Giriş Yap</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
