// LoadingSpinner.js — Full screen and inline loading states

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export const FullScreenLoader = ({ message = 'Loading...' }) => {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.fullscreen}>
      <Animated.View style={[styles.logoContainer, { opacity: pulse }]}>
        <LinearGradient
          colors={COLORS.gradientMixed}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoGradient}
        >
          <Text style={styles.logoText}>SS</Text>
        </LinearGradient>
      </Animated.View>
      <Text style={styles.appName}>SafarSetu</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

export const SkeletonLoader = ({ width = '100%', height = 20, borderRadius = 8, style = {} }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: COLORS.border,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const RouteCardSkeleton = () => (
  <View style={styles.skeletonCard}>
    <SkeletonLoader width={52} height={52} borderRadius={10} />
    <View style={{ flex: 1, marginLeft: 12 }}>
      <SkeletonLoader width="70%" height={16} borderRadius={6} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="90%" height={12} borderRadius={6} style={{ marginBottom: 6 }} />
      <SkeletonLoader width="80%" height={12} borderRadius={6} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="60%" height={10} borderRadius={6} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: SPACING.base,
  },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  appName: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  skeletonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginHorizontal: SPACING.base,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.base,
  },
});

export default FullScreenLoader;
