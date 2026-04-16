// WelcomeScreen.js — Onboarding / splash screen

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { SafarSetuSplashLogo } from '../../components/SafarSetuLogo';
import GradientButton from '../../components/GradientButton';

const { width, height } = Dimensions.get('window');

const FEATURES = [
  { icon: '🗺️', title: 'Live Tracking', desc: 'See vehicles in real-time on map' },
  { icon: '🎫', title: 'Digital Tickets', desc: 'Buy & manage tickets instantly' },
  { icon: '🚌', title: 'All Routes', desc: 'Explore every city route' },
];

const WelcomeScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Top gradient section */}
      <LinearGradient
        colors={['#1E3A8A', '#2563EB', '#1E3A8A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topSection}
      >
        {/* Decorative circles */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
          <SafarSetuSplashLogo />
        </Animated.View>
      </LinearGradient>

      {/* Bottom light section */}
      <Animated.View
        style={[
          styles.bottomSection,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.headline}>
          Your Smart{'\n'}Journey Companion
        </Text>
        <Text style={styles.subtext}>
          Track vehicles live, buy digital tickets, and explore routes — all in one app.
        </Text>

        {/* Feature pills */}
        <View style={styles.featuresRow}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featurePill}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureTitle}>{f.title}</Text>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <GradientButton
          title="Get Started"
          onPress={() => navigation.navigate('Login')}
          size="lg"
          style={styles.primaryBtn}
        />
        <Text style={styles.disclaimer}>
          By continuing, you agree to our Terms of Service
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topSection: {
    flex: 0.55,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -80,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(249,115,22,0.15)',
    bottom: -60,
    left: -60,
  },
  bottomSection: {
    flex: 0.45,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  headline: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 38,
    marginBottom: SPACING.sm,
  },
  subtext: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.xl,
  },
  featurePill: {
    flex: 1,
    backgroundColor: COLORS.primary + '0D',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  featureIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryBtn: {
    marginBottom: SPACING.md,
  },
  disclaimer: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});

export default WelcomeScreen;
