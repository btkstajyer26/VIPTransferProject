import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeContext';
import { createHomeStyles } from '../styles/homeStyles';
import { useAuth } from '../context/AuthContext';
import { useReservationDraft } from '../context/ReservationDraftContext';

function getDisplayName(user) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return fullName || user?.phoneNumber || 'Misafir';
}

function getAnimatedStyle(animation, translateDistance) {
  return {
    opacity: animation,
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [translateDistance, 0],
        }),
      },
    ],
  };
}

const TIERS = [
  { key: 'BRONZE', name: 'BRONZE', min: 0, max: 5000, label: 'BRO' },
  { key: 'SILVER', name: 'SILVER', min: 5000, max: 15000, label: 'SIL' },
  { key: 'GOLD', name: 'GOLD', min: 15000, max: 30000, label: 'GOL' },
  { key: 'PLATINUM', name: 'PLATINUM', min: 30000, max: 50000, label: 'PLA' },
  { key: 'VIP', name: 'VIP', min: 50000, max: 75000, label: 'VIP' },
];

function getPointsGaugeProgress(currentPoints) {
  const currentTier = TIERS.find(t => currentPoints >= t.min && currentPoints < t.max) || TIERS[TIERS.length - 1];
  const span = currentTier.max - currentTier.min;
  const currentInTier = currentPoints - currentTier.min;
  const ratio = span > 0 ? Math.min(Math.max(currentInTier / span, 0), 1) : 1;
  return ratio;
}

function getLevelGaugeProgress(currentPoints) {
  const index = TIERS.findIndex(t => currentPoints >= t.min && currentPoints < t.max);
  const matchedIndex = index === -1 ? TIERS.length - 1 : index;
  const currentTier = TIERS[matchedIndex];
  const span = currentTier.max - currentTier.min;
  const ratioInTier = span > 0 ? Math.min(Math.max((currentPoints - currentTier.min) / span, 0), 1) : 1;
  
  const totalSegments = TIERS.length - 1;
  const exactProgress = (matchedIndex + ratioInTier) / totalSegments;
  return Math.min(Math.max(exactProgress, 0), 1);
}

function getPointsTickLabels(currentPoints) {
  const currentTier = TIERS.find(t => currentPoints >= t.min && currentPoints < t.max) || TIERS[TIERS.length - 1];
  const step = (currentTier.max - currentTier.min) / 4;
  return Array.from({ length: 5 }, (_, i) => {
    const val = currentTier.min + step * i;
    if (val >= 1000) {
      return `${(val / 1000).toFixed(val % 1000 !== 0 ? 1 : 0)}B`;
    }
    return String(val);
  });
}

const GAUGE_TICK_COUNT = 5;

