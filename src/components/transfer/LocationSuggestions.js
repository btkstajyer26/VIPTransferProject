import { Pressable, Text, View } from 'react-native';

export function LocationSuggestions({ items, loading, error, onSelect, styles }) {
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
