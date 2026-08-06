import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser, updateCurrentUser, changeCurrentUserPassword } from '../api/userApi';
import { useTheme } from '../theme/ThemeContext';
import { createLoginStyles } from '../styles/loginStyles';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/;

export default function ProfileScreen() {
  const { theme } = useTheme();
  const loginStyles = useMemo(() => createLoginStyles(theme), [theme]);
  const styles = useMemo(() => createProfileExtraStyles(theme), [theme]);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [profileErrors, setProfileErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const currentUser = await getCurrentUser();
        if (!isMounted) return;
        setUser(currentUser);
        setFirstName(currentUser?.firstName ?? '');
        setLastName(currentUser?.lastName ?? '');
        setEmail(currentUser?.email ?? '');
      } catch (error) {
        if (isMounted) setLoadError(error?.message || 'Profil bilgileri alınamadı.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  function validateProfileForm() {
    const nextErrors = {};

    if (!firstName.trim()) nextErrors.firstName = 'Ad gerekli.';
    if (!lastName.trim()) nextErrors.lastName = 'Soyad gerekli.';

    if (!email.trim()) {
      nextErrors.email = 'E-posta gerekli.';
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = 'Geçerli bir e-posta adresi girin.';
    }

    setProfileErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSaveProfile() {
    if (savingProfile || !validateProfileForm()) return;

    try {
      setSavingProfile(true);
      setProfileSuccess('');
      const updatedUser = await updateCurrentUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        preferredLang: user?.preferredLang,
      });
      setUser(updatedUser);
      setProfileSuccess('Profil bilgileriniz güncellendi.');
    } catch (error) {
      setProfileErrors((currentErrors) => ({
        ...currentErrors,
        form: error?.message || 'Profil güncellenemedi.',
      }));
    } finally {
      setSavingProfile(false);
    }
  }

  function validatePasswordForm() {
    const nextErrors = {};

    if (!currentPassword) {
      nextErrors.currentPassword = 'Mevcut şifrenizi girin.';
    }

    if (newPassword.length < 8) {
      nextErrors.newPassword = 'Yeni şifre en az 8 karakter olmalı.';
    } else if (!PASSWORD_PATTERN.test(newPassword)) {
      nextErrors.newPassword =
        'En az 1 büyük harf, 1 küçük harf, 1 rakam ve 1 özel karakter içermeli.';
    }

    if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = 'Şifreler eşleşmiyor.';
    }

    setPasswordErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleChangePassword() {
    if (savingPassword || !validatePasswordForm()) return;

    try {
      setSavingPassword(true);
      setPasswordSuccess('');
      await changeCurrentUserPassword({ currentPassword, newPassword, confirmPassword });
      setPasswordSuccess('Şifreniz başarıyla değiştirildi.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordErrors((currentErrors) => ({
        ...currentErrors,
        form: error?.message || 'Şifre değiştirilemedi.',
      }));
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={loginStyles.safeArea} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={loginStyles.safeArea} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={loginStyles.errorText}>{loadError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={loginStyles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={loginStyles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={loginStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={loginStyles.header}>
            <View style={loginStyles.headingArea}>
              <View style={loginStyles.accentLine} />
              <Text style={loginStyles.title}>Profilim</Text>
              <Text style={loginStyles.description}>
                Hesap bilgilerinizi görüntüleyin ve güncelleyin.
              </Text>
            </View>
          </View>

          <View style={loginStyles.form}>
            <View style={loginStyles.fieldGroup}>
              <Text style={loginStyles.label}>Telefon numarası</Text>
              <View style={[loginStyles.input, styles.readOnlyField]}>
                <Text style={styles.readOnlyText}>{user?.phoneNumber}</Text>
              </View>
            </View>

            <View style={loginStyles.fieldGroup}>
              <Text style={loginStyles.label}>Ad</Text>
              <TextInput
                accessibilityLabel="Ad"
                editable={!savingProfile}
                onChangeText={(value) => {
                  setFirstName(value);
                  setProfileErrors((currentErrors) => ({ ...currentErrors, firstName: undefined }));
                }}
                placeholderTextColor={theme.placeholder}
                style={[loginStyles.input, profileErrors.firstName && loginStyles.inputError]}
                value={firstName}
              />
              {profileErrors.firstName ? (
                <Text style={loginStyles.errorText}>{profileErrors.firstName}</Text>
              ) : null}
            </View>

            <View style={loginStyles.fieldGroup}>
              <Text style={loginStyles.label}>Soyad</Text>
              <TextInput
                accessibilityLabel="Soyad"
                editable={!savingProfile}
                onChangeText={(value) => {
                  setLastName(value);
                  setProfileErrors((currentErrors) => ({ ...currentErrors, lastName: undefined }));
                }}
                placeholderTextColor={theme.placeholder}
                style={[loginStyles.input, profileErrors.lastName && loginStyles.inputError]}
                value={lastName}
              />
              {profileErrors.lastName ? (
                <Text style={loginStyles.errorText}>{profileErrors.lastName}</Text>
              ) : null}
            </View>

            <View style={loginStyles.fieldGroup}>
              <Text style={loginStyles.label}>E-posta</Text>
              <TextInput
                accessibilityLabel="E-posta"
                autoCapitalize="none"
                editable={!savingProfile}
                keyboardType="email-address"
                onChangeText={(value) => {
                  setEmail(value);
                  setProfileErrors((currentErrors) => ({ ...currentErrors, email: undefined }));
                }}
                placeholderTextColor={theme.placeholder}
                style={[loginStyles.input, profileErrors.email && loginStyles.inputError]}
                value={email}
              />
              {profileErrors.email ? (
                <Text style={loginStyles.errorText}>{profileErrors.email}</Text>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={savingProfile}
              onPress={handleSaveProfile}
              style={({ pressed }) => [
                loginStyles.button,
                loginStyles.primaryButton,
                savingProfile && loginStyles.disabledButton,
                pressed && !savingProfile && loginStyles.pressed,
              ]}
            >
              <Text style={loginStyles.primaryButtonText}>
                {savingProfile ? 'Kaydediliyor...' : 'Bilgileri Kaydet'}
              </Text>
            </Pressable>
            {profileErrors.form ? <Text style={loginStyles.errorText}>{profileErrors.form}</Text> : null}
            {profileSuccess ? <Text style={styles.successText}>{profileSuccess}</Text> : null}
          </View>

          <View style={styles.divider} />

          <View style={loginStyles.form}>
            <Text style={loginStyles.title}>Şifre Değiştir</Text>

            <View style={loginStyles.fieldGroup}>
              <Text style={loginStyles.label}>Mevcut şifre</Text>
              <TextInput
                accessibilityLabel="Mevcut şifre"
                autoComplete="current-password"
                editable={!savingPassword}
                onChangeText={(value) => {
                  setCurrentPassword(value);
                  setPasswordErrors((currentErrors) => ({
                    ...currentErrors,
                    currentPassword: undefined,
                  }));
                }}
                placeholderTextColor={theme.placeholder}
                secureTextEntry
                style={[loginStyles.input, passwordErrors.currentPassword && loginStyles.inputError]}
                value={currentPassword}
              />
              {passwordErrors.currentPassword ? (
                <Text style={loginStyles.errorText}>{passwordErrors.currentPassword}</Text>
              ) : null}
            </View>

            <View style={loginStyles.fieldGroup}>
              <Text style={loginStyles.label}>Yeni şifre</Text>
              <TextInput
                accessibilityLabel="Yeni şifre"
                autoComplete="new-password"
                editable={!savingPassword}
                onChangeText={(value) => {
                  setNewPassword(value);
                  setPasswordErrors((currentErrors) => ({ ...currentErrors, newPassword: undefined }));
                }}
                placeholder="En az 8 karakter, büyük/küçük harf, rakam, özel karakter"
                placeholderTextColor={theme.placeholder}
                secureTextEntry
                style={[loginStyles.input, passwordErrors.newPassword && loginStyles.inputError]}
                value={newPassword}
              />
              {passwordErrors.newPassword ? (
                <Text style={loginStyles.errorText}>{passwordErrors.newPassword}</Text>
              ) : null}
            </View>

            <View style={loginStyles.fieldGroup}>
              <Text style={loginStyles.label}>Yeni şifre tekrar</Text>
              <TextInput
                accessibilityLabel="Yeni şifre tekrar"
                autoComplete="new-password"
                editable={!savingPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  setPasswordErrors((currentErrors) => ({
                    ...currentErrors,
                    confirmPassword: undefined,
                  }));
                }}
                placeholderTextColor={theme.placeholder}
                secureTextEntry
                style={[loginStyles.input, passwordErrors.confirmPassword && loginStyles.inputError]}
                value={confirmPassword}
              />
              {passwordErrors.confirmPassword ? (
                <Text style={loginStyles.errorText}>{passwordErrors.confirmPassword}</Text>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={savingPassword}
              onPress={handleChangePassword}
              style={({ pressed }) => [
                loginStyles.button,
                loginStyles.secondaryButton,
                savingPassword && loginStyles.disabledButton,
                pressed && !savingPassword && loginStyles.pressed,
              ]}
            >
              <Text style={loginStyles.secondaryButtonText}>
                {savingPassword ? 'Kaydediliyor...' : 'Şifreyi Değiştir'}
              </Text>
            </Pressable>
            {passwordErrors.form ? (
              <Text style={loginStyles.errorText}>{passwordErrors.form}</Text>
            ) : null}
            {passwordSuccess ? <Text style={styles.successText}>{passwordSuccess}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createProfileExtraStyles(theme) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    readOnlyField: {
      justifyContent: 'center',
      opacity: 0.7,
    },
    readOnlyText: {
      color: theme.textSecondary,
      fontSize: 16,
    },
    successText: {
      color: theme.success,
      fontSize: 13,
      lineHeight: 18,
    },
    divider: {
      height: 1,
      marginVertical: 8,
      backgroundColor: theme.divider,
    },
  });
}
