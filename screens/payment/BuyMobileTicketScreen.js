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
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import GradientButton from '../../components/GradientButton';

const BuyMobileTicketScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedRoute, setSelectedRoute] = useState(null);
  const [startStop, setStartStop] = useState(null);
  const [endStop, setEndStop] = useState(null);

  const [pickerType, setPickerType] = useState(null); // 'route', 'start', 'end'
  const [isPickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    const fetchRoutes = async () => {
      const { routes: fetchedRoutes, error } = await getRoutes();
      if (!error) {
        setRoutes(fetchedRoutes);
      }
      setLoading(false);
    };
    fetchRoutes();
  }, []);

  const handleNext = () => {
    if (!selectedRoute || !startStop || !endStop) {
      Alert.alert('Incomplete', 'Please select route, start stop, and end stop.');
      return;
    }

    const stops = selectedRoute.stops || [];
    let distance = 0;
    const sortedStops = [...stops].sort((a,b) => a.order - b.order);
    
    let counting = false;
    for (const stop of sortedStops) {
      if (counting) {
        distance += (stop.distanceFromPrevKm || 0);
      }
      if (stop.id === startStop.id) {
        counting = true;
      }
      if (stop.id === endStop.id) {
        break;
      }
    }

    const calculatedFare = Math.max(10, Math.round(distance * 4));

    navigation.navigate('Payment', {
      customTicket: {
        route: selectedRoute,
        from: startStop.name,
        to: endStop.name,
        fare: calculatedFare,
        distance,
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
          } else if (pickerType === 'start') {
            setStartStop(item);
            if (endStop && endStop.order <= item.order) {
              setEndStop(null);
            }
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
    
    const stops = [...(selectedRoute.stops || [])].sort((a,b) => a.order - b.order);
    
    if (pickerType === 'start') {
      return stops.slice(0, stops.length - 1);
    }
    if (pickerType === 'end') {
      if (!startStop) return stops;
      return stops.filter(s => s.order > startStop.order);
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
  }
});

export default BuyMobileTicketScreen;
