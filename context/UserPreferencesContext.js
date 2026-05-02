import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { getRouteVehicles, getRouteById } from '../services/supabaseService';
import { getDistance, calculateETA } from '../utils/locationUtils';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const UserPreferencesContext = createContext(null);
const PREFS_KEY = 'safarsetu_user_prefs';

export const UserPreferencesProvider = ({ children }) => {
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [notificationRoutes, setNotificationRoutes] = useState([]);
  const [notificationHistory, setNotificationHistory] = useState([]);
  
  // Track notifications to prevent spam (vehicle_id -> true)
  const notifiedStarted = useRef({});
  const notifiedReaching = useRef({});

  useEffect(() => {
    loadPreferences();
    requestPermissions();
  }, []);

  useEffect(() => {
    // Start polling if we have active notification routes
    let interval;
    if (notificationRoutes.length > 0) {
      pollVehicles(); // initial poll
      interval = setInterval(pollVehicles, 30000); // every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [notificationRoutes]);

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permissions not granted');
    }
  };

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(PREFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSavedRoutes(parsed.savedRoutes || []);
        setNotificationRoutes(parsed.notificationRoutes || []);
        setNotificationHistory(parsed.notificationHistory || []);
      }
    } catch (e) {
      console.log('Failed to load preferences', e);
    }
  };

  const savePreferences = async (saved, notified, history = notificationHistory) => {
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({
        savedRoutes: saved,
        notificationRoutes: notified,
        notificationHistory: history
      }));
    } catch (e) {
      console.log('Failed to save preferences', e);
    }
  };

  const toggleSaveRoute = (routeId) => {
    let newSaved;
    if (savedRoutes.includes(routeId)) {
      newSaved = savedRoutes.filter(id => id !== routeId);
    } else {
      newSaved = [...savedRoutes, routeId];
    }
    setSavedRoutes(newSaved);
    savePreferences(newSaved, notificationRoutes);
  };

  const toggleNotifyRoute = (routeId) => {
    let newNotified;
    if (notificationRoutes.includes(routeId)) {
      newNotified = notificationRoutes.filter(id => id !== routeId);
    } else {
      newNotified = [...notificationRoutes, routeId];
    }
    setNotificationRoutes(newNotified);
    savePreferences(savedRoutes, newNotified, notificationHistory);
  };

  const addNotificationToHistory = (title, body) => {
    const newAlert = { id: Date.now().toString(), title, body, timestamp: new Date().toISOString() };
    const updated = [newAlert, ...notificationHistory].slice(0, 50); // Keep last 50
    setNotificationHistory(updated);
    savePreferences(savedRoutes, notificationRoutes, updated);
  };

  const isRouteSaved = (routeId) => savedRoutes.includes(routeId);
  const isRouteNotified = (routeId) => notificationRoutes.includes(routeId);

  const pollVehicles = async () => {
    try {
      let userLocation = null;
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        userLocation = loc.coords;
      }

      for (const routeId of notificationRoutes) {
        const { route } = await getRouteById(routeId);
        const { vehicles } = await getRouteVehicles(routeId);
        
        if (!route || !vehicles) continue;

        // Find user's nearest stop on this route
        let nearestStop = null;
        let minStopDist = Infinity;

        if (userLocation && route.stops) {
          route.stops.forEach(st => {
            if (st.latitude && st.longitude) {
              const d = getDistance(userLocation.latitude, userLocation.longitude, st.latitude, st.longitude);
              if (d !== null && d < minStopDist) {
                minStopDist = d;
                nearestStop = st;
              }
            }
          });
        }

        vehicles.forEach(vehicle => {
          const vId = vehicle.id;
          
          // 1. Check if just started (speed > 0 and we haven't notified)
          if (!notifiedStarted.current[vId]) {
            const title = `Bus Started Journey 🚌`;
            const body = `A bus on Route ${route.number} (${route.name}) has started its journey!`;
            Notifications.scheduleNotificationAsync({
              content: { title, body },
              trigger: null, // immediate
            });
            addNotificationToHistory(title, body);
            notifiedStarted.current[vId] = true;
          }

          // 2. Check if reaching nearest stop
          if (nearestStop && vehicle.location && !notifiedReaching.current[vId]) {
            const etaData = calculateETA(
              vehicle.location.latitude, 
              vehicle.location.longitude, 
              nearestStop.latitude, 
              nearestStop.longitude, 
              vehicle.speed || 25
            );

            if (etaData && etaData.distanceKm <= 3.0) { // within 3 km
              const title = `Bus Arriving Soon! 🚍`;
              const body = `Bus on Route ${route.number} is reaching your location "${nearestStop.name}" in ${etaData.durationMins} mins.`;
              Notifications.scheduleNotificationAsync({
                content: { title, body },
                trigger: null,
              });
              addNotificationToHistory(title, body);
              notifiedReaching.current[vId] = true;
            }
          }
        });
      }
    } catch (e) {
      console.log('Error polling vehicles for notifications:', e);
    }
  };

  return (
    <UserPreferencesContext.Provider value={{
      savedRoutes,
      notificationRoutes,
      notificationHistory,
      toggleSaveRoute,
      toggleNotifyRoute,
      isRouteSaved,
      isRouteNotified
    }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (!context) throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  return context;
};

export default UserPreferencesContext;
