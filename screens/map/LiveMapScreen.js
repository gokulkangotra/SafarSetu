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
import { 
  getLiveVehicleLocations, 
  subscribeToAllVehicleLocations, 
  getVehicleActiveTrip 
} from '../../services/supabaseService';
import { calculateETA, formatETA } from '../../utils/locationUtils';

// Module-level persistent cache for state preservation across screens
let cachedBuses = [];
let cachedUserLocation = null;

const generateMapHTML = (centerLat, centerLng, initialBuses = []) => {
  const centerLatValue = centerLat || 32.7266;
  const centerLngValue = centerLng || 74.8570;

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
      transition: transform 0.3s ease-out;
    }
    .pulse-base {
      background: #1E3A8A;
      border-radius: 50%;
      width: 34px;
      height: 34px;
      border: 3px solid #fff;
      box-shadow: 0 3px 8px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 2;
      position: relative;
    }
    .pulse-ring-active {
      border-color: white;
      box-shadow: 0 0 0 3px #22C55E, 0 3px 8px rgba(0,0,0,0.35);
    }
    .pulse-ring-weak {
      border-color: white;
      box-shadow: 0 0 0 3px #F97316, 0 3px 8px rgba(0,0,0,0.35);
    }
    .pulse-ring-offline {
      border-color: white;
      box-shadow: 0 0 0 3px #9CA3AF, 0 3px 8px rgba(0,0,0,0.35);
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

    .heading-pointer {
      position: absolute;
      top: -8px;
      left: 12px;
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-bottom: 8px solid #22C55E;
      z-index: 3;
    }
    .pointer-active {
      border-bottom-color: #22C55E;
    }
    .pointer-weak {
      border-bottom-color: #F97316;
    }
    .pointer-offline {
      border-bottom-color: #9CA3AF;
      opacity: 0.5;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {zoomControl: false}).setView([${centerLatValue}, ${centerLngValue}], 13);
    
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

    var userIcon = L.divIcon({
      html: '<div style="background:#38BDF8;border-radius:50%;width:20px;height:20px;border:3px solid white;box-shadow:0 2px 8px rgba(56,189,248,0.6);"></div>',
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

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
      
      var isReverse = (direction === 'return' || direction === 'reverse' || direction === 'backward' || direction === 'backwards');
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
    
    // Snapping route globals for the focused/selected vehicle
    var activeRouteLine = null;
    var activeRoutePath = null;
    var activeRouteVehicleId = null;

    function clearActiveRoutePath() {
      if (activeRouteLine) {
        map.removeLayer(activeRouteLine);
        activeRouteLine = null;
      }
      activeRoutePath = null;
      activeRouteVehicleId = null;
    }

    function updateActiveRoutePath(vehicleId, coords, color) {
      clearActiveRoutePath();
      activeRouteVehicleId = vehicleId;
      if (coords && coords.length > 0) {
        activeRoutePath = coords;
        activeRouteLine = L.polyline(coords, {
          color: color || '#1E3A8A',
          weight: 6,
          opacity: 0.8,
          lineJoin: 'round'
        }).addTo(map);
      }
    }

    function updateSingleVehicle(v) {
      try {
        if (!v || !v.id || !v.location || !v.location.latitude || !v.location.longitude) return;
        var id = v.id;
        
        var incomingLat = Number(v.location.latitude);
        var incomingLng = Number(v.location.longitude);
        var incomingSpeed = Number(v.speed) || 0;
        var incomingHeading = Number(v.heading) || 0;
        var incomingDirection = v.direction || 'onward';

        if (!vehiclesData[id]) {
          // Initialize new vehicle
          var initProj = { segmentIndex: 0, fraction: 0 };
          if (activeRouteVehicleId === id && activeRoutePath) {
            initProj = findClosestPointOnPolyline(incomingLat, incomingLng, activeRoutePath);
          }

          vehiclesData[id] = {
            id: id,
            number: v.number,
            direction: incomingDirection,
            speed: incomingSpeed,
            smoothedSpeed: incomingSpeed,
            heading: incomingHeading,
            lastRealLat: incomingLat,
            lastRealLng: incomingLng,
            currentLat: incomingLat,
            currentLng: incomingLng,
            animStartLat: incomingLat,
            animStartLng: incomingLng,
            animEndLat: incomingLat,
            animEndLng: incomingLng,
            animStartTime: 0, // 0 means no animation in progress
            lastUpdateReceivedAt: performance.now(),
            signalStatus: v.signalStatus || 'active',
            lastPostSec: -1,
            routeSegmentIndex: initProj.segmentIndex,
            routeFraction: initProj.fraction
          };

          var iconHtml = '<div class="pulse-container" id="container_' + id + '" style="transform: rotate(' + incomingHeading + 'deg);">' +
                         '<div class="pulse-base pulse-ring-active pulse-effect-active" id="pulse_base_' + id + '">' +
                         '<span style="font-size:16px;">🚌</span>' +
                         '</div>' +
                         '<div class="heading-pointer pointer-active" id="pointer_' + id + '"></div>' +
                         '</div>';

          var vIcon = L.divIcon({
            html: iconHtml,
            className: '',
            iconSize: [34, 34],
            iconAnchor: [17, 17]
          });

          var marker = L.marker([incomingLat, incomingLng], {icon: vIcon})
            .addTo(map)
            .on('click', function() {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'busClick', busId: id}));
              }
            });
          
          vehicleMarkers[id] = marker;
        } else {
          var data = vehiclesData[id];
          
          // Check if coordinates represent a new update
          if (data.lastRealLat !== incomingLat || data.lastRealLng !== incomingLng) {
            var now = performance.now();
            var timeDiff = (now - data.lastUpdateReceivedAt) / 1000;
            var dist = getDistance(data.lastRealLat, data.lastRealLng, incomingLat, incomingLng);

            // Ignore invalid GPS jumps: implied speed > 120 km/h
            if (timeDiff > 0.5) {
              var impliedSpeedKmh = (dist / timeDiff) * 3.6;
              if (impliedSpeedKmh > 120 && dist > 100) {
                console.warn("Ignoring invalid GPS jump: implied speed " + impliedSpeedKmh.toFixed(1) + " km/h, distance " + dist.toFixed(1) + "m");
                return;
              }
            }

            // Ignore huge sudden jumps caused by GPS drift
            if (dist > 3000 && timeDiff < 60) {
              console.warn("Ignoring GPS drift jump: " + dist.toFixed(1) + "m");
              return;
            }

            // If we are in the initial loading window, snap immediately without animating
            if (now - pageLoadedAt < 4000) {
              data.currentLat = incomingLat;
              data.currentLng = incomingLng;
              data.animStartLat = incomingLat;
              data.animStartLng = incomingLng;
              data.animEndLat = incomingLat;
              data.animEndLng = incomingLng;
              data.animStartTime = 0;
            } else {
              // Start smooth linear animation from current rendered position to new real GPS point
              data.animStartLat = data.currentLat;
              data.animStartLng = data.currentLng;
              data.animEndLat = incomingLat;
              data.animEndLng = incomingLng;
              data.animStartTime = now;
            }

            data.lastRealLat = incomingLat;
            data.lastRealLng = incomingLng;
            data.lastUpdateReceivedAt = now;

            // Speed calculation and smoothing
            var calculatedSpeed = incomingSpeed;
            if (calculatedSpeed <= 0 && timeDiff > 0.5) {
              calculatedSpeed = (dist / timeDiff) * 3.6;
            }
            if (data.smoothedSpeed === undefined) {
              data.smoothedSpeed = calculatedSpeed;
            } else {
              data.smoothedSpeed = (data.smoothedSpeed * 0.7) + (calculatedSpeed * 0.3);
            }
            data.speed = data.smoothedSpeed;

            data.heading = incomingHeading;
            data.direction = incomingDirection;

            if (activeRouteVehicleId === id && activeRoutePath) {
              var proj = findClosestPointOnPolyline(incomingLat, incomingLng, activeRoutePath);
              data.routeSegmentIndex = proj.segmentIndex;
              data.routeFraction = proj.fraction;
            }
          }
        }
      } catch (err) {
        console.error("WebView error updating single vehicle:", err);
      }
    }

    function updateBuses(busesList) {
      try {
        var currentIds = {};
        busesList.forEach(function(v) {
          if (!v || !v.id) return;
          currentIds[v.id] = true;
          updateSingleVehicle(v);
        });

        // Remove stale vehicle markers
        for (var id in vehicleMarkers) {
          if (!currentIds[id]) {
            map.removeLayer(vehicleMarkers[id]);
            delete vehicleMarkers[id];
            delete vehiclesData[id];
          }
        }
      } catch (e) {
        console.error("WebView error batch updating buses:", e);
      }
    }

    var pageLoadedAt = performance.now();

    // 60FPS physics and dead reckoning prediction loop
    var lastTickTime = performance.now();
    function tick(now) {
      var dt = (now - lastTickTime) / 1000;
      lastTickTime = now;

      try {
        for (var id in vehiclesData) {
          var data = vehiclesData[id];
          var marker = vehicleMarkers[id];
          if (!marker) continue;
          if (isMapAnimating) continue;

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
            var pointer = document.getElementById('pointer_' + id);
            
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
            
            if (pointer) {
              pointer.className = "heading-pointer";
              if (newStatus === 'active') {
                pointer.classList.add('pointer-active');
              } else if (newStatus === 'weak') {
                pointer.classList.add('pointer-weak');
              } else {
                pointer.classList.add('pointer-offline');
              }
            }

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

          // 2. Smooth Marker Animation (Linear, 1.8 seconds duration)
          var ANIM_DURATION = 1800; // ms
          if (data.animStartTime > 0) {
            var elapsedAnim = now - data.animStartTime;
            if (elapsedAnim < ANIM_DURATION) {
              var t = elapsedAnim / ANIM_DURATION;
              // Linear interpolation
              data.currentLat = data.animStartLat + (data.animEndLat - data.animStartLat) * t;
              data.currentLng = data.animStartLng + (data.animEndLng - data.animStartLng) * t;
            } else {
              // Animation completed
              data.currentLat = data.animEndLat;
              data.currentLng = data.animEndLng;
              data.animStartTime = 0; // stop animating
            }
          } else {
            // Keep marker fixed at target GPS location
            data.currentLat = data.animEndLat;
            data.currentLng = data.animEndLng;
          }

          marker.setLatLng([data.currentLat, data.currentLng]);

          // Update rotation dynamically
          var container = document.getElementById('container_' + id);
          if (container) {
            container.style.transform = 'rotate(' + (data.heading || 0) + 'deg)';
          }
        }
      } catch(err) {
        console.error("Tick error: ", err);
      }

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    function focusVehicle(id) {
      try {
        var tracker = vehiclesData[id];
        if (tracker && vehicleMarkers[id]) {
          map.setView([tracker.currentLat, tracker.currentLng], 15, { animate: true });
        }
      } catch(e) {}
    }

    // Render initial cached vehicles immediately on map load
    var initialBuses = ${JSON.stringify(initialBuses)};
    if (initialBuses && initialBuses.length > 0) {
      initialBuses.forEach(function(v) {
        updateSingleVehicle(v);
      });
    }

    L.control.zoom({position: 'bottomright'}).addTo(map);
  </script>
</body>
</html>`;
};

const LiveMapScreen = () => {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);
  const [buses, setBuses] = useState(cachedBuses);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [showBusPanel, setShowBusPanel] = useState(false);
  const [busCount, setBusCount] = useState(cachedBuses.length);
  const [userLocation, setUserLocation] = useState(cachedUserLocation);
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Jammu city coordinates as default
  const JAMMU_LAT = 32.7266;
  const JAMMU_LNG = 74.8570;

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const loc = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(loc);
        cachedUserLocation = loc; // Update persistent cache
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
      cachedBuses = liveVehicles; // Update persistent cache
      setBusCount(liveVehicles.length);
    } else {
      console.log('Live vehicle load error:', error);
    }
  };

  useEffect(() => {
    requestLocationPermission();
    loadLiveVehicles();

    // Set up Supabase Realtime Subscription instead of polling
    let subscription = null;
    subscription = subscribeToAllVehicleLocations((newLoc) => {
      setBuses((prev) => {
        const match = prev.find((b) => b.id === newLoc.vehicle_id);
        let updatedList;
        if (match) {
          const updatedBus = {
            ...match,
            location: {
              latitude: Number(newLoc.latitude),
              longitude: Number(newLoc.longitude),
            },
            speed: Number(newLoc.speed) || 0,
            heading: Number(newLoc.heading) || 0,
            recordedAt: newLoc.recorded_at,
            secondsAgo: 0,
            signalStatus: 'active',
          };

          // Performance Optimization: Inject single vehicle delta telemetry update
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
              if (typeof updateSingleVehicle === 'function') {
                updateSingleVehicle(${JSON.stringify(updatedBus)});
              }
              true;
            `);
          }

          updatedList = prev.map((b) => (b.id === newLoc.vehicle_id ? updatedBus : b));
        } else {
          // If a new vehicle has joined tracking dynamically, add it with default details
          const newBus = {
            id: newLoc.vehicle_id,
            number: newLoc.vehicle_number || newLoc.vehicle_id,
            capacity: 40,
            vehicleType: 'bus',
            speed: Number(newLoc.speed) || 0,
            heading: Number(newLoc.heading) || 0,
            location: {
              latitude: Number(newLoc.latitude),
              longitude: Number(newLoc.longitude),
            },
            recordedAt: newLoc.recorded_at,
            secondsAgo: 0,
            signalStatus: 'active',
          };

          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
              if (typeof updateSingleVehicle === 'function') {
                updateSingleVehicle(${JSON.stringify(newBus)});
              }
              true;
            `);
          }

          updatedList = [...prev, newBus];
        }
        cachedBuses = updatedList; // Update persistent cache
        return updatedList;
      });
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // Performance Optimization: Batch inject full list only when total bus count changes
  useEffect(() => {
    if (webViewRef.current && buses.length > 0) {
      webViewRef.current.injectJavaScript(`
        if (typeof updateBuses === 'function') {
          updateBuses(${JSON.stringify(buses)});
        }
        true;
      `);
    }
  }, [buses.length]);

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
        if (bus) showPanel(bus.id);
      } else if (data.type === 'STATUS_CHANGE' || data.type === 'TIME_UPDATE') {
        // Dynamic status/time updates from WebView physics engine
        setBuses((prev) => {
          const updatedList = prev.map((v) =>
            v.id === data.vehicleId
              ? { ...v, signalStatus: data.status, secondsAgo: data.secondsAgo, speed: data.speed }
              : v
          );
          cachedBuses = updatedList; // Update persistent cache
          return updatedList;
        });
      }
    } catch (e) {
      console.log('WebView message error', e);
    }
  };

  const centerOnBus = () => {
    const targetBus = buses.find((bus) => bus.id === selectedBusId) || buses[0];
    if (targetBus && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (typeof focusVehicle === 'function') {
          focusVehicle('${targetBus.id}');
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

  const fetchActiveTripAndRoute = async (busId) => {
    try {
      const { trip, error } = await getVehicleActiveTrip(busId);
      if (!error && trip && trip.route) {
        const routeData = trip.route;
        const validStops = (routeData.stops || []).filter((s) => s.latitude && s.longitude);

        if (validStops.length > 1) {
          const osrmCoords = validStops.map((s) => `${s.longitude},${s.latitude}`).join(';');
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson`;

          fetch(osrmUrl)
            .then((res) => res.json())
            .then((data) => {
              if (data.routes && data.routes.length > 0) {
                const routeCoords = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
                // Inject route coords into WebView for OSRM snapping
                if (webViewRef.current) {
                  webViewRef.current.injectJavaScript(`
                    if (typeof updateActiveRoutePath === 'function') {
                      updateActiveRoutePath('${busId}', ${JSON.stringify(routeCoords)}, '${routeData.color || '#1E3A8A'}');
                    }
                    true;
                  `);
                }
              }
            })
            .catch((err) => {
              console.warn('OSRM routing query failed for LiveMapScreen:', err);
              // Fallback to straight lines connecting stops
              const fallbackCoords = validStops.map((s) => [s.latitude, s.longitude]);
              if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`
                  if (typeof updateActiveRoutePath === 'function') {
                    updateActiveRoutePath('${busId}', ${JSON.stringify(fallbackCoords)}, '${routeData.color || '#1E3A8A'}');
                  }
                  true;
                `);
              }
            });
        }
      } else {
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            if (typeof clearActiveRoutePath === 'function') {
              clearActiveRoutePath();
            }
            true;
          `);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch active trip details:', e);
    }
  };

  const showPanel = (busId) => {
    setSelectedBusId(busId);
    setShowBusPanel(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 7,
      tension: 80,
      useNativeDriver: true,
    }).start();

    // Dynamically retrieve active route & stops to load street-snapped path
    fetchActiveTripAndRoute(busId);
  };

  const hidePanel = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowBusPanel(false);
      setSelectedBusId(null);

      // Clear the drawn route line from WebView
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          if (typeof clearActiveRoutePath === 'function') {
            clearActiveRoutePath();
          }
          true;
        `);
      }
    });
  };

  const initialBusesRef = useRef(cachedBuses);
  const centerLat = userLocation?.latitude || buses[0]?.location.latitude || JAMMU_LAT;
  const centerLng = userLocation?.longitude || buses[0]?.location.longitude || JAMMU_LNG;
  const mapHtml = useRef(generateMapHTML(centerLat, centerLng, initialBusesRef.current)).current;

  const selectedBus = buses.find((bus) => bus.id === selectedBusId);

  let liveBusEta = 'Live';
  if (selectedBus && userLocation) {
    const calculated = calculateETA(
      selectedBus.location.latitude,
      selectedBus.location.longitude,
      userLocation.latitude,
      userLocation.longitude,
      selectedBus.speed
    );
    if (calculated) {
      liveBusEta = formatETA(calculated.durationMins, true);
    }
  }

  // Determine real-time signal colors and status texts
  let bgDotColor = '#22C55E';
  let statusText = 'Live';
  let formattedTime = 'Just now';

  if (selectedBus) {
    const seconds = selectedBus.secondsAgo ?? 0;
    const signal = selectedBus.signalStatus ?? 'active';

    if (signal === 'weak') {
      statusText = 'Weak Signal';
      bgDotColor = '#F97316';
    } else if (signal === 'offline') {
      statusText = 'No Signal';
      bgDotColor = '#6B7280';
    }

    formattedTime = seconds === 0 ? 'Just now' : `${seconds}s ago`;
  }

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
            <Text style={styles.busPanelNumber}>Bus {selectedBus.number}</Text>
            <View style={styles.busPanelEtaBadge}>
              <Text style={styles.busPanelEtaText}>{liveBusEta}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={hidePanel}>
              <Ionicons name="close" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.busPanelBody}>
            <View style={styles.panelInfoRow}>
              <View style={styles.panelInfoItem}>
                <Text style={styles.panelLabel}>Speed</Text>
                <Text style={styles.panelValue}>{Math.round(selectedBus.speed)} km/h</Text>
              </View>
              <View style={styles.panelInfoItem}>
                <Text style={styles.panelLabel}>Capacity</Text>
                <Text style={styles.panelValue}>{selectedBus.capacity} passengers</Text>
              </View>
            </View>
            <View style={styles.panelRoute}>
              <View style={styles.panelRouteItem}>
                <View style={[styles.routeDot, { backgroundColor: bgDotColor }]} />
                <Text style={styles.panelRouteText}>
                  {statusText} • Updated {formattedTime}
                </Text>
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
