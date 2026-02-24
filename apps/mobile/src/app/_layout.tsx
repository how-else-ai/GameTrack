// Root layout for Expo Router
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useNotifications } from '@/hooks/useNotifications';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const initializeDevice = useAppStore((state) => state.initializeDevice);

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
              backgroundColor: '#1a1a2e',
            },
            headerTintColor: '#ffea00',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            contentStyle: {
              backgroundColor: '#1a1a2e',
            },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              title: 'Game Time Tracker',
            }}
          />
          <Stack.Screen
            name="timer/[kidId]"
            options={{
              title: 'Timer',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="add-kid"
            options={{
              title: 'Add Kid',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="sync"
            options={{
              title: 'Pair Devices',
              presentation: 'modal',
            }}
          />
        </Stack>
        <StatusBar style="light" />
      </AppInitializer>
    </SafeAreaProvider>
  );
}
