import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { LocationSuggestions } from './LocationSuggestions';

export function RouteField({
  label,
  location,
  placeholder,
  fieldName,
  markerStyle,
  activeField,
  error,
  loading,
  searchError,
  hasSearched,
  suggestions,
  onChangeText,
  onFocus,
  onSearch,
  onSelect,
  styles,
  theme,
}) {
  const isActive = activeField === fieldName;

  function handleSearch() {
    Keyboard.dismiss();
    onSearch();
  }

  return (
    <View style={styles.routeFieldRow}>
      <View style={styles.routeMarkerColumn}>
        <View style={[styles.routeMarker, markerStyle]} />
      </View>
      <View style={styles.routeFieldContent}>
        <Text style={styles.routeLabel}>{label}</Text>
        <View style={styles.routeInputRow}>
          <TextInput
            accessibilityLabel={label}
            autoCapitalize="words"
            enterKeyHint="search"
            onChangeText={onChangeText}
            onFocus={onFocus}
            onSubmitEditing={handleSearch}
            placeholder={placeholder}
            placeholderTextColor={theme.placeholder}
            returnKeyType="search"
            style={[
              styles.routeInput,
              isActive && styles.activeRouteInput,
              error && styles.inputError,
            ]}
            value={location.displayName}
          />
          <Pressable
            accessibilityLabel={`${label} adresini ara`}
            accessibilityRole="button"
            disabled={loading}
            onPress={handleSearch}
            style={({ pressed }) => [
              styles.routeSearchButton,
              loading && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.routeSearchButtonText}>{loading ? '...' : 'Ara'}</Text>
          </Pressable>
        </View>
        {location.placeId && location.address ? (
          <Text numberOfLines={2} style={styles.routeAddress}>
            {location.address}
          </Text>
        ) : null}
        <LocationSuggestions
          error={searchError}
          hasSearched={hasSearched}
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
