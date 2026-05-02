import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

const NotificationInboxScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { notificationHistory } = useUserPreferences();

  const renderItem = ({ item }) => {
    const isArriving = item.title.includes('Arriving');
    const date = new Date(item.timestamp);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

    return (
      <View style={styles.notificationCard}>
        <View style={[styles.iconBox, { backgroundColor: isArriving ? COLORS.warning + '20' : COLORS.success + '20' }]}>
          <Ionicons 
            name={isArriving ? "bus" : "play"} 
            size={24} 
            color={isArriving ? COLORS.warning : COLORS.success} 
          />
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.timestamp}>{dateString} at {timeString}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={COLORS.gradientPrimary} style={styles.header} start={{x:0, y:0}} end={{x:1, y:0}}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      {notificationHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No Notifications Yet</Text>
          <Text style={styles.emptyText}>When a bus on your saved routes starts its journey or approaches your stop, the alert will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={notificationHistory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, marginTop: SPACING.md },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
  listContent: {
    padding: SPACING.base,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: FONTS.sizes.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  body: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    fontWeight: '500',
  }
});

export default NotificationInboxScreen;
