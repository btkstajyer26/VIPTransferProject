import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAdminErrorMessage } from '../../api/admin/adminApiUtils';
import { deleteAdminUser, getAdminUsers } from '../../api/admin/adminUserApi';
import {
  AdminFilterChips,
  AdminListState,
  AdminSearchInput,
  AdminStatusBadge,
} from '../../components/admin/AdminUi';
import useAuth from '../../hooks/useAuth';
import { createAdminManagementStyles } from '../../styles/admin/adminManagementStyles';
import { useTheme } from '../../theme/ThemeContext';

const ROLE_FILTERS = [
  { label: 'Tüm roller', value: 'ALL' },
  { label: 'Yönetici', value: 'ADMIN' },
  { label: 'Müşteri', value: 'CUSTOMER' },
];
const STATUS_FILTERS = [
  { label: 'Tümü', value: 'ALL' },
  { label: 'Aktif', value: 'ACTIVE' },
  { label: 'Pasif', value: 'PASSIVE' },
];

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('tr-TR');
}

export default function AdminUsersScreen() {
  const { logout, role, userId } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createAdminManagementStyles(theme), [theme]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);
  const requestLock = useRef(false);
  const isAdmin = role?.trim().toUpperCase() === 'ADMIN';

  const loadUsers = useCallback(async (refresh = false) => {
    if (!isAdmin) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      setUsers(await getAdminUsers());
    } catch (requestError) {
      if (requestError?.status === 401) await logout();
      else setError(getAdminErrorMessage(requestError, 'Bilgiler alınamadı. Lütfen tekrar deneyin.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, logout]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return users.filter((user) => {
      const matchesSearch =
        !query ||
        [user.firstName, user.lastName, user.phoneNumber, user.email]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase('tr-TR').includes(query));
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' ? user.active === true : user.active === false);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, search, statusFilter, users]);

  const performDelete = useCallback(async (id) => {
    if (requestLock.current || Number(id) === Number(userId)) return;
    requestLock.current = true;
    setDeletingId(id);
    try {
      await deleteAdminUser(id);
      setUsers((current) => current.filter((user) => user.id !== id));
    } catch (requestError) {
      if (requestError?.status === 401) await logout();
      else {
        Alert.alert(
          'Silme işlemi tamamlanamadı',
          getAdminErrorMessage(requestError, 'Silme işlemi tamamlanamadı.', 'Kullanıcı bulunamadı.'),
        );
      }
    } finally {
      requestLock.current = false;
      setDeletingId(null);
    }
  }, [logout, userId]);

  function confirmDelete(user) {
    Alert.alert(
      'Kullanıcıyı sil',
      'Bu kullanıcıyı silmek istediğinizden emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => performDelete(user.id) },
      ],
    );
  }

  if (!isAdmin) return null;

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.content}
        data={filteredUsers}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadUsers(true)} />}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <Text style={styles.heading}>Kullanıcılar</Text>
              <Text style={styles.count}>{filteredUsers.length} kayıt</Text>
            </View>
            <AdminSearchInput
              onChangeText={setSearch}
              placeholder="Ad, telefon veya e-posta ara"
              styles={styles}
              value={search}
            />
            <Text style={styles.filterLabel}>ROL</Text>
            <AdminFilterChips options={ROLE_FILTERS} onSelect={setRoleFilter} selected={roleFilter} styles={styles} />
            <Text style={styles.filterLabel}>DURUM</Text>
            <AdminFilterChips options={STATUS_FILTERS} onSelect={setStatusFilter} selected={statusFilter} styles={styles} />
          </>
        }
        ListEmptyComponent={<AdminListState error={error} loading={loading} onRetry={loadUsers} styles={styles} />}
        renderItem={({ item }) => {
          const isOwnAccount = Number(item.id) === Number(userId);
          const fullName = [item.firstName, item.lastName].filter(Boolean).join(' ') || 'İsimsiz kullanıcı';
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardTitleArea}>
                  <Text style={styles.cardTitle}>{fullName}</Text>
                  <Text style={styles.cardSubtitle}>
                    {item.role === 'ADMIN' ? 'Yönetici' : 'Müşteri'} · {item.guest ? 'Misafir' : 'Kayıtlı kullanıcı'}
                  </Text>
                </View>
                <AdminStatusBadge active={item.active === true} styles={styles} />
              </View>
              <View style={styles.metadata}>
                <Text style={styles.metadataText}>Telefon: <Text style={styles.metadataStrong}>{item.phoneNumber || '-'}</Text></Text>
                <Text style={styles.metadataText}>E-posta: <Text style={styles.metadataStrong}>{item.email || '-'}</Text></Text>
                <Text style={styles.metadataText}>Oluşturulma: {formatDate(item.createdAt)}</Text>
              </View>
              {!isOwnAccount ? (
                <View style={styles.actions}>
                  <Pressable
                    disabled={deletingId !== null}
                    onPress={() => confirmDelete(item)}
                    style={[styles.actionButton, styles.dangerButton, deletingId !== null && styles.disabled]}
                  >
                    <Text style={[styles.actionText, styles.dangerText]}>
                      {deletingId === item.id ? 'Siliniyor...' : 'Sil'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={[styles.metadataText, { marginTop: 12 }]}>Bu sizin hesabınız.</Text>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
