import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import '../lib/geofencing'; // Registers geofencing task and notification handler
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { TaskProvider } from '../context/TaskContext';
import { View, Text, ActivityIndicator, StyleSheet, LogBox } from 'react-native';

// In Expo Go on Android, expo-notifications logs an error about *remote* push being removed.
// This app only uses *local* notifications for "When I'm nearby", which still work in Expo Go.
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications (remote notifications)',
]);
import { Colors } from '../constants/Colors';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { useNotificationNavigation } from '../hooks/useNotificationNavigation';

const SPLASH_DURATION_MS = 1500;

/** Listens for notification taps and navigates to task detail. Renders nothing. */
function NotificationNavigationHandler() {
  useNotificationNavigation();
  return null;
}

export default function RootLayout() {
  useFrameworkReady();
  const [showSplash, setShowSplash] = useState(true);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded) return;
    const timer = setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashText}>TASK WORKS</Text>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TaskProvider>
          <NotificationNavigationHandler />
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="create-account" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="task/[id]" />
        <Stack.Screen name="task/completed/[id]" />
        <Stack.Screen name="settings" />
        </Stack>
        <StatusBar style="dark" backgroundColor="transparent" />
        </TaskProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  splashText: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: '#F9FAFB',
    letterSpacing: 2,
  },
});
