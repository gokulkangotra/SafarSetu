// OTPScreen.js — OTP verification using Supabase

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import GradientButton from '../../components/GradientButton';
import { useAuth } from '../../context/AuthContext';

const OTP_LENGTH = 6;
const RESEND_TIMER = 30;

const OTPScreen = ({ navigation, route }) => {
  const { email, name } = route.params || {};
  const { verifyOtp, sendOtp } = useAuth();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(RESEND_TIMER);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  const timerRef = useRef(null);

  const startTimer = () => {
    setCanResend(false);
    setTimer(RESEND_TIMER);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleOtpChange = (text, index) => {
    const cleaned = text.replace(/\D/g, '').slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = cleaned;
    setOtp(nextOtp);
    setError('');
    if (cleaned && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verify = async () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      setError('Please enter the complete OTP');
      shake();
      return;
    }

    setLoading(true);
    const result = await verifyOtp(email, code, name);
    setLoading(false);

    if (!result.success) {
      const message = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      console.error('Verify OTP error:', result.error);
      setError(message || 'OTP verification failed');
      shake();
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      return;
    }
  };

  const handleResend = async () => {
    setError('');
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    startTimer();
    const result = await sendOtp(email);
    if (!result.success) {
      setError(result.error || 'Unable to resend OTP.');
    }
  };

  const filledCount = otp.filter(Boolean).length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <LinearGradient
        colors={COLORS.gradientPrimary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.otpIconContainer}>
          <Text style={styles.otpIcon}>✉️</Text>
        </View>
        <Text style={styles.headerTitle}>Verify OTP</Text>
        <Text style={styles.headerSubtitle}>
          Sent to <Text style={styles.phoneHighlight}>{email}</Text>
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.instruction}>Enter the 6-digit code</Text>

        <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}> 
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[styles.otpInput, digit ? styles.otpInputFilled : null, error ? styles.otpInputError : null]}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              autoFocus={index === 0}
            />
          ))}
        </Animated.View>

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={14} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(filledCount / OTP_LENGTH) * 100}%` }]} />
        </View>

        <GradientButton
          title="Verify & Continue"
          onPress={verify}
          loading={loading}
          disabled={filledCount < OTP_LENGTH}
          size="lg"
          style={styles.verifyBtn}
        />

        <View style={styles.resendContainer}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendActiveText}>Resend OTP</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.resendTimerText}>
              Resend OTP in <Text style={styles.timerNum}>{timer}s</Text>
            </Text>
          )}
        </View>

        <View style={styles.demoHint}>
          <Text style={styles.demoHintText}>
            You will receive a one-time code in your email inbox. If it does not arrive, check your spam or try resending.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: 60,
    paddingBottom: 50,
    alignItems: 'center',
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  otpIcon: { fontSize: 36 },
  headerTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  phoneHighlight: { color: COLORS.secondary, fontWeight: '700' },
  content: {
    flex: 1,
    padding: SPACING.xl,
  },
  instruction: {
    fontSize: FONTS.sizes.base,
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    textAlign: 'center',
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  otpInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  otpInputError: {
    borderColor: COLORS.error,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
  },
  verifyBtn: { marginBottom: SPACING.md },
  resendContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  resendTimerText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  resendActiveText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  timerNum: { color: COLORS.secondary },
  demoHint: {
    paddingHorizontal: SPACING.sm,
    marginTop: SPACING.sm,
  },
  demoHintText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
  },
});

export default OTPScreen;
