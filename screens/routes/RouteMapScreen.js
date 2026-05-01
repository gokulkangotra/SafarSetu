import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS, RADIUS, SPACING } from '../../constants/theme';
import { getRouteVehicles, subscribeToVehicleLocations } from '../../services/supabaseService';
import { useEffect, useState, useMemo } from 'react';

const generateRouteMapHTML = (routeData) => {
  const validStops = (routeData.stops || []).filter(s => s.latitude && s.longitude);
  const routeColor = routeData.color || '#1E3A8A';

  const markersJS = validStops.map((stop, index) => {
    let htmlContent = '<div style="background:white;border-radius:50%;width:14px;height:14px;border:3px solid ' + routeColor + ';box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>';
    
    if (index === 0) {
      htmlContent = '<div style="background:#22C55E;border-radius:50%;width:18px;height:18px;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>';
    } else if (index === validStops.length - 1) {
      htmlContent = '<div style="background:#F97316;border-radius:50%;width:18px;height:18px;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>';
    }

    return `
      var icon_${index} = L.divIcon({
        html: '${htmlContent}',
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      L.marker([${stop.latitude}, ${stop.longitude}], {icon: icon_${index}})
        .bindPopup('<b>${stop.name.replace(/'/g, "\\'")}</b>')
        .addTo(map);
    `;
  }).join('\n');
  
  const polylinePointsJS = validStops.map(stop => `[${stop.latitude}, ${stop.longitude}]`).join(',');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { height: 100vh; overflow: hidden; font-family: sans-serif; }
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
    var map = L.map('map', {zoomControl: false});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);

    var fallbackLatlngs = [${polylinePointsJS}];
    
    if (fallbackLatlngs.length > 0) {
      var polylineOptions = { color: '${routeColor}', weight: 5, opacity: 0.8, lineJoin: 'round' };
      
      if (fallbackLatlngs.length > 1 && fallbackLatlngs.length <= 100) {
        var osrmCoords = fallbackLatlngs.map(function(ll) { return ll[1] + ',' + ll[0]; }).join(';');
        var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' + osrmCoords + '?overview=full&geometries=geojson';
        
        fetch(osrmUrl)
          .then(function(response) { return response.json(); })
          .then(function(data) {
            if (data.routes && data.routes.length > 0) {
              var routeCoords = data.routes[0].geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
              var polyline = L.polyline(routeCoords, polylineOptions).addTo(map);
              map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
            } else {
              throw new Error('No route found');
            }
          })
          .catch(function(err) {
            console.warn('OSRM routing failed, falling back to straight lines', err);
            var polyline = L.polyline(fallbackLatlngs, polylineOptions).addTo(map);
            map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
          });
      } else {
        var polyline = L.polyline(fallbackLatlngs, polylineOptions).addTo(map);
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      }
    } else {
      map.setView([20.0, 0.0], 2);
    }

    ${markersJS}

    var vehicleMarkers = {};
    function updateVehicles(vehicles) {
      try {
        var currentIds = {};
        vehicles.forEach(function(v) {
          if (!v.location || !v.location.latitude || !v.location.longitude) return;
          currentIds[v.id] = true;
          
          if (vehicleMarkers[v.id]) {
            vehicleMarkers[v.id].setLatLng([v.location.latitude, v.location.longitude]);
            vehicleMarkers[v.id].getPopup().setContent('<b>Bus ' + v.number + '</b><br/>Speed: ' + v.speed + ' km/h');
          } else {
            var iconHtml = '<div style="background:#38BDF8;border-radius:50%;width:32px;height:32px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:16px;">🚌</span></div>';
            var vIcon = L.divIcon({
              html: iconHtml,
              className: '',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            });
            var marker = L.marker([v.location.latitude, v.location.longitude], {icon: vIcon})
              .bindPopup('<b>Bus ' + v.number + '</b><br/>Speed: ' + v.speed + ' km/h')
              .addTo(map);
            vehicleMarkers[v.id] = marker;
          }
        });
        
        for (var id in vehicleMarkers) {
          if (!currentIds[id]) {
            map.removeLayer(vehicleMarkers[id]);
            delete vehicleMarkers[id];
          }
        }
      } catch(e) {}
    }

    L.control.zoom({position: 'bottomright'}).addTo(map);
  </script>
</body>
</html>`;
};

const RouteMapScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const routeData = route.params?.route;
  const [vehicles, setVehicles] = useState([]);
  const webViewRef = useRef(null);
  
  const mapHtml = useMemo(() => routeData ? generateRouteMapHTML(routeData) : '', [routeData]);

  useEffect(() => {
    if (vehicles.length > 0 && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (typeof updateVehicles === 'function') {
          updateVehicles(${JSON.stringify(vehicles)});
        }
        true;
      `);
    }
  }, [vehicles]);

  useEffect(() => {
    let subscription = null;
    if (routeData?.id) {
      loadBuses().then(fetched => {
        if (fetched && fetched.length > 0) {
          const vIds = fetched.map(v => v.id);
          subscription = subscribeToVehicleLocations(vIds, (newLoc) => {
             setVehicles(prev => prev.map(v => 
               v.id === newLoc.vehicle_id 
                 ? { ...v, location: { latitude: Number(newLoc.latitude), longitude: Number(newLoc.longitude) }, speed: Number(newLoc.speed) }
                 : v
             ));
          });
        }
      });
      const interval = setInterval(loadBuses, 30000);
      return () => {
        clearInterval(interval);
        if (subscription) subscription.unsubscribe();
      };
    }
  }, [routeData]);

  const loadBuses = async () => {
    const { vehicles: vData, error } = await getRouteVehicles(routeData.id);
    if (!error) {
      setVehicles(vData);
      return vData;
    }
    return [];
  };

  if (!routeData) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
      />

      <View style={[styles.headerOverlay, { top: insets.top + SPACING.sm }]}> 
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <View style={[styles.routeBadge, { backgroundColor: routeData.color || COLORS.primary }]}> 
            <Text style={styles.routeNumber}>{routeData.number}</Text>
          </View>
          <Text style={styles.routeName} numberOfLines={1}>{routeData.name}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  map: { flex: 1 },
  headerOverlay: {
    position: 'absolute',
    left: SPACING.base,
    right: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    zIndex: 100,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    ...SHADOWS.md,
    gap: 8,
  },
  routeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  routeNumber: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.sm },
  routeName: { flex: 1, fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text, paddingRight: 8 },
});

export default RouteMapScreen;
