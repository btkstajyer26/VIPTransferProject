import { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { createWelcomeStyles } from '../styles/welcomeStyles';

const FEATURES = [
  {
    symbol: '◆',
    title: 'Profesyonel Sürücü',
    description: 'Deneyimli ve doğrulanmış ekip',
  },
  {
    symbol: '◷',
    title: 'Zamanında Karşılama',
    description: 'Uçuş ve saat takibi',
  },
  {
    symbol: '✓',
    title: 'Güvenli Yolculuk',
    description: 'Konforlu, bakımlı araçlar',
  },
];

function FeatureCard({ feature, styles }) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIconBox}>
        <Text style={styles.featureIcon}>{feature.symbol}</Text>
      </View>
      <View style={styles.featureTextArea}>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDescription}>{feature.description}</Text>
      </View>
    </View>
  );
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


export default function WelcomeScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createWelcomeStyles(theme), [theme]);
  const brandAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;
  const featureAnimations = useRef(FEATURES.map(() => new Animated.Value(0))).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timingConfig = {
      toValue: 1,
      duration: 360,
      useNativeDriver: true,
    };

    Animated.sequence([
      Animated.timing(brandAnim, { ...timingConfig, duration: 460 }),
      Animated.stagger(90, [
        Animated.timing(titleAnim, timingConfig),
        Animated.timing(heroAnim, timingConfig),
        ...featureAnimations.map((animation) => Animated.timing(animation, timingConfig)),
        Animated.timing(actionsAnim, timingConfig),
      ]),
    ]).start();
  }, [actionsAnim, brandAnim, featureAnimations, heroAnim, titleAnim]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.decorations}>
        <View style={styles.topOrb} />
        <View style={styles.topRing} />
        <View style={styles.bottomOrb} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.headerTop, getAnimatedStyle(brandAnim, -10)]}>
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

        <Animated.View style={[styles.messageArea, getAnimatedStyle(titleAnim, 14)]}>
          <Text style={styles.eyebrow}>AYRICALIKLI ULAŞIM DENEYİMİ</Text>
          <Text style={styles.title}>Yolculuğunuz,</Text>
          <Text style={[styles.title, styles.highlightedTitle]}>konforla başlasın.</Text>
          <Text style={styles.description}>
            Havalimanı, otel ve şehir içi transferlerinizi güvenli, konforlu ve zamanında
            planlayın.
          </Text>
        </Animated.View>


        <View style={styles.featuresArea}>
          <Text style={styles.sectionLabel}>NEDEN VIP TRANSFER?</Text>
          <View style={styles.featuresList}>
            {FEATURES.map((feature, index) => (
              <Animated.View
                key={feature.title}
                style={[
                  styles.featureAnimatedWrapper,
                  getAnimatedStyle(featureAnimations[index], 12),
                ]}
              >
                <FeatureCard feature={feature} styles={styles} />
              </Animated.View>
            ))}
          </View>
        </View>

        <Animated.View style={[styles.transferCard, getAnimatedStyle(heroAnim, 16)]}>
          <View style={styles.cardAccent} />
          <View style={styles.routeArea}>
            <Text style={styles.cardEyebrow}>ÖRNEK TRANSFER</Text>
            <View style={styles.routeRow}>
              <View style={styles.routeMarkerColumn}>
                <View style={styles.startMarker} />
                <View style={styles.routeLine} />
                <View style={styles.endMarker} />
              </View>
              <View style={styles.routeNames}>
                <View>
                  <Text style={styles.routeLabel}>BAŞLANGIÇ</Text>
                  <Text style={styles.routeValue}>Havalimanı</Text>
                </View>
                <View>
                  <Text style={styles.routeLabel}>VARIŞ</Text>
                  <Text style={styles.routeValue}>Şehir Merkezi</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceBadge}>7/24</Text>
            <Text style={styles.serviceLabel}>Transfer</Text>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterText}>
              Profesyonel sürücü · Planlı karşılama · Konforlu ulaşım
            </Text>
          </View>
        </Animated.View>
        <Animated.View style={[styles.footer, getAnimatedStyle(actionsAnim, 14)]}>
          <View style={styles.actions}>
            <Pressable
              accessibilityLabel="Transfer planla"
              accessibilityRole="button"
              onPress={() => navigation.navigate('TransferSearch')}
              style={({ pressed }) => [
                styles.button,
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Transfer Planla</Text>
              <Text style={styles.buttonArrow}>→</Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Giriş yap"
              accessibilityRole="button"
              onPress={() => navigation.navigate('Login')}
              style={({ pressed }) => [
                styles.button,
                styles.secondaryButton,
                pressed && styles.secondaryButtonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Giriş Yap</Text>
            </Pressable>
          </View>

          <Text style={styles.trustText}>
            7/24 transfer hizmeti · Profesyonel sürücüler · Rezervasyon güvencesi
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
