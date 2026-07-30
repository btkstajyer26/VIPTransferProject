import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAdminErrorMessage } from '../../api/admin/adminApiUtils';
import { createAdminVehicle, updateAdminVehicle } from '../../api/admin/adminVehicleApi';
import { AdminFilterChips } from '../../components/admin/AdminUi';
import useAuth from '../../hooks/useAuth';
import { createAdminManagementStyles } from '../../styles/admin/adminManagementStyles';
import { useTheme } from '../../theme/ThemeContext';

const CLASSES = [
  ['ECONOMY', 'Ekonomi'], ['STANDARD', 'Standart'], ['BUSINESS', 'Business'],
  ['VIP', 'VIP'], ['LUXURY', 'Lüks'], ['MINIVAN', 'Minivan'],
].map(([value, label]) => ({ value, label }));

function initialForm(vehicle) {
  return {
    plateNumber: String(vehicle?.plateNumber ?? ''), vehicleClass: vehicle?.vehicleClass || 'STANDARD',
    brand: String(vehicle?.brand ?? ''), model: String(vehicle?.model ?? ''),
    year: String(vehicle?.year ?? ''), color: String(vehicle?.color ?? ''),
    photoUrl: String(vehicle?.photoUrl ?? ''), capacity: String(vehicle?.capacity ?? ''),
    basePriceMultiplier: String(vehicle?.basePriceMultiplier ?? '1'),
    openingPrice: String(vehicle?.openingPrice ?? '0'),
  };
}

const decimal = (value) => Number(String(value).trim().replace(',', '.'));

function validate(form) {
  const errors = {};
  const year = form.year ? Number(form.year) : null;
  const capacity = Number(form.capacity);
  if (!form.plateNumber.trim()) errors.plateNumber = 'Plaka zorunludur.';
  else if (form.plateNumber.trim().length > 20) errors.plateNumber = 'Plaka en fazla 20 karakter olabilir.';
  if (form.brand.trim().length > 50) errors.brand = 'Marka en fazla 50 karakter olabilir.';
  if (form.model.trim().length > 50) errors.model = 'Model en fazla 50 karakter olabilir.';
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2100)) errors.year = 'Yıl 1900-2100 arasında olmalıdır.';
  if (form.color.trim().length > 30) errors.color = 'Renk en fazla 30 karakter olabilir.';
  if (form.photoUrl.trim().length > 500) errors.photoUrl = 'Fotoğraf adresi en fazla 500 karakter olabilir.';
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 99) errors.capacity = 'Kapasite 1-99 arasında olmalıdır.';
  if (!Number.isFinite(decimal(form.basePriceMultiplier)) || decimal(form.basePriceMultiplier) <= 0) errors.basePriceMultiplier = 'Fiyat çarpanı sıfırdan büyük olmalıdır.';
  if (!Number.isFinite(decimal(form.openingPrice)) || decimal(form.openingPrice) < 0) errors.openingPrice = 'Açılış fiyatı negatif olamaz.';
  return errors;
}

function buildPayload(form) {
  const text = (value) => value.trim() || null;
  return {
    plateNumber: form.plateNumber.trim(), vehicleClass: form.vehicleClass,
    brand: text(form.brand), model: text(form.model), year: form.year ? Number(form.year) : null,
    color: text(form.color), photoUrl: text(form.photoUrl), capacity: Number(form.capacity),
    basePriceMultiplier: decimal(form.basePriceMultiplier), openingPrice: decimal(form.openingPrice),
  };
}

function Field({ error, form, keyboardType, label, name, onChange, styles }) {
  return <>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput keyboardType={keyboardType} onChangeText={(value) => onChange(name, value)}
      placeholderTextColor={styles.placeholderColor.color} style={[styles.input, error && styles.inputError]}
      value={form[name]} />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </>;
}

export default function AdminVehicleFormScreen({ navigation, route }) {
  const mode = route.params?.mode === 'edit' ? 'edit' : 'create';
  const vehicle = route.params?.vehicle;
  const { logout, role } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createAdminManagementStyles(theme), [theme]);
  const [form, setForm] = useState(() => initialForm(vehicle));
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [saving, setSaving] = useState(false);
  const requestLock = useRef(false);
  const isAdmin = role?.trim().toUpperCase() === 'ADMIN';

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function save() {
    if (requestLock.current || !isAdmin) return;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (mode === 'edit' && vehicle?.id === undefined) return setRequestError('Araç bulunamadı.');
    requestLock.current = true;
    setSaving(true);
    setRequestError('');
    try {
      const payload = buildPayload(form);
      if (mode === 'edit') await updateAdminVehicle(vehicle.id, payload);
      else await createAdminVehicle(payload);
      navigation.goBack();
    } catch (error) {
      if (error?.status === 401) await logout();
      else setRequestError(getAdminErrorMessage(error, 'Araç kaydedilemedi.', 'Araç bulunamadı.'));
    } finally {
      requestLock.current = false;
      setSaving(false);
    }
  }

  if (!isAdmin) return null;
  return <SafeAreaView edges={['bottom']} style={styles.safeArea}>
    <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.formTitle}>{mode === 'edit' ? 'Aracı düzenle' : 'Yeni araç'}</Text>
      <Text style={styles.formSubtitle}>Araç bilgilerini eksiksiz girin.</Text>
      <Field label="Plaka *" name="plateNumber" form={form} error={errors.plateNumber} onChange={updateField} styles={styles} />
      <Text style={styles.fieldLabel}>Araç sınıfı *</Text>
      <AdminFilterChips options={CLASSES} onSelect={(value) => updateField('vehicleClass', value)} selected={form.vehicleClass} styles={styles} />
      <Field label="Marka" name="brand" form={form} error={errors.brand} onChange={updateField} styles={styles} />
      <Field label="Model" name="model" form={form} error={errors.model} onChange={updateField} styles={styles} />
      <Field label="Model yılı" name="year" form={form} error={errors.year} keyboardType="number-pad" onChange={updateField} styles={styles} />
      <Field label="Renk" name="color" form={form} error={errors.color} onChange={updateField} styles={styles} />
      <Field label="Fotoğraf URL'si" name="photoUrl" form={form} error={errors.photoUrl} keyboardType="url" onChange={updateField} styles={styles} />
      <Field label="Yolcu kapasitesi *" name="capacity" form={form} error={errors.capacity} keyboardType="number-pad" onChange={updateField} styles={styles} />
      <Field label="Taban fiyat çarpanı *" name="basePriceMultiplier" form={form} error={errors.basePriceMultiplier} keyboardType="decimal-pad" onChange={updateField} styles={styles} />
      <Field label="Açılış fiyatı *" name="openingPrice" form={form} error={errors.openingPrice} keyboardType="decimal-pad" onChange={updateField} styles={styles} />
      {requestError ? <Text style={styles.formError}>{requestError}</Text> : null}
      <Pressable disabled={saving} onPress={save} style={[styles.primaryButton, saving && styles.disabled]}>
        <Text style={styles.primaryButtonText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
      </Pressable>
    </ScrollView>
  </SafeAreaView>;
}
