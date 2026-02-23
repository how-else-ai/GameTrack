# iOS Implementation Guide - Quick Reference

This guide provides the essential code snippets and file structure to quickly implement the Game Time Tracker iOS app.

---

## Project Initialization

```bash
# Create Expo project
npx create-expo-app game-time-tracker-ios --template blank-typescript
cd game-time-tracker-ios

# Install core dependencies
npx expo install expo-router react-native-safe-area-context
npx expo install expo-notifications expo-device expo-constants
npx expo install expo-av
npx expo install expo-background-fetch expo-task-manager
npx expo install expo-haptics
npm install zustand @react-native-async-storage/async-storage
npm install @react-native-community/datetimepicker
npm install lucide-react-native react-native-svg
npm install date-fns uuid

# Dev dependencies
npm install -D @types/uuid
```

---

## Core Files

### 1. Notification Service (`src/lib/notifications.ts`)

```typescript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Define notification category with actions
Notifications.setNotificationCategoryAsync('timer_expired', [
  {
    identifier: 'STOP_ALARM',
    buttonTitle: 'Stop Alarm',
    options: { isDestructive: true },
  },
  {
    identifier: 'ADD_TIME',
    buttonTitle: 'Add 5 Minutes',
    options: { isAuthenticationRequired: false },
  },
]);

interface ScheduledNotification {
  kidId: string;
  notificationId: string;
  type: 'expired' | 'warning';
}

class NotificationService {
  private scheduledNotifications: Map<string, ScheduledNotification[]> = new Map();

  async initialize(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true,
        },
      });
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  getPermissionStatus(): Promise<Notifications.NotificationPermissionsStatus> {
    return Notifications.getPermissionsAsync();
  }

  async scheduleTimerExpired(
    kidId: string,
    kidName: string,
    fireDate: Date
  ): Promise<string> {
    // Cancel existing expiration notification for this kid
    await this.cancelNotification(kidId, 'expired');

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ Time's Up!",
        body: `${kidName}'s game time has ended.`,
        sound: 'alarm.wav',
        badge: 1,
        data: { kidId, type: 'timer_expired' },
        categoryIdentifier: 'timer_expired',
        interruptionLevel: 'critical', // iOS 15+
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
      },
    });

    this.trackNotification(kidId, identifier, 'expired');
    console.log(`[NOTIFICATIONS] Scheduled expiration for ${kidName} at ${fireDate}`);
    return identifier;
  }

  async scheduleTimerWarning(
    kidId: string,
    kidName: string,
    fireDate: Date
  ): Promise<string> {
    // Only schedule if warning time is in the future
    if (fireDate <= new Date()) {
      console.log('[NOTIFICATIONS] Warning time already passed, skipping');
      return '';
    }

    await this.cancelNotification(kidId, 'warning');

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ 1 Minute Left!',
        body: `${kidName} has 1 minute of game time remaining.`,
        sound: 'warning.wav',
        data: { kidId, type: 'timer_warning' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
      },
    });

    this.trackNotification(kidId, identifier, 'warning');
    console.log(`[NOTIFICATIONS] Scheduled warning for ${kidName} at ${fireDate}`);
    return identifier;
  }

  async cancelNotifications(kidId: string): Promise<void> {
    const notifications = this.scheduledNotifications.get(kidId) || [];
    
    for (const notification of notifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.notificationId);
    }
    
    this.scheduledNotifications.delete(kidId);
    console.log(`[NOTIFICATIONS] Cancelled all notifications for kid ${kidId}`);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    this.scheduledNotifications.clear();
    await Notifications.setBadgeCountAsync(0);
  }

  private async cancelNotification(kidId: string, type: 'expired' | 'warning'): Promise<void> {
    const notifications = this.scheduledNotifications.get(kidId) || [];
    const notification = notifications.find(n => n.type === type);
    
    if (notification) {
      await Notifications.cancelScheduledNotificationAsync(notification.notificationId);
      this.scheduledNotifications.set(
        kidId,
        notifications.filter(n => n.type !== type)
      );
    }
  }

  private trackNotification(
    kidId: string,
    notificationId: string,
    type: 'expired' | 'warning'
  ): void {
    const existing = this.scheduledNotifications.get(kidId) || [];
    this.scheduledNotifications.set(kidId, [...existing, { kidId, notificationId, type }]);
  }
}

