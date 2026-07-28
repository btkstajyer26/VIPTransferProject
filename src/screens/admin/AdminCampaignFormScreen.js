import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createAdminCampaign,
  getAdminCampaignById,
  updateAdminCampaign,
} from '../../api/admin/adminCampaignApi';
import { AdminFilterChips } from '../../components/admin/AdminUi';
import useAuth from '../../hooks/useAuth';
import { createAdminManagementStyles } from '../../styles/admin/adminManagementStyles';
import { useTheme } from '../../theme/ThemeContext';
import {
  CAMPAIGN_TYPES,
  campaignError,
  toOffsetDateTime,
} from '../../utils/adminCampaign';
import { parseDecimal, toIsoDate } from '../../utils/adminPricing';

const tomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date;
};

function Field({ error, label, onChangeText, styles, value, ...props }) {
  return <>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput onChangeText={onChangeText} placeholderTextColor={styles.placeholderColor.color}
      style={[styles.input, error && styles.inputError]} value={value} {...props} />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </>;
}

function optionalDecimal(value) {
  return value.trim() ? parseDecimal(value) : null;
}

function optionalInteger(value) {
  return value.trim() ? Number(value) : null;
}

export default function AdminCampaignFormScreen({ navigation, route }) {
  const mode = route.params?.mode === 'edit' ? 'edit' : 'create';
  const id = route.params?.campaignId;
  const { logout, role, userId } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createAdminManagementStyles(theme), [theme]);
  const [form, setForm] = useState({
    code: '', name: '', description: '', discountType: 'PERCENTAGE', discountValue: '',
    maxDiscountAmount: '', minOrderAmount: '', maxUses: '', maxUsesPerUser: '',
    validFrom: new Date(), validTo: tomorrow(),
  });
  const [picker, setPicker] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState('');
  const lock = useRef(false);
  const isAdmin = role?.trim().toUpperCase() === 'ADMIN';

  useEffect(() => {
    if (!isAdmin || mode !== 'edit') return;
    let mounted = true;
    (async () => {
      try {
        const campaign = await getAdminCampaignById(id);
        if (mounted) setForm({
          code: campaign.code || '', name: campaign.name || '', description: campaign.description || '',
          discountType: campaign.discountType, discountValue: String(campaign.discountValue ?? ''),
          maxDiscountAmount: String(campaign.maxDiscountAmount ?? ''),
          minOrderAmount: String(campaign.minOrderAmount ?? ''),
          maxUses: String(campaign.maxUses ?? ''), maxUsesPerUser: String(campaign.maxUsesPerUser ?? ''),
          validFrom: new Date(campaign.validFrom), validTo: new Date(campaign.validTo),
        });
      } catch (error) {
        if (error?.status === 401) await logout();
        else if (mounted) setRequestError(campaignError(error));
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

  function pickerChange(event, date) {
    const target = picker;
    setPicker(null);
    if (event.type === 'set' && date && target) change(target, date);
  }

  async function save() {
    if (lock.current) return;
    const discountValue = parseDecimal(form.discountValue);
    const maxDiscountAmount = optionalDecimal(form.maxDiscountAmount);
    const minOrderAmount = optionalDecimal(form.minOrderAmount);
    const maxUses = optionalInteger(form.maxUses);
    const maxUsesPerUser = optionalInteger(form.maxUsesPerUser);
    const next = {};
    if (!form.code.trim()) next.code = 'Kampanya kodu zorunludur.';
    else if (form.code.trim().length > 50) next.code = 'Kampanya kodu en fazla 50 karakter olabilir.';
    if (!form.name.trim()) next.name = 'Kampanya adı zorunludur.';
    else if (form.name.trim().length > 150) next.name = 'Kampanya adı en fazla 150 karakter olabilir.';
    if (form.description.trim().length > 500) next.description = 'Açıklama en fazla 500 karakter olabilir.';
    if (!Number.isFinite(discountValue) || discountValue < 0.01) next.discountValue = 'İndirim değeri en az 0,01 olmalıdır.';
    if (maxDiscountAmount !== null && (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount < 0)) next.maxDiscountAmount = 'Maksimum indirim negatif olamaz.';
    if (minOrderAmount !== null && (!Number.isFinite(minOrderAmount) || minOrderAmount < 0)) next.minOrderAmount = 'Minimum tutar negatif olamaz.';
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 0)) next.maxUses = 'Kullanım limiti negatif olmayan tam sayı olmalıdır.';
    if (maxUsesPerUser !== null && (!Number.isInteger(maxUsesPerUser) || maxUsesPerUser < 0)) next.maxUsesPerUser = 'Kullanıcı limiti negatif olmayan tam sayı olmalıdır.';
    if (toIsoDate(form.validTo) < toIsoDate(form.validFrom)) next.validTo = 'Bitiş tarihi başlangıç tarihinden önce olamaz.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      code: form.code.trim(), name: form.name.trim(), description: form.description.trim() || null,
      discountType: form.discountType, discountValue, maxDiscountAmount, minOrderAmount,
      maxUses, maxUsesPerUser, validFrom: toOffsetDateTime(form.validFrom),
      validTo: toOffsetDateTime(form.validTo, true), createdById: userId,
    };
    lock.current = true;
    setSaving(true);
    setRequestError('');
    try {
      if (mode === 'edit') await updateAdminCampaign(id, payload);
      else await createAdminCampaign(payload);
      navigation.goBack();
    } catch (error) {
      if (error?.status === 401) await logout();
      else setRequestError(campaignError(error, 'save'));
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
        <Text style={styles.formTitle}>{mode === 'edit' ? 'Kampanyayı düzenle' : 'Yeni kampanya'}</Text>
        <Text style={styles.formSubtitle}>Kod backend tarafından case-sensitive saklanır; yalnızca baştaki ve sondaki boşluklar temizlenir.</Text>
        <Field label="Kampanya kodu *" value={form.code} onChangeText={(value) => change('code', value)} error={errors.code} maxLength={50} autoCapitalize="characters" styles={styles} />
        <Field label="Kampanya adı *" value={form.name} onChangeText={(value) => change('name', value)} error={errors.name} styles={styles} />
        <Field label="Açıklama" value={form.description} onChangeText={(value) => change('description', value)} error={errors.description} styles={styles} />
        <Text style={styles.fieldLabel}>İndirim tipi *</Text>
        <AdminFilterChips options={CAMPAIGN_TYPES} onSelect={(value) => change('discountType', value)} selected={form.discountType} styles={styles} />
        <Field label={form.discountType === 'PERCENTAGE' ? 'İndirim yüzdesi *' : 'Sabit indirim tutarı *'} value={form.discountValue} onChangeText={(value) => change('discountValue', value)} error={errors.discountValue} keyboardType="decimal-pad" styles={styles} />
        <Field label="Maksimum indirim tutarı" value={form.maxDiscountAmount} onChangeText={(value) => change('maxDiscountAmount', value)} error={errors.maxDiscountAmount} keyboardType="decimal-pad" styles={styles} />
        <Field label="Minimum rezervasyon tutarı" value={form.minOrderAmount} onChangeText={(value) => change('minOrderAmount', value)} error={errors.minOrderAmount} keyboardType="decimal-pad" styles={styles} />
        <Field label="Toplam kullanım limiti" value={form.maxUses} onChangeText={(value) => change('maxUses', value)} error={errors.maxUses} keyboardType="number-pad" styles={styles} />
        <Field label="Kullanıcı başına limit" value={form.maxUsesPerUser} onChangeText={(value) => change('maxUsesPerUser', value)} error={errors.maxUsesPerUser} keyboardType="number-pad" styles={styles} />
        <Text style={styles.fieldLabel}>Başlangıç tarihi *</Text>
        <Pressable onPress={() => setPicker('validFrom')} style={styles.input}><Text style={[styles.metadataStrong, { paddingTop: 13 }]}>{toIsoDate(form.validFrom)}</Text></Pressable>
        <Text style={styles.fieldLabel}>Bitiş tarihi *</Text>
        <Pressable onPress={() => setPicker('validTo')} style={[styles.input, errors.validTo && styles.inputError]}><Text style={[styles.metadataStrong, { paddingTop: 13 }]}>{toIsoDate(form.validTo)}</Text></Pressable>
        {errors.validTo ? <Text style={styles.errorText}>{errors.validTo}</Text> : null}
        {requestError ? <Text style={styles.formError}>{requestError}</Text> : null}
        <Pressable disabled={saving} onPress={save} style={[styles.primaryButton, saving && styles.disabled]}>
          <Text style={styles.primaryButtonText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
        </Pressable>
      </ScrollView>
      {picker ? <DateTimePicker mode="date" onChange={pickerChange} value={form[picker]} /> : null}
    </SafeAreaView>
  );
}
