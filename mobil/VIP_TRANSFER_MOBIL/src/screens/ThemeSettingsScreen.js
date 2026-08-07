import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalization } from '../localization/LocalizationContext';
import { useTheme } from '../theme/ThemeContext';

export default function ThemeSettingsScreen({ navigation }) {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { language, t } = useLocalization();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [saveWarning, setSaveWarning] = useState(false);
  const options = [
    { mode: 'light', icon: '☀', title: t('settings.theme.light') },
    { mode: 'dark', icon: '☾', title: t('settings.theme.dark') },
  ];

  async function handleThemeChange(mode) {
    setSaveWarning(false);
    setSaveWarning(!(await setThemeMode(mode)));
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        <View>
          <View style={styles.accentLine} />
          <Text style={styles.title}>{t('settings.theme.title')}</Text>
          <Text style={styles.description}>{t('settings.theme.description')}</Text>
        </View>

        <View style={styles.options}>
          {options.map((option) => {
            const isSelected = themeMode === option.mode;
            return (
              <Pressable
                accessibilityLabel={`${option.title}${isSelected ? `, ${t('common.selected')}` : ''}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                key={option.mode}
                onPress={() => handleThemeChange(option.mode)}
                style={({ pressed }) => [styles.optionCard, isSelected && styles.selectedCard, pressed && styles.pressed]}
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

        {saveWarning ? <Text style={styles.warningText}>{t('settings.theme.warning')}</Text> : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('LanguageSettings')}
          style={({ pressed }) => [styles.languageCard, pressed && styles.pressed]}
        >
          <View>
            <Text style={styles.optionTitle}>{t('settings.language.open')}</Text>
            <Text style={styles.infoText}>
              {t('settings.language.current', { language: language === 'en' ? 'English' : 'Türkçe' })}
            </Text>
          </View>
          <Text style={styles.languageArrow}>→</Text>
        </Pressable>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>{t('settings.theme.saved')}</Text>
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
    optionCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 18, paddingHorizontal: 18, backgroundColor: theme.surface },
    selectedCard: { borderWidth: 2, borderColor: theme.accent },
    optionIcon: { width: 30, color: theme.accent, fontSize: 25, textAlign: 'center' },
    optionTitle: { color: theme.text, fontSize: 16, fontWeight: '800' },
    selectionMark: { marginLeft: 'auto', width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 12 },
    selectedMark: { borderColor: theme.accent, backgroundColor: theme.accent },
    checkText: { color: theme.buttonText, fontSize: 14, fontWeight: '800' },
    languageCard: { marginTop: 24, minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: theme.border, borderRadius: 18, paddingHorizontal: 18, backgroundColor: theme.surface },
    languageArrow: { color: theme.accent, fontSize: 26, fontWeight: '700' },
    infoCard: { marginTop: 18, borderLeftWidth: 2, borderLeftColor: theme.accent, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: theme.surface },
    infoText: { marginTop: 5, color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
    warningText: { marginTop: 20, color: theme.error, fontSize: 13, lineHeight: 19 },
    pressed: { opacity: 0.72 },
  });
}
