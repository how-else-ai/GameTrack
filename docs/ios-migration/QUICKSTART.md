# Quick Start: iOS Native Migration

## Prerequisites

- Node.js 18+
- npm or yarn
- macOS with Xcode 15+ (for iOS development)
- iOS Simulator or physical iPhone (iOS 16.4+)

## Step 1: Initialize Expo Project

```bash
# Install Expo CLI globally (if not already installed)
npm install -g expo-cli

# Create new project with TypeScript template
npx create-expo-app gametimetracker-native --template blank-typescript

# Navigate to project
cd gametimetracker-native
```

## Step 2: Install Dependencies

```bash
# Core dependencies
npm install zustand
npm install @react-native-async-storage/async-storage
npm install expo-notifications
npm install expo-haptics
npm install expo-router
npm install react-native-reanimated
npm install react-native-gesture-handler

# UI and utilities
npm install nativewind
npm install tailwindcss
npm install lucide-react-native
npm install date-fns

# Dev dependencies
npm install -D @types/react
```

## Step 3: Configure NativeWind

```bash
# Initialize Tailwind
npx tailwindcss init
```

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        foreground: '#e2e8f0',
        primary: '#8b5cf6',
        card: '#1a1a2e',
        border: '#2d2d3d',
        destructive: '#ef4444',
        muted: '#64748b',
      },
      fontFamily: {
        pixel: ['PressStart2P', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

```javascript
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel'],
  };
};
```

```typescript
// app.d.ts (create this file)
/// <reference types="nativewind/types" />
```

## Step 4: Copy Shared Code

```bash
# Create directory structure
mkdir -p src/{components,lib,hooks,types,constants}

# Copy types (identical to web)
cp ../web-app/src/lib/types.ts src/types/index.ts

# Copy store logic (will adapt for AsyncStorage)
cp ../web-app/src/lib/store.ts src/lib/store.ts

# Copy timer logic (will adapt for RN)
cp ../web-app/src/lib/timer.ts src/lib/timer.ts
```

## Step 5: Adapt Store for AsyncStorage

```typescript
// src/lib/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  getItem: async (name: string): Promise<string | null> => {
    return await AsyncStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};
```

```typescript
// Update store.ts
import { createJSONStorage } from 'zustand/middleware';
import { storage } from './storage';

// In persist config:
storage: createJSONStorage(() => storage),
```

## Step 6: Set Up Notifications

```typescript
// src/lib/notifications.ts
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    interruptionLevel: Notifications.InterruptionLevel.TIME_SENSITIVE,
  }),
});

export async function scheduleTimerNotification(
  kidId: string,
  kidName: string,
  durationMinutes: number
) {
  const expirationTime = new Date(Date.now() + durationMinutes * 60000);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "⏰ Time's Up!",
      body: `${kidName}'s game time has ended`,
      sound: 'default',
      interruptionLevel: Notifications.InterruptionLevel.TIME_SENSITIVE,
    },
    trigger: { date: expirationTime },
    identifier: `timer-${kidId}`,
  });
}
```

## Step 7: Create Basic Screen

```typescript
// app/index.tsx
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useAppStore } from '@/lib/store';

export default function HomeScreen() {
  const { kids, addKid } = useAppStore();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="p-4">
        <Text className="text-2xl text-foreground font-bold mb-4">
          Game Time Tracker
        </Text>

        {kids.length === 0 ? (
          <Text className="text-muted">No players yet</Text>
        ) : (
          kids.map(kid => (
            <View key={kid.id} className="bg-card p-4 rounded-lg mb-2">
              <Text className="text-foreground">{kid.name}</Text>
            </View>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}
```

## Step 8: Configure App Entry

```typescript
// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAppStore } from '@/lib/store';

export default function RootLayout() {
  const initializeDevice = useAppStore(state => state.initializeDevice);

  useEffect(() => {
    initializeDevice();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Kids' }} />
    </Stack>
  );
}
```

## Step 9: Run the App

```bash
# Start development server
npx expo start

# In another terminal, run on iOS simulator
npx expo run:ios

# Or scan QR code with Expo Go app on physical device
```

## Step 10: Test Notifications

```typescript
// Add to a test screen or button
import * as Notifications from 'expo-notifications';

async function testNotification() {
  // Request permission
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  // Schedule test notification in 5 seconds
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test',
      body: 'This is a test notification',
      sound: 'default',
    },
    trigger: { seconds: 5 },
  });
}
```

## Common Issues

### Issue: NativeWind styles not applying
**Solution:** Ensure `nativewind/babel` is in babel.config.js plugins

### Issue: Notifications not appearing
**Solution:** Check iOS simulator doesn't support notifications - use physical device

### Issue: AsyncStorage not persisting
**Solution:** Ensure you're awaiting all AsyncStorage operations

### Issue: App crashes on start
**Solution:** Check that fonts are loaded before rendering

## Next Steps

1. Implement all screens from web app
2. Add notification handling for timer expiration
3. Implement data migration from web app
4. Add iOS-specific features (widgets, haptics)
5. Build for production and submit to App Store

See full documentation in:
- [Implementation Plan](./planning/IMPLEMENTATION_PLAN.md)
- [Component Mapping](./planning/COMPONENT_MAPPING.md)
- [Notification Strategy](./architecture/NOTIFICATION_STRATEGY.md)
