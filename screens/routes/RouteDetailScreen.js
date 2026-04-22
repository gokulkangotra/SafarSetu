// RouteDetailScreen.js — Detailed route view with Supabase live vehicles

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import GradientButton from '../../components/GradientButton';
import { getRouteVehicles, subscribeToVehicleLocations } from '../../services/supabaseService';
import * as Location from 'expo-location';
import { calculateETA, formatETA, formatDistance } from '../../utils/locationUtils';

const TAB = { STOPS: 'stops', VEHICLES: 'vehicles', INFO: 'info' };

const RouteDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const routeData = route.params?.route;
  const [activeTab, setActiveTab] = useState(TAB.STOPS);
  const [routeVehicles, setRouteVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let subscription = null;
    if (routeData?.id) {
      loadRouteVehicles().then((vehicles) => {
        if (vehicles && vehicles.length > 0) {
          const vIds = vehicles.map(v => v.id);
          subscription = subscribeToVehicleLocations(vIds, (newLoc) => {
            setRouteVehicles(prev => prev.map(v => 
              v.id === newLoc.vehicle_id 
                ? { ...v, location: { latitude: Number(newLoc.latitude), longitude: Number(newLoc.longitude) }, speed: Number(newLoc.speed) }
                : v
            ));
          });
        }
      });
      const interval = setInterval(loadRouteVehicles, 20000); // Polling as fallback
      return () => {
        clearInterval(interval);
        if (subscription) subscription.unsubscribe();
      };
    }
  }, [routeData]);

  const loadRouteVehicles = async () => {
    if (!routeData?.id) return [];
    setIsLoading(true);
    const { vehicles, error } = await getRouteVehicles(routeData.id);
    if (!error) {
      setRouteVehicles(vehicles);
      setIsLoading(false);
      return vehicles;
    } else {
      console.log('Route vehicle load error:', error);
      setIsLoading(false);
      return [];
    }
  };

  if (!routeData) {
    return (
      <View style={styles.container}>
        <Text>Route not found</Text>
      </View>
    );
  }

  const renderStopEta = (stop) => {
    if (!routeVehicles || routeVehicles.length === 0) return null;
    
    const sortedStops = [...(routeData.stops || [])].sort((a,b) => (a.order || 0) - (b.order || 0));

    const approachingVehicles = routeVehicles.map(v => {
      if (!v.location?.latitude || !v.location?.longitude) return null;
      
      let closestStop = null;
      let minDistance = Infinity;
      
      sortedStops.forEach((s) => {
        const d = calculateETA(v.location.latitude, v.location.longitude, s.latitude, s.longitude, v.speed || 25).distanceKm;
        if (d < minDistance) {
            minDistance = d;
            closestStop = s;
        }
      });
      
      if (!closestStop) return null;
      
      if (stop.order < closestStop.order) {
        return null;
      }
      
      let totalDistance = minDistance;
      let totalMins = calculateETA(v.location.latitude, v.location.longitude, closestStop.latitude, closestStop.longitude, v.speed || 25).durationMins;
      
      for (let i = 0; i < sortedStops.length; i++) {
         const currentS = sortedStops[i];
         if (currentS.order > closestStop.order && currentS.order <= stop.order) {
             // Use fallback calculation if db fields are missing
             const distanceSegment = currentS.distanceFromPrevKm || 0;
             const timeSegment = currentS.avgTravelTimeMinutes || (distanceSegment > 0 ? (distanceSegment / (v.speed || 25)) * 60 : 0);
             totalDistance += distanceSegment;
             totalMins += timeSegment;
         }
      }
      
      return { ...v, distanceKm: totalDistance, durationMins: totalMins };
    }).filter(v => v !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 2);

    if (approachingVehicles.length === 0) return null;

    return (
      <View style={styles.stopEtaContainer}>
        {approachingVehicles.map(v => (
          <View key={v.id} style={styles.stopEtaRow}>
            <MaterialCommunityIcons name="bus-clock" size={14} color={COLORS.secondary} />
            <Text style={styles.stopEtaText}>
              <Text style={{fontWeight: '700'}}>Bus {v.number}</Text> • {formatETA(v.durationMins)} ({formatDistance(v.distanceKm)})
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const OccupancyBar = ({ value, total }) => {
    const pct = total > 0 ? (value / total) * 100 : 0;
    const color = pct > 80 ? COLORS.error : pct > 50 ? COLORS.warning : COLORS.success;
    return (
      <View style={styles.occBar}>
        <View style={[styles.occFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[routeData.color || COLORS.primary, COLORS.primary]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.decor1} />
        <View style={styles.decor2} />

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.headerMain}>
          <View style={styles.routeBadge}>
            <Text style={styles.routeNumber}>{routeData.number}</Text>
          </View>
          <Text style={styles.routeName}>{routeData.name}</Text>
          <View style={styles.routePath}>
            <Text style={styles.pathText}>{routeData.source}</Text>
            <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.pathText}>{routeData.destination}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {[
            { icon: 'time-outline', label: routeData.duration },
            { icon: 'navigate-outline', label: routeData.distance },
            { icon: 'refresh-outline', label: routeData.frequency },
          ].map((s, i) => (
            <View key={i} style={styles.statItem}>
              <Ionicons name={s.icon} size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.statText}>{s.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.mapBtn}
          onPress={() => navigation.navigate('RouteMap', { route: routeData })}
        >
          <Ionicons name="map" size={16} color={COLORS.primary} />
          <Text style={styles.mapBtnText}>Show on Map</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.tabs}>
        {[
          { key: TAB.STOPS, label: 'Stops', icon: 'location' },
          { key: TAB.VEHICLES, label: 'Live Vehicles', icon: 'bus' },
          { key: TAB.INFO, label: 'Fares', icon: 'card' },
        ].map(({ key, label, icon }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => setActiveTab(key)}
          >
            <Ionicons
              name={icon}
              size={15}
              color={activeTab === key ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === TAB.STOPS && (
          <View>
            <Text style={styles.sectionTitle}>{routeData.stops?.length || 0} Stops</Text>
            {(routeData.stops || []).map((stop, index) => (
              <View key={stop.id || `${index}`} style={styles.stopRow}>
                <View style={styles.timeline}>
                  <View
                    style={[
                      styles.stopDot,
                      index === 0 && styles.stopDotFirst,
                      index === (routeData.stops?.length || 0) - 1 && styles.stopDotLast,
                    ]}
                  />
                  {index < (routeData.stops?.length || 0) - 1 && <View style={styles.stopLine} />}
                </View>
                <View style={styles.stopCard}>
                  <View style={styles.stopInfo}>
                    <Text style={styles.stopName}>{stop.name}</Text>
                    <Text style={styles.stopMeta}>{stop.order ? `Stop ${stop.order}` : ''}</Text>
                  </View>
                  {renderStopEta(stop)}
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === TAB.VEHICLES && (
          <View>
            <Text style={styles.sectionTitle}>
              {routeVehicles.length} Active Vehicle{routeVehicles.length !== 1 ? 's' : ''}
            </Text>
            {routeVehicles.length === 0 && !isLoading ? (
              <View style={styles.emptyTab}>
                <Text style={styles.emptyTabIcon}>🚌</Text>
                <Text style={styles.emptyTabText}>No vehicles currently active</Text>
              </View>
            ) : null}
            {routeVehicles.map((vehicle) => (
              <View key={vehicle.id} style={styles.busCard}>
                <View style={styles.busHeader}>
                  <View style={styles.busNumberBadge}>
                    <MaterialCommunityIcons name="bus" size={14} color={COLORS.white} />
                    <Text style={styles.busNumberText}>{vehicle.number}</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
                  <Text style={styles.statusLabel}>{vehicle.status || 'Live'}</Text>
                </View>
                <View style={styles.busInfo}>
                  <View style={styles.busInfoItem}>
                    <Text style={styles.busInfoLabel}>Vehicle</Text>
                    <Text style={styles.busInfoValue}>{vehicle.vehicleType}</Text>
                  </View>
                  <View style={styles.busInfoItem}>
                    <Text style={styles.busInfoLabel}>Speed</Text>
                    <Text style={styles.busInfoValue}>{vehicle.speed} km/h</Text>
                  </View>
                  <View style={styles.busInfoItem}>
                    <Text style={styles.busInfoLabel}>Capacity</Text>
                    <Text style={styles.busInfoValue}>{vehicle.capacity}</Text>
                  </View>
                </View>
                <View style={styles.occupancyRow}>
                  <Text style={styles.occLabel}>Vehicle ID: {vehicle.id}</Text>
                  <Text style={styles.occPct}>{vehicle.eta}</Text>
                </View>
                <OccupancyBar value={vehicle.capacity ? (vehicle.capacity * 0.65) : 0} total={vehicle.capacity || 1} />
              </View>
            ))}
          </View>
        )}

        {activeTab === TAB.INFO && (
          <View>
            <Text style={styles.sectionTitle}>Fare Information</Text>
            <View style={styles.fareCard}>
              <View style={styles.fareRow}>
                <View>
                  <Text style={styles.fareLabel}>Single Journey</Text>
                  <Text style={styles.fareDesc}>One way, valid 3 hours</Text>
                </View>
                <Text style={styles.farePrice}>₹{routeData.fare.normal}</Text>
              </View>
              <View style={styles.fareDivider} />
              <View style={styles.fareRow}>
                <View>
                  <Text style={styles.fareLabel}>Monthly Pass</Text>
                  <Text style={styles.fareDesc}>Unlimited travel, 30 days</Text>
                </View>
                <Text style={styles.farePrice}>₹{routeData.fare.pass}</Text>
              </View>
            </View>

            <GradientButton
              title="Buy Ticket Now"
              onPress={() => navigation.navigate('Payment', { route: routeData })}
              size="lg"
              style={styles.buyBtn}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  decor1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -60,
    right: -40,
  },
  decor2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(249,115,22,0.15)',
    bottom: -40,
    left: -20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerMain: { marginBottom: SPACING.md },
  routeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  routeNumber: { color: COLORS.white, fontWeight: '800', fontSize: FONTS.sizes.sm },
  routeName: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    marginBottom: 4,
  },
  routePath: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pathText: { color: 'rgba(255,255,255,0.8)', fontSize: FONTS.sizes.sm },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.base,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: 'rgba(255,255,255,0.9)', fontSize: FONTS.sizes.xs },
  mapBtn: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
    ...SHADOWS.sm,
  },
  mapBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: FONTS.sizes.sm },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.md,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  tabText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.base },
  sectionTitle: {
    fontSize: FONTS.sizes.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  stopRow: { flexDirection: 'row', marginBottom: SPACING.md },
  timeline: { alignItems: 'center', width: 24 },
  stopDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary, marginBottom: 4 },
  stopDotFirst: { backgroundColor: COLORS.success },
  stopDotLast: { backgroundColor: COLORS.secondary },
  stopLine: { width: 2, flex: 1, backgroundColor: COLORS.border },
  stopCard: {
    flex: 1,
    marginLeft: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  stopInfo: { marginBottom: SPACING.xs },
  stopName: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
  stopMeta: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  stopEtaContainer: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 4,
  },
  stopEtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stopEtaText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  emptyTab: { alignItems: 'center', paddingTop: 60 },
  emptyTabIcon: { fontSize: 48, marginBottom: SPACING.sm },
  emptyTabText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center' },
  busCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  busHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  busNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  busNumberText: { color: COLORS.white, marginLeft: 4, fontWeight: '700' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginLeft: SPACING.xs },
  busInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  busInfoItem: { flex: 1 },
  busInfoLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  busInfoValue: { fontSize: FONTS.sizes.sm, color: COLORS.text, fontWeight: '700', marginTop: 4 },
  occupancyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  occLabel: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs },
  occPct: { color: COLORS.secondary, fontWeight: '700', fontSize: FONTS.sizes.xs },
  occBar: { height: 10, backgroundColor: COLORS.border, borderRadius: 6, overflow: 'hidden' },
  occFill: { height: '100%' },
  fareCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.base,
    ...SHADOWS.sm,
  },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm },
  fareLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  fareDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: 4 },
  farePrice: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.primary },
  fareDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },
  buyBtn: { marginTop: SPACING.md },
});

export default RouteDetailScreen;
