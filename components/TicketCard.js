// TicketCard.js — Digital ticket / pass card UI

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const TicketCard = ({ ticket, compact = false }) => {
  const isUsed = ticket.status === 'used';
  const isExpired = ticket.status === 'expired';
  const isActive = ticket.status === 'active';

  const statusColors = {
    active: COLORS.success,
    used: COLORS.textSecondary,
    expired: COLORS.error,
  };

  const statusLabels = {
    active: 'ACTIVE',
    used: 'USED',
    expired: 'EXPIRED',
  };

  return (
    <View style={[styles.wrapper, compact && styles.wrapperCompact, (isUsed || isExpired) && styles.faded]}>
      <LinearGradient
        colors={isActive ? COLORS.gradientPrimary : ['#6B7280', '#9CA3AF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Top: App name + Ticket ID */}
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.appName}>SafarSetu</Text>
            <Text style={styles.ticketId}>#{ticket.id}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[ticket.status] || COLORS.textSecondary }]}>
            <Text style={styles.statusText}>{statusLabels[ticket.status] || ticket.status?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Route info */}
        <View style={styles.routeRow}>
          <View style={styles.routeEndpoint}>
            <Text style={styles.endpointLabel}>FROM</Text>
            <Text style={styles.endpointName} numberOfLines={1}>{ticket.from}</Text>
          </View>
          <View style={styles.routeArrow}>
            <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
          </View>
          <View style={[styles.routeEndpoint, { alignItems: 'flex-end' }]}>
            <Text style={styles.endpointLabel}>TO</Text>
            <Text style={styles.endpointName} numberOfLines={1}>{ticket.to}</Text>
          </View>
        </View>

        {/* Route badge */}
        <View style={styles.routeTag}>
          <Text style={styles.routeTagText}>{ticket.route === 'ALL' ? 'All Routes' : `Route ${ticket.route}`}</Text>
        </View>
      </LinearGradient>

      {/* Zigzag separator */}
      <View style={styles.separator}>
        <View style={styles.circleLeft} />
        <View style={styles.dashedLine} />
        <View style={styles.circleRight} />
      </View>

      {/* Footer: date, type, fare */}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Ionicons name="calendar-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.footerText}>{ticket.date}</Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.footerText}>{ticket.time}</Text>
        </View>
        <View style={styles.footerItem}>
          <Text style={styles.footerType}>{ticket.type}</Text>
        </View>
        <View style={styles.fareContainer}>
          <Text style={styles.fareAmount}>₹{ticket.fare}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    marginHorizontal: SPACING.base,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  wrapperCompact: {
    marginHorizontal: 0,
  },
  faded: {
    opacity: 0.7,
  },
  header: {
    padding: SPACING.base,
    paddingBottom: SPACING.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  appName: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: FONTS.sizes.base,
    letterSpacing: 0.5,
  },
  ticketId: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeEndpoint: {
    flex: 1,
  },
  endpointLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  endpointName: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  routeArrow: {
    paddingHorizontal: SPACING.md,
  },
  routeTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: SPACING.sm,
  },
  routeTagText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xs,
  },
  circleLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    marginLeft: -10,
  },
  circleRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    marginRight: -10,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.base,
    gap: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  footerType: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    fontWeight: '700',
  },
  fareContainer: {
    marginLeft: 'auto',
    backgroundColor: COLORS.primary + '12',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  fareAmount: {
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: '800',
  },
});

export default TicketCard;
