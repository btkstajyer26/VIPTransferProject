import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { getAdminErrorMessage } from '../../api/admin/adminApiUtils';
import {
  deleteAdminVehicle,
  getAllAdminVehicles,
  updateAdminVehicleStatus,
} from '../../api/admin/adminVehicleApi';
import {
  AdminFilterChips,
  AdminListState,
  AdminSearchInput,
  AdminStatusBadge,
} from '../../components/admin/AdminUi';
import useAuth from '../../hooks/useAuth';
import { ADMIN_ROUTES } from '../../navigation/adminRoutes';
import { createAdminManagementStyles } from '../../styles/admin/adminManagementStyles';
import { useTheme } from '../../theme/ThemeContext';

const STATUS_FILTERS = [
  { label: 'Tümü', value: 'ALL' },
  { label: 'Aktif', value: 'ACTIVE' },
  { label: 'Pasif', value: 'PASSIVE' },
];
const VEHICLE_CLASSES = ['ALL', 'ECONOMY', 'STANDARD', 'BUSINESS', 'VIP', 'LUXURY', 'MINIVAN'];
const CLASS_LABELS = {
  ALL: 'Tüm sınıflar', ECONOMY: 'Ekonomi', STANDARD: 'Standart',
  BUSINESS: 'Business', VIP: 'VIP', LUXURY: 'Lüks', MINIVAN: 'Minivan',
};

export default function AdminVehiclesScreen({ navigation }) {
  const { logout, role } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createAdminManagementStyles(theme), [theme]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [busyId, setBusyId] = useState(null);
  const requestLock = useRef(false);
  const isAdmin = role?.trim().toUpperCase() === 'ADMIN';

  const loadVehicles = useCallback(async (refresh = false) => {
    if (!isAdmin) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      setVehicles(await getAllAdminVehicles());
    } catch (requestError) {
      if (requestError?.status === 401) await logout();
      else setError(getAdminErrorMessage(requestError, 'Bilgiler alınamadı. Lütfen tekrar deneyin.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, logout]);

  useFocusEffect(useCallback(() => {
    loadVehicles();
  }, [loadVehicles]));

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return vehicles.filter((vehicle) => {
      const matchesSearch =
        !query ||
        [vehicle.brand, vehicle.model, vehicle.plateNumber]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase('tr-TR').includes(query));
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' ? vehicle.active === true : vehicle.active === false);
      return matchesSearch && matchesStatus && (classFilter === 'ALL' || vehicle.vehicleClass === classFilter);
    });
  }, [classFilter, search, statusFilter, vehicles]);

  const runVehicleAction = useCallback(async (vehicle, action) => {
    if (requestLock.current) return;
    requestLock.current = true;
    setBusyId(vehicle.id);
    try {
      if (action === 'status') {
        const updated = await updateAdminVehicleStatus(vehicle.id);
        setVehicles((current) => current.map((item) => item.id === vehicle.id ? { ...item, ...updated } : item));
      } else {
        await deleteAdminVehicle(vehicle.id);
        setVehicles((current) =>
          current.map((item) => item.id === vehicle.id ? { ...item, active: false } : item),
        );
      }
    } catch (requestError) {
      if (requestError?.status === 401) await logout();
      else {
        Alert.alert(
          action === 'delete' ? 'Silme işlemi tamamlanamadı' : 'Durum güncellenemedi',
          getAdminErrorMessage(
            requestError,
            action === 'delete' ? 'Silme işlemi tamamlanamadı.' : 'Araç durumu güncellenemedi.',
            'Araç bulunamadı.',
          ),
        );
      }
    } finally {
      requestLock.current = false;
      setBusyId(null);
    }
  }, [logout]);

  function confirmDelete(vehicle) {
    Alert.alert('Aracı sil', 'Bu aracı silmek istediğinizden emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => runVehicleAction(vehicle, 'delete') },
    ]);
  }

  if (!isAdmin) return null;

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.content}
        data={filteredVehicles}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadVehicles(true)} />}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <Text style={styles.heading}>Araçlar</Text>
              <Pressable onPress={() => navigation.navigate(ADMIN_ROUTES.VEHICLE_FORM, { mode: 'create' })} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Yeni Araç</Text>
              </Pressable>
            </View>
            <AdminSearchInput onChangeText={setSearch} placeholder="Marka, model veya plaka ara" styles={styles} value={search} />
            <Text style={styles.filterLabel}>DURUM</Text>
            <AdminFilterChips options={STATUS_FILTERS} onSelect={setStatusFilter} selected={statusFilter} styles={styles} />
            <Text style={styles.filterLabel}>ARAÇ SINIFI</Text>
            <AdminFilterChips
              options={VEHICLE_CLASSES.map((value) => ({ value, label: CLASS_LABELS[value] }))}
              onSelect={setClassFilter}
              selected={classFilter}
              styles={styles}
            />
          </>
        }
        ListEmptyComponent={<AdminListState error={error} loading={loading} onRetry={loadVehicles} styles={styles} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.cardTitleArea}>
                <Text style={styles.cardTitle}>{item.brand || 'Markasız'} {item.model || ''}</Text>
                <Text style={styles.cardSubtitle}>{item.plateNumber} · {CLASS_LABELS[item.vehicleClass] || item.vehicleClass}</Text>
              </View>
              <AdminStatusBadge active={item.active === true} styles={styles} />
            </View>
            <View style={styles.metadata}>
              <Text style={styles.metadataText}>Kapasite: <Text style={styles.metadataStrong}>{item.capacity} yolcu</Text></Text>
              <Text style={styles.metadataText}>Model yılı: {item.year || '-'}</Text>
              <Text style={styles.metadataText}>Fiyat çarpanı: {item.basePriceMultiplier ?? '-'} · Açılış: ₺{item.openingPrice ?? '-'}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable
                disabled={busyId !== null}
                onPress={() => navigation.navigate(ADMIN_ROUTES.VEHICLE_FORM, { mode: 'edit', vehicle: item })}
                style={[styles.actionButton, busyId !== null && styles.disabled]}
              >
                <Text style={styles.actionText}>Düzenle</Text>
              </Pressable>
              <Pressable
                disabled={busyId !== null}
                onPress={() => runVehicleAction(item, 'status')}
                style={[styles.actionButton, busyId !== null && styles.disabled]}
              >
                <Text style={styles.actionText}>
                  {busyId === item.id ? 'İşleniyor...' : item.active ? 'Pasife Al' : 'Aktifleştir'}
                </Text>
              </Pressable>
              <Pressable
                disabled={busyId !== null || !item.active}
                onPress={() => confirmDelete(item)}
                style={[styles.actionButton, styles.dangerButton, (busyId !== null || !item.active) && styles.disabled]}
              >
                <Text style={[styles.actionText, styles.dangerText]}>Sil</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
