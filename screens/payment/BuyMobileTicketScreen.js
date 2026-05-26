import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getRoutes } from '../../services/supabaseService';
import { getDistance, getOrderedStops } from '../../utils/locationUtils';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import GradientButton from '../../components/GradientButton';

const BuyMobileTicketScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedRoute, setSelectedRoute] = useState(null);
  const [startStop, setStartStop] = useState(null);
  const [endStop, setEndStop] = useState(null);
  const [direction, setDirection] = useState('onward');
  const [isAutoSelected, setIsAutoSelected] = useState(false);

  const [pickerType, setPickerType] = useState(null); // 'route', 'start', 'end'
  const [isPickerVisible, setPickerVisible] = useState(false);

  const findNearestStop = React.useCallback((location, stops) => {
    if (!location || !stops || stops.length === 0) return null;
    let minDistance = Infinity;
    let nearest = null;
    stops.forEach((s) => {
      const d = getDistance(location.latitude, location.longitude, s.latitude, s.longitude);
      if (d !== null && d < minDistance) {
        minDistance = d;
        nearest = s;
      }
    });
    return nearest;
  }, []);

  useEffect(() => {
    const fetchRoutes = async () => {
      setLoading(true);
      const { routes: fetchedRoutes, error } = await getRoutes();
      if (!error) {
        setRoutes(fetchedRoutes);
        
        const passedRoute = route.params?.routeData;
        const userLoc = route.params?.userLocation;
        
        if (passedRoute) {
          setSelectedRoute(passedRoute);
          const rStops = passedRoute.stops || [];
          let nearest = findNearestStop(userLoc, rStops);
          
          if (!nearest && rStops.length > 0) {
            nearest = [...rStops].sort((a,b) => a.order - b.order)[0];
          }
          
          if (nearest) {
            setStartStop(nearest);
            setIsAutoSelected(!!userLoc && !!nearest);
          }
        }
      }
      setLoading(false);
    };
    fetchRoutes();
  }, [route.params, findNearestStop]);

  const orderedStops = React.useMemo(() => {
    if (!selectedRoute) return [];
    return getOrderedStops(selectedRoute.stops, direction);
  }, [selectedRoute, direction]);

  const handleNext = () => {
    if (!selectedRoute || !startStop || !endStop) {
      Alert.alert('Incomplete', 'Please select route, start stop, and end stop.');
      return;
    }

    const stops = selectedRoute.stops || [];
    const allStopsForward = [...stops].sort((a, b) => a.order - b.order);
    
    const startIdx = allStopsForward.findIndex(s => s.id === startStop.id);
    const endIdx = allStopsForward.findIndex(s => s.id === endStop.id);
    
    if (startIdx === -1 || endIdx === -1) {
       Alert.alert('Error', 'Invalid stops selected.');
       return;
    }

    const low = Math.min(startIdx, endIdx);
    const high = Math.max(startIdx, endIdx);
    
    let distance = 0;
    for (let i = low + 1; i <= high; i++) {
      distance += (allStopsForward[i].distanceFromPrevKm || 0);
    }

    const calculatedFare = Math.max(10, Math.round(distance * 4));

    navigation.navigate('Payment', {
      customTicket: {
        route: selectedRoute,
        from: startStop.name,
        to: endStop.name,
        fare: calculatedFare,
        distance,
        direction,
      }
    });
  };

  const renderPickerItem = ({ item }) => {
    let label = '';
    let icon = '';
    if (pickerType === 'route') {
      label = `Route ${item.number}_ ${item.source} to ${item.destination}`;
      icon = 'bus-outline';
    } else {
      label = item.name;
      icon = 'location-outline';
    }

    return (
      <TouchableOpacity 
        style={styles.pickerItem}
        onPress={() => {
          if (pickerType === 'route') {
            setSelectedRoute(item);
            setStartStop(null);
            setEndStop(null);
            setIsAutoSelected(false);
          } else if (pickerType === 'start') {
            setStartStop(item);
            setEndStop(null); // Force pick new destination
            setIsAutoSelected(false);
          } else if (pickerType === 'end') {
            setEndStop(item);
          }
          setPickerVisible(false);
        }}
      >
        <View style={styles.pickerItemIconBox}>
          <Ionicons name={icon} size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.pickerItemText}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const getPickerData = () => {
    if (pickerType === 'route') return routes;
    if (!selectedRoute) return [];
    
    if (pickerType === 'start') {
      return orderedStops.slice(0, orderedStops.length - 1);
    }
    if (pickerType === 'end') {
      if (!startStop) return orderedStops;
      const sIdx = orderedStops.findIndex(s => s.id === startStop.id);
      if (sIdx === -1) return orderedStops;
      return orderedStops.slice(sIdx + 1);
    }
    return [];
  };

  const openPicker = (type) => {
    if (type !== 'route' && !selectedRoute) {
      Alert.alert('Select Route', 'Please select a route first.');
      return;
    }
    if (type === 'end' && !startStop) {
      Alert.alert('Select Start', 'Please select a start stop first.');
      return;
    }
    setPickerType(type);
    setPickerVisible(true);
  };

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
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Trip</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>Loading routes...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Plan Your Journey</Text>
          
          {/* Smart Direction Selector */}
          <View style={styles.filterContainer}>
            {[
              { key: 'onward', label: 'Onward' },
              { key: 'backward', label: 'Return' }
            ].map((item) => {
              const isActive = direction === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.filterButton, isActive ? styles.activeFilterButton : styles.inactiveFilterButton]}
                  onPress={() => {
                    setDirection(item.key);
                    setStartStop(null);
                    setEndStop(null);
                    setIsAutoSelected(false);
                  }}
                >
                  <Text style={[styles.filterButtonText, isActive ? styles.activeFilterButtonText : styles.inactiveFilterButtonText]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.inputContainer} 
              onPress={() => openPicker('route')}
              activeOpacity={0.7}
            >
              <View style={styles.inputIconBox}>
                <Ionicons name="bus" size={20} color={selectedRoute ? COLORS.primary : COLORS.textLight} />
              </View>
              <View style={styles.inputTextContainer}>
                <Text style={styles.inputLabel}>Route</Text>
                <Text style={[styles.inputText, !selectedRoute && styles.placeholderText]}>
                  {selectedRoute ? `Route ${selectedRoute.number}_ ${selectedRoute.source} to ${selectedRoute.destination}` : 'Select a route'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.inputContainer} 
              onPress={() => openPicker('start')}
              activeOpacity={0.7}
            >
              <View style={[styles.inputIconBox, { backgroundColor: COLORS.success + '15' }]}>
                <Ionicons name="location" size={20} color={startStop ? COLORS.success : COLORS.textLight} />
              </View>
              <View style={styles.inputTextContainer}>
                <Text style={styles.inputLabel}>From</Text>
                <Text style={[styles.inputText, !startStop && styles.placeholderText]}>
                  {startStop ? startStop.name : 'Select start stop'}
                </Text>
                {isAutoSelected && startStop && (
                  <View style={styles.autoSelectedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                    <Text style={styles.autoSelectedText}>Nearest Stop Auto Selected</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
            </TouchableOpacity>

            <View style={styles.timelineLine} />
            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.inputContainer} 
              onPress={() => openPicker('end')}
              activeOpacity={0.7}
            >
              <View style={[styles.inputIconBox, { backgroundColor: COLORS.secondary + '15' }]}>
                <Ionicons name="location" size={20} color={endStop ? COLORS.secondary : COLORS.textLight} />
              </View>
              <View style={styles.inputTextContainer}>
                <Text style={styles.inputLabel}>To</Text>
                <Text style={[styles.inputText, !endStop && styles.placeholderText]}>
                  {endStop ? endStop.name : 'Select end stop'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          <GradientButton 
            title="Continue to Payment" 
            onPress={handleNext}
            size="lg"
            style={styles.nextButton}
            disabled={!selectedRoute || !startStop || !endStop}
          />
        </View>
      )}

      {/* Picker Modal */}
      <Modal visible={isPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pickerType === 'route' ? 'Select Route' : pickerType === 'start' ? 'Select Start Stop' : 'Select End Stop'}
              </Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={getPickerData()}
              keyExtractor={item => item.id}
              renderItem={renderPickerItem}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xl }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  content: {
    padding: SPACING.base,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    ...SHADOWS.md,
    marginBottom: SPACING.xl,
    position: 'relative',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  inputIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  inputTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  placeholderText: {
    color: COLORS.textLight,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
    marginLeft: 56, // Align with text
  },
  timelineLine: {
    position: 'absolute',
    left: 36, // 16 padding + 20 half of icon box
    top: 130, // roughly between start and end stop icons
    width: 2,
    height: 30,
    backgroundColor: COLORS.border,
    borderStyle: 'dashed',
    zIndex: -1,
  },
  nextButton: {
    marginTop: SPACING.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    maxHeight: '80%',
    paddingTop: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    color: COLORS.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  pickerItemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  pickerItemText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: SPACING.xl + 36 + SPACING.md,
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
  autoSelectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  autoSelectedText: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: '600',
  },
});

export default BuyMobileTicketScreen;
