import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useState } from 'react';
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
import { getLocationDetails, searchLocations } from '../api/locationApi';
import { useTheme } from '../theme/ThemeContext';
import { createTransferSearchStyles } from '../styles/transferSearchStyles';

const MIN_PASSENGER_COUNT = 1;
const MAX_PASSENGER_COUNT = 20;
const SEARCH_DELAY_MS = 375;
const EMPTY_LOCATION = {
  placeId: null,
  displayName: '',
  address: '',
  latitude: null,
  longitude: null,
  type: null,
  source: null,
};

function formatDate(date) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function padNumber(value) {
  return String(value).padStart(2, '0');
}

function formatTime(date) {
  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

function createScheduledDate(selectedDate, selectedTime) {
  if (!selectedDate || !selectedTime) {
    return null;
  }

  return new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    selectedTime.getHours(),
    selectedTime.getMinutes(),
    0,
    0,
  );
}

function formatScheduledTime(selectedDate, selectedTime) {
  const scheduledDate = createScheduledDate(selectedDate, selectedTime);

  if (!scheduledDate) {
    return null;
  }

  return `${scheduledDate.getFullYear()}-${padNumber(scheduledDate.getMonth() + 1)}-${padNumber(
    scheduledDate.getDate(),
  )}T${padNumber(scheduledDate.getHours())}:${padNumber(scheduledDate.getMinutes())}:00`;
}

function hasCoordinates(location) {
  return location.latitude !== null && location.longitude !== null;
}

function validateLocation(location, otherLocation, label) {
  if (!location.placeId || !hasCoordinates(location)) {
    return 'Lütfen listeden bir konum seçin.';
  }

  if (
    otherLocation.placeId &&
    (location.placeId === otherLocation.placeId ||
      (location.latitude === otherLocation.latitude && location.longitude === otherLocation.longitude))
  ) {
    return `${label} konumu diğer konumla aynı olamaz.`;
  }

  return null;
}

function validateTransferForm({ pickupLocation, dropoffLocation, selectedDate, selectedTime, passengerCount }) {
  const nextErrors = {};
  const pickupError = validateLocation(pickupLocation, dropoffLocation, 'Başlangıç');
  const dropoffError = validateLocation(dropoffLocation, pickupLocation, 'Bitiş');

  if (pickupError) nextErrors.pickupLocation = pickupError;
  if (dropoffError) nextErrors.dropoffLocation = dropoffError;
  if (!selectedDate) nextErrors.date = 'Tarih seçin.';
  if (!selectedTime) nextErrors.time = 'Saat seçin.';

  const scheduledDate = createScheduledDate(selectedDate, selectedTime);
  if (scheduledDate && scheduledDate <= new Date()) {
    nextErrors.time = 'Geçmiş bir tarih veya saat seçilemez.';
  }

  if (passengerCount < MIN_PASSENGER_COUNT || passengerCount > MAX_PASSENGER_COUNT) {
    nextErrors.passengerCount = `Yolcu sayısı ${MIN_PASSENGER_COUNT}-${MAX_PASSENGER_COUNT} arasında olmalı.`;
  }

  return nextErrors;
}