export const notificationService = new NotificationService();
```

---

### 2. Audio Service (`src/lib/audio.ts`)

```typescript
import { Audio, InterruptionModeIOS } from 'expo-av';

class AudioService {
  private alarmSound: Audio.Sound | null = null;
  private warningSound: Audio.Sound | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Configure audio session
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false, // We use notifications for background audio
      shouldDuckAndroid: true,
    });

    // Pre-load sounds
    this.alarmSound = await this.loadSound(require('../../assets/alarm.wav'));
    this.warningSound = await this.loadSound(require('../../assets/warning.wav'));

    this.isInitialized = true;
  }

  private async loadSound(source: any): Promise<Audio.Sound> {
    const { sound } = await Audio.Sound.createAsync(source, {
      shouldPlay: false,
      isLooping: false,
    });
    return sound;
  }

  async playAlarm(): Promise<void> {
    if (!this.alarmSound) return;
    
    try {
      await this.alarmSound.setPositionAsync(0);
      await this.alarmSound.setIsLoopingAsync(true);
      await this.alarmSound.playAsync();
    } catch (error) {
      console.error('[AUDIO] Failed to play alarm:', error);
    }
  }

  async playWarning(): Promise<void> {
    if (!this.warningSound) return;
    
    try {
      await this.warningSound.setPositionAsync(0);
      await this.warningSound.setIsLoopingAsync(false);
      await this.warningSound.playAsync();
    } catch (error) {
      console.error('[AUDIO] Failed to play warning:', error);
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.alarmSound) {
        await this.alarmSound.stopAsync();
      }
      if (this.warningSound) {
        await this.warningSound.stopAsync();
      }
    } catch (error) {
      console.error('[AUDIO] Failed to stop:', error);
    }
  }

  async unload(): Promise<void> {
    if (this.alarmSound) {
      await this.alarmSound.unloadAsync();
      this.alarmSound = null;
    }
    if (this.warningSound) {
      await this.warningSound.unloadAsync();
      this.warningSound = null;
    }
    this.isInitialized = false;
  }
}

