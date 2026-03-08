// Root layout for Expo Router (aligned with web app)
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useNotifications } from '@/hooks/useNotifications';
import * as Font from 'expo-font';

// Theme colors matching web app
const COLORS = {
  background: '#0a0a12',
  card: '#12121f',
  primary: '#ffea00',
  border: '#3a3a5e',
};

function AppInitializer({ children }: { children: React.ReactNode }) {
  const initializeDevice = useAppStore((state) => state.initializeDevice);

  // Load the pixel font
  useEffect(() => {
    Font.loadAsync({
      'PressStart2P': require('@assets/PressStart2P-Regular.ttf'),
    });
  }, []);

  useEffect(() => {
    initializeDevice();
  }, [initializeDevice]);

  // Initialize notifications
  useNotifications();

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppInitializer>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: COLORS.card,
            },
            headerTintColor: COLORS.primary,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 12,
            },
            headerShadowVisible: false,
            contentStyle: {
              backgroundColor: COLORS.background,
            },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
              title: 'Game Time Tracker',
            }}
          />
          <Stack.Screen
            name="timer/[kidId]"
            options={{
              headerShown: false,
              title: 'Timer',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="add-kid"
            options={{
              headerShown: false,
              title: 'Add Kid',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="sync"
            options={{
              headerShown: false,
              title: 'Pair Devices',
              presentation: 'modal',
            }}
          />
        </Stack>
        <StatusBar style="light" backgroundColor={COLORS.card} />
      </AppInitializer>
    </SafeAreaProvider>
  );
}