function LocationSuggestions({ items, loading, error, onSelect, styles }) {
  if (loading) {
    return <Text style={styles.searchStatus}>Konumlar aranıyor...</Text>;
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  if (!items.length) {
    return null;
  }

  return (
    <View style={styles.suggestionList}>
      {items.map((item, index) => (
        <Pressable
          accessibilityLabel={`${item.displayName}, ${item.address}`}
          accessibilityRole="button"
          key={item.placeId}
          onPress={() => onSelect(item)}
          style={({ pressed }) => [
            styles.suggestionItem,
            index < items.length - 1 && styles.suggestionDivider,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.suggestionName}>{item.displayName}</Text>
          <Text style={styles.suggestionAddress}>{item.address}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function StepIndicator({ styles }) {
  const steps = ['Rota', 'Araç', 'Bilgiler', 'Onay'];

  return (
    <View accessibilityLabel="Rezervasyon adımları, birinci adım Rota" style={styles.stepIndicator}>
      {steps.map((step, index) => (
        <View key={step} style={styles.stepItemContainer}>
          <View style={styles.stepItem}>
            <View style={[styles.stepDot, index === 0 && styles.activeStepDot]}>
              <Text style={[styles.stepNumber, index === 0 && styles.activeStepNumber]}>
                {index + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, index === 0 && styles.activeStepLabel]}>{step}</Text>
          </View>
          {index < steps.length - 1 ? <View style={styles.stepLine} /> : null}
        </View>
      ))}
    </View>
  );
}

function RouteField({
  label,
  location,
  placeholder,
  fieldName,
  markerStyle,
  activeField,
  error,
  loading,
  searchError,
  suggestions,
  onBlur,
  onChangeText,
  onFocus,
  onSelect,
  styles,
  theme,
}) {
  const isActive = activeField === fieldName;

  return (
    <View style={styles.routeFieldRow}>
      <View style={styles.routeMarkerColumn}>
        <View style={[styles.routeMarker, markerStyle]} />
      </View>
      <View style={styles.routeFieldContent}>
        <Text style={styles.routeLabel}>{label}</Text>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="words"
          onBlur={onBlur}
          onChangeText={onChangeText}
          onFocus={onFocus}
          placeholder={placeholder}
          placeholderTextColor={theme.placeholder}
          style={[styles.routeInput, isActive && styles.activeRouteInput, error && styles.inputError]}
          value={location.displayName}
        />
        {location.placeId && location.address ? (
          <Text numberOfLines={2} style={styles.routeAddress}>{location.address}</Text>
        ) : null}
        <LocationSuggestions
          error={searchError}
          items={suggestions}
          loading={loading}
          onSelect={onSelect}
          styles={styles}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </View>
  );
}

function TripInfoCard({ accessibilityLabel, icon, label, value, error, onPress, styles }) {
  return (
    <View style={styles.infoCardWrapper}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.infoCard,
          value && styles.selectedInfoCard,
          error && styles.inputError,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.infoIcon}>{icon}</Text>
        <View style={styles.infoCardText}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text numberOfLines={2} style={value ? styles.infoValue : styles.infoPlaceholder}>
            {value || 'Seçin'}
          </Text>
        </View>
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function TripSummaryCard({ pickupLocation, dropoffLocation, selectedDate, selectedTime, passengerCount, styles }) {
  const hasRoute = Boolean(pickupLocation.placeId && dropoffLocation.placeId);
  const detailParts = [
    selectedDate ? formatDate(selectedDate) : null,
    selectedTime ? formatTime(selectedTime) : null,
    `${passengerCount} yolcu`,
  ].filter(Boolean);

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryAccent} />
      <View style={styles.summaryContent}>
        <Text style={styles.summaryTitle}>Yolculuk Özeti</Text>
        {hasRoute ? (
          <>
            <Text style={styles.summaryRoute}>
              {pickupLocation.displayName} → {dropoffLocation.displayName}
            </Text>
            <Text style={styles.summaryDetails}>{detailParts.join(' · ')}</Text>
          </>
        ) : (
          <Text style={styles.summaryEmpty}>
            Yolculuk özetini görmek için başlangıç ve varış noktalarını seçin.
          </Text>
        )}
        <Text style={styles.summaryInfo}>
          Bir sonraki adımda uygun araçları ve fiyatları görüntüleyeceksiniz.
        </Text>
      </View>
    </View>
  );
}

export default function TransferSearchScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createTransferSearchStyles(theme), [theme]);
  const [pickupLocation, setPickupLocation] = useState({ ...EMPTY_LOCATION });
  const [dropoffLocation, setDropoffLocation] = useState({ ...EMPTY_LOCATION });
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [dropoffLoading, setDropoffLoading] = useState(false);
  const [pickupSearchError, setPickupSearchError] = useState('');
  const [dropoffSearchError, setDropoffSearchError] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [pickerMode, setPickerMode] = useState(null);
  const [activeLocationField, setActiveLocationField] = useState(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let active = true;
    const query = pickupLocation.displayName.trim();

    if (pickupLocation.placeId || query.length < 2) {
      setPickupSuggestions([]);
      setPickupLoading(false);
      return undefined;
    }

    setPickupLoading(true);
    setPickupSearchError('');
    const timer = setTimeout(async () => {
      try {
        const results = await searchLocations(query);
        if (active) setPickupSuggestions(results);
      } catch {
        if (active) setPickupSearchError('Konumlar yüklenemedi. Tekrar deneyin.');
      } finally {
        if (active) setPickupLoading(false);
      }
    }, SEARCH_DELAY_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pickupLocation.displayName, pickupLocation.placeId]);

  useEffect(() => {
    let active = true;
    const query = dropoffLocation.displayName.trim();

    if (dropoffLocation.placeId || query.length < 2) {
      setDropoffSuggestions([]);
      setDropoffLoading(false);
      return undefined;
    }

    setDropoffLoading(true);
    setDropoffSearchError('');
    const timer = setTimeout(async () => {
      try {
        const results = await searchLocations(query);
        if (active) setDropoffSuggestions(results);
      } catch {
        if (active) setDropoffSearchError('Konumlar yüklenemedi. Tekrar deneyin.');
      } finally {
        if (active) setDropoffLoading(false);
      }
    }, SEARCH_DELAY_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [dropoffLocation.displayName, dropoffLocation.placeId]);

  function clearFieldError(fieldName) {
    setErrors((currentErrors) => ({ ...currentErrors, [fieldName]: undefined }));
  }

  function handleLocationTextChange(value, setLocation, setSearchError, fieldName) {
    setLocation({ ...EMPTY_LOCATION, displayName: value, address: value });
    setSearchError('');
    clearFieldError(fieldName);
  }

  async function handleLocationSelect(item, setLocation, setSuggestions, setSearchError, fieldName) {
    setSearchError('');
    try {
      const location = await getLocationDetails(item.placeId);
      setLocation(location);
      setSuggestions([]);
      clearFieldError(fieldName);
    } catch (error) {
      setSearchError(error?.message || 'Konum detayları alınamadı.');
    }
  }

  function handleSwapLocations() {
    const nextPickupLocation = { ...dropoffLocation };
    const nextDropoffLocation = { ...pickupLocation };

    setPickupLocation(nextPickupLocation);
    setDropoffLocation(nextDropoffLocation);
    setPickupSuggestions([]);
    setDropoffSuggestions([]);
    setPickupSearchError('');
    setDropoffSearchError('');
    setErrors((currentErrors) => ({
      ...currentErrors,
      pickupLocation: undefined,
      dropoffLocation: undefined,
    }));
  }

  function handleDateValueChange(value) {
    const nextDate = new Date(value.getFullYear(), value.getMonth(), value.getDate());
    const combinedDate = createScheduledDate(nextDate, selectedTime);

    setSelectedDate(nextDate);
    clearFieldError('date');

    if (combinedDate && combinedDate <= new Date()) {
      setSelectedTime(null);
      setErrors((currentErrors) => ({
        ...currentErrors,
        time: 'Gelecekte bir saat seçin.',
      }));
    }

    if (Platform.OS === 'android') setPickerMode(null);
  }

  function handleTimeValueChange(value) {
    const nextTime = new Date(2000, 0, 1, value.getHours(), value.getMinutes());
    const combinedDate = createScheduledDate(selectedDate, nextTime);

    if (combinedDate && combinedDate <= new Date()) {
      setErrors((currentErrors) => ({ ...currentErrors, time: 'Geçmiş bir saat seçilemez.' }));
      if (Platform.OS === 'android') setPickerMode(null);
      return;
    }

    setSelectedTime(nextTime);
    clearFieldError('time');
    if (Platform.OS === 'android') setPickerMode(null);
  }

  function handlePickerDismiss() {
    setPickerMode(null);
  }

  function updatePassengerCount(change) {
    setPassengerCount((count) => Math.min(MAX_PASSENGER_COUNT, Math.max(MIN_PASSENGER_COUNT, count + change)));
    clearFieldError('passengerCount');
  }

  function handleContinue() {
    const nextErrors = validateTransferForm({ pickupLocation, dropoffLocation, selectedDate, selectedTime, passengerCount });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const scheduledTime = formatScheduledTime(selectedDate, selectedTime);
    const transferDetails = {
      pickupLocation: { ...pickupLocation },
      dropoffLocation: { ...dropoffLocation },
      scheduledTime,
      passengerCount,
    };

    // TODO: VehicleSelectionScreen hazırlandığında transferDetails route params ile aktarılacak.
    Alert.alert(
      'Transfer bilgileri hazırlandı',
      `Başlangıç: ${transferDetails.pickupLocation.displayName}\nBitiş: ${transferDetails.dropoffLocation.displayName}\nTarih: ${formatDate(selectedDate)}\nSaat: ${formatTime(selectedTime)}\nYolcu sayısı: ${passengerCount}`,
    );
  }

  const pickerValue = pickerMode === 'date' ? selectedDate || new Date() : selectedTime || new Date();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <StepIndicator styles={styles} />

          <View style={styles.headingTop}>
            <View style={styles.headingArea}>
              <Text style={styles.eyebrow}>VIP TRANSFER REZERVASYONU</Text>
              <Text style={styles.title}>Transferinizi Planlayın</Text>
              <Text style={styles.description}>
                Rotanızı ve yolculuk zamanınızı seçin, size uygun araçları karşılaştırın.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Tema ayarlarını aç"
              accessibilityRole="button"
              onPress={() => navigation.navigate('ThemeSettings')}
              style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
            >
              <Text style={styles.settingsIcon}>⚙</Text>
            </Pressable>
          </View>

          <View style={styles.routeCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardEyebrow}>YOLCULUK PLANI</Text>
                <Text style={styles.cardTitle}>Rota</Text>
              </View>
              <Pressable
                accessibilityLabel="Başlangıç ve bitiş konumlarını değiştir"
                accessibilityRole="button"
                onPress={handleSwapLocations}
                style={({ pressed }) => [styles.swapButton, pressed && styles.pressed]}
              >
                <Text style={styles.swapIcon}>⇅</Text>
                <Text style={styles.swapButtonText}>Değiştir</Text>
              </Pressable>
            </View>

            <View style={styles.routeFields}>
              <View style={styles.routeConnector} />
              <RouteField
                activeField={activeLocationField}
                error={errors.pickupLocation}
                fieldName="pickupLocation"
                label="Nereden"
                loading={pickupLoading}
                location={pickupLocation}
                markerStyle={styles.pickupMarker}
                onBlur={() => setActiveLocationField(null)}
                onChangeText={(value) => handleLocationTextChange(value, setPickupLocation, setPickupSearchError, 'pickupLocation')}
                placeholder="Başlangıç noktası seçin"
                searchError={pickupSearchError}
                styles={styles}
                suggestions={pickupSuggestions}
                theme={theme}
              />
              <View style={styles.routeDivider} />
              <RouteField
                activeField={activeLocationField}
                error={errors.dropoffLocation}
                fieldName="dropoffLocation"
                label="Nereye"
                loading={dropoffLoading}
                location={dropoffLocation}
                markerStyle={styles.dropoffMarker}
                onBlur={() => setActiveLocationField(null)}
                onChangeText={(value) => handleLocationTextChange(value, setDropoffLocation, setDropoffSearchError, 'dropoffLocation')}
                onFocus={() => setActiveLocationField('dropoffLocation')}
                onSelect={(item) => handleLocationSelect(item, setDropoffLocation, setDropoffSuggestions, setDropoffSearchError, 'dropoffLocation')}
                placeholder="Varış noktası seçin"
                searchError={dropoffSearchError}
                styles={styles}
                suggestions={dropoffSuggestions}
                theme={theme}
              />
            </View>
          </View>

          <View style={styles.infoGrid}>
            <TripInfoCard
              accessibilityLabel="Transfer tarihini seç"
              error={errors.date}
              icon="▣"
              label="Tarih"
              onPress={() => setPickerMode('date')}
              styles={styles}
              value={selectedDate ? formatDate(selectedDate) : ''}
            />
            <TripInfoCard
              accessibilityLabel="Transfer saatini seç"
              error={errors.time}
              icon="◷"
              label="Saat"
              onPress={() => setPickerMode('time')}
              styles={styles}
              value={selectedTime ? formatTime(selectedTime) : ''}
            />
          </View>

            {pickerMode === 'date' ? (
              <View style={styles.pickerArea}>
                <DateTimePicker
                  minimumDate={new Date()}
                  mode="date"
                  onDismiss={handlePickerDismiss}
                  onValueChange={(...args) => handleDateValueChange(args[1])}
                  themeVariant={theme.mode}
                  value={pickerValue}
                />
                {Platform.OS === 'ios' ? <Pressable accessibilityRole="button" onPress={handlePickerDismiss} style={styles.pickerDoneButton}><Text style={styles.pickerDoneText}>Tamam</Text></Pressable> : null}
              </View>
            ) : null}

            {pickerMode === 'time' ? (
              <View style={styles.pickerArea}>
                <DateTimePicker
                  mode="time"
                  onDismiss={handlePickerDismiss}
                  onValueChange={(...args) => handleTimeValueChange(args[1])}
                  themeVariant={theme.mode}
                  value={pickerValue}
                />
                {Platform.OS === 'ios' ? <Pressable accessibilityRole="button" onPress={handlePickerDismiss} style={styles.pickerDoneButton}><Text style={styles.pickerDoneText}>Tamam</Text></Pressable> : null}
              </View>
            ) : null}

          <View style={[styles.passengerCard, errors.passengerCount && styles.inputError]}>
            <View style={styles.passengerHeading}>
              <Text style={styles.infoIcon}>♟</Text>
              <View>
                <Text style={styles.infoLabel}>Yolcu</Text>
                <Text accessibilityLabel={`${passengerCount} yolcu`} style={styles.passengerValue}>
                  {passengerCount} kişi
                </Text>
              </View>
            </View>
            <View style={styles.compactCounter}>
              <Pressable
                accessibilityLabel="Yolcu sayısını azalt"
                accessibilityRole="button"
                disabled={passengerCount === MIN_PASSENGER_COUNT}
                onPress={() => updatePassengerCount(-1)}
                style={({ pressed }) => [styles.counterButton, passengerCount === MIN_PASSENGER_COUNT && styles.disabled, pressed && styles.pressed]}
              >
                <Text style={styles.counterButtonText}>−</Text>
              </Pressable>
              <Text style={styles.counterValue}>{passengerCount}</Text>
              <Pressable
                accessibilityLabel="Yolcu sayısını artır"
                accessibilityRole="button"
                disabled={passengerCount === MAX_PASSENGER_COUNT}
                onPress={() => updatePassengerCount(1)}
                style={({ pressed }) => [styles.counterButton, passengerCount === MAX_PASSENGER_COUNT && styles.disabled, pressed && styles.pressed]}
              >
                <Text style={styles.counterButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
          {errors.passengerCount ? <Text style={styles.errorText}>{errors.passengerCount}</Text> : null}

          <TripSummaryCard
            dropoffLocation={dropoffLocation}
            passengerCount={passengerCount}
            pickupLocation={pickupLocation}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            styles={styles}
          />

          <Pressable
            accessibilityRole="button"
            onPress={handleContinue}
            style={({ pressed }) => [styles.continueButton, pressed && styles.continueButtonPressed]}
          >
            <Text style={styles.continueButtonText}>Uygun Araçları Gör</Text>
            <Text style={styles.continueArrow}>→</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
