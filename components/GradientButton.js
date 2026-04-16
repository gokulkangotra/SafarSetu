// GradientButton.js — Premium gradient button component

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const GradientButton = ({
  title,
  onPress,
  variant = 'primary',   // 'primary' | 'secondary' | 'outline' | 'ghost'
  size = 'md',           // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  icon = null,
  style = {},
  textStyle = {},
}) => {
  const gradients = {
    primary: COLORS.gradientPrimary,
    secondary: COLORS.gradientSecondary,
    mixed: COLORS.gradientMixed,
    accent: COLORS.gradientAccent,
  };

  const sizes = {
    sm: { paddingVertical: 10, paddingHorizontal: 20, fontSize: FONTS.sizes.sm },
    md: { paddingVertical: 14, paddingHorizontal: 28, fontSize: FONTS.sizes.md },
    lg: { paddingVertical: 18, paddingHorizontal: 36, fontSize: FONTS.sizes.lg },
  };

  const currentSize = sizes[size];
  const isDisabled = disabled || loading;

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        style={[
          styles.outlineButton,
          { paddingVertical: currentSize.paddingVertical, paddingHorizontal: currentSize.paddingHorizontal },
          isDisabled && styles.disabled,
          style,
        ]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <View style={styles.row}>
            {icon}
            <Text style={[styles.outlineText, { fontSize: currentSize.fontSize }, textStyle]}>
              {title}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        style={[styles.ghostButton, isDisabled && styles.disabled, style]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
      >
        {icon}
        <Text style={[styles.ghostText, { fontSize: currentSize.fontSize }, textStyle]}>
          {title}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.wrapper, isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={isDisabled ? ['#9CA3AF', '#6B7280'] : (gradients[variant] || gradients.primary)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.gradient,
          {
            paddingVertical: currentSize.paddingVertical,
            paddingHorizontal: currentSize.paddingHorizontal,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <View style={styles.row}>
            {icon && <View style={styles.iconWrapper}>{icon}</View>}
            <Text style={[styles.text, { fontSize: currentSize.fontSize }, textStyle]}>
              {title}
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
  },
  text: {
    color: COLORS.white,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: 8,
  },
  outlineButton: {
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
  },
  ghostText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default GradientButton;
