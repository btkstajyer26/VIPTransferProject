import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalization } from '../localization/LocalizationContext';
import { LANGUAGE_OPTIONS } from '../localization/resources';
import { useTheme } from '../theme/ThemeContext';

export default function LanguageSettingsScreen() {
  const { language, setLanguage, t, usesLocalFallback } = useLocalization();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [saveWarning, setSaveWarning] = useState(false);

  async function handleLanguageChange(code) {
    setSaveWarning(false);
    const wasSaved = await setLanguage(code);
    setSaveWarning(!wasSaved);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.accentLine} />
        <Text style={styles.title}>{t('settings.language.title')}</Text>
        <Text style={styles.description}>{t('settings.language.description')}</Text>

        <View style={styles.options}>
          {LANGUAGE_OPTIONS.map((option) => {
            const isSelected = language === option.code;
            return (
              <Pressable
                accessibilityLabel={`${option.nativeLabel}${isSelected ? `, ${t('common.selected')}` : ''}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                key={option.code}
                onPress={() => handleLanguageChange(option.code)}
                style={({ pressed }) => [
                  styles.optionCard,
                  isSelected && styles.selectedCard,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.languageCode}>{option.code.toUpperCase()}</Text>
                <Text style={styles.optionTitle}>{option.nativeLabel}</Text>
                <View style={[styles.selectionMark, isSelected && styles.selectedMark]}>
                  {isSelected ? <Text style={styles.checkText}>✓</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {saveWarning ? <Text style={styles.warning}>{t('settings.language.warning')}</Text> : null}
        {usesLocalFallback ? (
          <Text style={styles.warning}>{t('settings.language.remoteWarning')}</Text>
        ) : null}
        <Text style={styles.info}>{t('settings.language.saved')}</Text>
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    container: { flex: 1, paddingHorizontal: 24, paddingTop: 28 },
    accentLine: { width: 40, height: 3, marginBottom: 18, borderRadius: 2, backgroundColor: theme.accent },
    title: { color: theme.text, fontSize: 30, fontWeight: '800' },
    description: { marginTop: 10, color: theme.textSecondary, fontSize: 15, lineHeight: 23 },
    options: { marginTop: 32, gap: 14 },
    optionCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 18, paddingHorizontal: 18, backgroundColor: theme.surface },
    selectedCard: { borderWidth: 2, borderColor: theme.accent },
    languageCode: { width: 42, color: theme.accent, fontSize: 15, fontWeight: '900' },
    optionTitle: { flex: 1, color: theme.text, fontSize: 16, fontWeight: '800' },
    selectionMark: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 12 },
    selectedMark: { borderColor: theme.accent, backgroundColor: theme.accent },
    checkText: { color: theme.buttonText, fontWeight: '900' },
    warning: { marginTop: 18, color: theme.error, fontSize: 13, lineHeight: 19 },
    info: { marginTop: 24, borderLeftWidth: 2, borderLeftColor: theme.accent, padding: 14, color: theme.textSecondary, backgroundColor: theme.surface },
    pressed: { opacity: 0.72 },
  });
}
