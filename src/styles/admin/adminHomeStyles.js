import { StyleSheet } from 'react-native';

export function createAdminHomeStyles(theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 20,
      paddingBottom: 36,
    },
    eyebrow: {
      color: theme.accent,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.4,
    },
    title: {
      marginTop: 8,
      color: theme.text,
      fontSize: 29,
      fontWeight: '800',
    },
    subtitle: {
      marginTop: 8,
      marginBottom: 22,
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 22,
    },
    card: {
      minHeight: 112,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'stretch',
      overflow: 'hidden',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    cardPressed: {
      opacity: 0.72,
    },
    cardAccent: {
      width: 4,
      backgroundColor: theme.accent,
    },
    cardContent: {
      flex: 1,
      justifyContent: 'center',
      padding: 16,
    },
    cardTitle: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '800',
    },
    cardDescription: {
      marginTop: 6,
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    cardArrow: {
      alignSelf: 'center',
      paddingRight: 16,
      color: theme.accent,
      fontSize: 30,
      fontWeight: '300',
    },
    logoutButton: {
      marginTop: 10,
      alignItems: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.error,
      paddingVertical: 14,
    },
    logoutButtonPressed: {
      opacity: 0.7,
    },
    logoutButtonDisabled: {
      opacity: 0.45,
    },
    logoutText: {
      color: theme.error,
      fontSize: 15,
      fontWeight: '800',
    },
  });
}
