import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  buildAuthenticatedReservationData,
  buildGuestReservationData,
  createAuthenticatedReservation,
  createGuestReservation,
} from '../api/reservationApi';
import ReservationSummaryCard from '../components/reservation/ReservationSummaryCard';
import VehicleBookingSteps from '../components/vehicle/VehicleBookingSteps';
import {
  isValidReservationDraft,
  useReservationDraft,
} from '../context/ReservationDraftContext';
import useAuth from '../hooks/useAuth';
import { createReservationStyles } from '../styles/reservationStyles';
import { useTheme } from '../theme/ThemeContext';

function animatedStyle(animation, distance = 16) {
  return {
    opacity: animation,
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }),
      },
    ],
  };
}

export default function ReservationScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const { clearReservationDraft, reservationDraft } = useReservationDraft();
  const styles = useMemo(() => createReservationStyles(theme), [theme]);
  const transferDetails = route.params?.transferDetails ?? reservationDraft?.transferDetails;
  const selectedVehicle = route.params?.selectedVehicle ?? reservationDraft?.selectedVehicle;
  const hasReservationData = isValidReservationDraft({ transferDetails, selectedVehicle });
  const guestInfo = route.params?.guestInfo;
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reservation, setReservation] = useState(null);
  const headerAnimation = useRef(new Animated.Value(0)).current;
  const summaryAnimation = useRef(new Animated.Value(0)).current;
  const paymentAnimation = useRef(new Animated.Value(0)).current;
  const actionAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timing = (value, duration = 400) =>
      Animated.timing(value, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      });

    Animated.stagger(90, [
      timing(headerAnimation, 440),
      timing(summaryAnimation),
      timing(paymentAnimation),
      timing(actionAnimation),
    ]).start();
  }, [actionAnimation, headerAnimation, paymentAnimation, summaryAnimation]);

  useEffect(() => {
    if (hasReservationData) return;

    clearReservationDraft();
    Alert.alert(
      'Rezervasyon bilgileri eksik',
      'Lütfen yolculuk bilgilerinizi yeniden seçin.',
    );
    navigation.replace('TransferSearch');
  }, [clearReservationDraft, hasReservationData, navigation]);

  async function handleCreateReservation() {
    if (loading || reservation || !hasReservationData) return;

    setLoading(true);
    setError('');

    try {
      const buildReservationData = isAuthenticated
        ? buildAuthenticatedReservationData
        : buildGuestReservationData;
      const reservationData = buildReservationData({
        guestInfo,
        notes,
        selectedVehicle,
        transferDetails,
      });
      const response = isAuthenticated
        ? await createAuthenticatedReservation({ reservationData })
        : await createGuestReservation({
            phoneNumber: guestInfo?.phoneNumber,
            reservationData,
          });

      if (!response || typeof response !== 'object' || Array.isArray(response)) {
        throw { message: 'Sunucudan geçerli bir rezervasyon cevabı alınamadı.' };
      }

      setReservation(response);
      clearReservationDraft();
    } catch (requestError) {
      setError(requestError?.message || 'Rezervasyon oluşturulamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }

  function handleFinish() {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  }

  const bookingReference = reservation?.bookingReference;

  if (!hasReservationData) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View pointerEvents="none" style={styles.decorations}>
        <View style={styles.topOrb} />
        <View style={styles.topRing} />
        <View style={styles.bottomOrb} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <VehicleBookingSteps activeStep={3} styles={styles} />

        <Animated.View style={[styles.headingArea, animatedStyle(headerAnimation)]}>
          <Text style={styles.eyebrow}>
            {reservation ? 'REZERVASYON TAMAMLANDI' : 'REZERVASYON VE ÖDEME'}
          </Text>
          <Text style={styles.title}>
            {reservation ? (
              <>
                Yolculuğunuz{'\n'}
                <Text style={styles.highlightedTitle}>hazır.</Text>
              </>
            ) : (
              <>
                Son kez kontrol edin,{'\n'}
                <Text style={styles.highlightedTitle}>güvenle onaylayın.</Text>
              </>
            )}
          </Text>
          <Text style={styles.description}>
            {reservation
              ? 'Rezervasyon bilgileriniz kaydedildi. Referans numaranızı saklayın.'
              : 'Rota bilgilerinize göre kesin tutar rezervasyon oluşturulurken backend tarafından hesaplanır.'}
          </Text>
        </Animated.View>

        {reservation ? (
          <Animated.View style={[styles.successCard, animatedStyle(summaryAnimation, 18)]}>
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Rezervasyonunuz alındı</Text>
            <Text style={styles.successDescription}>
              Sürücü ve araç bilgileri transfer saatinden önce sizinle paylaşılacaktır.
            </Text>
            <View style={styles.referenceBox}>
              <Text style={styles.referenceLabel}>REZERVASYON NUMARASI</Text>
              <Text selectable style={styles.referenceValue}>
                {bookingReference || '—'}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View style={animatedStyle(summaryAnimation, 18)}>
          <ReservationSummaryCard
            reservation={reservation}
            selectedVehicle={selectedVehicle}
            styles={styles}
            transferDetails={transferDetails}
          />
        </Animated.View>

        {!reservation ? (
          <Animated.View style={[styles.paymentCard, animatedStyle(paymentAnimation, 18)]}>
            <View style={styles.paymentHeader}>
              <View>
                <Text style={styles.cardEyebrow}>ÖDEME YÖNTEMİ</Text>
                <Text style={styles.cardTitle}>Araçta Ödeme</Text>
              </View>
              <View style={styles.selectedPaymentBadge}>
                <Text style={styles.selectedPaymentIcon}>✓</Text>
              </View>
            </View>
            <Text style={styles.paymentDescription}>
              Ödemenizi transfer tamamlandığında doğrudan sürücünüze yapabilirsiniz.
            </Text>
            <View style={styles.paymentNotice}>
              <Text style={styles.paymentNoticeIcon}>◆</Text>
              <Text style={styles.paymentNoticeText}>
                Online kart ödeme altyapısı henüz etkin olmadığı için bu aşamada kart bilgisi
                alınmaz.
              </Text>
            </View>

            <Text style={styles.notesLabel}>Sürücüye not (opsiyonel)</Text>
            <TextInput
              accessibilityLabel="Sürücüye not"
              editable={!loading}
              maxLength={300}
              multiline
              onChangeText={setNotes}
              placeholder="Uçuş numarası, karşılama notu veya özel isteğiniz..."
              placeholderTextColor={theme.placeholder}
              style={styles.notesInput}
              textAlignVertical="top"
              value={notes}
            />
            <Text style={styles.characterCount}>{notes.length}/300</Text>
          </Animated.View>
        ) : null}

        {error ? (
          <View accessibilityLiveRegion="polite" style={styles.errorBox}>
            <Text style={styles.errorIcon}>!</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Animated.View style={[styles.actions, animatedStyle(actionAnimation, 18)]}>
          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={reservation ? handleFinish : handleCreateReservation}
            style={({ pressed }) => [
              styles.primaryButton,
              loading && styles.disabledButton,
              pressed && !loading && styles.primaryButtonPressed,
            ]}
          >
            {loading ? <ActivityIndicator color={theme.buttonText} size="small" /> : null}
            <Text style={styles.primaryButtonText}>
              {loading
                ? 'Fiyat Hesaplanıyor...'
                : reservation
                  ? 'Ana Sayfaya Dön'
                  : 'Rezervasyonu Onayla'}
            </Text>
            {!loading ? <Text style={styles.buttonArrow}>→</Text> : null}
          </Pressable>

          {!reservation ? (
            <Text style={styles.termsText}>
              Onaylayarak transfer bilgilerinin doğru olduğunu kabul etmiş olursunuz.
            </Text>
          ) : null}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
