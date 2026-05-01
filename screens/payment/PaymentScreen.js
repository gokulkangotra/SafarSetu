// PaymentScreen.js — Buy tickets and passes with Supabase bookings

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
let QRCode = null;
try { QRCode = require('react-native-qrcode-svg').default; } catch (e) {}
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import GradientButton from '../../components/GradientButton';
import TicketCard from '../../components/TicketCard';
import { getRoutes, getRouteTrips } from '../../services/supabaseService';
import { useTickets } from '../../context/TicketContext';
import { useAuth } from '../../context/AuthContext';

const TICKET_TYPES = [
  {
    id: 'TKT_SINGLE',
    name: 'Single Journey',
    description: 'One way trip for any route',
    price: null,
    icon: 'ticket',
    validity: '3 hours',
  },
  {
    id: 'PASS_DAILY',
    name: 'Day Pass',
    description: 'Unlimited travel for 1 day',
    price: 100,
    icon: 'calendar',
    validity: '24 hours',
  },
  {
    id: 'PASS_MONTHLY',
    name: 'Monthly Pass',
    description: 'Unlimited travel for 30 days',
    price: 1200,
    icon: 'card',
    validity: '30 days',
  },
  {
    id: 'PASS_WEEKLY',
    name: 'Weekly Pass',
    description: 'Unlimited travel for 7 days',
    price: 350,
    icon: 'calendar-outline',
    validity: '7 days',
  },
];

const PaymentScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const preselectedRoute = route?.params?.route;
  const customTicket = route?.params?.customTicket;
  const { addTicket } = useTickets();
  const { user } = useAuth();

  const [routes, setRoutes] = useState([]);
  const [selectedType, setSelectedType] = useState(TICKET_TYPES[0]);
  const [selectedRoute, setSelectedRoute] = useState(preselectedRoute || null);
  const [loading, setLoading] = useState(false);
  const [successTicket, setSuccessTicket] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!selectedRoute) {
      fetchRoutes();
    }
  }, []);

  const fetchRoutes = async () => {
    const { routes: fetchedRoutes, error } = await getRoutes();
    if (!error) {
      setRoutes(fetchedRoutes);
    } else {
      console.log('Routes load error:', error);
    }
  };

  const getPrice = () => {
    if (customTicket) return customTicket.fare;
    if (selectedType.id === 'TKT_SINGLE') {
      return selectedRoute ? selectedRoute.fare?.normal || 0 : 0;
    }
    return selectedType.price || 0;
  };

  const getFrom = () => customTicket ? customTicket.from : (selectedRoute ? selectedRoute.source : 'Any');
  const getTo = () => customTicket ? customTicket.to : (selectedRoute ? selectedRoute.destination : 'Any');

  const handlePay = async () => {
    if (selectedType.id === 'TKT_SINGLE' && !selectedRoute) {
      Alert.alert('Select Route', 'Please select a route for single journey ticket');
      return;
    }

    setLoading(true);

    let tripId = null;
    if (selectedRoute) {
      const result = await getRouteTrips(selectedRoute.id);
      if (!result.error && Array.isArray(result.trips) && result.trips.length > 0) {
        tripId = result.trips[0].id;
      }
    }

    if (!tripId && selectedType.id === 'TKT_SINGLE') {
      setLoading(false);
      Alert.alert('No Trip Available', 'Unable to find an active trip for this route at the moment.');
      return;
    }

    await new Promise((r) => setTimeout(r, 2000));

    const ticketId = `TID-${Date.now()}`;
    const now = new Date();
    const ticket = {
      id: ticketId,
      type: customTicket ? 'Mobile Ticket' : selectedType.name,
      route: customTicket ? customTicket.route.number : (selectedRoute ? selectedRoute.number : 'ALL'),
      from: getFrom(),
      to: getTo(),
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
      fare: getPrice(),
      status: 'active',
      qrData: `SAFARSETU|${ticketId}|${customTicket ? customTicket.route.number : (selectedRoute?.number || 'ALL')}|${getPrice()}|${now.toISOString()}`,
    };

    const paymentData = {
      amount: getPrice(),
      currency: 'INR',
      status: 'success',
      razorpay_order_id: `demo_order_${ticketId}`,
      razorpay_payment_id: `demo_payment_${ticketId}`,
    };

    const result = await addTicket({ ticket, tripId, payment: paymentData });
    setLoading(false);

    if (!result.success) {
      Alert.alert('Payment error', result.error || 'Unable to save ticket');
      return;
    }

    setSuccessTicket(result.ticket);
    setShowSuccess(true);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <LinearGradient
        colors={COLORS.gradientPrimary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buy Ticket / Pass</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PaymentHistory')}>
            <Ionicons name="receipt-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!customTicket && (
          <>
            <Text style={styles.sectionTitle}>Choose Ticket Type</Text>
            <View style={styles.ticketTypeGrid}>
          {TICKET_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeCard,
                selectedType.id === type.id && styles.typeCardActive,
              ]}
              onPress={() => setSelectedType(type)}
            >
              {selectedType.id === type.id && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark" size={10} color={COLORS.white} />
                </View>
              )}
              <Ionicons
                name={type.icon}
                size={28}
                color={selectedType.id === type.id ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.typeName, selectedType.id === type.id && styles.typeNameActive]}>
                {type.name}
              </Text>
              <Text style={styles.typeDesc}>{type.description}</Text>
              {type.price ? (
                <Text style={styles.typePrice}>₹{type.price}</Text>
              ) : (
                <Text style={styles.typePrice}>By route</Text>
              )}
              <Text style={styles.typeValidity}>{type.validity}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedType.id === 'TKT_SINGLE' && (
          <>
            <Text style={styles.sectionTitle}>Select Route</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routeScroll}>
              {routes.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.routeChip,
                    selectedRoute?.id === r.id && styles.routeChipActive,
                  ]}
                  onPress={() => setSelectedRoute(r)}
                >
                  <View style={[styles.routeChipBadge, { backgroundColor: r.color }]}> 
                    <Text style={styles.routeChipNumber}>{r.number}</Text>
                  </View>
                  <View>
                    <Text style={[styles.routeChipName, selectedRoute?.id === r.id && styles.routeChipNameActive]}>
                      {r.name}
                    </Text>
                    <Text style={styles.routeChipFare}>₹{r.fare.normal}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
        </>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ticket Type</Text>
            <Text style={styles.summaryValue}>{customTicket ? 'Mobile Ticket' : selectedType.name}</Text>
          </View>
          {(selectedRoute || customTicket) && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Route</Text>
              <Text style={styles.summaryValue}>{customTicket ? customTicket.route.number : selectedRoute.number}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Validity</Text>
            <Text style={styles.summaryValue}>{customTicket ? '3 hours' : selectedType.validity}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>₹{getPrice() || '—'}</Text>
          </View>

          <View style={styles.paymentProviderBadge}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
            <Text style={styles.paymentProviderText}>Secured by Razorpay (Demo Mode)</Text>
          </View>
        </View>

        <GradientButton
          title={`Pay ₹${getPrice() || '—'}`}
          onPress={handlePay}
          loading={loading}
          disabled={!getPrice()}
          size="lg"
          variant="secondary"
          style={styles.payBtn}
        />

        <TouchableOpacity
          style={styles.historyLink}
          onPress={() => navigation.navigate('PaymentHistory')}
        >
          <Ionicons name="receipt-outline" size={16} color={COLORS.primary} />
          <Text style={styles.historyLinkText}>View Payment History</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <LinearGradient
              colors={[COLORS.success, '#16a34a']}
              style={styles.successIcon}
            >
              <Ionicons name="checkmark" size={36} color={COLORS.white} />
            </LinearGradient>
            <Text style={styles.successTitle}>Payment Successful! 🎉</Text>
            <Text style={styles.successSubtitle}>Your ticket is ready</Text>

            {successTicket && (
              <View style={styles.qrContainer}>
                {QRCode ? (
                  <QRCode
                    value={successTicket.qrData}
                    size={160}
                    color={COLORS.primary}
                    backgroundColor={COLORS.white}
                  />
                ) : (
                  <View style={styles.qrFallback}>
                    <Text style={styles.qrFallbackIcon}>🎫</Text>
                    <Text style={styles.qrFallbackId}>{successTicket.id}</Text>
                  </View>
                )}
                <Text style={styles.qrLabel}>Scan at boarding</Text>
              </View>
            )}

            {successTicket && (
              <View style={styles.ticketPreview}>
                <TicketCard ticket={successTicket} compact />
              </View>
            )}

            <View style={styles.successActions}>
              <GradientButton
                title="My Tickets"
                onPress={() => {
                  setShowSuccess(false);
                  navigation.navigate('Profile');
                }}
                style={{ flex: 1 }}
              />
              <GradientButton
                title="Done"
                variant="outline"
                onPress={() => setShowSuccess(false)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.md },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.base, paddingBottom: 100 },
  sectionTitle: {
    fontSize: FONTS.sizes.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginTop: SPACING.base,
  },
  ticketTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  typeCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
    ...SHADOWS.sm,
  },
  typeCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  checkmark: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  typeNameActive: { color: COLORS.primary },
  typeDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginBottom: 8 },
  typePrice: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.primary },
  typeValidity: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  routeScroll: { marginBottom: SPACING.md },
  routeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginRight: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  routeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  routeChipBadge: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeChipNumber: { color: COLORS.white, fontWeight: '800', fontSize: FONTS.sizes.xs },
  routeChipName: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  routeChipNameActive: { color: COLORS.primary },
  routeChipFare: { fontSize: FONTS.sizes.xs, color: COLORS.secondary, fontWeight: '700' },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    ...SHADOWS.md,
  },
  summaryTitle: {
    fontSize: FONTS.sizes.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  summaryValue: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
  },
  totalLabel: { fontSize: FONTS.sizes.base, fontWeight: '700', color: COLORS.text },
  totalAmount: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    color: COLORS.primary,
  },
  paymentProviderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.md,
    justifyContent: 'center',
  },
  paymentProviderText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.success,
    fontWeight: '600',
  },
  payBtn: { marginBottom: SPACING.md },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
  },
  historyLinkText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  successModal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: SPACING.xl,
    paddingBottom: 40,
    alignItems: 'center',
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  successTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  qrFallback: {
    width: 160,
    height: 160,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrFallbackIcon: { fontSize: 44 },
  qrFallbackId: {
    marginTop: SPACING.sm,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  qrLabel: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
  },
  ticketPreview: { width: '100%', marginTop: SPACING.md },
  successActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
});

export default PaymentScreen;
