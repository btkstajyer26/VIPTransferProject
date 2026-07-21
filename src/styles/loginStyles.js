import { StyleSheet } from 'react-native';

export function createLoginStyles(theme) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  keyboardView: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
  },
  header: {
    gap: 34,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: theme.surface,
  },
  logoText: {
    color: theme.accent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  brandName: {
    color: theme.text,
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
  },
  accentLine: {
    width: 40,
    height: 3,
    marginBottom: 18,
    borderRadius: 2,
    backgroundColor: theme.accent,
  },
  title: {
    color: theme.text,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  description: {
    marginTop: 10,
    color: theme.textSecondary,
    fontSize: 15,
    lineHeight: 23,
  },
  form: {
    marginTop: 34,
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: theme.inputBackground,
    color: theme.text,
    fontSize: 16,
  },
  passwordContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    backgroundColor: theme.inputBackground,
  },
  passwordInput: {
    minHeight: 52,
    flex: 1,
    paddingLeft: 16,
    paddingRight: 8,
    color: theme.text,
    fontSize: 16,
  },
  passwordToggle: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  passwordToggleText: {
    color: theme.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  inputError: {
    borderColor: theme.error,
  },
  errorText: {
    color: theme.error,
    fontSize: 12,
    lineHeight: 17,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    color: theme.accent,
    fontSize: 13,
    fontWeight: '700',
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
    color: theme.buttonText,
    fontSize: 16,
    fontWeight: '800',
  },
  registerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  registerPrompt: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  registerLink: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  dividerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },
  divider: {
    height: 1,
    flex: 1,
    backgroundColor: theme.divider,
  },
  dividerText: {
    color: theme.textSecondary,
    fontSize: 12,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.accent,
    backgroundColor: theme.background,
  },
  secondaryButtonText: {
    color: theme.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
  disabledButton: {
    opacity: 0.55,
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.accent,
    borderRadius: 12,
  },
  settingsIcon: {
    color: theme.accent,
    fontSize: 20,
  },
  });
}
