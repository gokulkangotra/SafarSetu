import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '../constants/theme';
import { getRouteVehicles } from '../services/supabaseService';
import { getDistance, formatDistance, calculateETA, formatETA } from '../utils/locationUtils';
import { useNavigation } from '@react-navigation/native';

const NearestStopWidget = ({ globalNearestStop, route }) => {
  const navigation = useNavigation();
  const [nearestBusDist, setNearestBusDist] = useState(null);
  const [nearestBusETA, setNearestBusETA] = useState(null);
  const [isLocating, setIsLocating] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (globalNearestStop && route) {
      setIsLocating(true);
      getRouteVehicles(route.id).then(({ vehicles }) => {
        if (vehicles && vehicles.length > 0) {
          let closestDist = Infinity;
          let closestETA = null;
          vehicles.forEach(v => {
            if (v.location?.latitude && v.location?.longitude) {
              const etaData = calculateETA(
                v.location.latitude,
                v.location.longitude,
                globalNearestStop.latitude,
                globalNearestStop.longitude,
                v.speed || 25
              );
              if (etaData && etaData.distanceKm < closestDist) {
                closestDist = etaData.distanceKm;
                closestETA = etaData.durationMins;
              }
            }
          });
          if (closestDist !== Infinity) {
             setNearestBusDist(closestDist);
             setNearestBusETA(closestETA);
          }
        }
        setIsLocating(false);
      });
    }
  }, [globalNearestStop, route]);

  if (!globalNearestStop || !route) return null;

  return (
    <View style={styles.widgetCard}>
      <TouchableOpacity 
        style={styles.headerRow} 
        activeOpacity={0.8} 
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.iconBox}>
          <Ionicons name="location" size={20} color={COLORS.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.titleText}>Your nearest bus stop is</Text>
          <Text style={styles.stopName} numberOfLines={1}>{globalNearestStop.name}</Text>
        </View>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={24} 
          color={COLORS.textLight} 
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />
          
          <View style={styles.liveTrackingRow}>
            <MaterialCommunityIcons name="bus-marker" size={22} color={COLORS.secondary} />
            <View style={styles.liveTrackingInfo}>
              <Text style={styles.routeBadge}>Route {route.number}</Text>
              {isLocating ? (
                <Text style={styles.etaText}>Locating active vehicles...</Text>
              ) : nearestBusDist !== null ? (
                <Text style={styles.etaActive}>
                  Active bus arrives in {formatETA(nearestBusETA)} ({formatDistance(nearestBusDist)})
                </Text>
              ) : (
                <Text style={styles.etaAlert}>No active vehicles nearby right now</Text>
              )}
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Heading to</Text>
              <Text style={styles.metaValue} numberOfLines={1}>{route.destination}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Fare (Normal)</Text>
              <Text style={styles.metaValue}>₹{route.fare?.normal}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.viewRouteBtn}
            onPress={() => navigation.navigate('RouteDetail', { route })}
          >
            <Text style={styles.viewRouteText}>View Full Route</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  widgetCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.base,
    marginBottom: SPACING.lg,
    padding: SPACING.base,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  titleText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stopName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    color: COLORS.primary,
  },
  expandedContent: {
    marginTop: SPACING.sm,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  liveTrackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  liveTrackingInfo: {
    flex: 1,
  },
  routeBadge: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: '#92400E',
  },
  etaText: {
    fontSize: FONTS.sizes.xs,
    color: '#B45309',
    marginTop: 2,
  },
  etaActive: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.success,
    fontWeight: '700',
    marginTop: 2,
  },
  etaAlert: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.error,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: SPACING.md,
  },
  metaItem: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  metaLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  viewRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.md,
  },
  viewRouteText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: FONTS.sizes.sm,
  },
});

export default NearestStopWidget;
