// RouteCard.js — Beautiful route card for the routes list

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '../constants/theme';
import { getRouteVehicles } from '../services/supabaseService';
import { getDistance, formatDistance, calculateETA, formatETA } from '../utils/locationUtils';
import { useUserPreferences } from '../context/UserPreferencesContext';

const RouteIcon = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Curved dashed connecting line */}
    <Path d="M5 19 Q12 22 16 16" stroke={color} strokeWidth="1.5" strokeDasharray="2.5,2.5" strokeLinecap="round" fill="none" />
    {/* Small start dot */}
    <Circle cx="4.5" cy="19" r="2" fill={color} />
    {/* Large destination pin */}
    <Path d="M 16 4 A 4.5 4.5 0 0 0 11.5 8.5 C 11.5 11.5, 16 16.5, 16 16.5 C 16 16.5, 20.5 11.5, 20.5 8.5 A 4.5 4.5 0 0 0 16 4 Z" fill={color} />
    <Circle cx="16" cy="8.5" r="1.5" fill="#fff" />
  </Svg>
);

const RouteCard = ({ route, onPress, onMapPress, matchedStop }) => {
  const { toggleSaveRoute, toggleNotifyRoute, isRouteSaved, isRouteNotified } = useUserPreferences();
  const [nearestBusDist, setNearestBusDist] = useState(null);
  const [nearestBusETA, setNearestBusETA] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  const isSaved = isRouteSaved(route.id);
  const isNotified = isRouteNotified(route.id);

  useEffect(() => {
    if (matchedStop) {
      setIsLocating(true);
      getRouteVehicles(route.id).then(({ vehicles }) => {
        if (vehicles && vehicles.length > 0) {
          let closestDist = Infinity;
          let closestETA = null;
          vehicles.forEach(v => {
            if (v.location?.latitude && v.location?.longitude) {
              const etaData = calculateETA(v.location.latitude, v.location.longitude, matchedStop.latitude, matchedStop.longitude, v.speed || 25);
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
    } else {
      setNearestBusDist(null);
    }
  }, [matchedStop, route.id]);
  const occupancyColor =
    route.vehicles?.length > 0
      ? COLORS.success
      : COLORS.error;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Route number badge */}
      <View style={[styles.badge, { backgroundColor: route.color || COLORS.primary }]}>
        <Text style={styles.badgeText}>{route.number}</Text>
      </View>

      <View style={styles.content}>
        {/* Route name */}
        <Text style={styles.routeName}>{route.name}</Text>

        {/* Source → Destination */}
        <View style={styles.pathRow}>
          <View style={styles.dotGreen} />
          <Text style={styles.stopText} numberOfLines={1}>{route.source}</Text>
        </View>
        <View style={styles.verticalLine} />
        <View style={styles.pathRow}>
          <View style={styles.dotOrange} />
          <Text style={styles.stopText} numberOfLines={1}>{route.destination}</Text>
        </View>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{route.duration}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="navigate-outline" size={13} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{route.distance}</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="bus" size={13} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{route.vehicles?.length || 0} vehicles</Text>
          </View>
        </View>

        {/* Dynamic CTA for matched Stop */}
        {matchedStop && (
          <View style={styles.stopMatchBanner}>
            <View style={styles.stopMatchIcon}>
              <Ionicons name="bus-outline" size={14} color={COLORS.white} />
            </View>
            <View style={styles.stopMatchContent}>
              <Text style={styles.stopMatchText} numberOfLines={1}>
                Searching <Text style={{fontWeight: '700'}}>{matchedStop.name}</Text>
              </Text>
              {isLocating ? (
                <Text style={styles.stopMatchSub}>Locating nearest bus...</Text>
              ) : nearestBusDist !== null ? (
                <Text style={styles.stopMatchSubHighlight}>Arrives in {formatETA(nearestBusETA)} ({formatDistance(nearestBusDist)})</Text>
              ) : (
                <Text style={styles.stopMatchSub}>No active buses nearby</Text>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity 
            style={styles.actionIconBtn} 
            onPress={(e) => { e.stopPropagation(); toggleSaveRoute(route.id); }}
          >
            <Ionicons name={isSaved ? "heart" : "heart-outline"} size={20} color={isSaved ? COLORS.error : COLORS.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionIconBtn} 
            onPress={(e) => { e.stopPropagation(); toggleNotifyRoute(route.id); }}
          >
            <Ionicons name={isNotified ? "notifications" : "notifications-outline"} size={20} color={isNotified ? COLORS.secondary : COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {onMapPress && (
          <TouchableOpacity 
            style={styles.mapIconBtn} 
            onPress={(e) => { e.stopPropagation(); onMapPress(); }}
            activeOpacity={0.7}
          >
            <RouteIcon size={18} color={COLORS.primary} />
          </TouchableOpacity>
        )}
        <View style={styles.arrow}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.base,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.base,
    ...SHADOWS.md,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    flexShrink: 0,
  },
  badgeText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  routeName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  pathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 8,
  },
  dotOrange: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
    marginRight: 8,
  },
  verticalLine: {
    width: 1,
    height: 8,
    backgroundColor: COLORS.border,
    marginLeft: 3.5,
    marginVertical: 1,
  },
  stopText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },

  cardActions: {
    alignItems: 'center',
    marginLeft: SPACING.sm,
    gap: 8,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    marginLeft: 12,
  },
  stopMatchBanner: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.md,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  stopMatchIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stopMatchContent: {
    flex: 1,
  },
  stopMatchText: {
    fontSize: FONTS.sizes.xs,
    color: '#3730A3',
  },
  stopMatchSub: {
    fontSize: 10,
    color: '#6366F1',
    marginTop: 1,
  },
  stopMatchSubHighlight: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: '700',
    marginTop: 1,
  },
});

export default RouteCard;
