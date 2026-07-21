import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

const OPTIONS = [
  { mode: 'light', icon: '☀', title: 'Açık Tema' },
  { mode: 'dark', icon: '☾', title: 'Koyu Tema' },
];

export default function ThemeSettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        <View>
          <View style={styles.accentLine} />
          <Text style={styles.title}>Tema Seçimi</Text>
          <Text style={styles.description}>
            Uygulamanın görünümünü tercihinize göre seçin.
          </Text>
        </View>

        <View style={styles.options}>
          {OPTIONS.map((option) => {
            const isSelected = themeMode === option.mode;
            return (
              <Pressable
                accessibilityLabel={`${option.title}${isSelected ? ', seçili' : ''}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                key={option.mode}
                onPress={() => setThemeMode(option.mode)}
                style={({ pressed }) => [
                  styles.optionCard,
                  isSelected && styles.selectedCard,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <View style={[styles.selectionMark, isSelected && styles.selectedMark]}>
                  {isSelected ? <Text style={styles.checkText}>✓</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>Tema tercihiniz bu cihazda saklanır.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    container: { flex: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28 },
    accentLine: { width: 40, height: 3, marginBottom: 18, borderRadius: 2, backgroundColor: theme.accent },
    title: { color: theme.text, fontSize: 30, fontWeight: '800', lineHeight: 38, letterSpacing: -0.4 },
    description: { marginTop: 10, color: theme.textSecondary, fontSize: 15, lineHeight: 23 },
    options: { marginTop: 32, gap: 14 },
    optionCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 18, backgroundColor: theme.surface },
    selectedCard: { borderWidth: 2, borderColor: theme.accent },
    optionIcon: { width: 30, color: theme.accent, fontSize: 25, textAlign: 'center' },
    optionTitle: { flex: 1, color: theme.text, fontSize: 16, fontWeight: '800' },
    selectionMark: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 12 },
    selectedMark: { borderColor: theme.accent, backgroundColor: theme.accent },
    checkText: { color: theme.buttonText, fontSize: 14, fontWeight: '800' },
    infoCard: { marginTop: 24, borderLeftWidth: 2, borderLeftColor: theme.accent, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: theme.surface },
    infoText: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
    pressed: { opacity: 0.72 },
  });
}
