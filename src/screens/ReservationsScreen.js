import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
  Platform,
  LayoutAnimation,
  UIManager,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mockReservations } from '../data/mockData';
import { cancelMyReservation, getMyReservations } from '../api/reservationApi';
import { formatDate, formatTime } from '../utils/dateUtils';
import { useTheme } from '../theme/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PAST_STATUSES = ['COMPLETED', 'CANCELLED', 'CANCELED', 'NO_SHOW'];

function isPastStatus(status) {
  return PAST_STATUSES.includes(status);
}

function getStatusKind(status) {
  if (status === 'COMPLETED') return 'completed';
  if (status === 'CANCELLED' || status === 'CANCELED' || status === 'NO_SHOW') return 'canceled';
  return 'pending';
}

function getStatusLabel(status) {
  switch (status) {
    case 'COMPLETED':
      return 'Tamamlandı';
    case 'CANCELLED':
    case 'CANCELED':
      return 'İptal Edildi';
    case 'NO_SHOW':
      return 'Gelinmedi';
    case 'ASSIGNED':
      return 'Araç Atandı';
    default:
      return 'Bekliyor';
  }
}

function normalizeReservation(item) {
  const scheduled = item?.scheduledTime ? new Date(item.scheduledTime) : null;
  const price = item?.calculatedPrice ?? item?.basePrice;

  return {
    id: item?.id,
    pickup: item?.pickupAddress || '',
    destination: item?.dropoffAddress || '',
    date:
      scheduled && !Number.isNaN(scheduled.getTime())
        ? `${formatDate(scheduled)} - ${formatTime(scheduled)}`
        : '',
    status: item?.status,
    price:
      price !== null && price !== undefined
        ? `${Number(price).toLocaleString('tr-TR')} ${item?.currency || 'TL'}`
        : '',
    vehicle: item?.vehicleName || null,
    driver: null,
    points: null,
  };
}

