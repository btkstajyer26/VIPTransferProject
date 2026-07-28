import { Pressable, Text, View } from 'react-native';

export default function AdminDashboardCard({ description, onPress, styles, title }) {
  return (
    <Pressable
      accessibilityLabel={`${title} sayfasını aç`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardAccent} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      <Text style={styles.cardArrow}>›</Text>
    </Pressable>
  );
}
