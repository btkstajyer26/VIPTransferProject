import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeContext';

export default function AdminPlaceholder({ description, title }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>FAZ 1</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
      backgroundColor: theme.background,
    },
    badge: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.surface,
      borderColor: theme.accent,
      borderWidth: 1,
    },
    badgeText: {
      color: theme.accent,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
    },
    title: {
      marginTop: 18,
      color: theme.text,
      fontSize: 24,
      fontWeight: '800',
      textAlign: 'center',
    },
    description: {
      marginTop: 10,
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
    },
  });
}
