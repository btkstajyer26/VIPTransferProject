import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createAdminPricingZone,
  getAdminPricingZoneById,
  updateAdminPricingZone,
} from '../../api/admin/adminPricingZoneApi';
import useAuth from '../../hooks/useAuth';
import { createAdminManagementStyles } from '../../styles/admin/adminManagementStyles';
import { useTheme } from '../../theme/ThemeContext';
import { parseDecimal, pricingError } from '../../utils/adminPricing';
import PricingZoneMapEditor from '../../components/admin/PricingZoneMapEditor';

const EMPTY_POLYGON = '{\n  "type": "Polygon",\n  "coordinates": [[[29.0, 41.0], [29.1, 41.0], [29.1, 41.1], [29.0, 41.0]]]\n}';

function validatePolygon(text) {
  try {
    const polygon = JSON.parse(text);
    const ring = polygon?.coordinates?.[0];
    if (polygon?.type !== 'Polygon' || !Array.isArray(ring) || ring.length < 4) return null;
    if (!ring.every((point) => Array.isArray(point) && point.length >= 2 && point.every(Number.isFinite))) return null;
    const first = ring[0];
    const last = ring[ring.length - 1];
    return first[0] === last[0] && first[1] === last[1] ? polygon : null;
  } catch {
    return null;
  }
}

function Field({ error, label, multiline, onChangeText, styles, value, ...props }) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholderTextColor={styles.placeholderColor.color}
        style={[styles.input, multiline && { minHeight: 130, paddingTop: 12, textAlignVertical: 'top' }, error && styles.inputError]}
        value={value}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </>
  );
}

export default function AdminPricingZoneFormScreen({ navigation, route }) {
  const mode = route.params?.mode === 'edit' ? 'edit' : 'create';
  const id = route.params?.pricingZoneId;
  const { logout, role } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createAdminManagementStyles(theme), [theme]);
  const [form, setForm] = useState({
    name: '', description: '', polygon: EMPTY_POLYGON,
    basePrice: '', minPrice: '0', pricePerKm: '', currency: 'TRY',
  });
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
        const zone = await getAdminPricingZoneById(id);
        if (mounted) setForm({
          name: zone.name || '', description: zone.description || '',
          polygon: JSON.stringify(zone.polygon, null, 2),
          basePrice: String(zone.basePrice ?? ''), minPrice: String(zone.minPrice ?? '0'),
          pricePerKm: String(zone.pricePerKm ?? ''), currency: zone.currency || 'TRY',
        });
      } catch (error) {
        if (error?.status === 401) await logout();
        else if (mounted) setRequestError(pricingError(error, 'zone'));
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

  async function save() {
    if (lock.current) return;
    const polygon = validatePolygon(form.polygon);
    const basePrice = parseDecimal(form.basePrice);
    const minPrice = parseDecimal(form.minPrice);
    const pricePerKm = parseDecimal(form.pricePerKm);
    const next = {};
    if (!form.name.trim()) next.name = 'Bölge adı zorunludur.';
    else if (form.name.trim().length > 150) next.name = 'Bölge adı en fazla 150 karakter olabilir.';
    if (form.description.trim().length > 255) next.description = 'Açıklama en fazla 255 karakter olabilir.';
    if (!polygon) next.polygon = 'Geçerli, kapalı bir GeoJSON Polygon girin.';
    if (!Number.isFinite(basePrice) || basePrice < 0) next.basePrice = 'Taban fiyat negatif olamaz.';
    else if (basePrice > 99999999.99) next.basePrice = 'Taban fiyat en fazla 8 tam basamak olabilir.';
    if (!Number.isFinite(minPrice) || minPrice < 0) next.minPrice = 'Minimum fiyat negatif olamaz.';
    else if (minPrice > 99999999.99) next.minPrice = 'Minimum fiyat en fazla 8 tam basamak olabilir.';
    else if (minPrice > basePrice) next.minPrice = 'Minimum fiyat taban fiyattan büyük olamaz.';
    if (!Number.isFinite(pricePerKm) || pricePerKm < 0) next.pricePerKm = 'Kilometre fiyatı negatif olamaz.';
    else if (pricePerKm > 99999999.99) next.pricePerKm = 'Kilometre fiyatı en fazla 8 tam basamak olabilir.';
    if (form.currency.trim().length !== 3) next.currency = 'Para birimi 3 karakter olmalıdır.';
    setErrors(next);
    if (Object.keys(next).length) return;

    lock.current = true;
    setSaving(true);
    setRequestError('');
    const payload = {
      name: form.name.trim(), description: form.description.trim() || null, polygon,
      basePrice, minPrice, pricePerKm, currency: form.currency.trim().toUpperCase(),
    };
    try {
      if (mode === 'edit') await updateAdminPricingZone(id, payload);
      else await createAdminPricingZone(payload);
      navigation.goBack();
    } catch (error) {
      if (error?.status === 401) await logout();
      else setRequestError(pricingError(error, 'zone', 'save'));
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
        <Text style={styles.formTitle}>{mode === 'edit' ? 'Fiyat bölgesini düzenle' : 'Yeni fiyat bölgesi'}</Text>
        <Text style={styles.formSubtitle}>Koordinatlar GeoJSON standardında [boylam, enlem] sırasıyla girilmelidir.</Text>
        <Field label="Bölge adı *" value={form.name} onChangeText={(value) => change('name', value)} error={errors.name} styles={styles} />
        <Field label="Açıklama" value={form.description} onChangeText={(value) => change('description', value)} error={errors.description} styles={styles} />
        <Text style={styles.fieldLabel}>Bölgeyi haritada çizin *</Text>
        <PricingZoneMapEditor
          initialPolygon={validatePolygon(form.polygon)}
          onChange={(polygon) => change('polygon', polygon ? JSON.stringify(polygon, null, 2) : '')}
          theme={theme}
        />
        <Text style={styles.formSubtitle}>Haritaya sırayla en az 3 köşe ekleyin. Bir noktayı silmek için üzerine dokunun.</Text>
        <Field label="GeoJSON Polygon *" multiline value={form.polygon} onChangeText={(value) => change('polygon', value)} error={errors.polygon} styles={styles} autoCapitalize="none" />
        <Field label="Taban fiyat *" value={form.basePrice} onChangeText={(value) => change('basePrice', value)} error={errors.basePrice} styles={styles} keyboardType="decimal-pad" />
        <Field label="Minimum fiyat" value={form.minPrice} onChangeText={(value) => change('minPrice', value)} error={errors.minPrice} styles={styles} keyboardType="decimal-pad" />
        <Field label="Kilometre fiyatı *" value={form.pricePerKm} onChangeText={(value) => change('pricePerKm', value)} error={errors.pricePerKm} styles={styles} keyboardType="decimal-pad" />
        <Field label="Para birimi *" value={form.currency} onChangeText={(value) => change('currency', value.toUpperCase())} error={errors.currency} styles={styles} autoCapitalize="characters" maxLength={3} />
        {requestError ? <Text style={styles.formError}>{requestError}</Text> : null}
        <Pressable disabled={saving} onPress={save} style={[styles.primaryButton, saving && styles.disabled]}>
          <Text style={styles.primaryButtonText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
