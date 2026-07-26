import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { reverseGeocode } from '../api/locationApi';
import { MapPreview } from '../components/transfer/MapPreview';
import { RouteField } from '../components/transfer/RouteField';
import { StepIndicator } from '../components/transfer/StepIndicator';
import { TripInfoCard } from '../components/transfer/TripInfoCard';
import { TripSummaryCard } from '../components/transfer/TripSummaryCard';
import { useLocationSearch } from '../hooks/useLocationSearch';
import { createTransferSearchStyles } from '../styles/transferSearchStyles';
import { useTheme } from '../theme/ThemeContext';
import {
  createScheduledDate,
  formatDate,
  formatScheduledTime,
  formatTime,
} from '../utils/dateUtils';
import {
  MAX_PASSENGER_COUNT,
  MIN_PASSENGER_COUNT,
  validateTransferForm,
} from '../utils/transferValidation';

const EMPTY_LOCATION = {
  placeId: null,
  displayName: '',
  address: '',
  latitude: null,
  longitude: null,
  type: null,
  source: null,
};

export default function TransferSearchScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createTransferSearchStyles(theme), [theme]);
  const [pickupLocation, setPickupLocation] = useState({ ...EMPTY_LOCATION });
  const [dropoffLocation, setDropoffLocation] = useState({ ...EMPTY_LOCATION });
  const pickupSearch = useLocationSearch();
  const dropoffSearch = useLocationSearch();
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [pickerMode, setPickerMode] = useState(null);
  const [activeLocationField, setActiveLocationField] = useState(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const [errors, setErrors] = useState({});
  const reverseControllerRef = useRef(null);

  useEffect(
    () => () => {
      reverseControllerRef.current?.abort();
    },
    [],
  );

  function clearFieldError(fieldName) {
    setErrors((currentErrors) => ({ ...currentErrors, [fieldName]: undefined }));
  }

  function handleLocationTextChange(value, setLocation, search, fieldName) {
    setLocation({ ...EMPTY_LOCATION, displayName: value, address: value });
    search.clearSearch();
    clearFieldError(fieldName);
  }

  function handleLocationSelect(item, setLocation, search, fieldName) {
    setLocation({ ...item });
    search.clearSearch();
    clearFieldError(fieldName);
  }

  async function handleMapPress(latitude, longitude) {
    const target = activeLocationField;
    if (target !== 'pickupLocation' && target !== 'dropoffLocation') return;

    const setLocation = target === 'pickupLocation' ? setPickupLocation : setDropoffLocation;
    const search = target === 'pickupLocation' ? pickupSearch : dropoffSearch;
    const coordinateLabel = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

    reverseControllerRef.current?.abort();
    const controller = new AbortController();
    reverseControllerRef.current = controller;
    search.clearSearch();
    setLocation({
      ...EMPTY_LOCATION,
      displayName: coordinateLabel,
      address: 'Adres belirleniyor...',
      latitude,
      longitude,
      source: 'nominatim',
    });
    clearFieldError(target);

    try {
      const location = await reverseGeocode(latitude, longitude, { signal: controller.signal });
      if (reverseControllerRef.current === controller) setLocation(location);
    } catch (error) {
      if (error?.name !== 'AbortError' && reverseControllerRef.current === controller) {
        search.setSearchError(error?.message || 'Seçilen konumun adresi bulunamadı.');
      }
    }
  }

  function handleSwapLocations() {
    reverseControllerRef.current?.abort();
    const nextPickupLocation = { ...dropoffLocation };
    const nextDropoffLocation = { ...pickupLocation };

    setPickupLocation(nextPickupLocation);
    setDropoffLocation(nextDropoffLocation);
    pickupSearch.clearSearch();
    dropoffSearch.clearSearch();
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
    setPassengerCount((count) =>
      Math.min(MAX_PASSENGER_COUNT, Math.max(MIN_PASSENGER_COUNT, count + change)),
    );
    clearFieldError('passengerCount');
  }

  function handleContinue() {
    const nextErrors = validateTransferForm({
      pickupLocation,
      dropoffLocation,
      selectedDate,
      selectedTime,
      passengerCount,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const scheduledTime = formatScheduledTime(selectedDate, selectedTime);
    const transferDetails = {
      pickupLocation: { ...pickupLocation },
      dropoffLocation: { ...dropoffLocation },
      scheduledTime,
      passengerCount,
    };

    navigation.navigate('VehicleSelection', { transferDetails });
  }

  const pickerValue = pickerMode === 'date' ? selectedDate || new Date() : selectedTime || new Date();

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
                hasSearched={pickupSearch.hasSearched}
                loading={pickupSearch.loading}
                location={pickupLocation}
                markerStyle={styles.pickupMarker}
                onChangeText={(value) =>
                  handleLocationTextChange(
                    value,
                    setPickupLocation,
                    pickupSearch,
                    'pickupLocation',
                  )
                }
                onFocus={() => setActiveLocationField('pickupLocation')}
                onSearch={() => pickupSearch.search(pickupLocation.displayName)}
                onSelect={(item) =>
                  handleLocationSelect(
                    item,
                    setPickupLocation,
                    pickupSearch,
                    'pickupLocation',
                  )
                }
                placeholder="Başlangıç noktası seçin"
                searchError={pickupSearch.searchError}
                styles={styles}
                suggestions={pickupSearch.suggestions}
                theme={theme}
              />
              <View style={styles.routeDivider} />
              <RouteField
                activeField={activeLocationField}
                error={errors.dropoffLocation}
                fieldName="dropoffLocation"
                label="Nereye"
                hasSearched={dropoffSearch.hasSearched}
                loading={dropoffSearch.loading}
                location={dropoffLocation}
                markerStyle={styles.dropoffMarker}
                onChangeText={(value) =>
                  handleLocationTextChange(
                    value,
                    setDropoffLocation,
                    dropoffSearch,
                    'dropoffLocation',
                  )
                }
                onFocus={() => setActiveLocationField('dropoffLocation')}
                onSearch={() => dropoffSearch.search(dropoffLocation.displayName)}
                onSelect={(item) =>
                  handleLocationSelect(
                    item,
                    setDropoffLocation,
                    dropoffSearch,
                    'dropoffLocation',
                  )
                }
                placeholder="Varış noktası seçin"
                searchError={dropoffSearch.searchError}
                styles={styles}
                suggestions={dropoffSearch.suggestions}
                theme={theme}
              />
            </View>
          </View>

          <MapPreview
            activeField={activeLocationField}
            dropoff={dropoffLocation}
            onMapPress={handleMapPress}
            pickup={pickupLocation}
            styles={styles}
            theme={theme}
          />

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
              {Platform.OS === 'ios' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={handlePickerDismiss}
                  style={styles.pickerDoneButton}
                >
                  <Text style={styles.pickerDoneText}>Tamam</Text>
                </Pressable>
              ) : null}
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
              {Platform.OS === 'ios' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={handlePickerDismiss}
                  style={styles.pickerDoneButton}
                >
                  <Text style={styles.pickerDoneText}>Tamam</Text>
                </Pressable>
              ) : null}
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
                style={({ pressed }) => [
                  styles.counterButton,
                  passengerCount === MIN_PASSENGER_COUNT && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.counterButtonText}>−</Text>
              </Pressable>
              <Text style={styles.counterValue}>{passengerCount}</Text>
              <Pressable
                accessibilityLabel="Yolcu sayısını artır"
                accessibilityRole="button"
                disabled={passengerCount === MAX_PASSENGER_COUNT}
                onPress={() => updatePassengerCount(1)}
                style={({ pressed }) => [
                  styles.counterButton,
                  passengerCount === MAX_PASSENGER_COUNT && styles.disabled,
                  pressed && styles.pressed,
                ]}
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
