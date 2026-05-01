// RoutesScreen.js — All routes with search and filtering via Supabase

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { SafarSetuTextLogo } from '../../components/SafarSetuLogo';
import RouteCard from '../../components/RouteCard';
import { RouteCardSkeleton } from '../../components/LoadingSpinner';
import { getRoutes } from '../../services/supabaseService';
import * as Location from 'expo-location';
import { getDistance } from '../../utils/locationUtils';
import { useAuth } from '../../context/AuthContext';
import NearestStopWidget from '../../components/NearestStopWidget';

const FILTER_TAGS = ['All', 'Express', 'Feeder', 'Airport', 'Ring'];

const RoutesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [routes, setRoutes] = useState([]);
  const [globalNearestStop, setGlobalNearestStop] = useState(null);
  const [globalNearestRoute, setGlobalNearestRoute] = useState(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadRoutes();
    requestLocation();
  }, []);

  useEffect(() => {
    if (routes.length > 0 && userLocation) {
      let closestStop = null;
      let closestRoute = null;
      let minDistance = Infinity;

      routes.forEach(r => {
        r.stops?.forEach(st => {
          if (st.latitude && st.longitude) {
            const d = getDistance(userLocation.latitude, userLocation.longitude, st.latitude, st.longitude);
            if (d !== null && d < minDistance) {
              minDistance = d;
              closestStop = st;
              closestRoute = r;
            }
          }
        });
      });

      if (closestStop && closestRoute) {
        setGlobalNearestStop(closestStop);
        setGlobalNearestRoute(closestRoute);
      }
    }
  }, [routes, userLocation]);

  const requestLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);
      }
    } catch (err) {
      console.log('Location permission error:', err);
    }
  };

  const loadRoutes = async () => {
    setIsLoading(true);
    const { routes: fetchedRoutes, error } = await getRoutes();
    if (!error) {
      setRoutes(fetchedRoutes);
    } else {
      console.log('Route load error:', error);
    }
    setIsLoading(false);
  };

  const handleSearchChange = (text) => {
    setSearch(text);
  };

  const filteredItems = routes.map((r) => {
    const q = search.toLowerCase();
    
    // Check basic info
    const matchBasic = 
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.number.toLowerCase().includes(q) ||
      r.source.toLowerCase().includes(q) ||
      r.destination.toLowerCase().includes(q);

    // Check stops
    const matchedStops = q ? (r.stops?.filter(s => s.name?.toLowerCase().includes(q)) || []) : [];
    const matchSearch = matchBasic || matchedStops.length > 0;

    if (!matchSearch) return null;

    let closestStop = null;
    let minStopDist = Infinity;

    // Calculate nearest matched stop if GPS is available
    if (matchedStops.length > 0 && userLocation) {
      matchedStops.forEach(st => {
        if (st.latitude && st.longitude) {
          const d = getDistance(userLocation.latitude, userLocation.longitude, st.latitude, st.longitude);
          if (d !== null && d < minStopDist) {
            minStopDist = d;
            closestStop = st;
          }
        }
      });
    } else if (matchedStops.length > 0) {
      closestStop = matchedStops[0];
    }

    return { route: r, closestStop, minStopDist };
  }).filter(Boolean).sort((a, b) => {
    if (a.minStopDist === Infinity && b.minStopDist === Infinity) return 0;
    return a.minStopDist - b.minStopDist;
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const renderRoute = useCallback(
    ({ item }) => (
      <RouteCard
        route={item.route}
        matchedStop={item.closestStop}
        onPress={() => navigation.navigate('RouteDetail', { route: item.route })}
        onMapPress={() => navigation.navigate('RouteMap', { route: item.route })}
      />
    ),
    [navigation]
  );

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
          <SafarSetuTextLogo size="md" />
          <View style={styles.headerRight}>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>{routes.length} Routes</Text>
            </View>
          </View>
        </View>
        <Text style={styles.welcomeText}>
          {user?.name ? `Welcome, ${user.name.split(' ')[0]}` : 'Welcome'} 👋
        </Text>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search routes, stops..."
            placeholderTextColor={COLORS.textLight}
            value={search}
            onChangeText={handleSearchChange}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>

      {!search && globalNearestStop && globalNearestRoute && (
        <View style={{ marginTop: -SPACING.xl, zIndex: 10 }}>
          <NearestStopWidget globalNearestStop={globalNearestStop} route={globalNearestRoute} />
        </View>
      )}

      <View style={styles.resultsRow}>
        <View>
          <Text style={styles.sectionHeading}>Available Routes</Text>
          <Text style={styles.resultsText}>
            {filteredItems.length} route{filteredItems.length !== 1 ? 's' : ''} found
          </Text>
        </View>
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearText}>Clear search</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <View>
          {[1, 2, 3].map((i) => <RouteCardSkeleton key={i} />)}
        </View>
      ) : (
        <Animated.FlatList
          data={filteredItems}
          keyExtractor={(item) => item.route.id}
          renderItem={renderRoute}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No Routes Found</Text>
              <Text style={styles.emptyText}>
                Try a different search or clear your filters
              </Text>
            </View>
          }
        />
      )}

      {/* Quick Access Buy Ticket Button */}
      <TouchableOpacity 
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Tickets', { screen: 'BuyMobileTicket' })}
      >
        <Ionicons name="ticket" size={20} color={COLORS.white} />
        <Text style={styles.fabText}>Buy Ticket</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl * 1.5,
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  headerRight: { alignItems: 'flex-end' },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  activeText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    height: 40,
    paddingVertical: 0,
  },

  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionHeading: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  resultsText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  clearText: { fontSize: FONTS.sizes.sm, color: COLORS.secondary, fontWeight: '600' },
  list: { paddingBottom: 100 },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: SPACING.xl,
  },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl + 60, // Above bottom tab bar
    right: SPACING.base,
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    gap: 8,
    ...SHADOWS.md,
    elevation: 5,
  },
  fabText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONTS.sizes.sm,
  },
});

export default RoutesScreen;
