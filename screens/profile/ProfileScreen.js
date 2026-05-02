// ProfileScreen.js — User profile with Supabase-backed tickets and profile details

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import GradientButton from '../../components/GradientButton';
import TicketCard from '../../components/TicketCard';
import { SafarSetuIcon } from '../../components/SafarSetuLogo';
import { useAuth } from '../../context/AuthContext';
import { useTickets } from '../../context/TicketContext';
import { useUserPreferences } from '../../context/UserPreferencesContext';

const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuth();
  const { tickets } = useTickets();
  const { savedRoutes, notificationRoutes, notificationHistory } = useUserPreferences();

  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  const activeTickets = tickets.filter((t) => t.status === 'active');
  const totalSpent = tickets.reduce((s, t) => s + (t.fare || 0), 0);

  const handleSaveEdit = async () => {
    setSaving(true);
    const result = await updateUser({ name: editName, email: editEmail });
    setSaving(false);
    if (result.success) {
      setEditVisible(false);
    } else {
      Alert.alert('Update failed', result.error || 'Unable to update profile.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const MENU_ITEMS = [
    {
      icon: 'ticket-outline',
      label: 'My Tickets',
      count: tickets.length,
      onPress: () => navigation.navigate('PaymentHistory'),
    },
    {
      icon: 'heart-outline',
      label: 'Saved Routes',
      count: savedRoutes.length,
      onPress: () => navigation.navigate('SavedRoutes'),
    },
    {
      icon: 'card-outline',
      label: 'Add Money / Wallet',
      count: null,
      onPress: () => navigation.navigate('Payment'),
    },
    {
      icon: 'notifications-outline',
      label: 'Notifications',
      count: notificationHistory.length,
      onPress: () => navigation.navigate('NotificationInbox'),
    },
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
      count: null,
      onPress: () => navigation.navigate('HelpSupport'),
    },
    {
      icon: 'information-circle-outline',
      label: 'About SafarSetu',
      count: null,
      onPress: () => navigation.navigate('About'),
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={COLORS.gradientMixed}
          style={styles.profileHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.decor1} />
          <View style={styles.decor2} />

          <View style={styles.headerTopRow}>
            <Text style={styles.screenTitle}>My Profile</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditVisible(true)}>
              <Ionicons name="create-outline" size={18} color={COLORS.white} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[COLORS.secondary, COLORS.secondaryLight]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
            </LinearGradient>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={10} color={COLORS.white} />
            </View>
          </View>

          <Text style={styles.userName}>{user?.name || 'Traveller'}</Text>
          <Text style={styles.userMobile}>{user?.phone || ''}</Text>
          {user?.email ? <Text style={styles.userEmail}>{user.email}</Text> : null}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{tickets.length}</Text>
              <Text style={styles.statLabel}>Tickets</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{activeTickets.length}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>₹{totalSpent}</Text>
              <Text style={styles.statLabel}>Spent</Text>
            </View>
          </View>
        </LinearGradient>

        {activeTickets.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Tickets</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PaymentHistory')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            {activeTickets.slice(0, 2).map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </View>
        )}

        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.menuItem,
                i === MENU_ITEMS.length - 1 && styles.menuItemLast,
              ]}
              onPress={item.onPress}
            >
              <View style={styles.menuIconWrapper}>
                <Ionicons name={item.icon} size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <View style={styles.menuRight}>
                {item.count !== null && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{item.count}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={14} color={COLORS.textLight} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.appInfo}>
          <SafarSetuIcon size={36} />
          <Text style={styles.appVersion}>SafarSetu v1.0.0</Text>
          <Text style={styles.appTagline}>Smart Transport Tracking</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={16} color={COLORS.textLight} />
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your name"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={16} color={COLORS.textLight} />
                <TextInput
                  style={styles.input}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="your@email.com"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <GradientButton
              title="Save Changes"
              onPress={handleSaveEdit}
              loading={saving}
              size="lg"
              style={{ marginTop: SPACING.md }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: {},
  profileHeader: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  decor1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -60,
    right: -40,
  },
  decor2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0,0,0,0.08)',
    bottom: -40,
    left: -30,
  },
  headerTopRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  screenTitle: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: '700' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  editBtnText: { color: COLORS.white, fontWeight: '700' },
  avatarContainer: { position: 'relative', marginBottom: SPACING.md },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: FONTS.sizes.xl, fontWeight: '800' },
  verifiedBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    marginTop: SPACING.md,
  },
  userMobile: { color: COLORS.white, fontSize: FONTS.sizes.sm, marginTop: SPACING.xs },
  userEmail: { color: COLORS.white, fontSize: FONTS.sizes.xs, opacity: 0.85, marginTop: SPACING.xs },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: { color: 'rgba(255,255,255,0.75)', fontSize: FONTS.sizes.xs },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  section: { padding: SPACING.base },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONTS.sizes.base, fontWeight: '700', color: COLORS.text },
  seeAll: { color: COLORS.primary, fontWeight: '700' },
  menuSection: { marginTop: SPACING.base },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  menuItemLast: { marginBottom: 0 },
  menuIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: { flex: 1, marginLeft: SPACING.md, fontSize: FONTS.sizes.sm, color: COLORS.text },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: {
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.full,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  countText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  appInfo: { alignItems: 'center', marginTop: SPACING.xl },
  appVersion: { color: COLORS.text, fontWeight: '700', marginTop: SPACING.sm },
  appTagline: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginTop: SPACING.xs },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: SPACING.base,
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  logoutText: { color: COLORS.error, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  editModal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: SPACING.xl,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  inputGroup: { marginBottom: SPACING.md },
  inputLabel: { color: COLORS.text, marginBottom: SPACING.xs },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    marginLeft: SPACING.sm,
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
    height: '100%',
  },
});

export default ProfileScreen;
