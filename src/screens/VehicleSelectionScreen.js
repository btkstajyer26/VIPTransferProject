import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VehicleBookingSteps from '../components/vehicle/VehicleBookingSteps';
import VehicleCard from '../components/vehicle/VehicleCard';
import VehicleListState from '../components/vehicle/VehicleListState';
import VehicleTripSummary from '../components/vehicle/VehicleTripSummary';
import useAuth from '../hooks/useAuth';
import { useVehicles } from '../hooks/useVehicles';
import { createVehicleSelectionStyles } from '../styles/vehicleSelectionStyles';
import { useTheme } from '../theme/ThemeContext';

function getEntryStyle(animation, translateDistance = 14) {
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

function getVehicleAnimation(animationMap, vehicleId) {
  if (!animationMap.has(vehicleId)) {
    animationMap.set(vehicleId, new Animated.Value(0));
  }

  return animationMap.get(vehicleId);
}

export default function VehicleSelectionScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const styles = useMemo(() => createVehicleSelectionStyles(theme), [theme]);
  const transferDetails = route.params?.transferDetails;
  const passengerCount = transferDetails?.passengerCount ?? 1;
  const { vehicles, loading, error, reloadVehicles } = useVehicles();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const headingAnimation = useRef(new Animated.Value(0)).current;
  const summaryAnimation = useRef(new Animated.Value(0)).current;
  const listHeaderAnimation = useRef(new Animated.Value(0)).current;
  const footerAnimation = useRef(new Animated.Value(0)).current;
  const vehicleAnimations = useRef(new Map()).current;

  useEffect(() => {
    const timing = (value, duration = 380) =>
      Animated.timing(value, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      });

    Animated.stagger(90, [
      timing(headingAnimation, 420),
      timing(summaryAnimation),
      timing(listHeaderAnimation),
      timing(footerAnimation),
    ]).start();
  }, [footerAnimation, headingAnimation, listHeaderAnimation, summaryAnimation]);

  useEffect(() => {
    if (!vehicles.length) return;

    const animations = vehicles.map((vehicle) => {
      const animation = getVehicleAnimation(vehicleAnimations, vehicle.id);
      animation.setValue(0);
      return animation;
    });

    Animated.stagger(
      85,
      animations.map((animation) =>
        Animated.timing(animation, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [vehicleAnimations, vehicles]);

  function handleContinue() {
    if (!selectedVehicle) return;

    navigation.navigate(isAuthenticated ? 'Reservation' : 'GuestInfo', {
      transferDetails,
      selectedVehicle,
      isGuest: !isAuthenticated,
    });
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
        showsVerticalScrollIndicator={false}
      >
        <VehicleBookingSteps styles={styles} />

        <Animated.View style={[styles.headingArea, getEntryStyle(headingAnimation)]}>
          <Text style={styles.eyebrow}>VIP TRANSFER FİLOSU</Text>
          <Text style={styles.title}>
            Yolculuğunuza uygun{'\n'}
            <Text style={styles.highlightedTitle}>aracı seçin.</Text>
          </Text>
          <Text style={styles.description}>
            Konfor, kapasite ve başlangıç fiyatlarını karşılaştırarak transfer aracınızı
            belirleyin.
          </Text>
        </Animated.View>

        <Animated.View style={getEntryStyle(summaryAnimation, 18)}>
          <VehicleTripSummary styles={styles} transferDetails={transferDetails} />
        </Animated.View>

        <Animated.View style={[styles.listHeader, getEntryStyle(listHeaderAnimation, 12)]}>
          <View>
            <Text style={styles.sectionEyebrow}>MÜSAİT ARAÇLAR</Text>
            <Text style={styles.sectionTitle}>Filomuz</Text>
          </View>
          {!loading && !error && vehicles.length ? (
            <Text style={styles.vehicleCount}>{vehicles.length} ARAÇ</Text>
          ) : null}
        </Animated.View>

        {loading || error || !vehicles.length ? (
          <VehicleListState
            error={error}
            loading={loading}
            onRetry={reloadVehicles}
            styles={styles}
            theme={theme}
          />
        ) : (
          <View accessibilityRole="radiogroup" style={styles.vehicleList}>
            {vehicles.map((vehicle, index) => (
              <VehicleCard
                animation={getVehicleAnimation(vehicleAnimations, vehicle.id)}
                index={index}
                isSelected={selectedVehicle?.id === vehicle.id}
                key={vehicle.id}
                onSelect={setSelectedVehicle}
                passengerCount={passengerCount}
                styles={styles}
                vehicle={vehicle}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Animated.View style={[styles.footer, getEntryStyle(footerAnimation, 22)]}>
        {!selectedVehicle ? <Text style={styles.footerHint}>Devam etmek için bir araç seçin</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={!selectedVehicle}
          onPress={handleContinue}
          style={({ pressed }) => [
            styles.continueButton,
            !selectedVehicle && styles.continueButtonDisabled,
            pressed && selectedVehicle && styles.continueButtonPressed,
          ]}
        >
          <Text style={styles.continueButtonText}>
            {selectedVehicle ? 'Bilgilere Devam Et' : 'Araç Seçin'}
          </Text>
          <Text style={styles.continueArrow}>→</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}
