import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar, FlatList } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS, RADIUS, SPACING } from '../../constants/theme';
import { getRouteVehicles, subscribeToVehicleLocations } from '../../services/supabaseService';

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
    body { height: 100vh; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    #map { width: 100%; height: 100vh; }
    
    /* Premium live pulse indicator styles */
    .pulse-container {
      position: relative;
      width: 34px;
      height: 34px;
    }
    .pulse-base {
      background: #38BDF8;
      border-radius: 50%;
      width: 34px;
      height: 34px;
      border: 3.5px solid #fff;
      box-shadow: 0 3px 8px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 2;
      position: relative;
    }
    .pulse-ring-active {
      border: 3px solid #22C55E;
    }
    .pulse-ring-weak {
      border: 3px solid #F97316;
    }
    .pulse-ring-offline {
      border: 3px solid #9CA3AF;
      opacity: 0.6;
    }
    
    .pulse-effect-active::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      border-radius: 50%;
      border: 3px solid #22C55E;
      animation: pulse-active-kf 1.8s infinite ease-out;
      z-index: 1;
    }
    .pulse-effect-weak::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      border-radius: 50%;
      border: 3px solid #F97316;
      animation: pulse-weak-kf 1.8s infinite ease-out;
      z-index: 1;
    }
    
    @keyframes pulse-active-kf {
      0% { transform: scale(1.0); opacity: 0.85; }
      100% { transform: scale(1.9); opacity: 0.0; }
    }
    @keyframes pulse-weak-kf {
      0% { transform: scale(1.0); opacity: 0.85; }
      100% { transform: scale(1.6); opacity: 0.0; }
    }
    
    .offline-marker {
      filter: grayscale(85%);
      opacity: 0.55;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {zoomControl: false});
    
    // Zoom in bug prevention: pause marker setLatLng redrawing during active map zoom/pan transitions
    var isMapAnimating = false;
    map.on('zoomstart movestart', function() {
      isMapAnimating = true;
    });
    map.on('zoomend moveend', function() {
      isMapAnimating = false;
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);

    var fallbackLatlngs = [${polylinePointsJS}];
    var activeRoutePath = fallbackLatlngs; // Store route path globally for prediction

    if (fallbackLatlngs.length > 0) {
      var polylineOptions = { color: '${routeColor}', weight: 6, opacity: 0.85, lineJoin: 'round' };
      
      if (fallbackLatlngs.length > 1 && fallbackLatlngs.length <= 100) {
        var osrmCoords = fallbackLatlngs.map(function(ll) { return ll[1] + ',' + ll[0]; }).join(';');
        var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' + osrmCoords + '?overview=full&geometries=geojson';
        
        fetch(osrmUrl)
          .then(function(response) { return response.json(); })
          .then(function(data) {
            if (data.routes && data.routes.length > 0) {
              var routeCoords = data.routes[0].geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
              var polyline = L.polyline(routeCoords, polylineOptions).addTo(map);
              activeRoutePath = routeCoords; // High-resolution street path loaded
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

    // Geometry & Math Utilities
    function getDistance(lat1, lon1, lat2, lon2) {
      var R = 6371000; // meters
      var dLat = (lat2 - lat1) * Math.PI / 180;
      var dLon = (lon2 - lon1) * Math.PI / 180;
      var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    function projectPointOnSegment(py, px, ay, ax, by, bx) {
      var dx = bx - ax;
      var dy = by - ay;
      var lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return { lat: ay, lng: ax, fraction: 0 };
      
      var t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t)); // clamp to segment
      
      return {
        lat: ay + t * dy,
        lng: ax + t * dx,
        fraction: t
      };
    }

    function findClosestPointOnPolyline(lat, lng, polyline) {
      if (!polyline || polyline.length === 0) return { point: [lat, lng], segmentIndex: 0, fraction: 0 };
      if (polyline.length === 1) return { point: polyline[0], segmentIndex: 0, fraction: 0 };
      
      var minDistance = Infinity;
      var closestPoint = null;
      var bestSegment = 0;
      var bestFraction = 0;
      
      for (var i = 0; i < polyline.length - 1; i++) {
        var p1 = polyline[i];
        var p2 = polyline[i+1];
        
        var projection = projectPointOnSegment(lat, lng, p1[0], p1[1], p2[0], p2[1]);
        var dist = getDistance(lat, lng, projection.lat, projection.lng);
        
        if (dist < minDistance) {
          minDistance = dist;
          closestPoint = [projection.lat, projection.lng];
          bestSegment = i;
          bestFraction = projection.fraction;
        }
      }
      
      return {
        point: closestPoint,
        segmentIndex: bestSegment,
        fraction: bestFraction,
        distance: minDistance
      };
    }

    function getPointAlongPolyline(polyline, segmentIndex, fraction, distanceMeters, direction) {
      if (!polyline || polyline.length === 0) return null;
      if (polyline.length === 1) return { lat: polyline[0][0], lng: polyline[0][1], segmentIndex: 0, fraction: 0 };
      
      var remainingDistance = distanceMeters;
      var currSeg = segmentIndex;
      var currFrac = fraction;
      
      var isReverse = (direction === 'return' || direction === 'reverse' || direction === 'backwards');
      var step = isReverse ? -1 : 1;
      
      while (remainingDistance > 0) {
        var p1 = polyline[currSeg];
        var p2 = polyline[currSeg + 1];
        if (!p1 || !p2) break;
        
        var p1_frac_y = p1[0] + currFrac * (p2[0] - p1[0]);
        var p1_frac_x = p1[1] + currFrac * (p2[1] - p1[1]);
        
        var segRemainingDist = 0;
        if (step === 1) {
          segRemainingDist = getDistance(p1_frac_y, p1_frac_x, p2[0], p2[1]);
        } else {
          segRemainingDist = getDistance(p1_frac_y, p1_frac_x, p1[0], p1[1]);
        }
        
        if (remainingDistance <= segRemainingDist) {
          var ratio = remainingDistance / (segRemainingDist || 1);
          var newFrac = 0;
          if (step === 1) {
            newFrac = currFrac + ratio * (1 - currFrac);
          } else {
            newFrac = currFrac - ratio * currFrac;
          }
          
          var targetLat = p1[0] + newFrac * (p2[0] - p1[0]);
          var targetLng = p1[1] + newFrac * (p2[1] - p1[1]);
          
          return {
            lat: targetLat,
            lng: targetLng,
            segmentIndex: currSeg,
            fraction: newFrac
          };
        }
        
        remainingDistance -= segRemainingDist;
        if (step === 1) {
          if (currSeg >= polyline.length - 2) {
            return {
              lat: polyline[polyline.length - 1][0],
              lng: polyline[polyline.length - 1][1],
              segmentIndex: polyline.length - 2,
              fraction: 1.0
            };
          }
          currSeg++;
          currFrac = 0.0;
        } else {
          if (currSeg <= 0) {
            return {
              lat: polyline[0][0],
              lng: polyline[0][1],
              segmentIndex: 0,
              fraction: 0.0
            };
          }
          currSeg--;
          currFrac = 1.0;
        }
      }
      
      var currentLat = polyline[currSeg][0] + currFrac * (polyline[currSeg+1][0] - polyline[currSeg][0]);
      var currentLng = polyline[currSeg][1] + currFrac * (polyline[currSeg+1][1] - polyline[currSeg][1]);
      return { lat: currentLat, lng: currentLng, segmentIndex: currSeg, fraction: currFrac };
    }

    var vehiclesData = {};
    var vehicleMarkers = {};

    function updateVehicles(vehicles) {
      try {
        var currentIds = {};
        vehicles.forEach(function(v) {
          if (!v.location || !v.location.latitude || !v.location.longitude) return;
          var id = v.id;
          currentIds[id] = true;
          
          var incomingLat = Number(v.location.latitude);
          var incomingLng = Number(v.location.longitude);
          var incomingSpeed = Number(v.speed) || 0;
          var incomingHeading = Number(v.heading) || 0;
          var incomingDirection = v.direction || 'onward';

          if (!vehiclesData[id]) {
            // First time tracking this vehicle
            var proj = findClosestPointOnPolyline(incomingLat, incomingLng, activeRoutePath);
            
            vehiclesData[id] = {
              id: id,
              number: v.number,
              direction: incomingDirection,
              speed: incomingSpeed,
              heading: incomingHeading,
              lastRealLat: incomingLat,
              lastRealLng: incomingLng,
              currentLat: incomingLat,
              currentLng: incomingLng,
              lastUpdateReceivedAt: performance.now(),
              signalStatus: 'active',
              lastPostSec: -1,
              routeSegmentIndex: proj.segmentIndex,
              routeFraction: proj.fraction
            };

            var iconHtml = '<div class="pulse-container">' +
                           '<div class="pulse-base pulse-ring-active pulse-effect-active" id="pulse_base_' + id + '">' +
                           '<span style="color:white;font-size:16px;">🚌</span>' +
                           '</div></div>';
            var vIcon = L.divIcon({
              html: iconHtml,
              className: '',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            });

            var marker = L.marker([incomingLat, incomingLng], {icon: vIcon})
              .bindPopup('<b>Bus ' + v.number + '</b><br/>Status: <b>Live</b><br/>Speed: ' + Math.round(incomingSpeed) + ' km/h')
              .addTo(map);
            
            vehicleMarkers[id] = marker;
          } else {
            var data = vehiclesData[id];
            
            // Check if coordinates represent a new database update
            if (data.lastRealLat !== incomingLat || data.lastRealLng !== incomingLng) {
              
              // GPS drift threshold checking (ignore sudden jumps > 5km)
              var driftDist = getDistance(data.lastRealLat, data.lastRealLng, incomingLat, incomingLng);
              if (driftDist > 5000) {
                console.warn("Ignoring GPS jump of " + Math.round(driftDist) + "m");
                return;
              }

              data.lastRealLat = incomingLat;
              data.lastRealLng = incomingLng;
              data.speed = incomingSpeed;
              data.heading = incomingHeading;
              data.direction = incomingDirection;
              data.lastUpdateReceivedAt = performance.now();

              var proj = findClosestPointOnPolyline(incomingLat, incomingLng, activeRoutePath);
              data.routeSegmentIndex = proj.segmentIndex;
              data.routeFraction = proj.fraction;
            }
          }
        });
        
        // Remove offline/stale query vehicles
        for (var id in vehicleMarkers) {
          if (!currentIds[id]) {
            map.removeLayer(vehicleMarkers[id]);
            delete vehicleMarkers[id];
            delete vehiclesData[id];
          }
        }
      } catch(e) {
        console.error("WebView error updating vehicles: ", e);
      }
    }

    // 60FPS physics/prediction loop
    var lastTickTime = performance.now();
    function tick(now) {
      var dt = (now - lastTickTime) / 1000;
      lastTickTime = now;

      try {
        for (var id in vehiclesData) {
          var data = vehiclesData[id];
          var marker = vehicleMarkers[id];
          if (!marker) continue;
          if (isMapAnimating) continue; // Let Leaflet's zoom pane scale/pan markers natively during transitions

          var elapsedTime = (now - data.lastUpdateReceivedAt) / 1000; // seconds since last GPS update
          
          // 1. Connection Stale Signal Detection
          var newStatus = 'active';
          if (elapsedTime > 10 && elapsedTime <= 30) {
            newStatus = 'weak';
          } else if (elapsedTime > 30) {
            newStatus = 'offline';
          }

          // Trigger bridge status change events back to React Native
          if (data.signalStatus !== newStatus) {
            data.signalStatus = newStatus;
            
            var pulseBase = document.getElementById('pulse_base_' + id);
            if (pulseBase) {
              pulseBase.className = "pulse-base"; // reset classes
              if (newStatus === 'active') {
                pulseBase.classList.add('pulse-ring-active', 'pulse-effect-active');
                pulseBase.parentElement.classList.remove('offline-marker');
              } else if (newStatus === 'weak') {
                pulseBase.classList.add('pulse-ring-weak', 'pulse-effect-weak');
                pulseBase.parentElement.classList.remove('offline-marker');
              } else {
                pulseBase.classList.add('pulse-ring-offline');
                pulseBase.parentElement.classList.add('offline-marker');
              }
            }

            var statusStr = newStatus === 'active' ? 'Live' : (newStatus === 'weak' ? 'Weak Signal' : 'Offline');
            marker.getPopup().setContent('<b>Bus ' + data.number + '</b><br/>Status: <b style="color:' + 
              (newStatus==='active'?'#22C55E':(newStatus==='weak'?'#F97316':'#9CA3AF')) + '">' + statusStr + '</b><br/>Speed: ' + Math.round(data.speed) + ' km/h');

            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'STATUS_CHANGE',
                vehicleId: data.id,
                status: newStatus,
                lastUpdated: Math.round(elapsedTime),
                speed: data.speed
              }));
            }
          }

          // Periodic time update back to React Native UI
          var secInt = Math.floor(elapsedTime);
          if (data.lastPostSec !== secInt) {
            data.lastPostSec = secInt;
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'TIME_UPDATE',
                vehicleId: data.id,
                secondsAgo: secInt,
                status: data.signalStatus,
                speed: data.speed
              }));
            }
          }

          // 2. Telemetry and Prediction calculations
          var targetLat = data.lastRealLat;
          var targetLng = data.lastRealLng;

          if (elapsedTime <= 3) {
            targetLat = data.lastRealLat;
            targetLng = data.lastRealLng;
          } else if (elapsedTime > 3 && elapsedTime <= 30) {
            // Predict movement (Dead reckoning along exact route polyline!)
            var speedMps = (data.speed || 20) / 3.6;
            speedMps = Math.min(Math.max(speedMps, 5), 25); // Clamp speed 18-90 km/h

            // Linear confidence decay to 0 over 30s
            var confidenceDecay = Math.max(0, (30 - elapsedTime) / 27.0);
            var distToMove = speedMps * confidenceDecay * dt;

            if (activeRoutePath && activeRoutePath.length > 1) {
              var newProj = getPointAlongPolyline(
                activeRoutePath, 
                data.routeSegmentIndex, 
                data.routeFraction, 
                distToMove, 
                data.direction
              );
              
              if (newProj) {
                targetLat = newProj.lat;
                targetLng = newProj.lng;
                data.routeSegmentIndex = newProj.segmentIndex;
                data.routeFraction = newProj.fraction;
              }
            } else {
              // Dead reckoning along bearing
              var bearingRad = (data.heading || 0) * Math.PI / 180;
              var metersLat = distToMove * Math.cos(bearingRad);
              var metersLng = distToMove * Math.sin(bearingRad);
              
              targetLat = data.currentLat + (metersLat / 111000);
              targetLng = data.currentLng + (metersLng / (111000 * Math.cos(data.currentLat * Math.PI / 180)));
            }
          } else {
            targetLat = data.currentLat;
            targetLng = data.currentLng;
          }

          // 3. Smooth Delta-time independent Linear catching-up interpolation
          var catchupRate = 1 - Math.exp(-6 * dt);
          var gapDist = getDistance(data.currentLat, data.currentLng, targetLat, targetLng);
          
          if (gapDist > 500) {
            // Reconnection/Snap correction
            data.currentLat = targetLat;
            data.currentLng = targetLng;
          } else {
            data.currentLat += (targetLat - data.currentLat) * catchupRate;
            data.currentLng += (targetLng - data.currentLng) * catchupRate;
          }

          marker.setLatLng([data.currentLat, data.currentLng]);
        }
      } catch(err) {
        console.error("Tick error: ", err);
      }

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // Interactive focus method called from React Native UI
    function focusVehicle(id) {
      try {
        var tracker = vehiclesData[id];
        if (tracker && vehicleMarkers[id]) {
          map.setView([tracker.currentLat, tracker.currentLng], 16, { animate: true });
          vehicleMarkers[id].openPopup();
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
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const webViewRef = useRef(null);
  
  const mapHtml = useMemo(() => routeData ? generateRouteMapHTML(routeData) : '', [routeData]);

  useEffect(() => {
    if (vehicles.length > 0 && webViewRef.current) {
      // Feed telemetry into Leaflet engine
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
                 ? { 
                     ...v, 
                     location: { 
                       latitude: Number(newLoc.latitude), 
                       longitude: Number(newLoc.longitude) 
                     }, 
                     speed: Number(newLoc.speed),
                     heading: Number(newLoc.heading) || v.heading,
                     recordedAt: newLoc.recorded_at,
                     secondsAgo: 0,
                     signalStatus: 'active'
                   }
                 : v
              ));
          });
        }
      });
      
      // Standardize polling fallback interval to 5s
      const interval = setInterval(loadBuses, 5000);
      return () => {
        clearInterval(interval);
        if (subscription) subscription.unsubscribe();
      };
    }
  }, [routeData]);

  const loadBuses = async () => {
    const { vehicles: vData, error } = await getRouteVehicles(routeData.id);
    if (!error) {
      setVehicles(prev => {
        return vData.map(newV => {
          const match = prev.find(p => p.id === newV.id);
          return {
            ...newV,
            signalStatus: match ? match.signalStatus : 'active',
            secondsAgo: match ? match.secondsAgo : 0
          };
        });
      });
      return vData;
    }
    return [];
  };

  const handleFocusVehicle = (id) => {
    setSelectedVehicleId(id);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (typeof focusVehicle === 'function') {
          focusVehicle('${id}');
        }
        true;
      `);
    }
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'STATUS_CHANGE' || data.type === 'TIME_UPDATE') {
        // Synchronize state down to React Native UI
        setVehicles(prev => prev.map(v => 
          v.id === data.vehicleId 
            ? { ...v, signalStatus: data.status, secondsAgo: data.secondsAgo }
            : v
        ));
      }
    } catch (e) {
      console.warn("WebView event parsing error:", e);
    }
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
        onMessage={handleWebViewMessage}
      />

      {/* Header Overlay */}
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

      {/* Premium Live Vehicles Bottom Slider Panel */}
      {vehicles.length > 0 && (
        <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + SPACING.sm }]}>
          <Text style={styles.panelTitle}>Active Vehicles ({vehicles.length})</Text>
          <FlatList
            horizontal
            data={vehicles}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sliderContainer}
            renderItem={({ item }) => {
              const isActive = item.id === selectedVehicleId;
              const seconds = item.secondsAgo ?? 0;
              const signal = item.signalStatus ?? 'active';

              // Determine status styles & labels
              let statusText = 'Live';
              let badgeColor = COLORS.success;
              let bgDotColor = '#22C55E';
              
              if (signal === 'weak') {
                statusText = 'Weak Signal';
                badgeColor = COLORS.warning;
                bgDotColor = '#F97316';
              } else if (signal === 'offline') {
                statusText = 'Offline';
                badgeColor = '#9CA3AF';
                bgDotColor = '#6B7280';
              }

              const formattedTime = seconds === 0 ? 'Just now' : `${seconds}s ago`;

              return (
                <TouchableOpacity 
                  style={[styles.vehicleCard, isActive && styles.vehicleCardActive]}
                  activeOpacity={0.9}
                  onPress={() => handleFocusVehicle(item.id)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.busLabelRow}>
                      <Text style={styles.cardEmoji}>🚌</Text>
                      <Text style={styles.cardBusNumber}>Bus {item.number}</Text>
                    </View>
                    
                    <View style={[styles.statusBadge, { backgroundColor: badgeColor + '15' }]}>
                      <View style={[styles.statusDot, { backgroundColor: bgDotColor }]} />
                      <Text style={[styles.statusBadgeText, { color: badgeColor }]}>{statusText}</Text>
                    </View>
                  </View>

                  <View style={styles.cardStats}>
                    <View style={styles.statCol}>
                      <Text style={styles.statLabel}>SPEED</Text>
                      <Text style={styles.statVal}>{Math.round(item.speed)} km/h</Text>
                    </View>
                    <View style={styles.statCol}>
                      <Text style={styles.statLabel}>LAST UPDATED</Text>
                      <Text style={styles.statVal}>{formattedTime}</Text>
                    </View>
                  </View>

                  <View style={styles.focusActionRow}>
                    <Text style={styles.cardActionText}>Focus on Map</Text>
                    <Ionicons name="scan" size={14} color={COLORS.primary} />
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}
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
  
  // Premium Bottom Panel Styles
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.base,
    zIndex: 99,
    ...SHADOWS.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  panelTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    color: COLORS.text,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sliderContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xs,
    gap: SPACING.base,
  },
  vehicleCard: {
    width: 250,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...SHADOWS.sm,
    marginBottom: SPACING.sm,
  },
  vehicleCardActive: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  busLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardEmoji: {
    fontSize: 16,
  },
  cardBusNumber: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    color: COLORS.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: SPACING.sm,
  },
  statCol: {
    gap: 2,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  statVal: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.text,
  },
  focusActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  cardActionText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
});

export default RouteMapScreen;
