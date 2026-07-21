import { StyleSheet } from 'react-native';

export const createGuestInfoStyles = (theme) =>
  StyleSheet.create({
    safeArea: {
    flex: 1,
    backgroundColor: theme.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 30,
  },
  brandArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoPlaceholder: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.accent,
    borderRadius: 12,
    backgroundColor: theme.secondary,
  },
  logoText: {
    color: theme.accent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  brandName: {
    color: theme.card,
    fontSize: 16,
    fontWeight: '800',
  },
  brandTagline: {
    marginTop: 2,
    color: theme.accent,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  headingArea: {
    maxWidth: 520,
    marginTop: 34,
  },
  accentLine: {
    width: 40,
    height: 3,
    marginBottom: 18,
    borderRadius: 2,
    backgroundColor: theme.accent,
  },
  title: {
    color: theme.card,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  description: {
    marginTop: 10,
    color: theme.border,
    fontSize: 15,
    lineHeight: 23,
  },
  form: {
    marginTop: 30,
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: theme.border,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: theme.muted,
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: theme.primary,
    color: theme.card,
    fontSize: 16,
  },
  inputError: {
    borderColor: theme.warning,
  },
  errorText: {
    color: theme.warning,
    fontSize: 12,
    lineHeight: 17,
  },
  infoBox: {
    borderLeftWidth: 2,
    borderLeftColor: theme.accent,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.secondary,
  },
  infoText: {
    color: theme.border,
    fontSize: 12,
    lineHeight: 18,
  },
  button: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  primaryButton: {
    marginTop: 2,
    backgroundColor: theme.accent,
  },
  primaryButtonText: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  loginArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  loginPrompt: {
    color: theme.border,
    fontSize: 14,
  },
  loginLink: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
  },
  disabledButton: {
    opacity: 0.55,
  },

  });