export default function ReservationsScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createReservationsStyles(theme), [theme]);

  const [activeTab, setActiveTab] = useState('UPCOMING');
  const [expandedId, setExpandedId] = useState(null);
  const [tabContainerWidth, setTabContainerWidth] = useState(0);

  const [dataSource, setDataSource] = useState('real');
  const [mockList, setMockList] = useState(mockReservations);
  const [realList, setRealList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const reservations = dataSource === 'mock' ? mockList : realList;

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedForCancel, setSelectedForCancel] = useState(null);
  const [cancelNote, setCancelNote] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const tabAnim = useRef(new Animated.Value(0)).current;
  const TAB_INSET = 4;
  const indicatorWidth = tabContainerWidth > 0 ? (tabContainerWidth - TAB_INSET * 2) / 2 : 0;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeTab]);

  const selectTab = (tab) => {
    setActiveTab(tab);
    setExpandedId(null);
    Animated.timing(tabAnim, {
      toValue: tab === 'PAST' ? 1 : 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  };

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const data = await getMyReservations();
      setRealList((data ?? []).map(normalizeReservation));
    } catch (error) {
      setLoadError(error?.message || 'Rezervasyonlarınız alınamadı.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (dataSource === 'real') {
      loadReservations();
    } else {
      setLoading(false);
      setLoadError(null);
    }
  }, [dataSource, loadReservations]);

  function toggleDataSource() {
    setExpandedId(null);
    setDataSource((current) => (current === 'real' ? 'mock' : 'real'));
  }

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const filteredData = reservations.filter((item) => {
    const past = isPastStatus(item.status);
    return activeTab === 'PAST' ? past : !past;
  });

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const openCancelModal = (id) => {
    setSelectedForCancel(id);
    setCancelNote('');
    setCancelError(null);
    setCancelModalVisible(true);
  };

  const handleCancelReservation = async () => {
    if (!cancelNote.trim()) {
      triggerShake();
      return;
    }

    if (dataSource === 'mock') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setMockList((prevReservations) =>
        prevReservations.map((res) =>
          res.id === selectedForCancel ? { ...res, status: 'CANCELED' } : res
        )
      );
      setCancelModalVisible(false);
      setSelectedForCancel(null);
      setCancelNote('');
      return;
    }

    try {
      setCancelling(true);
      setCancelError(null);
      await cancelMyReservation(selectedForCancel);

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setRealList((prevReservations) =>
        prevReservations.map((res) =>
          res.id === selectedForCancel ? { ...res, status: 'CANCELLED' } : res
        )
      );
      setCancelModalVisible(false);
      setSelectedForCancel(null);
      setCancelNote('');
    } catch (error) {
      setCancelError(error?.message || 'Rezervasyon iptal edilemedi.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Rezervasyonlarım</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={toggleDataSource}>
          <Text style={styles.demoToggleText}>
            {dataSource === 'real' ? 'Demo Verisiyle Göster' : 'Gerçek Verilerime Dön'}
          </Text>
        </Pressable>
      </View>

      {/* Sekmeler */}
      <View
        style={styles.tabContainer}
        onLayout={(e) => setTabContainerWidth(e.nativeEvent.layout.width)}
      >
        {indicatorWidth > 0 ? (
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                width: indicatorWidth,
                transform: [
                  {
                    translateX: tabAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, indicatorWidth],
                    }),
                  },
                ],
              },
            ]}
          />
        ) : null}

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => selectTab('UPCOMING')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'UPCOMING' && styles.activeTabText]}>
            Aktif
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => selectTab('PAST')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'PAST' && styles.activeTabText]}>
            Geçmiş
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste */}
      {dataSource === 'real' && loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      ) : dataSource === 'real' && loadError ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{loadError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={loadReservations}
            style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      ) : (
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={styles.emptyText}>Bu listede hiç rezervasyon yok.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isExpanded = expandedId === item.id;
            const isPast = isPastStatus(item.status);
            const statusKind = getStatusKind(item.status);

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.date}>{item.date}</Text>
                  <Text style={styles.price}>{item.price}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.routeContainer}>
                  <View style={styles.routeItem}>
                    <View style={styles.dot} />
                    <Text style={styles.routeText}>{item.pickup}</Text>
                  </View>
                  <View style={styles.routeLine} />
                  <View style={styles.routeItem}>
                    <View style={[styles.dot, { backgroundColor: theme.accent }]} />
                    <Text style={styles.routeText}>{item.destination}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                  <View
                    style={[
                      styles.statusBadge,
                      statusKind === 'completed' && styles.statusCompleted,
                      statusKind === 'canceled' && styles.statusCanceled,
                      statusKind === 'pending' && styles.statusPending
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        statusKind === 'completed' && styles.statusTextCompleted,
                        statusKind === 'canceled' && styles.statusTextCanceled,
                        statusKind === 'pending' && styles.statusTextPending
                      ]}
                    >
                      {getStatusLabel(item.status)}
                    </Text>
                  </View>

                  {item.status === 'COMPLETED' && item.points && (
                    <View style={styles.pointsBadge}>
                      <Ionicons name="star" size={14} color={theme.accent} />
                      <Text style={styles.pointsText}>+{item.points} Puan</Text>
                    </View>
                  )}
                </View>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <View style={styles.divider} />
                    <Text style={styles.expandedTitle}>Transfer Detayları</Text>

                    <View style={styles.driverRow}>
                      <View style={styles.driverIconContainer}>
                        <Ionicons name="person" size={20} color={theme.accent} />
                      </View>
                      <View style={styles.driverInfo}>
                        <Text style={styles.driverName}>{item.driver || 'Şoför Atanmadı'}</Text>
                        <Text style={styles.vehicleName}>{item.vehicle || 'Araç Belirtilmedi'}</Text>
                      </View>
                      <View style={styles.vehicleIconContainer}>
                        <Ionicons name="car-sport" size={20} color={theme.text} />
                      </View>
                    </View>

                    {/* Harita Görünüm Alanı */}
                    <View style={styles.mapContainer}>
                      <Ionicons name="map" size={28} color={theme.accent} style={{ marginBottom: 4 }} />
                      <Text style={styles.mapTitle}>
                        {isPast ? 'Tamamlanan Rota Güzergahı' : 'Canlı Konum Takibi'}
                      </Text>
                      <Text style={styles.mapRouteText} numberOfLines={1}>
                        {item.pickup} ➔ {item.destination}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.actionRow}>
                  {(dataSource === 'mock' ? !isPast : item.status === 'PENDING') && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionButtonSecondary,
                        pressed && { opacity: 0.7 }
                      ]}
                      onPress={() => openCancelModal(item.id)}
                    >
                      <Text style={styles.actionButtonTextSecondary}>İptal Talebi</Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={({ pressed }) => [
                      isExpanded ? styles.actionButtonActive : styles.actionButtonPrimary,
                      pressed && { opacity: 0.7 }
                    ]}
                    onPress={() => toggleExpand(item.id)}
                  >
                    <Text style={isExpanded ? styles.actionButtonTextActive : styles.actionButtonTextPrimary}>
                      {isExpanded ? 'Detayları Gizle' : 'Detayları Gör'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      </Animated.View>
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={cancelModalVisible}
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Animated.View style={[styles.modalContent, { transform: [{ translateX: shakeAnim }] }]}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="warning" size={32} color={theme.danger} />
            </View>
            <Text style={styles.modalTitle}>Rezervasyonu İptal Et</Text>
            <Text style={styles.modalText}>
              Bu işlemi geri alamazsınız. Lütfen iptal sebebinizi kısaca belirtin.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="İptal sebebi (Örn: Uçağım rötar yaptı)"
              placeholderTextColor={theme.placeholder}
              value={cancelNote}
              onChangeText={setCancelNote}
              multiline
              maxLength={150}
            />

            {cancelError ? <Text style={styles.cancelErrorText}>{cancelError}</Text> : null}

            <View style={styles.modalActionRow}>
              <Pressable
                disabled={cancelling}
                style={({ pressed }) => [styles.modalButtonCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Vazgeç</Text>
              </Pressable>

              <Pressable
                disabled={cancelling}
                style={({ pressed }) => [
                  styles.modalButtonConfirm,
                  cancelling && { opacity: 0.6 },
                  pressed && !cancelling && { opacity: 0.7 }
                ]}
                onPress={handleCancelReservation}
              >
                <Text style={styles.modalButtonTextConfirm}>
                  {cancelling ? 'İptal Ediliyor...' : 'İptal Et'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

function createReservationsStyles(theme) {
  const isDark = theme.mode === 'dark';

  return StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 24, paddingTop: 24, backgroundColor: theme.background },
    title: { marginTop: 12, color: theme.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
    titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
    demoToggleText: { color: theme.accent, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
    retryButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: theme.accent },
    retryButtonText: { color: theme.buttonText, fontWeight: '800', fontSize: 14 },
    cancelErrorText: { color: theme.danger, fontSize: 12, lineHeight: 17, marginBottom: 12 },
    tabContainer: { flexDirection: 'row', marginTop: 24, backgroundColor: theme.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: theme.border },
    tabIndicator: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 10, backgroundColor: theme.accent, elevation: 6 },
    tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
    tabText: { color: theme.textSecondary, fontSize: 15, fontWeight: '700' },
    activeTabText: { color: theme.buttonText, fontWeight: '900' },
    list: { paddingTop: 24, gap: 16, paddingBottom: 40 },
    emptyText: { color: theme.textSecondary, fontSize: 16, fontWeight: '600' },
    card: {
      padding: 20,
      borderRadius: 16,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      elevation: 0
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    date: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
    price: { color: theme.text, fontSize: 18, fontWeight: '900' },
    divider: { height: 1, backgroundColor: theme.border, marginVertical: 14 },
    routeContainer: { marginBottom: 8 },
    routeItem: { flexDirection: 'row', alignItems: 'center' },
    routeLine: { width: 2, height: 16, backgroundColor: theme.textSecondary, marginLeft: 5, marginVertical: 4, opacity: 0.5 },
    dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.text, marginRight: 12 },
    routeText: { color: theme.text, fontSize: 16, fontWeight: '800' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    statusPending: { backgroundColor: theme.accentSoft },
    statusCompleted: { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.18)' : 'rgba(5, 150, 105, 0.12)' },
    statusCanceled: { backgroundColor: isDark ? 'rgba(220, 38, 38, 0.2)' : 'rgba(220, 38, 38, 0.1)' },
    statusText: { fontSize: 13, fontWeight: '900' },
    statusTextPending: { color: theme.accent },
    statusTextCompleted: { color: theme.success },
    statusTextCanceled: { color: theme.danger },
    pointsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.accentSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4 },
    pointsText: { color: theme.accent, fontSize: 12, fontWeight: 'bold' },
    expandedContent: { marginTop: 8 },
    expandedTitle: { fontSize: 15, fontWeight: '800', color: theme.text, marginBottom: 12 },
    driverRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
    driverIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.accentSoft, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    driverInfo: { flex: 1 },
    driverName: { fontSize: 14, fontWeight: '800', color: theme.text },
    vehicleName: { fontSize: 13, color: theme.textSecondary, marginTop: 2, fontWeight: '600' },
    vehicleIconContainer: { padding: 8, backgroundColor: theme.surface, borderRadius: 8 },
    mapContainer: {
      height: 110,
      backgroundColor: theme.background,
      borderRadius: 14,
      marginTop: 12,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.border
    },
    mapTitle: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '900',
      marginBottom: 2
    },
    mapRouteText: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center'
    },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 12 },
    actionButtonSecondary: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(220, 38, 38, 0.16)' : 'rgba(220, 38, 38, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(220, 38, 38, 0.4)' : 'rgba(220, 38, 38, 0.3)'
    },
    actionButtonTextSecondary: {
      color: theme.danger,
      fontWeight: '800',
      fontSize: 14
    },
    actionButtonPrimary: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', elevation: 2 },
    actionButtonTextPrimary: { color: theme.buttonText, fontWeight: '900', fontSize: 14 },
    actionButtonActive: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.accent },
    actionButtonTextActive: { color: theme.accent, fontWeight: '900', fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: {
      width: '100%',
      backgroundColor: theme.surface,
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border
    },
    modalIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? 'rgba(220, 38, 38, 0.2)' : 'rgba(220, 38, 38, 0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: theme.text, marginBottom: 8 },
    modalText: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 20, fontWeight: '600' },
    modalInput: { width: '100%', backgroundColor: theme.background, borderRadius: 12, padding: 16, fontSize: 14, color: theme.text, minHeight: 80, textAlignVertical: 'top', marginBottom: 24, borderWidth: 1, borderColor: theme.border },
    modalActionRow: { flexDirection: 'row', gap: 12, width: '100%' },
    modalButtonCancel: { flex: 1, paddingVertical: 14, backgroundColor: theme.background, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    modalButtonTextCancel: { color: theme.text, fontWeight: '800', fontSize: 15 },
    modalButtonConfirm: { flex: 1, paddingVertical: 14, backgroundColor: theme.danger, borderRadius: 12, alignItems: 'center' },
    modalButtonTextConfirm: { color: theme.buttonText, fontWeight: '800', fontSize: 15 },
  });
}
