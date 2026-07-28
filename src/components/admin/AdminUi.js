import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

export function AdminSearchInput({ onChangeText, placeholder, styles, value }) {
  return (
    <TextInput
      accessibilityLabel={placeholder}
      autoCapitalize="none"
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={styles.placeholderColor.color}
      style={styles.searchInput}
      value={value}
    />
  );
}

export function AdminFilterChips({ options, onSelect, selected, styles }) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onSelect(option.value)}
          style={[styles.chip, selected === option.value && styles.chipSelected]}
        >
          <Text style={[styles.chipText, selected === option.value && styles.chipTextSelected]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function AdminStatusBadge({ active, styles }) {
  return (
    <View style={[styles.badge, active ? styles.badgeActive : styles.badgePassive]}>
      <Text style={[styles.badgeText, active ? styles.badgeTextActive : styles.badgeTextPassive]}>
        {active ? 'Aktif' : 'Pasif'}
      </Text>
    </View>
  );
}

export function AdminListState({ emptyMessage, error, loading, onRetry, styles }) {
  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator size="large" />
        <Text style={styles.stateText}>Bilgiler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>{error ? 'Bilgiler alınamadı' : 'Kayıt bulunamadı'}</Text>
      <Text style={styles.stateText}>
        {error || emptyMessage || 'Filtrelerinize uygun kayıt yok.'}
      </Text>
      {error ? (
        <Pressable onPress={onRetry} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Tekrar Dene</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
