import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { createVehicleSelectionStyles } from '../styles/vehicleSelectionStyles';
import { getActiveVehicles } from '../api/vehicleApi';

const STEPS = ['Rota', 'Araç', 'Bilgiler', 'Onay'];
const CURRENT_STEP_INDEX = 1;

function formatScheduledTime(scheduledTime) {
  if (!scheduledTime) {
    return '';
  }

  const parsed = new Date(scheduledTime);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function StepIndicator({ styles }) {
  return (
    <View accessibilityLabel={`Rezervasyon adımları, ikinci adım ${STEPS[CURRENT_STEP_INDEX]}`} style={styles.stepIndicator}>
      {STEPS.map((step, index) => {
        const isActive = index === CURRENT_STEP_INDEX;
        const isCompleted = index < CURRENT_STEP_INDEX;

        return (
          <View key={step} style={styles.stepItemContainer}>
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, isActive && styles.activeStepDot, isCompleted && styles.completedStepDot]}>
                <Text style={[styles.stepNumber, isActive && styles.activeStepNumber, isCompleted && styles.completedStepNumber]}>
                  {isCompleted ? '✓' : index + 1}
                </Text>
              </View>
              <Text style={[styles.stepLabel, isActive && styles.activeStepLabel]}>{step}</Text>
            </View>
            {index < STEPS.length - 1 ? <View style={styles.stepLine} /> : null}
          </View>
        );
      })}
    </View>
  );
}

function VehicleCard({ vehicle, isSelected, onSelect, styles }) {
  return (
    <Pressable
      accessibilityLabel={`${vehicle.brand} ${vehicle.model}, ${vehicle.capacity} kişilik${isSelected ? ', seçili' : ''}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      onPress={() => onSelect(vehicle.id)}
      style={({ pressed }) => [styles.vehicleCard, isSelected && styles.vehicleCardSelected, pressed && styles.pressed]}
    >
      <View style={styles.vehicleIconBox}>
        <Text style={styles.vehicleIcon}>◆</Text>
      </View>
      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleName}>
          {vehicle.brand} {vehicle.model}
        </Text>
        <Text style={styles.vehicleMeta}>
          {vehicle.vehicleClass} • {vehicle.capacity} yolcu kapasitesi
        </Text>
        <Text style={styles.vehiclePrice}>{vehicle.openingPrice} TL&apos;den başlayan fiyat</Text>
      </View>
      <View style={[styles.selectionMark, isSelected && styles.selectedMark]}>
        {isSelected ? <Text style={styles.checkText}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

export default function VehicleSelectionScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createVehicleSelectionStyles(theme), [theme]);
  const transferDetails = route.params?.transferDetails ?? null;

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectionError, setSelectionError] = useState(null);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  );

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getActiveVehicles();
      setVehicles(data ?? []);
    } catch (loadError) {
      setError(loadError?.message || 'Araç listesi alınamadı.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  function handleSelectVehicle(vehicleId) {
    setSelectedVehicleId(vehicleId);
    setSelectionError(null);
  }

  function handleContinue() {
    if (!selectedVehicle) {
      setSelectionError('Devam etmek için bir araç seçin.');
      return;
    }

    navigation.navigate('GuestInfo', {
      transferDetails,
      selectedVehicle,
    });
  }

  const routeText = transferDetails
    ? `${transferDetails.pickupLocation?.displayName} → ${transferDetails.dropoffLocation?.displayName}`
    : null;
  const detailsText = transferDetails
    ? [formatScheduledTime(transferDetails.scheduledTime), `${transferDetails.passengerCount} yolcu`]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <StepIndicator styles={styles} />

        <View style={styles.headingArea}>
          <Text style={styles.eyebrow}>VIP TRANSFER REZERVASYONU</Text>
          <Text style={styles.title}>Aracınızı Seçin</Text>
          <Text style={styles.description}>
            Yolculuğunuz için size en uygun aracı ve fiyatı karşılaştırın.
          </Text>
        </View>

        {routeText ? (
          <View style={styles.routeSummaryCard}>
            <View style={styles.routeSummaryAccent} />
            <View style={styles.routeSummaryContent}>
              <Text style={styles.routeSummaryRoute}>{routeText}</Text>
              {detailsText ? <Text style={styles.routeSummaryDetails}>{detailsText}</Text> : null}
            </View>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.accent} size="large" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadVehicles}>
              <Text style={styles.retryButtonText}>Tekrar Dene</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.vehicleList}>
              {vehicles.map((vehicle) => (
                <VehicleCard
                  isSelected={vehicle.id === selectedVehicleId}
                  key={vehicle.id}
                  onSelect={handleSelectVehicle}
                  styles={styles}
                  vehicle={vehicle}
                />
              ))}
            </View>
            {selectionError ? <Text style={styles.fieldErrorText}>{selectionError}</Text> : null}

            <Pressable
              accessibilityRole="button"
              onPress={handleContinue}
              style={({ pressed }) => [styles.continueButton, pressed && styles.continueButtonPressed]}
            >
              <Text style={styles.continueButtonText}>Devam Et</Text>
              <Text style={styles.continueArrow}>→</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}