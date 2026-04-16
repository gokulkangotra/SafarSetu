// LoginScreen.js — Email/password and Google login for Supabase

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import GradientButton from '../../components/GradientButton';
import { SafarSetuIcon } from '../../components/SafarSetuLogo';
import { useAuth } from '../../context/AuthContext';

const LoginScreen = ({ navigation }) => {
  const { sendOtp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const validateEmail = (value) => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value.trim());

  const handleSubmit = async () => {
    setError('');
    setMessage('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      shake();
      return;
    }

    setLoading(true);
    const result = await sendOtp(email.trim());
    setLoading(false);

    if (!result.success) {
      const errorMsg = result.error || 'Unable to send code. Please try again.';
      console.log('OTP send error:', errorMsg);

      if (errorMsg.includes('504') || errorMsg.includes('timeout') || errorMsg.includes('Gateway')) {
        setError('Server timeout reaching your SMTP. Please verify port 587 instead of 585 in Supabase.');
      } else {
        setError(errorMsg);
      }

      shake();
      return;
    }

    navigation.navigate('OTP', { email: email.trim(), name: mode === 'signup' ? name.trim() : null });
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);

    if (!result.success) {
      const errorMsg = result.error || 'Unable to sign in with Google.';
      console.log('Google auth error:', errorMsg);

      if (errorMsg.includes('504') || errorMsg.includes('timeout') || errorMsg.includes('Gateway')) {
        setError('Server timeout during Google sign-in. Please try again or check your Supabase configuration.');
      } else {
        setError(errorMsg);
      }

      shake();
      return;
    }

    setMessage('Google sign-in launched. Follow the provider flow.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={COLORS.gradientPrimary}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.circleDecor1} />
          <View style={styles.circleDecor2} />
          <SafarSetuIcon size={64} />
          <Text style={styles.headerTitle}>SafarSetu</Text>
          <Text style={styles.headerSubtitle}>
            {mode === 'signin' ? 'Sign in with email or Google' : 'Create an account with email'}
          </Text>
        </LinearGradient>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{mode === 'signin' ? 'Welcome Back' : 'Create Account'}</Text>
          <Text style={styles.formSubtitle}>
            {mode === 'signin'
              ? 'Enter your email to receive a secure login code.'
              : 'Enter your email to get started.'}
          </Text>

          {mode === 'signup' && (
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={COLORS.textLight}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color={COLORS.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={COLORS.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>


          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {message ? (
            <View style={styles.messageRow}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.messageText}>{message}</Text>
            </View>
          ) : null}

          <GradientButton
            title={mode === 'signin' ? 'Get Login Code' : 'Sign Up'}
            onPress={handleSubmit}
            loading={loading}
            disabled={!email}
            size="lg"
            style={styles.primaryBtn}
          />

          <View style={styles.separator}>
            <View style={styles.sepLine} />
            <Text style={styles.sepText}>or</Text>
            <View style={styles.sepLine} />
          </View>

          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn}>
            <Ionicons name="logo-google" size={20} color={COLORS.white} />
            <Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleMode}
            onPress={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
              setMessage('');
            }}
          >
            <Text style={styles.toggleText}>
              {mode === 'signin'
                ? "Don't have an account? Create one"
                : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1 },
  header: {
    paddingTop: 60,
    paddingBottom: 50,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  circleDecor1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -60,
    right: -40,
  },
  circleDecor2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(249,115,22,0.18)',
    bottom: -50,
    left: -30,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xxl,
    fontWeight: '800',
    marginTop: 12,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FONTS.sizes.sm,
    marginTop: 4,
    textAlign: 'center',
  },
  formCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24,
    padding: SPACING.xl,
    paddingTop: SPACING.xxl,
    ...SHADOWS.md,
  },
  formTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  formSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 52,
    marginBottom: SPACING.sm,
  },
  inputIcon: { marginRight: SPACING.sm },
  input: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    height: '100%',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: SPACING.sm,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    flex: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: SPACING.sm,
  },
  messageText: {
    color: COLORS.success,
    fontSize: FONTS.sizes.sm,
    flex: 1,
  },
  primaryBtn: { marginTop: SPACING.lg },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  sepLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  sepText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    borderRadius: RADIUS.lg,
    height: 52,
    gap: SPACING.sm,
  },
  googleText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  toggleMode: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  toggleText: {
    color: COLORS.secondary,
    fontSize: FONTS.sizes.sm,
    textDecorationLine: 'underline',
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 18,
  },
});

export default LoginScreen;
