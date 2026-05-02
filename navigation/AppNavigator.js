// AppNavigator.js — Bottom tab + nested stack navigators for main app

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import RoutesScreen from '../screens/routes/RoutesScreen';
import RouteDetailScreen from '../screens/routes/RouteDetailScreen';
import RouteMapScreen from '../screens/routes/RouteMapScreen';
import LiveMapScreen from '../screens/map/LiveMapScreen';
import PaymentScreen from '../screens/payment/PaymentScreen';
import PaymentHistoryScreen from '../screens/payment/PaymentHistoryScreen';
import BuyMobileTicketScreen from '../screens/payment/BuyMobileTicketScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SavedRoutesScreen from '../screens/profile/SavedRoutesScreen';
import HelpSupportScreen from '../screens/profile/HelpSupportScreen';
import AboutScreen from '../screens/profile/AboutScreen';
import NotificationInboxScreen from '../screens/profile/NotificationInboxScreen';
import { useUserPreferences } from '../context/UserPreferencesContext';

import { COLORS, FONTS, SHADOWS } from '../constants/theme';

const Tab = createBottomTabNavigator();
const RoutesStack = createStackNavigator();
const PaymentStack = createStackNavigator();
const ProfileStack = createStackNavigator();

// --- Stacks ---

const RoutesStackNav = () => (
  <RoutesStack.Navigator screenOptions={{ headerShown: false }}>
    <RoutesStack.Screen name="RoutesList" component={RoutesScreen} />
    <RoutesStack.Screen name="RouteDetail" component={RouteDetailScreen} />
    <RoutesStack.Screen name="RouteMap" component={RouteMapScreen} />
  </RoutesStack.Navigator>
);

const PaymentStackNav = () => (
  <PaymentStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="BuyMobileTicket">
    <PaymentStack.Screen name="BuyMobileTicket" component={BuyMobileTicketScreen} />
    <PaymentStack.Screen name="Payment" component={PaymentScreen} />
    <PaymentStack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
  </PaymentStack.Navigator>
);

const ProfileStackNav = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
    <ProfileStack.Screen name="SavedRoutes" component={SavedRoutesScreen} />
    <ProfileStack.Screen name="NotificationInbox" component={NotificationInboxScreen} />
    <ProfileStack.Screen name="HelpSupport" component={HelpSupportScreen} />
    <ProfileStack.Screen name="About" component={AboutScreen} />
  </ProfileStack.Navigator>
);

// --- Custom Tab Bar Label ---
const TabLabel = ({ label, focused }) => (
  <Text
    style={[
      styles.tabLabel,
      focused && styles.tabLabelActive,
    ]}
  >
    {label}
  </Text>
);

// --- Custom Tab Icon ---
const TabIcon = ({ name, focused, badge }) => (
  <View style={styles.tabIconWrapper}>
    <Ionicons
      name={name}
      size={22}
      color={focused ? COLORS.primary : COLORS.textLight}
    />
    {badge > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
      </View>
    )}
  </View>
);

// --- Main Tab Navigator ---
const AppNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarShowLabel: true,
      tabBarStyle: styles.tabBar,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textLight,
      tabBarItemStyle: styles.tabItem,
    }}
  >
    <Tab.Screen
      name="Routes"
      component={RoutesStackNav}
      options={{
        tabBarLabel: ({ focused }) => <TabLabel label="Routes" focused={focused} />,
        tabBarIcon: ({ focused }) => (
          <TabIcon name={focused ? 'map' : 'map-outline'} focused={focused} />
        ),
      }}
    />
    <Tab.Screen
      name="LiveMap"
      component={LiveMapScreen}
      options={{
        tabBarLabel: ({ focused }) => <TabLabel label="Live Map" focused={focused} />,
        tabBarIcon: ({ focused }) => (
          <View style={focused ? styles.activeTabCenter : styles.tabCenter}>
            <MaterialCommunityIcons
              name="bus-marker"
              size={focused ? 26 : 22}
              color={focused ? COLORS.white : COLORS.textLight}
            />
          </View>
        ),
      }}
    />
    <Tab.Screen
      name="Tickets"
      component={PaymentStackNav}
      options={{
        tabBarLabel: ({ focused }) => <TabLabel label="Tickets" focused={focused} />,
        tabBarIcon: ({ focused }) => (
          <TabIcon name={focused ? 'ticket' : 'ticket-outline'} focused={focused} />
        ),
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileStackNav}
      options={{
        tabBarLabel: ({ focused }) => <TabLabel label="Profile" focused={focused} />,
        tabBarIcon: ({ focused }) => (
          <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />
        ),
      }}
    />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 84 : 64,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 20 : 4,
    paddingTop: 4,
    ...SHADOWS.lg,
  },
  tabItem: {
    paddingTop: 4,
    height: Platform.OS === 'ios' ? 60 : 56,
  },
  tabLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: '500',
    marginTop: 2,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  tabIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
  },
  tabCenter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTabCenter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...SHADOWS.md,
  },
});

export default AppNavigator;
