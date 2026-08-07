import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuth from '../hooks/useAuth';
import { getNotificationPreferences, updateNotificationPreference } from '../services/notificationPreferenceService';
import { useTheme } from '../theme/ThemeContext';

const NOTIFICATION_CHANNELS = [
  { key: 'EMAIL', icon: '@', title: 'E-posta', description: 'Rezervasyon ve hesap bildirimleri e-posta ile gönderilir.', editable: false },
  { key: 'SMS', icon: 'SMS', title: 'SMS', description: 'Önemli rezervasyon güncellemeleri SMS ile gönderilir.', editable: false },
  { key: 'PUSH', icon: '!', title: 'Anlık bildirim', description: 'Uygulama bildirimlerini açın veya kapatın.', editable: true },
  { key: 'WHATSAPP', icon: 'W', title: 'WhatsApp', description: 'Uygun bildirimleri WhatsApp üzerinden alın.', editable: true },
];
const EMPTY_PREFERENCES = { EMAIL: true, SMS: true, PUSH: false, WHATSAPP: false };

function normalizePreferences(items) {
  const result = { ...EMPTY_PREFERENCES };
  items.forEach((item) => {
    if (item?.channel === 'PUSH' || item?.channel === 'WHATSAPP') {
      result[item.channel] = item.enabled === true;
    }
  });
  return result;
}

export default function NotificationPreferencesScreen({ navigation }) {
  const { isAuthenticated, logout } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [preferences, setPreferences] = useState(EMPTY_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState({});

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      navigation.replace('Login');
      return;
    }
    setLoading(true);
    setError('');
    try {
      setPreferences(normalizePreferences(await getNotificationPreferences()));
    } catch (requestError) {
      if (requestError?.status === 401) {
        await logout();
        navigation.replace('Login');
        return;
      }
      setError('Bildirim tercihleriniz alınamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, logout, navigation]);

  useEffect(() => { load(); }, [load]);

  async function changePreference(channel, enabled) {
    if (updating[channel]) return;
    const previous = preferences[channel];
    setPreferences((current) => ({ ...current, [channel]: enabled }));
    setUpdating((current) => ({ ...current, [channel]: true }));
    try {
      const saved = await updateNotificationPreference(channel, enabled);
      if (saved?.channel === channel) {
        setPreferences((current) => ({ ...current, [channel]: saved.enabled === true }));
      }
    } catch (requestError) {
      setPreferences((current) => ({ ...current, [channel]: previous }));
      if (requestError?.status === 401) {
        await logout();
        navigation.replace('Login');
        return;
      }
      Alert.alert('Güncelleme başarısız', 'Bildirim tercihiniz kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setUpdating((current) => ({ ...current, [channel]: false }));
    }
  }

  if (loading) return <SafeAreaView edges={['bottom']} style={styles.safeArea}><View style={styles.state}><ActivityIndicator color={theme.accent} size="large" /><Text style={styles.stateText}>Bildirim tercihleri yükleniyor...</Text></View></SafeAreaView>;
  if (error) return <SafeAreaView edges={['bottom']} style={styles.safeArea}><View style={styles.state}><Text style={styles.stateTitle}>Tercihler yüklenemedi</Text><Text style={styles.stateText}>{error}</Text><Pressable onPress={load} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}><Text style={styles.retryText}>Tekrar Dene</Text></Pressable></View></SafeAreaView>;

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Bildirim Tercihleri</Text>
        <Text style={styles.description}>Size hangi kanallardan ulaşabileceğimizi seçin.</Text>
        <View style={styles.list}>
          {NOTIFICATION_CHANNELS.map((channel) => (
            <View key={channel.key} style={styles.card}>
              <View style={styles.icon}><Text style={styles.iconText}>{channel.icon}</Text></View>
              <View style={styles.channel}>
                <View style={styles.titleRow}>
                  <Text style={styles.channelTitle}>{channel.title}</Text>
                  {!channel.editable ? <Text style={styles.requiredBadge}>Her zaman açık</Text> : null}
                </View>
                <Text style={styles.channelDescription}>{channel.description}</Text>
              </View>
              <View style={styles.control}>
                {updating[channel.key] ? <ActivityIndicator color={theme.accent} size="small" /> : null}
                <Switch accessibilityLabel={`${channel.title} bildirimleri`} disabled={!channel.editable || Boolean(updating[channel.key])} ios_backgroundColor={theme.surfaceSecondary} onValueChange={(value) => changePreference(channel.key, value)} thumbColor={preferences[channel.key] ? theme.buttonText : theme.textSecondary} trackColor={{ false: theme.surfaceSecondary, true: theme.accent }} value={preferences[channel.key]} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    content: { flexGrow: 1, padding: 20, paddingBottom: 36 },
    title: { color: theme.text, fontSize: 28, fontWeight: '800' },
    description: { marginTop: 8, color: theme.textSecondary, fontSize: 15, lineHeight: 22 },
    list: { marginTop: 24, gap: 12 },
    card: { minHeight: 92, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 18, padding: 16, backgroundColor: theme.surface },
    icon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: theme.accentSoft },
    iconText: { color: theme.accent, fontSize: 13, fontWeight: '900' },
    channel: { flex: 1, marginHorizontal: 13 },
    titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
    channelTitle: { color: theme.text, fontSize: 16, fontWeight: '800' },
    requiredBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: theme.accentSoft, color: theme.accent, fontSize: 10, fontWeight: '800' },
    channelDescription: { marginTop: 4, color: theme.textSecondary, fontSize: 12, lineHeight: 18 },
    control: { minWidth: 52, alignItems: 'center', gap: 4 },
    state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
    stateTitle: { color: theme.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
    stateText: { marginTop: 10, color: theme.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
    retry: { marginTop: 22, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 13, backgroundColor: theme.accent },
    retryText: { color: theme.buttonText, fontSize: 14, fontWeight: '800' },
    pressed: { opacity: 0.75 },
  });
}
