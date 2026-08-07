import { useEffect, useMemo, useRef } from 'react';
import { Animated, ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalization } from '../localization/LocalizationContext';
import { createWelcomeStyles } from '../styles/welcomeStyles';
import { useTheme } from '../theme/ThemeContext';

const FEATURE_KEYS = [
  { symbol: '◆', key: 'driver' },
  { symbol: '▷', key: 'time' },
  { symbol: '✓', key: 'safe' },
];

function FeatureCard({ feature, styles }) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIconBox}><Text style={styles.featureIcon}>{feature.symbol}</Text></View>
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
    transform: [{ translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [translateDistance, 0] }) }],
  };
}

export default function WelcomeScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { t } = useLocalization();
  const styles = useMemo(() => createWelcomeStyles(theme), [theme]);
  const features = FEATURE_KEYS.map(({ symbol, key }) => ({
    symbol,
    key,
    title: t(`welcome.feature.${key}.title`),
    description: t(`welcome.feature.${key}.description`),
  }));
  const brandAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;
  const featureAnimations = useRef(FEATURE_KEYS.map(() => new Animated.Value(0))).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timingConfig = { toValue: 1, duration: 360, useNativeDriver: true };
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
    <ImageBackground
      resizeMode="cover"
      source={isDark ? require('../../assets/vip-transfer-hero.png') : require('../../assets/vip-transfer-hero-light.png')}
      style={styles.backgroundImage}
    >
      <View pointerEvents="none" style={styles.imageOverlay} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.headerTop, getAnimatedStyle(brandAnim, -10)]}>
            <View style={styles.brandArea}>
              <View style={styles.logoPlaceholder}><Text style={styles.logoText}>VIP</Text></View>
              <View>
                <Text style={styles.brandName}>VIP Transfer</Text>
                <Text style={styles.brandTagline}>{t('welcome.tagline')}</Text>
              </View>
            </View>
            <Pressable accessibilityLabel={t('welcome.settings')} accessibilityRole="button" onPress={() => navigation.navigate('ThemeSettings')} style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}>
              <Text style={styles.settingsIcon}>⚙</Text>
            </Pressable>
          </Animated.View>

          <Animated.View style={[styles.messageArea, getAnimatedStyle(titleAnim, 14)]}>
            <Text style={styles.eyebrow}>{t('welcome.eyebrow')}</Text>
            <Text style={styles.title}>{t('welcome.title')}</Text>
            <Text style={[styles.title, styles.highlightedTitle]}>{t('welcome.highlight')}</Text>
            <Text style={styles.description}>{t('welcome.description')}</Text>
          </Animated.View>

          <View style={styles.featuresArea}>
            <Text style={styles.sectionLabel}>{t('welcome.why')}</Text>
            <View style={styles.featuresList}>
              {features.map((feature, index) => (
                <Animated.View key={feature.key} style={[styles.featureAnimatedWrapper, getAnimatedStyle(featureAnimations[index], 12)]}>
                  <FeatureCard feature={feature} styles={styles} />
                </Animated.View>
              ))}
            </View>
          </View>

          <Animated.View style={[styles.footer, getAnimatedStyle(actionsAnim, 14)]}>
            <View style={styles.actions}>
              <Pressable accessibilityLabel={t('welcome.plan')} accessibilityRole="button" onPress={() => navigation.navigate('TransferSearch')} style={({ pressed }) => [styles.button, styles.primaryButton, pressed && styles.primaryButtonPressed]}>
                <Text style={styles.primaryButtonText}>{t('welcome.plan')}</Text><Text style={styles.buttonArrow}>→</Text>
              </Pressable>
              <Pressable accessibilityLabel={t('welcome.login')} accessibilityRole="button" onPress={() => navigation.navigate('Login')} style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.secondaryButtonPressed]}>
                <Text style={styles.secondaryButtonText}>{t('welcome.login')}</Text>
              </Pressable>
              <Pressable accessibilityLabel={t('welcome.lookup')} accessibilityRole="button" onPress={() => navigation.navigate('ReservationLookup')} style={({ pressed }) => [styles.lookupButton, pressed && styles.secondaryButtonPressed]}>
                <Text style={styles.lookupButtonText}>{t('welcome.lookup')}</Text>
              </Pressable>
            </View>
            <Text style={styles.trustText}>{t('welcome.trust')}</Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}
