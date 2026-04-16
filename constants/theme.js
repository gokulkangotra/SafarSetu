// SafarSetu Design System — theme.js

export const COLORS = {
  primary: '#1E3A8A',       // Deep Blue
  primaryLight: '#2563EB',
  primaryDark: '#1e2f6b',
  secondary: '#F97316',     // Saffron Orange
  secondaryLight: '#FB923C',
  accent: '#38BDF8',        // Light Sky Blue
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.5)',

  // Gradient pairs
  gradientPrimary: ['#1E3A8A', '#2563EB'],
  gradientSecondary: ['#F97316', '#FB923C'],
  gradientMixed: ['#1E3A8A', '#F97316'],
  gradientAccent: ['#38BDF8', '#2563EB'],
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 36,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  full: 999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
};
