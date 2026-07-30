import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createAdminPricingRule,
  getAdminPricingRuleById,
  updateAdminPricingRule,
} from '../../api/admin/adminPricingRuleApi';
import { getAdminPricingZones } from '../../api/admin/adminPricingZoneApi';
import { AdminFilterChips } from '../../components/admin/AdminUi';
import useAuth from '../../hooks/useAuth';
import { createAdminManagementStyles } from '../../styles/admin/adminManagementStyles';
import { useTheme } from '../../theme/ThemeContext';
import {
  DAYS, parseDecimal, parseLocalDate, parseLocalTime, pricingError, toIsoDate, toIsoTime,
} from '../../utils/adminPricing';

function Field({ error, label, onChangeText, styles, value, ...props }) {
  return <>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput onChangeText={onChangeText} placeholderTextColor={styles.placeholderColor.color}
      style={[styles.input, error && styles.inputError]} value={value} {...props} />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </>;
}

function PickerButton({ label, onPress, styles, value }) {
  return <>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Pressable onPress={onPress} style={styles.input}><Text style={[styles.metadataStrong, { paddingTop: 13 }]}>{value}</Text></Pressable>
  </>;
}

export default function AdminPricingRuleFormScreen({ navigation, route }) {
  const mode = route.params?.mode === 'edit' ? 'edit' : 'create';
  const id = route.params?.pricingRuleId;
  const { logout, role } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createAdminManagementStyles(theme), [theme]);
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState({
    zoneId: null, name: '', dayOfWeek: null, startTime: parseLocalTime('08:00'),
    endTime: parseLocalTime('18:00'), multiplier: '1', reason: '', validFrom: null, validTo: null,
  });
  const [picker, setPicker] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState('');
  const lock = useRef(false);
  const isAdmin = role?.trim().toUpperCase() === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    (async () => {
      try {
        const [zoneList, rule] = await Promise.all([
          getAdminPricingZones(),
          mode === 'edit' ? getAdminPricingRuleById(id) : Promise.resolve(null),
        ]);
        if (!mounted) return;
        setZones(zoneList);
        if (rule) setForm({
          zoneId: rule.zoneId, name: rule.name || '', dayOfWeek: rule.dayOfWeek ?? null,
          startTime: parseLocalTime(rule.startTime), endTime: parseLocalTime(rule.endTime),
          multiplier: String(rule.multiplier), reason: rule.reason || '',
          validFrom: rule.validFrom ? parseLocalDate(rule.validFrom) : null,
          validTo: rule.validTo ? parseLocalDate(rule.validTo) : null,
        });
        else if (zoneList.length) setForm((current) => ({ ...current, zoneId: zoneList[0].id }));
      } catch (error) {
        if (error?.status === 401) await logout();
        else if (mounted) setRequestError(pricingError(error, 'rule'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, isAdmin, logout, mode]);

  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function pickerChange(event, value) {
    const target = picker;
    setPicker(null);
    if (event.type === 'set' && value && target) change(target, value);
  }

  async function save() {
    if (lock.current) return;
    const multiplier = parseDecimal(form.multiplier);
    const start = toIsoTime(form.startTime);
    const end = toIsoTime(form.endTime);
    const from = form.validFrom ? toIsoDate(form.validFrom) : null;
    const to = form.validTo ? toIsoDate(form.validTo) : null;
    const overnight = end < start;
    const next = {};
    if (!form.zoneId) next.zoneId = 'Fiyat bölgesi zorunludur.';
    if (form.name.trim().length > 100) next.name = 'Kural adı en fazla 100 karakter olabilir.';
    if (form.reason.trim().length > 100) next.reason = 'Açıklama en fazla 100 karakter olabilir.';
    if (!Number.isFinite(multiplier) || multiplier < 0.01 || multiplier > 99.99) next.multiplier = 'Çarpan 0,01 ile 99,99 arasında olmalıdır.';
    if (start === end) next.time = 'Başlangıç ve bitiş saati aynı olamaz.';
    if (!overnight && from && to && to < from) next.date = 'Bitiş tarihi başlangıç tarihinden önce olamaz.';
    if (overnight) {
      const nextDay = form.validFrom ? new Date(form.validFrom) : null;
      if (nextDay) nextDay.setDate(nextDay.getDate() + 1);
      if (!from || !to || toIsoDate(nextDay) !== to) next.date = 'Geceyi aşan kuralda bitiş tarihi başlangıcın ertesi günü olmalıdır.';
      if (form.dayOfWeek !== null) next.dayOfWeek = 'Geceyi aşan kuralda gün seçimi Her gün olmalıdır.';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      zoneId: Number(form.zoneId), name: form.name.trim() || null, dayOfWeek: form.dayOfWeek,
      startTime: start, endTime: end, multiplier, reason: form.reason.trim() || null,
      validFrom: from, validTo: to,
    };
    lock.current = true;
    setSaving(true);
    setRequestError('');
    try {
      if (mode === 'edit') await updateAdminPricingRule(id, payload);
      else await createAdminPricingRule(payload);
      navigation.goBack();
    } catch (error) {
      if (error?.status === 401) await logout();
      else setRequestError(pricingError(error, 'rule', 'save'));
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  if (!isAdmin) return null;
  if (loading) return <View style={styles.state}><ActivityIndicator color={theme.accent} size="large" /></View>;
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.formTitle}>{mode === 'edit' ? 'Fiyat kuralını düzenle' : 'Yeni fiyat kuralı'}</Text>
        {!zones.length ? <Text style={styles.formError}>Kural oluşturmak için aktif bir fiyat bölgesi gereklidir.</Text> : null}
        <Text style={styles.fieldLabel}>Fiyat bölgesi *</Text>
        <AdminFilterChips options={zones.map((zone) => ({ value: zone.id, label: zone.name }))} onSelect={(value) => change('zoneId', value)} selected={form.zoneId} styles={styles} />
        {errors.zoneId ? <Text style={styles.errorText}>{errors.zoneId}</Text> : null}
        <Field label="Kural adı" value={form.name} onChangeText={(value) => change('name', value)} error={errors.name} styles={styles} />
        <Text style={styles.fieldLabel}>Geçerli gün</Text>
        <AdminFilterChips options={DAYS} onSelect={(value) => change('dayOfWeek', value)} selected={form.dayOfWeek} styles={styles} />
        {errors.dayOfWeek ? <Text style={styles.errorText}>{errors.dayOfWeek}</Text> : null}
        <PickerButton label="Başlangıç saati *" value={toIsoTime(form.startTime)} onPress={() => setPicker('startTime')} styles={styles} />
        <PickerButton label="Bitiş saati *" value={toIsoTime(form.endTime)} onPress={() => setPicker('endTime')} styles={styles} />
        {errors.time ? <Text style={styles.errorText}>{errors.time}</Text> : null}
        <Field label="Fiyat çarpanı *" value={form.multiplier} onChangeText={(value) => change('multiplier', value)} error={errors.multiplier} keyboardType="decimal-pad" styles={styles} />
        <Field label="Açıklama / neden" value={form.reason} onChangeText={(value) => change('reason', value)} error={errors.reason} styles={styles} />
        <PickerButton label="Başlangıç tarihi" value={form.validFrom ? toIsoDate(form.validFrom) : 'Sınırsız'} onPress={() => setPicker('validFrom')} styles={styles} />
        {form.validFrom ? <Pressable onPress={() => change('validFrom', null)} style={styles.actionButton}><Text style={styles.actionText}>Başlangıç tarihini temizle</Text></Pressable> : null}
        <PickerButton label="Bitiş tarihi" value={form.validTo ? toIsoDate(form.validTo) : 'Sınırsız'} onPress={() => setPicker('validTo')} styles={styles} />
        {form.validTo ? <Pressable onPress={() => change('validTo', null)} style={styles.actionButton}><Text style={styles.actionText}>Bitiş tarihini temizle</Text></Pressable> : null}
        {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}
        {requestError ? <Text style={styles.formError}>{requestError}</Text> : null}
        <Pressable disabled={saving || !zones.length} onPress={save} style={[styles.primaryButton, (saving || !zones.length) && styles.disabled]}>
          <Text style={styles.primaryButtonText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
        </Pressable>
      </ScrollView>
      {picker ? (
        <DateTimePicker
          mode={picker === 'startTime' || picker === 'endTime' ? 'time' : 'date'}
          onChange={pickerChange}
          value={form[picker] || new Date()}
        />
      ) : null}
    </SafeAreaView>
  );
}
