import { Text, TextInput, View } from 'react-native';
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
  suggestions,
  onBlur,
  onChangeText,
  onFocus,
  onSelect,
  styles,
  theme,
}) {
  const isActive = activeField === fieldName;

  return (
    <View style={styles.routeFieldRow}>
      <View style={styles.routeMarkerColumn}>
        <View style={[styles.routeMarker, markerStyle]} />
      </View>
      <View style={styles.routeFieldContent}>
        <Text style={styles.routeLabel}>{label}</Text>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="words"
          onBlur={onBlur}
          onChangeText={onChangeText}
          onFocus={onFocus}
          placeholder={placeholder}
          placeholderTextColor={theme.placeholder}
          style={[styles.routeInput, isActive && styles.activeRouteInput, error && styles.inputError]}
          value={location.displayName}
        />
        {location.placeId && location.address ? (
          <Text numberOfLines={2} style={styles.routeAddress}>
            {location.address}
          </Text>
        ) : null}
        <LocationSuggestions
          error={searchError}
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
