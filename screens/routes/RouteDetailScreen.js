// RouteDetailScreen.js — Detailed route view with Supabase live vehicles

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import GradientButton from '../../components/GradientButton';
import { getRouteVehicles, subscribeToVehicleLocations } from '../../services/supabaseService';
import * as Location from 'expo-location';
import { calculateETA, formatETA, formatDistance, getDistance, getOrderedStops, getVehicleNextStopIndex } from '../../utils/locationUtils';

const TAB = { STOPS: 'stops', VEHICLES: 'vehicles', INFO: 'info' };



const BusTimelineIcon = ({ progress }) => {
  const animatedTop = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(animatedTop, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const topStyle = animatedTop.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[{
      position: 'absolute',
      left: -11,
      width: 24,
      height: 24,
      backgroundColor: '#38BDF8',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#FFF',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      top: topStyle,
    }]}>
      <Text style={{ fontSize: 12, lineHeight: 14 }}>🚌</Text>
    </Animated.View>
  );
};

const RouteDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const routeData = route.params?.route;
  const [activeTab, setActiveTab] = useState(TAB.STOPS);
  const [routeVehicles, setRouteVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [directionFilter, setDirectionFilter] = useState('All');

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    return getDistance(lat1, lon1, lat2, lon2);
  };

  const filteredAndSortedVehicles = React.useMemo(() => {
    let filtered = [...routeVehicles];

    // 1. Filtering logic
    if (directionFilter === 'Onwards') {
      filtered = filtered.filter(v => v.direction === 'forward' || v.direction === 'onward');
    } else if (directionFilter === 'Backwards') {
      filtered = filtered.filter(v => v.direction === 'reverse' || v.direction === 'return');
    }

    // 2. Sorting by nearest distance using Haversine
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      filtered.sort((a, b) => {
        const distA = calculateDistance(userLocation.latitude, userLocation.longitude, a.location?.latitude, a.location?.longitude) ?? Infinity;
        const distB = calculateDistance(userLocation.latitude, userLocation.longitude, b.location?.latitude, b.location?.longitude) ?? Infinity;
        return distA - distB;
      });
    }

    return filtered;
  }, [routeVehicles, directionFilter, userLocation]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation(location.coords);
      }
    })();
  }, []);

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

    const approachingVehicles = routeVehicles.map(v => {
      if (!v.location?.latitude || !v.location?.longitude) return null;
      
      const direction = v.direction || 'onward';
      const orderedStops = getOrderedStops(routeData.stops, direction);
      
      const nextStopIndex = getVehicleNextStopIndex(v, orderedStops);
      if (nextStopIndex >= orderedStops.length) return null;
      
      const nextStop = orderedStops[nextStopIndex];
      const destStop = orderedStops[orderedStops.length - 1];
      
      if (nextStop.id === stop.id) {
        return { ...v, destinationName: destStop.name };
      }
      return null;
    }).filter(v => v !== null);

    if (approachingVehicles.length === 0) return null;

    return (
      <View style={styles.stopEtaContainer}>
        {approachingVehicles.map(v => (
          <View key={v.id} style={styles.stopEtaRow}>
            <MaterialCommunityIcons name="bus-side" size={14} color={COLORS.secondary} />
            <Text style={styles.stopEtaText}>
              <Text style={{fontWeight: '700'}}>Bus {v.number}</Text> <Ionicons name="arrow-forward" size={12} color={COLORS.textSecondary} /> {v.destinationName}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const getNearestStopId = () => {
    if (!userLocation || !routeData?.stops) return null;
    let minDistance = Infinity;
    let nearestId = null;
    routeData.stops.forEach((s) => {
      const d = getDistance(userLocation.latitude, userLocation.longitude, s.latitude, s.longitude);
      if (d !== null && d < minDistance) {
        minDistance = d;
        nearestId = s.id;
      }
    });
    return nearestId;
  };

  const nearestStopId = getNearestStopId();

  const OccupancyBar = ({ value, total }) => {
    const pct = total > 0 ? (value / total) * 100 : 0;
    const color = pct > 80 ? COLORS.error : pct > 50 ? COLORS.warning : COLORS.success;
    return (
      <View style={styles.occBar}>
        <View style={[styles.occFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    );
  };

  const getBusesOnSegment = (index) => {
     const sortedStops = getOrderedStops(routeData.stops, 'onward');
     const stopCurrent = sortedStops[index];
     const stopNext = sortedStops[index + 1];
     if (!stopNext || !routeVehicles) return [];

     return routeVehicles.map(v => {
         if (!v.location?.latitude || !v.location?.longitude) return null;
         
         const direction = v.direction || 'onward';
         // We only show buses on the forward path timeline if they are traveling forward
         if (direction !== 'onward' && direction !== 'forward') return null;

         const orderedStops = getOrderedStops(routeData.stops, direction);
         const nextStopIndex = getVehicleNextStopIndex(v, orderedStops);
         
         if (nextStopIndex === index + 1) {
             const segmentDist = getDistance(stopCurrent.latitude, stopCurrent.longitude, stopNext.latitude, stopNext.longitude);
             const distToNext = getDistance(v.location.latitude, v.location.longitude, stopNext.latitude, stopNext.longitude);
             let progress = segmentDist > 0 ? (segmentDist - distToNext) / segmentDist : 0;
             progress = Math.max(0, Math.min(1, progress));
             return { ...v, progress };
         }
         return null;
     }).filter(Boolean);
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
            {getOrderedStops(routeData.stops, 'onward').map((stop, index, sortedStops) => {
              const isNearest = stop.id === nearestStopId;
              return (
              <View key={stop.id || `${index}`} style={styles.stopRow}>
                <View style={styles.timeline}>
                  <View
                    style={[
                      styles.stopDot,
                      index === 0 && styles.stopDotFirst,
                      index === sortedStops.length - 1 && styles.stopDotLast,
                    ]}
                  />
                  {index < sortedStops.length - 1 && (
                     <View style={styles.stopLine}>
                        {getBusesOnSegment(index).map(v => (
                           <BusTimelineIcon key={v.id} progress={v.progress} />
                        ))}
                     </View>
                  )}
                </View>
                <View style={[styles.stopCard, isNearest && styles.nearestStopCard]}>
                  {isNearest && (
                    <View style={styles.nearestBadge}>
                      <Text style={styles.nearestBadgeText}>Nearest Stop</Text>
                    </View>
                  )}
                  <View style={styles.stopInfo}>
                    <Text style={styles.stopName}>{stop.name}</Text>
                    <Text style={styles.stopMeta}>
                       {stop.order ? `Stop ${stop.order}` : ''}
                       {index < sortedStops.length - 1 && sortedStops[index+1] && (
                          ` • ${formatDistance(getDistance(stop.latitude, stop.longitude, sortedStops[index+1].latitude, sortedStops[index+1].longitude))} to next`
                       )}
                    </Text>
                  </View>
                  {renderStopEta(stop)}
                </View>
              </View>
            )})}
          </View>
        )}

        {activeTab === TAB.VEHICLES && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
                {filteredAndSortedVehicles.length} Active Vehicle{filteredAndSortedVehicles.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Direction Filter Pills */}
            <View style={styles.filterContainer}>
              {['All', 'Onwards', 'Backwards'].map((filter) => {
                const isActive = directionFilter === filter;
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterButton,
                      isActive ? styles.activeFilterButton : styles.inactiveFilterButton
                    ]}
                    onPress={() => setDirectionFilter(filter)}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      isActive ? styles.activeFilterButtonText : styles.inactiveFilterButtonText
                    ]}>
                      {filter}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {filteredAndSortedVehicles.length === 0 && !isLoading ? (
              <View style={styles.emptyTab}>
                <Text style={styles.emptyTabIcon}>🚌</Text>
                <Text style={styles.emptyTabText}>No vehicles match the filter</Text>
              </View>
            ) : null}
            {filteredAndSortedVehicles.map((vehicle) => {
              const direction = vehicle.direction || 'onward';
              const orderedStops = getOrderedStops(routeData.stops, direction);
              const nextStopIndex = getVehicleNextStopIndex(vehicle, orderedStops);
              const nextStop = nextStopIndex < orderedStops.length ? orderedStops[nextStopIndex] : null;
              const sourceStop = orderedStops[0];
              const destStop = orderedStops[orderedStops.length - 1];

              return (
              <TouchableOpacity 
                key={vehicle.id} 
                style={styles.busCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('BusDetail', { vehicle, route: routeData })}
              >
                <View style={styles.busHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.busNumberBadge}>
                      <MaterialCommunityIcons name="bus" size={14} color={COLORS.white} />
                      <Text style={styles.busNumberText}>{vehicle.number}</Text>
                    </View>
                    
                    {/* Direction Badge */}
                    <View style={[
                      styles.directionBadge, 
                      { backgroundColor: (vehicle.direction === 'forward' || vehicle.direction === 'onward') ? COLORS.primary + '18' : COLORS.secondary + '18' }
                    ]}>
                      <Text style={[
                        styles.directionBadgeText, 
                        { color: (vehicle.direction === 'forward' || vehicle.direction === 'onward') ? COLORS.primary : COLORS.secondary }
                      ]}>
                        {(vehicle.direction === 'forward' || vehicle.direction === 'onward') ? 'Onwards' : 'Backwards'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
                    <Text style={styles.statusLabel}>{vehicle.status || 'running'}</Text>
                  </View>
                </View>
                
                <View style={styles.busDirectionRow}>
                  <Ionicons name="compass-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.busDirectionText}>
                    <Text style={{fontWeight: '700'}}>Towards {destStop?.name}</Text> ({sourceStop?.name} <Ionicons name="arrow-forward" size={12} color={COLORS.textSecondary} /> {destStop?.name})
                  </Text>
                </View>

                {nextStop && (
                  <View style={styles.busNextStopRow}>
                    <Ionicons name="location-outline" size={16} color={COLORS.secondary} />
                    <Text style={styles.busNextStopText}>Next Stop: <Text style={{fontWeight: '700'}}>{nextStop.name}</Text></Text>
                  </View>
                )}

                <View style={styles.busInfo}>
                  <View style={styles.busInfoItem}>
                    <Text style={styles.busInfoLabel}>Vehicle</Text>
                    <Text style={styles.busInfoValue}>{vehicle.vehicleType}</Text>
                  </View>
                  <View style={styles.busInfoItem}>
                    <Text style={styles.busInfoLabel}>Speed</Text>
                    <Text style={styles.busInfoValue}>{Math.round(vehicle.speed)} km/h</Text>
                  </View>
                  <View style={styles.busInfoItem}>
                    <Text style={styles.busInfoLabel}>Capacity</Text>
                    <Text style={styles.busInfoValue}>{vehicle.capacity}</Text>
                  </View>
                </View>
                <View style={styles.occupancyRow}>
                  <Text style={styles.occLabel}>Estimated Occupancy</Text>
                  <Text style={styles.occPct}>{vehicle.capacity ? Math.round(65) : 0}%</Text>
                </View>
                <OccupancyBar value={vehicle.capacity ? (vehicle.capacity * 0.65) : 0} total={vehicle.capacity || 1} />
              </TouchableOpacity>
            )})}
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
              onPress={() => navigation.navigate('BuyMobileTicket', { 
                routeData: routeData, 
                userLocation: userLocation 
              })}
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
  nearestStopCard: {
    backgroundColor: '#E5E7EB',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  nearestBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  nearestBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },
  busDirectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  busDirectionText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  busNextStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.md,
  },
  busNextStopText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: RADIUS.full,
    padding: 4,
    marginBottom: SPACING.md,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary,
  },
  inactiveFilterButton: {
    backgroundColor: 'transparent',
  },
  filterButtonText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  activeFilterButtonText: {
    color: COLORS.white,
  },
  inactiveFilterButtonText: {
    color: COLORS.textSecondary,
  },
  directionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginLeft: 8,
  },
  directionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
});

export default RouteDetailScreen;
