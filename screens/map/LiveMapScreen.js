// LiveMapScreen.js — OpenStreetMap with real-time bus tracking from Supabase

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { getLiveVehicleLocations } from '../../services/supabaseService';
import { calculateETA, formatETA } from '../../utils/locationUtils';

const generateMapHTML = (centerLat, centerLng) => {
  const centerLatValue = centerLat || 20.0;
  const centerLngValue = centerLng || 0.0;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { height: 100vh; overflow: hidden; }
    #map { width: 100%; height: 100vh; }
    .leaflet-marker-icon {
      transition: transform 2s linear;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {zoomControl: false}).setView([${centerLatValue}, ${centerLngValue}], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);

    var busIcon = L.divIcon({
      html: '<div style="background:#1E3A8A;border-radius:50%;width:32px;height:32px;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78A2.99 2.99 0 0020 16V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 4h2V2h-2v2zM4 9h16v3H4V9z"/></svg></div>',
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    var userIcon = L.divIcon({
      html: '<div style="background:#38BDF8;border-radius:50%;width:20px;height:20px;border:3px solid white;box-shadow:0 2px 8px rgba(56,189,248,0.6);"></div>',
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    var busMarkers = {};
    function updateBuses(buses) {
      try {
        var currentIds = {};
        buses.forEach(function(bus) {
          currentIds[bus.id] = true;
          if (busMarkers[bus.id]) {
            busMarkers[bus.id].setLatLng([bus.location.latitude, bus.location.longitude]);
          } else {
            var marker = L.marker([bus.location.latitude, bus.location.longitude], {icon: busIcon})
              .addTo(map)
              .on('click', function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'busClick', busId: bus.id}));
              });
            busMarkers[bus.id] = marker;
          }
        });
        for (var id in busMarkers) {
          if (!currentIds[id]) {
            map.removeLayer(busMarkers[id]);
            delete busMarkers[id];
          }
        }
      } catch(e) {}
    }

    var userMarker = null;
    function updateUser(lat, lng) {
      if (userMarker) {
        userMarker.setLatLng([lat, lng]);
      } else {
        userMarker = L.marker([lat, lng], {icon: userIcon})
          .addTo(map)
          .bindPopup('<b>Your Location</b>');
      }
    }

    L.control.zoom({position: 'bottomright'}).addTo(map);
  </script>
</body>
</html>`;
};

const LiveMapScreen = () => {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [showBusPanel, setShowBusPanel] = useState(false);
  const [busCount, setBusCount] = useState(0);
  const [userLocation, setUserLocation] = useState(null);
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Jammu city coordinates as default
  const JAMMU_LAT = 32.7266;
  const JAMMU_LNG = 74.8570;

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } else {
        Alert.alert(
          'Location Permission',
          'Location permission is required to show your position on the map.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.log('Location error:', error);
      Alert.alert('Location Error', 'Unable to get your location. Using default location.');
    }
  };

  const loadLiveVehicles = async () => {
    const { vehicles: liveVehicles, error } = await getLiveVehicleLocations();
    if (!error) {
      setBuses(liveVehicles);
      setBusCount(liveVehicles.length);
    } else {
      console.log('Live vehicle load error:', error);
    }
  };

  useEffect(() => {
    requestLocationPermission();
    loadLiveVehicles();
    const interval = setInterval(loadLiveVehicles, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (webViewRef.current && buses.length > 0) {
      webViewRef.current.injectJavaScript(`
        if (typeof updateBuses === 'function') {
          updateBuses(${JSON.stringify(buses)});
        }
        true;
      `);
    }
  }, [buses]);

  useEffect(() => {
    if (webViewRef.current && userLocation) {
      webViewRef.current.injectJavaScript(`
        if (typeof updateUser === 'function') {
          updateUser(${userLocation.latitude}, ${userLocation.longitude});
        }
        true;
      `);
    }
  }, [userLocation]);

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'busClick') {
        const bus = buses.find((item) => item.id === data.busId);
        if (bus) showPanel(bus);
      }
    } catch (e) {
      console.log('WebView message error', e);
    }
  };

  const centerOnBus = () => {
    const targetBus = selectedBus || buses[0];
    if (targetBus && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (typeof map !== 'undefined') {
          map.setView([${targetBus.location.latitude}, ${targetBus.location.longitude}], 14);
        }
        true;
      `);
    }
  };

  const centerOnUser = () => {
    if (userLocation && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (typeof map !== 'undefined') {
          map.setView([${userLocation.latitude}, ${userLocation.longitude}], 14);
        }
        true;
      `);
    }
  };

  const showPanel = (bus) => {
    setSelectedBus(bus);
    setShowBusPanel(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 7,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  const hidePanel = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowBusPanel(false);
      setSelectedBus(null);
    });
  };

  const centerLat = userLocation?.latitude || buses[0]?.location.latitude || JAMMU_LAT;
  const centerLng = userLocation?.longitude || buses[0]?.location.longitude || JAMMU_LNG;
  const mapHtml = useRef(generateMapHTML(centerLat, centerLng)).current;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <View style={[styles.headerOverlay, { top: insets.top }]}> 
        <View style={styles.headerCard}>
          <MaterialCommunityIcons name="bus" size={18} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Live Bus Tracker</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{busCount} Active</Text>
          </View>
        </View>
      </View>

      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.map}
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
      />

      <TouchableOpacity
        style={[styles.locationBtn, { bottom: insets.bottom + 100 }]}
        onPress={centerOnBus}
      >
        <Ionicons name="locate" size={22} color={COLORS.primary} />
      </TouchableOpacity>

      {userLocation && (
        <TouchableOpacity
          style={[styles.userLocationBtn, { bottom: insets.bottom + 160 }]}
          onPress={centerOnUser}
        >
          <Ionicons name="person" size={20} color={COLORS.secondary} />
        </TouchableOpacity>
      )}

      <View style={[styles.legend, { bottom: insets.bottom + 100 }]}> 
        <View style={styles.legendItem}>
          <View style={styles.legendBus} />
          <Text style={styles.legendText}>Bus</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendUser} />
          <Text style={styles.legendText}>Your Location</Text>
        </View>
      </View>

      {showBusPanel && selectedBus && (
        <Animated.View
          style={[
            styles.busPanel,
            { bottom: insets.bottom + 80, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <LinearGradient
            colors={COLORS.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.busPanelHeader}
          >
            <MaterialCommunityIcons name="bus" size={18} color={COLORS.white} />
            <Text style={styles.busPanelNumber}>{selectedBus.number}</Text>
            <View style={styles.busPanelEtaBadge}>
              <Text style={styles.busPanelEtaText}>{selectedBus.eta || 'Live'}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={hidePanel}>
              <Ionicons name="close" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.busPanelBody}>
            <View style={styles.panelInfoRow}>
              <View style={styles.panelInfoItem}>
                <Text style={styles.panelLabel}>Speed</Text>
                <Text style={styles.panelValue}>{selectedBus.speed} km/h</Text>
              </View>
              <View style={styles.panelInfoItem}>
                <Text style={styles.panelLabel}>Capacity</Text>
                <Text style={styles.panelValue}>{selectedBus.capacity}</Text>
              </View>
            </View>
            <View style={styles.panelRoute}>
              <View style={styles.panelRouteItem}>
                <View style={[styles.routeDot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.panelRouteText}>Live position</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    justifyContent: 'space-between',
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  liveText: { color: COLORS.primary, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  map: { flex: 1 },
  locationBtn: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  userLocationBtn: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  legend: {
    position: 'absolute',
    left: 20,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    ...SHADOWS.sm,
  },
  legendBus: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  legendUser: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  legendText: { color: COLORS.text, fontSize: FONTS.sizes.xs },
  busPanel: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.lg,
  },
  busPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
  },
  busPanelNumber: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  busPanelEtaBadge: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  busPanelEtaText: { color: COLORS.primary, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  busPanelBody: { padding: SPACING.md },
  panelInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  panelInfoItem: { flex: 1 },
  panelLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  panelValue: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text, marginTop: SPACING.xs },
  panelRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  panelRouteItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  panelRouteText: { color: COLORS.text, fontSize: FONTS.sizes.sm },
});

export default LiveMapScreen;
