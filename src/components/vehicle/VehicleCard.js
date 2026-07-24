import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, Text, View } from 'react-native';

const CLASS_LABELS = {
  ECONOMY: 'Ekonomi',
  COMFORT: 'Konfor',
  BUSINESS: 'Business',
  PREMIUM: 'Premium',
  VIP: 'VIP',
  LUXURY: 'Luxury',
};

function formatPrice(value) {
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function VehicleCard({
  animation,
  index,
  isSelected,
  onSelect,
  passengerCount,
  styles,
  vehicle,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const selectionScale = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const isAvailable = vehicle.capacity >= passengerCount;
  const classLabel = CLASS_LABELS[vehicle.vehicleClass] || vehicle.vehicleClass;

  useEffect(() => {
    Animated.spring(selectionScale, {
      toValue: isSelected ? 1 : 0,
      damping: 16,
      stiffness: 180,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [isSelected, selectionScale]);

  const animatedEntryStyle = {
    opacity: animation,
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [22 + index * 3, 0],
        }),
      },
      {
        scale: selectionScale.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.015],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[styles.vehicleCardWrapper, animatedEntryStyle]}>
      <Pressable
        accessibilityLabel={`${vehicle.brand} ${vehicle.model}, ${vehicle.capacity} yolcu`}
        accessibilityRole="radio"
        accessibilityState={{ checked: isSelected, disabled: !isAvailable }}
        disabled={!isAvailable}
        onPress={() => onSelect(vehicle)}
        style={({ pressed }) => [
          styles.vehicleCard,
          isSelected && styles.selectedVehicleCard,
          !isAvailable && styles.unavailableVehicleCard,
          pressed && isAvailable && styles.pressedCard,
        ]}
      >
        <View style={styles.imageArea}>
          {vehicle.photoUrl && !imageFailed ? (
            <Image
              accessibilityIgnoresInvertColors
              onError={() => setImageFailed(true)}
              resizeMode="cover"
              source={{ uri: vehicle.photoUrl }}
              style={styles.vehicleImage}
            />
          ) : (
            <View style={styles.imageFallback}>
              <Text style={styles.imageFallbackIcon}>VIP</Text>
              <Text style={styles.imageFallbackText}>Premium Araç</Text>
            </View>
          )}
          <View style={styles.classBadge}>
            <Text style={styles.classBadgeText}>{classLabel}</Text>
          </View>
          {isSelected ? (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeIcon}>✓</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.vehicleContent}>
          <View style={styles.vehicleHeading}>
            <View style={styles.vehicleNameArea}>
              <Text style={styles.vehicleBrand}>{vehicle.brand}</Text>
              <Text numberOfLines={1} style={styles.vehicleModel}>
                {vehicle.model}
              </Text>
            </View>
            <View style={styles.priceArea}>
              <Text style={styles.priceLabel}>BAŞLANGIÇ</Text>
              <Text style={styles.priceValue}>₺{formatPrice(vehicle.openingPrice)}</Text>
            </View>
          </View>

          <View style={styles.vehicleDetails}>
            <View style={styles.detailPill}>
              <Text style={styles.detailIcon}>●</Text>
              <Text style={styles.detailText}>{vehicle.capacity} yolcu</Text>
            </View>
            {vehicle.year ? (
              <View style={styles.detailPill}>
                <Text style={styles.detailIcon}>◆</Text>
                <Text style={styles.detailText}>{vehicle.year}</Text>
              </View>
            ) : null}
            {vehicle.color ? (
              <View style={styles.detailPill}>
                <Text style={styles.detailIcon}>◇</Text>
                <Text style={styles.detailText}>{vehicle.color}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.cardFooter}>
            <Text style={[styles.availabilityText, !isAvailable && styles.unavailableText]}>
              {isAvailable
                ? isSelected
                  ? 'Bu araç seçildi'
                  : 'Transferiniz için uygun'
                : `${passengerCount} yolcu için kapasite yetersiz`}
            </Text>
            {isAvailable ? (
              <Text style={[styles.selectText, isSelected && styles.selectedText]}>
                {isSelected ? 'SEÇİLDİ' : 'SEÇ'}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
