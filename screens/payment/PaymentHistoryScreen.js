// PaymentHistoryScreen.js — All past transactions and tickets

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// QR Code with safe fallback
let QRCode = null;
try { QRCode = require('react-native-qrcode-svg').default; } catch (e) {}
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import TicketCard from '../../components/TicketCard';
import { useTickets } from '../../context/TicketContext';

const FILTER_TABS = ['All', 'Active', 'Used', 'Expired'];

const PaymentHistoryScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { tickets } = useTickets();
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedTicket, setSelectedTicket] = useState(null);

  const filtered =
    activeFilter === 'All'
      ? tickets
      : tickets.filter((t) => t.status === activeFilter.toLowerCase());

  const totalSpent = tickets.reduce((s, t) => s + (t.fare || 0), 0);
  const activeCount = tickets.filter((t) => t.status === 'active').length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
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
          <Text style={styles.headerTitle}>Payment History</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{tickets.length}</Text>
            <Text style={styles.statLabel}>Total Tickets</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{totalSpent}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
            onPress={() => setActiveFilter(tab)}
          >
            <Text style={[styles.filterTabText, activeFilter === tab && styles.filterTabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Ticket list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setSelectedTicket(item)} activeOpacity={0.85}>
            <TicketCard ticket={item} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎫</Text>
            <Text style={styles.emptyTitle}>No {activeFilter !== 'All' ? activeFilter : ''} Tickets</Text>
            <Text style={styles.emptyText}>
              {activeFilter === 'All'
                ? 'Buy your first ticket to see it here'
                : `No ${activeFilter.toLowerCase()} tickets found`}
            </Text>
          </View>
        }
      />

      {/* Ticket detail modal with QR */}
      <Modal
        visible={!!selectedTicket}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTicket(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.ticketModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ticket Details</Text>
              <TouchableOpacity onPress={() => setSelectedTicket(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedTicket && (
              <>
                <TicketCard ticket={selectedTicket} compact />
                {selectedTicket.payment && (
                  <View style={styles.paymentDetailSection}>
                    <Text style={styles.paymentDetailTitle}>Payment Details</Text>
                    <View style={styles.paymentDetailRow}>
                      <Text style={styles.detailLabel}>Amount</Text>
                      <Text style={styles.detailValue}>₹{selectedTicket.payment.amount}</Text>
                    </View>
                    <View style={styles.paymentDetailRow}>
                      <Text style={styles.detailLabel}>Currency</Text>
                      <Text style={styles.detailValue}>{selectedTicket.payment.currency}</Text>
                    </View>
                    <View style={styles.paymentDetailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={styles.detailValue}>{selectedTicket.payment.status?.toUpperCase()}</Text>
                    </View>
                    <View style={styles.paymentDetailRow}>
                      <Text style={styles.detailLabel}>Order ID</Text>
                      <Text style={styles.detailValue}>{selectedTicket.payment.razorpay_order_id}</Text>
                    </View>
                    <View style={styles.paymentDetailRow}>
                      <Text style={styles.detailLabel}>Payment ID</Text>
                      <Text style={styles.detailValue}>{selectedTicket.payment.razorpay_payment_id}</Text>
                    </View>
                    {selectedTicket.payment.createdAt && (
                      <View style={styles.paymentDetailRow}>
                        <Text style={styles.detailLabel}>Paid On</Text>
                        <Text style={styles.detailValue}>{new Date(selectedTicket.payment.createdAt).toLocaleString()}</Text>
                      </View>
                    )}
                  </View>
                )}
                {selectedTicket.qrData && (
                  <View style={styles.qrSection}>
                    <Text style={styles.qrTitle}>Boarding QR Code</Text>
                    <View style={styles.qrBox}>
                      {QRCode ? (
                        <QRCode
                          value={selectedTicket.qrData}
                          size={180}
                          color={COLORS.primary}
                          backgroundColor={COLORS.white}
                        />
                      ) : (
                        <View style={styles.qrFallback}>
                          <Text style={{ fontSize: 50 }}>🎫</Text>
                          <Text style={{ fontSize: 10, color: COLORS.primary, fontWeight: '700', textAlign: 'center', marginTop: 8 }}>
                            {selectedTicket.id}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.qrId}>Ticket ID: {selectedTicket.id}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: { color: 'rgba(255,255,255,0.75)', fontSize: FONTS.sizes.xs },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.3)' },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  filterTabActive: { backgroundColor: COLORS.primary },
  filterTabText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterTabTextActive: { color: COLORS.white },
  list: { padding: SPACING.base, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  ticketModal: {
    backgroundColor: COLORS.background,
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
  qrSection: { alignItems: 'center', marginTop: SPACING.md },
  qrTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  qrBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  paymentDetailSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  paymentDetailTitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: SPACING.sm,
  },
  qrFallback: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  qrId: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    fontFamily: 'System',
    letterSpacing: 0.5,
  },
});

export default PaymentHistoryScreen;