export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createHomeStyles(theme), [theme]);
  const { logout } = useAuth();
  const { clearReservationDraft } = useReservationDraft();

  const [user, setUser] = useState(null);
  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayedPoints, setDisplayedPoints] = useState(0);
  
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const greetingAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const cardScaleAnim = useRef(new Animated.Value(0.92)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;
  
  const pointsAnim = useRef(new Animated.Value(0)).current;
  const gaugeAnim = useRef(new Animated.Value(0)).current;
  const levelAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const mockUser = {
        firstName: 'Stajyer',
        lastName: 'Geliştirici',
        phoneNumber: '05551111111'
      };

      const mockLoyalty = {
        lifetimePoints: 12500,
        tier: 'SILVER'
      };

      await new Promise(resolve => setTimeout(resolve, 350));

      setUser(mockUser);
      setLoyalty(mockLoyalty);
    } catch (loadError) {
      setError(loadError?.message || 'Bilgiler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (loading || error) {
      return;
    }

    const timingConfig = { toValue: 1, duration: 380, useNativeDriver: true };

    Animated.stagger(100, [
      Animated.timing(headerAnim, timingConfig),
      Animated.timing(greetingAnim, timingConfig),
      Animated.parallel([
        Animated.timing(cardAnim, timingConfig),
        Animated.spring(cardScaleAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      ]),
      Animated.timing(actionsAnim, timingConfig),
    ]).start();
  }, [actionsAnim, cardAnim, cardScaleAnim, error, greetingAnim, headerAnim, loading]);

  useEffect(() => {
    if (loading || error || !loyalty) {
      return undefined;
    }

    pointsAnim.setValue(0);
    gaugeAnim.setValue(0);
    levelAnim.setValue(0);
    setDisplayedPoints(0);

    const targetPoints = loyalty.lifetimePoints ?? 0;
    const targetPointsRatio = getPointsGaugeProgress(targetPoints);
    const targetLevelRatio = getLevelGaugeProgress(targetPoints);

    const listenerId = pointsAnim.addListener(({ value }) => {
      setDisplayedPoints(Math.round(value * targetPoints));
    });

    Animated.parallel([
      Animated.timing(pointsAnim, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: false,
      }),
      Animated.timing(gaugeAnim, {
        toValue: targetPointsRatio,
        duration: 1600,
        easing: Easing.out(Easing.elastic(1)),
        useNativeDriver: true,
      }),
      Animated.timing(levelAnim, {
        toValue: targetLevelRatio,
        duration: 1600,
        easing: Easing.out(Easing.elastic(1)),
        useNativeDriver: true,
      })
    ]).start();

    return () => {
      pointsAnim.removeListener(listenerId);
    };
  }, [error, loading, loyalty, pointsAnim, gaugeAnim, levelAnim]);

  function handleNewReservation() {
    clearReservationDraft();
    navigation.navigate('TransferSearch');
  }

  async function handleLogout() {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </Pressable>
      </View>
    );
  }

  const currentPoints = loyalty?.lifetimePoints ?? 0;
  const currentTierObj = TIERS.find(t => currentPoints >= t.min && currentPoints < t.max) || TIERS[TIERS.length - 1];
  const currentTierLabel = currentTierObj.name;
  
  const pointsTickLabels = getPointsTickLabels(currentPoints);

  const pointsGaugeInterpolate = gaugeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '90deg'],
  });
  const levelGaugeInterpolate = levelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '90deg'],
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.headerTop, getAnimatedStyle(headerAnim, -10)]}>
          <View style={styles.brandArea}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>VIP</Text>
            </View>
            <View>
              <Text style={styles.brandName}>VIP Transfer</Text>
              <Text style={styles.brandTagline}>PREMİUM ULAŞIM</Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Tema ayarlarını aç"
            accessibilityRole="button"
            onPress={() => navigation.navigate('ThemeSettings')}
            style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={getAnimatedStyle(greetingAnim, 12)}>
          <Text style={styles.greeting}>Merhaba, {getDisplayName(user)}</Text>
          <Text style={styles.subtitle}>VIP transfer hesabına hoş geldin.</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.loyaltyCard,
            getAnimatedStyle(cardAnim, 16),
            { transform: [...getAnimatedStyle(cardAnim, 16).transform, { scale: cardScaleAnim }] },
          ]}
        >
          <View style={styles.gaugesRow}>
            {/* SOL KADRAN: PUAN */}
            <View style={styles.gaugeUnit}>
              <View style={styles.fullCircleGaugeBox}>
                <View style={styles.gaugeDialFace} />

                {Array.from({ length: GAUGE_TICK_COUNT }).map((_, index) => {
                  const angle = -90 + index * (180 / (GAUGE_TICK_COUNT - 1));
                  return (
                    <View
                      key={`points-tick-${index}`}
                      style={[styles.gaugeTickWrapper, { transform: [{ rotate: `${angle}deg` }] }]}
                    >
                      <View style={styles.gaugeTick} />
                    </View>
                  );
                })}

                {pointsTickLabels.map((lbl, index) => {
                  const angle = -90 + index * (180 / (GAUGE_TICK_COUNT - 1));
                  return (
                    <View
                      key={`points-label-${index}`}
                      style={[styles.gaugeLabelWrapper, { transform: [{ rotate: `${angle}deg` }] }]}
                    >
                      <Text style={[styles.gaugeLabelText, { transform: [{ rotate: `${-angle}deg` }] }]}>
                        {lbl}
                      </Text>
                    </View>
                  );
                })}

                {/* İbre */}
                <Animated.View
                  style={[styles.gaugeNeedleWrapper, { transform: [{ rotate: pointsGaugeInterpolate }] }]}
                >
                  <View style={styles.gaugeNeedle} />
                </Animated.View>

                {/* Kadranın Tam Merkezindeki Pivot Noktası */}
                <View style={styles.needlePivotDot} />

                <View style={styles.gaugeCenterContent}>
                  <Text style={styles.gaugeCaption}>PUAN</Text>
                  <Text style={styles.gaugeValueText}>{displayedPoints.toLocaleString('tr-TR')}</Text>
                </View>
              </View>
            </View>

            {/* SAĞ KADRAN: SEVİYE */}
            <View style={styles.gaugeUnit}>
              <View style={styles.fullCircleGaugeBox}>
                <View style={styles.gaugeDialFace} />

                {TIERS.map((_, index) => {
                  const angle = -90 + index * (180 / (TIERS.length - 1));
                  return (
                    <View
                      key={`level-tick-${index}`}
                      style={[styles.gaugeTickWrapper, { transform: [{ rotate: `${angle}deg` }] }]}
                    >
                      <View style={styles.gaugeTick} />
                    </View>
                  );
                })}

                {TIERS.map((t, index) => {
                  const angle = -90 + index * (180 / (TIERS.length - 1));
                  return (
                    <View
                      key={`level-label-${index}`}
                      style={[styles.gaugeLabelWrapper, { transform: [{ rotate: `${angle}deg` }] }]}
                    >
                      <Text style={[styles.gaugeLabelText, { transform: [{ rotate: `${-angle}deg` }] }]}>
                        {t.label}
                      </Text>
                    </View>
                  );
                })}

                {/* İbre */}
                <Animated.View
                  style={[styles.gaugeNeedleWrapper, { transform: [{ rotate: levelGaugeInterpolate }] }]}
                >
                  <View style={styles.gaugeNeedle} />
                </Animated.View>

                {/* Kadranın Tam Merkezindeki Pivot Noktası */}
                <View style={styles.needlePivotDot} />

                <View style={styles.gaugeCenterContent}>
                  <Text style={styles.gaugeCaption}>SEVİYE</Text>
                  <Text style={styles.gaugeValueText}>{currentTierLabel}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Açılır Kapanır Bilgi Alanı */}
          <View style={styles.loyaltyDropdownContainer}>
            <Pressable
              onPress={() => setIsInfoExpanded(!isInfoExpanded)}
              style={({ pressed }) => [styles.infoToggleButton, pressed && styles.pressed]}
            >
              <Text style={styles.infoToggleText}>
                {isInfoExpanded ? 'Bilgileri Gizle' : 'Puanlar Nasıl Kazanılır ve Kullanılır?'}
              </Text>
              <Text style={styles.infoToggleIcon}>{isInfoExpanded ? '▲' : '▼'}</Text>
            </Pressable>

            {isInfoExpanded && (
              <View style={styles.loyaltyInfoBox}>
                <View style={styles.loyaltyInfoItem}>
                  <Text style={styles.loyaltyInfoTitle}>Nasıl Kazanılır?</Text>
                  <Text style={styles.loyaltyInfoText}>Gerçekleştirdiğin her başarılı VIP transfer rezervasyonundan sadakat puanı kazanırsın.</Text>
                </View>
                <View style={styles.loyaltyDivider} />
                <View style={styles.loyaltyInfoItem}>
                  <Text style={styles.loyaltyInfoTitle}>Nasıl Kullanılır?</Text>
                  <Text style={styles.loyaltyInfoText}>Biriken puanlarını ve seviyeni yükselterek sonraki transferlerinde avantaj elde edersin.</Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        <Animated.View style={[styles.actionGroup, getAnimatedStyle(actionsAnim, 14)]}>
          <Pressable
            accessibilityRole="button"
            onPress={handleNewReservation}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>Yeni Rezervasyon Oluştur</Text>
            <Text style={styles.buttonArrow}>→</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Reservations')}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>Geçmiş Rezervasyonlarım</Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.logoutArea, getAnimatedStyle(actionsAnim, 14)]}>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={handleLogout} style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.logoutText}>Çıkış Yap</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}