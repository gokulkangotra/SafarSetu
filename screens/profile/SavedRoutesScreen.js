import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getRoutes } from '../../services/supabaseService';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import RouteCard from '../../components/RouteCard';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

const SavedRoutesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { savedRoutes } = useUserPreferences();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSavedRoutes = async () => {
      const { routes: allRoutes } = await getRoutes();
      if (allRoutes) {
        setRoutes(allRoutes.filter(r => savedRoutes.includes(r.id)));
      }
      setLoading(false);
    };
    fetchSavedRoutes();
  }, [savedRoutes]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={COLORS.gradientPrimary} style={styles.header} start={{x:0, y:0}} end={{x:1, y:0}}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Routes</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : routes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-dislike-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No Saved Routes</Text>
          <Text style={styles.emptyText}>Save your frequent routes for quick access.</Text>
        </View>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: SPACING.base }}
          renderItem={({ item }) => (
            <RouteCard
              route={item}
              onPress={() => navigation.navigate('Routes', { screen: 'RouteDetail', params: { route: item }})}
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.base,
  },
  headerTitle: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, marginTop: SPACING.md },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
});

export default SavedRoutesScreen;
