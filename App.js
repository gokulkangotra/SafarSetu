// App.js — Root entry point with navigation container and context providers
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './context/AuthContext';
import { TicketProvider } from './context/TicketContext';
import { UserPreferencesProvider } from './context/UserPreferencesContext';
import AuthNavigator from './navigation/AuthNavigator';
import AppNavigator from './navigation/AppNavigator';
import { FullScreenLoader } from './components/LoadingSpinner';

const linking = {
  prefixes: ['safarsetu://'],
};

// Root navigation selector
const RootNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullScreenLoader message="Loading SafarSetu..." />;
  }

  return user ? <AppNavigator /> : <AuthNavigator />;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TicketProvider>
          <UserPreferencesProvider>
            <NavigationContainer linking={linking}>
              <StatusBar style="auto" />
              <RootNavigator />
            </NavigationContainer>
          </UserPreferencesProvider>
        </TicketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
