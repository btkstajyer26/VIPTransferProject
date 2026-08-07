import { ActivityIndicator, Pressable, Text, View } from 'react-native';

export default function VehicleListState({ error, loading, onRetry, styles, theme }) {
  if (loading) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.stateCard}>
        <ActivityIndicator color={theme.accent} size="large" />
        <Text style={styles.stateTitle}>Araçlar hazırlanıyor</Text>
        <Text style={styles.stateDescription}>
          Transferinize uygun premium araçları getiriyoruz.
        </Text>
      </View>
    );
  }

  return (
    <View accessibilityLiveRegion="polite" style={styles.stateCard}>
      <View style={styles.stateIcon}>
        <Text style={styles.stateIconText}>{error ? '!' : 'VIP'}</Text>
      </View>
      <Text style={styles.stateTitle}>{error ? 'Araçlar yüklenemedi' : 'Uygun araç bulunamadı'}</Text>
      <Text style={styles.stateDescription}>
        {error || 'Seçtiğiniz yolcu sayısına uygun aktif araç bulunmuyor.'}
      </Text>
      {error ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
        >
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
