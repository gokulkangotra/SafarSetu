import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRoutes } from '../../services/supabaseService';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

const BuyMobileTicketScreen = ({ navigation }) => {
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

    // Calculate distance
    const stops = selectedRoute.stops || [];
    let distance = 0;
    
    // Sort stops just to be sure
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
    if (pickerType === 'route') {
      label = `Route ${item.number} - ${item.name}`;
    } else {
      label = item.name;
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
            // Reset end stop if it is before start stop
            if (endStop && endStop.order <= item.order) {
              setEndStop(null);
            }
          } else if (pickerType === 'end') {
            setEndStop(item);
          }
          setPickerVisible(false);
        }}
      >
        <Text style={styles.pickerItemText}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const getPickerData = () => {
    if (pickerType === 'route') return routes;
    if (!selectedRoute) return [];
    
    const stops = [...(selectedRoute.stops || [])].sort((a,b) => a.order - b.order);
    
    if (pickerType === 'start') {
      // Cannot select the very last stop as start stop
      return stops.slice(0, stops.length - 1);
    }
    if (pickerType === 'end') {
      // Only show stops AFTER the start stop
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Trip</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FF7F00" />
        </View>
      ) : (
        <View style={styles.content}>
          <TouchableOpacity 
            style={styles.inputContainer} 
            onPress={() => openPicker('route')}
          >
            <Text style={[styles.inputText, !selectedRoute && styles.placeholderText]}>
              {selectedRoute ? `Route ${selectedRoute.number}` : 'Enter route number'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.inputContainer} 
            onPress={() => openPicker('start')}
          >
            <Text style={[styles.inputText, !startStop && styles.placeholderText]}>
              {startStop ? startStop.name : 'Enter start stop'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.inputContainer} 
            onPress={() => openPicker('end')}
          >
            <Text style={[styles.inputText, !endStop && styles.placeholderText]}>
              {endStop ? endStop.name : 'Enter end stop'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>NEXT</Text>
          </TouchableOpacity>
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
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={getPickerData()}
              keyExtractor={item => item.id}
              renderItem={renderPickerItem}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  content: {
    padding: 24,
  },
  inputContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 16,
    marginBottom: 8,
  },
  inputText: {
    fontSize: 16,
    color: '#000000',
  },
  placeholderText: {
    color: '#A0A0A0',
  },
  nextButton: {
    backgroundColor: '#FF7A00',
    borderRadius: 4,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  pickerItem: {
    padding: 16,
    paddingHorizontal: 20,
  },
  pickerItemText: {
    fontSize: 16,
    color: '#333',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
  }
});

export default BuyMobileTicketScreen;
