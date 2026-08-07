import { Pressable, Text, View } from 'react-native';

export function TripInfoCard({ accessibilityLabel, icon, label, value, error, onPress, styles }) {
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
