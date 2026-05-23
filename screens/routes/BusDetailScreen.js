// BusDetailScreen.js — Detailed view for a specific active bus
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { subscribeToVehicleLocations } from '../../services/supabaseService';
import { calculateETA, formatETA, formatDistance, getDistance, getOrderedStops, getVehicleNextStopIndex, getEffectiveVehicleSpeed } from '../../utils/locationUtils';

const BusDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { vehicle: initialVehicle, route: routeData } = route.params;
  const [vehicle, setVehicle] = useState(initialVehicle);
  const [etaData, setEtaData] = useState([]);
  
  // Tracking refs for smart ETA stabilization
  const smoothedSpeedRef = useRef(null);
  const stopStartTimeRef = useRef(null);

  
  const [rowLayouts, setRowLayouts] = useState({});
  const busYAnim = useRef(new Animated.Value(0)).current;

  const direction = vehicle.direction || 'onward';
  const orderedStops = React.useMemo(() => getOrderedStops(routeData.stops, direction), [routeData.stops, direction]);
  const sourceStop = orderedStops[0];
  const destStop = orderedStops[orderedStops.length - 1];

  const initialTime = vehicle.recordedAt ? new Date(vehicle.recordedAt).getTime() : Date.now();
  const [lastUpdateAt, setLastUpdateAt] = useState(initialTime);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [signalStatus, setSignalStatus] = useState('active');

  useEffect(() => {
    let subscription = null;
    if (vehicle.id) {
      subscription = subscribeToVehicleLocations([vehicle.id], (newLoc) => {
        if (newLoc.vehicle_id === vehicle.id) {
          setVehicle(prev => ({
            ...prev,
            speed: Number(newLoc.speed) || prev.speed,
            location: {
              latitude: Number(newLoc.latitude) || prev.location.latitude,
              longitude: Number(newLoc.longitude) || prev.location.longitude,
            },
            recordedAt: newLoc.recorded_at
          }));
          setLastUpdateAt(Date.now());
          setSecondsAgo(0);
          setSignalStatus('active');
        }
      });
    }
    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [vehicle.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastUpdateAt) / 1000);
      setSecondsAgo(elapsed);
      
      let newSignal = 'active';
      if (elapsed > 10 && elapsed <= 30) {
        newSignal = 'weak';
      } else if (elapsed > 30) {
        newSignal = 'offline';
      }
      setSignalStatus(newSignal);

      // Route-aware stops timeline prediction
      if (elapsed > 3 && elapsed <= 30 && vehicle.location?.latitude && vehicle.location?.longitude && orderedStops.length > 0) {
        const speedMps = (vehicle.speed || 20) / 3.6;
        const confidence = Math.max(0, (30 - elapsed) / 27.0);
        const distToMoveKm = (speedMps * confidence * 1.0) / 1000.0;

        const nextStopIndex = getVehicleNextStopIndex(vehicle, orderedStops);
        if (nextStopIndex < orderedStops.length) {
          const nextStop = orderedStops[nextStopIndex];
          const dy = nextStop.latitude - vehicle.location.latitude;
          const dx = nextStop.longitude - vehicle.location.longitude;
          const distDeg = Math.sqrt(dx * dx + dy * dy);
          const moveDeg = distToMoveKm * 0.009; // Approximate degree step

          if (distDeg > 0) {
            let newLat = vehicle.location.latitude;
            let newLng = vehicle.location.longitude;

            if (distDeg > moveDeg) {
              const ratio = moveDeg / distDeg;
              newLat += dy * ratio;
              newLng += dx * ratio;
            } else {
              newLat = nextStop.latitude;
              newLng = nextStop.longitude;
            }

            setVehicle(prev => ({
              ...prev,
              location: { latitude: newLat, longitude: newLng }
            }));
          }
        }
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [lastUpdateAt, vehicle.location, vehicle.speed, orderedStops]);

  useEffect(() => {
    if (!vehicle.location?.latitude || !vehicle.location?.longitude || !orderedStops.length) return;
    
    const currentSpeed = vehicle.speed || 0;
    
    // 1. Determine smoothed speed
    const effectiveSpeed = getEffectiveVehicleSpeed(currentSpeed, smoothedSpeedRef.current);
    smoothedSpeedRef.current = effectiveSpeed;

    // 2. Track Stop Duration for Penalty Calculation
    let stopPenaltyMins = 0;
    if (currentSpeed < 3) {
      if (!stopStartTimeRef.current) {
        stopStartTimeRef.current = Date.now();
      }
      const elapsedMs = Date.now() - stopStartTimeRef.current;
      
      if (elapsedMs >= 45000 && elapsedMs < 120000) {
        // Gradual drift penalty for medium stops (45 sec - 2 min)
        // Slowly add penalty minutes up to ~2 minutes max
        stopPenaltyMins = ((elapsedMs - 45000) / 60000) * 0.8; 
      } else if (elapsedMs >= 120000) {
        // Resuming gradual real-time incremental increase for long stops
        stopPenaltyMins = 1.0 + ((elapsedMs - 120000) / 60000);
      }
      // Short stops (<45s) produce penalty = 0, effectively freezing/stabilizing ETA.
    } else {
      stopStartTimeRef.current = null; // Reset upon movement
    }

    const nextStopIndex = getVehicleNextStopIndex(vehicle, orderedStops);
    
    const newEtaData = [];
    let prevLat = vehicle.location.latitude;
    let prevLng = vehicle.location.longitude;
    let totalDistance = 0;
    let totalMins = 0;
    
    for (let i = 0; i < orderedStops.length; i++) {
      const stop = orderedStops[i];
      
      if (i < nextStopIndex) {
        newEtaData.push({ stopId: stop.id, passed: true });
      } else {
        const distKm = getDistance(prevLat, prevLng, stop.latitude, stop.longitude) || 0.5;
        
        // Live projection based on smoothed effective speed
        const liveTimeSegment = (distKm / effectiveSpeed) * 60;
        
        // Determine historical component
        // stop.avgTravelTimeMinutes tracks the estimated minutes between last stop and this one
        const historicalSegment = stop.avgTravelTimeMinutes || liveTimeSegment;
        
        let segmentFinalTime = 0;
        
        if (i === nextStopIndex) {
          // Next stop special case: compute remaining proportional distance
          const directDistToNext = getDistance(vehicle.location.latitude, vehicle.location.longitude, stop.latitude, stop.longitude) || distKm;
          
          const liveRemainingTime = (directDistToNext / effectiveSpeed) * 60;
          
          // Calculate distance proportion based on recorded stop geometry if valid
          let distFraction = 1.0;
          if (stop.distanceFromPrevKm && stop.distanceFromPrevKm > 0) {
            distFraction = Math.min(1.0, directDistToNext / stop.distanceFromPrevKm);
          }
          
          const historicalRemainingTime = historicalSegment * distFraction;
          
          // Blend: 60% real-time speed tracking, 40% historical consistency
          segmentFinalTime = (liveRemainingTime * 0.6) + (historicalRemainingTime * 0.4);
          
          // Incorporate Stop Penalty ONLY on the immediately approaching stop
          segmentFinalTime += stopPenaltyMins;
          
          totalDistance = directDistToNext;
          totalMins = segmentFinalTime;
        } else {
          // Upcoming subsequent segments: full blend
          segmentFinalTime = (liveTimeSegment * 0.6) + (historicalSegment * 0.4);
          totalDistance += distKm;
          totalMins += segmentFinalTime;
        }
        
        prevLat = stop.latitude;
        prevLng = stop.longitude;

        newEtaData.push({ 
          stopId: stop.id, 
          passed: false,
          isNext: i === nextStopIndex,
          distanceKm: totalDistance,
          durationMins: Math.max(0, totalMins) // Guard against negative drift edge cases
        });
      }
    }
    setEtaData(newEtaData);
  }, [vehicle, orderedStops]);

  useEffect(() => {
    if (!vehicle.location?.latitude || !vehicle.location?.longitude || !orderedStops.length) return;
    
    const nextStopIndex = getVehicleNextStopIndex(vehicle, orderedStops);
    let targetY = 0;

    if (nextStopIndex <= 0) {
      targetY = rowLayouts[0] ?? 0;
    } else if (nextStopIndex >= orderedStops.length) {
      targetY = rowLayouts[orderedStops.length - 1] ?? 0;
    } else {
      const prevIdx = nextStopIndex - 1;
      const startY = rowLayouts[prevIdx] ?? 0;
      const endY = rowLayouts[nextStopIndex] ?? 0;
      
      const prevStop = orderedStops[prevIdx];
      const nextStop = orderedStops[nextStopIndex];
      
      const segmentDist = getDistance(prevStop.latitude, prevStop.longitude, nextStop.latitude, nextStop.longitude) || 0.5;
      const distToNext = getDistance(vehicle.location.latitude, vehicle.location.longitude, nextStop.latitude, nextStop.longitude) || 0;
      
      let progress = segmentDist > 0 ? (segmentDist - distToNext) / segmentDist : 0;
      progress = Math.max(0, Math.min(1, progress));
      
      targetY = startY + (endY - startY) * progress;
    }

    Animated.timing(busYAnim, {
      toValue: targetY,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  }, [vehicle, orderedStops, rowLayouts]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerSubtitle}>Live Tracking</Text>
          <Text style={styles.headerTitle}>Bus {vehicle.number}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Bus Info Card */}
        <View style={styles.infoCard}>
          {signalStatus === 'weak' && (
            <View style={styles.weakSignalBanner}>
              <MaterialCommunityIcons name="wifi-strength-1-alert" size={16} color="#F97316" />
              <Text style={styles.weakSignalBannerText}>Weak Signal - Predicting live movement...</Text>
            </View>
          )}
          {signalStatus === 'offline' && (
            <View style={styles.offlineBanner}>
              <MaterialCommunityIcons name="wifi-strength-off" size={16} color="#6B7280" />
              <Text style={styles.offlineBannerText}>Offline - Displaying last known location</Text>
            </View>
          )}

          <View style={styles.directionRow}>
            <Ionicons name="compass" size={20} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.directionLabel} numberOfLines={1}>Towards {destStop?.name}</Text>
              <Text style={styles.directionRoute} numberOfLines={1}>
                {sourceStop?.name} <Ionicons name="arrow-forward" size={12} color={COLORS.textSecondary} /> {destStop?.name}
              </Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Status</Text>
              <View style={styles.statusBadgeRow}>
                <View style={[
                  styles.statusDot, 
                  { backgroundColor: signalStatus === 'active' ? '#22C55E' : (signalStatus === 'weak' ? '#F97316' : '#9CA3AF') }
                ]} />
                <Text style={[
                  styles.statValue, 
                  { color: signalStatus === 'active' ? '#22C55E' : (signalStatus === 'weak' ? '#F97316' : '#6B7280') }
                ]}>
                  {signalStatus === 'active' ? 'Live' : (signalStatus === 'weak' ? 'Weak' : 'Offline')}
                </Text>
              </View>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Speed</Text>
              <Text style={styles.statValue}>{Math.round(vehicle.speed)} km/h</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Occupancy</Text>
              <Text style={styles.statValue}>{vehicle.capacity ? Math.round(65) : 0}%</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Updated</Text>
              <Text style={styles.statValue}>{secondsAgo === 0 ? 'Just now' : `${secondsAgo}s ago`}</Text>
            </View>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Journey Timeline</Text>
          
          <View style={styles.timelineWrapper}>
            <Animated.View 
              style={[
                styles.liveBusIcon, 
                { 
                  position: 'absolute',
                  left: 10,
                  top: 0,
                  transform: [{ translateY: busYAnim }],
                  backgroundColor: signalStatus === 'active' ? '#38BDF8' : (signalStatus === 'weak' ? '#F97316' : '#9CA3AF'),
                  borderColor: signalStatus === 'active' ? COLORS.white : (signalStatus === 'weak' ? '#FFEDD5' : '#F3F4F6'),
                }
              ]}
            >
              <Text style={{fontSize: 14}}>🚌</Text>
            </Animated.View>

            {orderedStops.map((stop, index) => {
              const stopEta = etaData.find(e => e.stopId === stop.id) || { passed: false };
              const isLast = index === orderedStops.length - 1;
              const isFirst = index === 0;
              
              return (
                <View 
                  key={stop.id || index} 
                  style={styles.timelineRow}
                  onLayout={(e) => {
                    const { y } = e.nativeEvent.layout;
                    setRowLayouts(prev => ({ ...prev, [index]: y }));
                  }}
                >
                  <View style={styles.timelineGraphic}>
                    <View style={[
                      styles.timelineDot,
                      stopEta.passed && styles.timelineDotPassed,
                      stopEta.isNext && styles.timelineDotNext,
                    ]} />
                    {!isLast && (
                      <View style={[
                        styles.timelineLine,
                        stopEta.passed && styles.timelineLinePassed
                      ]} />
                    )}

                  </View>
                  
                  <View style={[
                    styles.stopContent,
                    stopEta.passed && styles.stopContentPassed,
                    stopEta.isNext && styles.stopContentNext
                  ]}>
                    <View style={styles.stopNameRow}>
                      <Text style={[
                        styles.stopName,
                        stopEta.passed && styles.stopNamePassed,
                        stopEta.isNext && styles.stopNameNext
                      ]}>{stop.name}</Text>
                      
                      {!stopEta.passed && stopEta.durationMins !== undefined && (
                        <Text style={[styles.etaText, stopEta.isNext && styles.etaTextNext]}>
                          {formatETA(stopEta.durationMins)}
                        </Text>
                      )}
                      {stopEta.passed && (
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                      )}
                    </View>
                    
                    {!stopEta.passed && stopEta.distanceKm !== undefined && (
                      <Text style={styles.distanceText}>
                        {formatDistance(stopEta.distanceKm)} away
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        
        <View style={{height: 40}}/>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
    zIndex: 10,
  },
  backBtn: {
    width: 44, height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitles: { alignItems: 'center' },
  headerSubtitle: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' },
  headerTitle: { fontSize: FONTS.sizes.lg, color: COLORS.text, fontWeight: '800' },
  
  content: { flex: 1, padding: SPACING.md },
  
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  directionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  directionLabel: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  directionRoute: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: FONTS.sizes.xs - 2, color: COLORS.textSecondary, marginBottom: 4, textTransform: 'uppercase', fontWeight: '600' },
  statValue: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
  
  weakSignalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  weakSignalBannerText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: '#C2410C',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  offlineBannerText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: '#4B5563',
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  
  timelineCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.lg },
  
  timelineWrapper: { paddingLeft: 8 },
  timelineRow: { flexDirection: 'row', minHeight: 60 },
  timelineGraphic: { width: 30, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.border, zIndex: 2 },
  timelineDotPassed: { backgroundColor: COLORS.success },
  timelineDotNext: { backgroundColor: COLORS.primary, width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: COLORS.primary + '33' },
  timelineLine: { width: 2, flex: 1, backgroundColor: COLORS.border, marginTop: -4, marginBottom: -4, zIndex: 1 },
  timelineLinePassed: { backgroundColor: COLORS.success },
  
  liveBusIcon: {
    position: 'absolute',
    top: 0,
    left: -11,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#38BDF8',
    borderWidth: 2,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...SHADOWS.md,
  },

  stopContent: { flex: 1, paddingLeft: 12, paddingBottom: 24, marginTop: -4 },
  stopContentPassed: { opacity: 0.6 },
  stopContentNext: { opacity: 1 },
  
  stopNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stopName: { fontSize: FONTS.sizes.md, color: COLORS.text, fontWeight: '500' },
  stopNamePassed: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  stopNameNext: { fontWeight: '800', color: COLORS.primary },
  
  etaText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
  etaTextNext: { color: COLORS.primary },
  distanceText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 4 },
});

export default BusDetailScreen;
