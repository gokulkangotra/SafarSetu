import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

const HelpSupportScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const handleCall = () => Linking.openURL('tel:6006273269');
  const handleEmail = () => Linking.openURL('mailto:2022a1r006@mietjammu.in');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={COLORS.gradientPrimary} style={styles.header} start={{x:0, y:0}} end={{x:1, y:0}}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.card}>
          <Image source={require('../../assets/images/shivam.jpg')} style={styles.profileImage} />
          
          <Text style={styles.name}>Shivam Pandoh</Text>
          <Text style={styles.role}>SafarSetu App Expert</Text>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.contactRow} onPress={handleCall} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: COLORS.success + '15' }]}>
              <Ionicons name="call" size={20} color={COLORS.success} />
            </View>
            <View style={styles.contactTextContainer}>
              <Text style={styles.contactLabel}>Phone Number</Text>
              <Text style={styles.contactValue}>+91 6006273269</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.contactRow, { marginTop: SPACING.md }]} onPress={handleEmail} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: COLORS.primary + '15' }]}>
              <Ionicons name="mail" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.contactTextContainer}>
              <Text style={styles.contactLabel}>Email Address</Text>
              <Text style={styles.contactValue}>2022a1r006@mietjammu.in</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          Our expert is available Monday to Saturday (9:00 AM - 6:00 PM). Feel free to reach out for any app-related issues or feedback.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.base,
  },
  headerTitle: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: '700' },
  content: { padding: SPACING.base, alignItems: 'center' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    ...SHADOWS.md,
    marginTop: SPACING.md,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: SPACING.md,
    borderWidth: 3,
    borderColor: COLORS.primary + '30',
  },
  name: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  role: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '600' },
  divider: { width: '100%', height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.lg },
  contactRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  contactTextContainer: { flex: 1 },
  contactLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginBottom: 2 },
  contactValue: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  footerText: {
    marginTop: SPACING.xl,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.base,
    lineHeight: 20,
  }
});

export default HelpSupportScreen;