export const audioService = new AudioService();
```

---

### 3. Store with Notifications (`src/lib/store.ts`)

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from './notifications';
import { Kid, Ticket, Session, PairedDevice, DeletedKid } from './types';

interface AppState {
  deviceId: string;
  deviceName: string;
  authToken: string;
  kids: Kid[];
  pairedDevices: PairedDevice[];
  deletedKids: DeletedKid[];
  syncVersion: number;
  lastSyncFlash: number;
  notificationsEnabled: boolean;

  initializeDevice: () => void;
  setDeviceName: (name: string) => void;
  setAuthToken: (token: string) => void;
  addKid: (data: { name: string; avatarEmoji: string; ticketLimit: number; ticketDuration: number }) => void;
  updateKid: (id: string, data: Partial<Kid>) => void;
  deleteKid: (id: string) => void;
  resetTickets: (kidId: string) => void;
  markTicketUsed: (ticketId: string, kidId: string) => void;
  startSession: (kidId: string, ticketId: string) => Promise<void>;
  pauseSession: (kidId: string) => Promise<void>;
  resumeSession: (kidId: string) => Promise<void>;
  endSession: (kidId: string) => Promise<void>;
  addPairedDevice: (device: PairedDevice) => void;
  removePairedDevice: (deviceId: string) => void;
  updateDeviceOnline: (deviceId: string, isOnline: boolean) => void;
  importData: (kids: Kid[]) => void;
  mergeKidsData: (kids: Kid[]) => void;
  setDeletedKids: (deletedKids: DeletedKid[]) => void;
  triggerSyncFlash: () => void;
  getDeletedKidIds: () => string[];
  clearDeletedKid: (id: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  initializeNotifications: () => Promise<void>;
}

const createTickets = (limit: number, date: string): Ticket[] => {
  return Array.from({ length: limit }, (_, i) => ({
    id: `ticket-${Date.now()}-${i}`,
    status: 'available' as const,
    lastResetDate: date,
  }));
};

const generateDeviceId = (): string => {
  return `ios-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      deviceId: '',
      deviceName: '',
      authToken: '',
      kids: [],
      pairedDevices: [],
      deletedKids: [],
      syncVersion: 0,
      lastSyncFlash: 0,
      notificationsEnabled: false,

      initializeDevice: () => {
        const state = get();
        if (!state.deviceId) {
          set({
            deviceId: generateDeviceId(),
            deviceName: `iPhone-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          });
        }
      },

      initializeNotifications: async () => {
        const granted = await notificationService.initialize();
        set({ notificationsEnabled: granted });
      },

      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),

      setDeviceName: (name) => set({ deviceName: name }),
      setAuthToken: (token) => set({ authToken: token }),

      addKid: (data) => {
        const today = new Date().toISOString().split('T')[0];
        const newKid: Kid = {
          id: `kid-${Date.now()}`,
          ...data,
          tickets: createTickets(data.ticketLimit, today),
          activeSession: null,
        };
        set((state) => ({
          kids: [...state.kids, newKid],
          syncVersion: state.syncVersion + 1,
        }));
      },

      updateKid: (id, data) => set((state) => ({
        kids: state.kids.map((kid) =>
          kid.id === id ? { ...kid, ...data } : kid
        ),
        syncVersion: state.syncVersion + 1,
      })),

      deleteKid: (id) => {
        const state = get();
        const deletedEntry: DeletedKid = {
          id,
          deletedAt: Date.now(),
          deletedBy: state.deviceId,
        };
        
        // Cancel any pending notifications
        notificationService.cancelNotifications(id);
        
        set((state) => ({
          kids: state.kids.filter((kid) => kid.id !== id),
          deletedKids: [...state.deletedKids.filter(d => d.id !== id), deletedEntry],
          syncVersion: state.syncVersion + 1,
        }));
      },

      resetTickets: (kidId) => {
        const today = new Date().toISOString().split('T')[0];
        set((state) => ({
          kids: state.kids.map((kid) =>
            kid.id === kidId
              ? {
                  ...kid,
                  tickets: createTickets(kid.ticketLimit, today),
                  activeSession: null,
                }
              : kid
          ),
          syncVersion: state.syncVersion + 1,
        }));
      },

      markTicketUsed: (ticketId, kidId) => set((state) => ({
        kids: state.kids.map((kid) =>
          kid.id === kidId
            ? {
                ...kid,
                tickets: kid.tickets.map((t) =>
                  t.id === ticketId ? { ...t, status: 'used' as const } : t
                ),
              }
            : kid
        ),
        syncVersion: state.syncVersion + 1,
      })),

      startSession: async (kidId, ticketId) => {
        const now = new Date().toISOString();
        const state = get();
        const kid = state.kids.find(k => k.id === kidId);
        if (!kid) return;

        const session: Session = {
          ticketId,
          startTime: now,
          isPaused: false,
          totalPausedDuration: 0,
        };

        set((state) => ({
          kids: state.kids.map((k) =>
            k.id === kidId
              ? {
                  ...k,
                  activeSession: session,
                  tickets: k.tickets.map((t) =>
                    t.id === ticketId
                      ? { ...t, status: 'in-use' as const }
                      : t
                  ),
                }
              : k
          ),
          syncVersion: state.syncVersion + 1,
        }));

        // Schedule notifications
        if (state.notificationsEnabled) {
          const durationMs = kid.ticketDuration * 60 * 1000;
          const endTime = new Date(Date.now() + durationMs);
          const warningTime = new Date(endTime.getTime() - 60000);

          await notificationService.scheduleTimerExpired(kidId, kid.name, endTime);
          await notificationService.scheduleTimerWarning(kidId, kid.name, warningTime);
        }
      },

      pauseSession: async (kidId) => {
        const state = get();
        const kid = state.kids.find(k => k.id === kidId);
        if (!kid?.activeSession || kid.activeSession.isPaused) return;

        // Cancel notifications while paused
        await notificationService.cancelNotifications(kidId);

        set((state) => ({
          kids: state.kids.map((k) =>
            k.id === kidId && k.activeSession
              ? {
                  ...k,
                  activeSession: {
                    ...k.activeSession,
                    isPaused: true,
                    pausedAt: new Date().toISOString(),
                  },
                }
              : k
          ),
          syncVersion: state.syncVersion + 1,
        }));
      },

      resumeSession: async (kidId) => {
        const state = get();
        const kid = state.kids.find(k => k.id === kidId);
        if (!kid?.activeSession || !kid.activeSession.isPaused) return;

        const pausedAt = kid.activeSession.pausedAt
          ? new Date(kid.activeSession.pausedAt).getTime()
          : Date.now();
        const pausedDuration = Date.now() - pausedAt;
        const totalPausedDuration = (kid.activeSession.totalPausedDuration || 0) + pausedDuration;

        // Calculate new end time and reschedule notifications
        if (state.notificationsEnabled) {
          const elapsedMs = Date.now() - new Date(kid.activeSession.startTime).getTime() - totalPausedDuration;
          const durationMs = kid.ticketDuration * 60 * 1000;
          const remainingMs = Math.max(0, durationMs - elapsedMs);
          const endTime = new Date(Date.now() + remainingMs);
          const warningTime = new Date(endTime.getTime() - 60000);

          await notificationService.scheduleTimerExpired(kidId, kid.name, endTime);
          if (remainingMs > 60000) {
            await notificationService.scheduleTimerWarning(kidId, kid.name, warningTime);
          }
        }

        set((state) => ({
          kids: state.kids.map((k) =>
            k.id === kidId && k.activeSession
              ? {
                  ...k,
                  activeSession: {
                    ...k.activeSession,
                    isPaused: false,
                    pausedAt: undefined,
                    totalPausedDuration,
                  },
                }
              : k
          ),
          syncVersion: state.syncVersion + 1,
        }));
      },

      endSession: async (kidId) => {
        const state = get();
        const kid = state.kids.find((k) => k.id === kidId);
        if (!kid || !kid.activeSession) return;

        // Cancel notifications
        await notificationService.cancelNotifications(kidId);

        set((state) => ({
          kids: state.kids.map((k) =>
            k.id === kidId
              ? {
                  ...k,
                  activeSession: null,
                  tickets: k.tickets.map((t) =>
                    t.id === kid.activeSession!.ticketId
                      ? { ...t, status: 'used' as const }
                      : t
                  ),
                }
              : k
          ),
          syncVersion: state.syncVersion + 1,
        }));
      },

      addPairedDevice: (device) => set((state) => ({
        pairedDevices: [...state.pairedDevices.filter(d => d.deviceId !== device.deviceId), device],
      })),

      removePairedDevice: (deviceId) => set((state) => ({
        pairedDevices: state.pairedDevices.filter((d) => d.deviceId !== deviceId),
      })),

      updateDeviceOnline: (deviceId, isOnline) => set((state) => ({
        pairedDevices: state.pairedDevices.map((d) =>
          d.deviceId === deviceId ? { ...d, isOnline, lastSeen: new Date().toISOString() } : d
        ),
      })),

      importData: (incomingKids) => set((state) => {
        const deletedIds = new Set(state.deletedKids.map(d => d.id));
        const filteredIncoming = incomingKids.filter(k => !deletedIds.has(k.id));
        const incomingIds = new Set(incomingKids.map(k => k.id));
        const localOnlyKids = state.kids.filter(k => !incomingIds.has(k.id));
        const mergedKids = [...filteredIncoming, ...localOnlyKids];

        return {
          kids: mergedKids,
          syncVersion: state.syncVersion + 1,
        };
      }),

      mergeKidsData: (mergedKids) => set((state) => ({
        kids: mergedKids,
        syncVersion: state.syncVersion + 1,
      })),

      setDeletedKids: (newDeletedKids) => set((state) => ({
        deletedKids: newDeletedKids,
        syncVersion: state.syncVersion + 1,
      })),

      triggerSyncFlash: () => set({ lastSyncFlash: Date.now() }),

      getDeletedKidIds: () => get().deletedKids.map(d => d.id),

      clearDeletedKid: (id) => set((state) => ({
        deletedKids: state.deletedKids.filter(d => d.id !== id),
      })),
    }),
    {
      name: 'game-time-tracker',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

---

### 4. Root Layout with Notification Handling (`app/_layout.tsx`)

```typescript
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '@/src/lib/store';
import { audioService } from '@/src/lib/audio';
import { notificationService } from '@/src/lib/notifications';

export default function RootLayout() {
  const router = useRouter();
  const { initializeDevice, initializeNotifications, endSession } = useAppStore();

  useEffect(() => {
    // Initialize services
    initializeDevice();
    initializeNotifications();
    audioService.initialize();

    // Set up notification response handler
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const { actionIdentifier, notification } = response;
      const { kidId, type } = notification.request.content.data;

      // Handle notification actions
      switch (actionIdentifier) {
        case 'STOP_ALARM':
          endSession(kidId);
          audioService.stop();
          break;
        case 'ADD_TIME':
          // Implement add time logic
          break;
        case Notifications.DEFAULT_ACTION_IDENTIFIER:
          // User tapped notification - navigate to timer
          router.push(`/timer/${kidId}`);
          break;
      }
    });

    // Handle foreground notifications
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      const { type } = notification.request.content.data;
      
      if (type === 'timer_expired') {
        audioService.playAlarm();
      } else if (type === 'timer_warning') {
        audioService.playWarning();
      }
    });

    return () => {
      subscription.remove();
      foregroundSubscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="timer/[kidId]" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
```

---

### 5. App Configuration (`app.json`)

```json
{
  "expo": {
    "name": "Game Time Tracker",
    "slug": "game-time-tracker",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1a1a2e"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.gametimetracker",
      "buildNumber": "1.0.0",
      "infoPlist": {
        "UIBackgroundModes": ["fetch", "remote-notification"],
        "NSUserNotificationUsageDescription": "Game Time Tracker sends notifications when game timers expire.",
        "NSLocalNotificationUsageDescription": "Game Time Tracker schedules local notifications for timer alerts."
      }
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#4ade80",
          "sounds": ["./assets/alarm.wav", "./assets/warning.wav"],
          "enableBackgroundRemoteNotifications": true
        }
      ]
    ]
  }
}
```

---

## Build & Deploy Commands

```bash
# Development build (simulator)
npx expo run:ios

# Development build (device)
npx expo run:ios --device

# Production build with EAS
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios

# Internal distribution (TestFlight)
eas build --platform ios --profile preview
```

---

## Testing Checklist

- [ ] App launches without crashes
- [ ] Notifications permission requested
- [ ] Timer starts and counts down correctly
- [ ] Notification fires at timer expiration
- [ ] Notification fires when app is killed
- [ ] Pause/resume reschedules notifications correctly
- [ ] Sound plays on notification (foreground)
- [ ] Data persists across app restarts
- [ ] Multiple timers can run simultaneously
- [ ] Warning notification at 1 minute

---

## Troubleshooting

### Notifications not firing
1. Check permission granted: `Settings → Notifications → Game Time Tracker`
2. Verify sound files are in `assets/` and listed in `app.json`
3. Check iOS console for scheduling errors

### Alarm sound not playing
1. Verify audio session is configured correctly
2. Check that `playsInSilentModeIOS: true` is set
3. Verify sound file format (WAV recommended)

### Data not persisting
1. Check AsyncStorage is properly configured
2. Verify Zustand persist middleware is set up
3. Check for JSON serialization errors

---

*This guide provides the essential implementation details. Refer to the full migration plan for complete architecture and additional features.*
