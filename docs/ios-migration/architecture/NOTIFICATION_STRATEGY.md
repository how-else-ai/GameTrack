# Notification Strategy: Local Notifications in React Native

## Overview

This document details how to implement reliable timer notifications that work in all iOS app states.

## iOS Notification Behavior

| App State | Notification Delivery | User Interaction |
|-----------|----------------------|------------------|
| Foreground | Received in app | Handled via listener |
| Background | System notification | Tap opens app |
| Suspended | System notification | Tap opens app |
| Terminated | System notification | Tap launches app |
| Locked | Lock screen notification | Unlock + open app |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       App Launch                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           Request Notification Permission                    │
│     (Required before scheduling any notifications)           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Timer Started                             │
│                    (User action)                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Calculate Expiration Time                       │
│         expiration = now + duration (in seconds)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
│  Schedule    │  │  Schedule Warning│  │  Save State  │
│  Expiration  │  │  (1 min before)  │  │  AsyncStorage│
│ Notification │  │  Notification    │  │              │
└──────────────┘  └──────────────────┘  └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  App Goes to Background                      │
│           (Notification still scheduled in iOS)              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Timer Expires (iOS handles this)                │
│              Notification fires automatically                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────┴───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
│  App is      │  │  App is          │  │  App is      │
│  Foreground  │  │  Background      │  │  Terminated  │
└──────────────┘  └──────────────────┘  └──────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
│  In-app      │  │  System          │  │  System      │
│  notification│  │  notification    │  │  notification│
└──────────────┘  └──────────────────┘  └──────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 User Taps Notification                       │
│                   (Deep link handling)                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Navigate to Timer Screen                        │
│              Calculate actual remaining time                 │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

### 1. Setup and Permission

```typescript
// lib/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    interruptionLevel: Notifications.InterruptionLevel.TIME_SENSITIVE,
  }),
});

export class NotificationManager {
  private static instance: NotificationManager;
  
  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: false,
          allowSound: true,
          allowDisplayInCarPlay: false,
          allowCriticalAlerts: false, // Not needed for timer
        },
      });
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  async getPermissionsStatus(): Promise<string> {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }
}
```

### 2. Scheduling Timer Notifications

```typescript
// lib/notifications.ts

interface TimerNotificationData {
  kidId: string;
  kidName: string;
  ticketId: string;
  type: 'warning' | 'expiration';
}

async scheduleTimerNotifications(
  kid: Kid,
  ticketId: string
): Promise<void> {
  const now = Date.now();
  const durationMs = kid.ticketDuration * 60 * 1000;
  const expirationTime = now + durationMs;
  
  // Calculate warning time (1 minute before expiration)
  const warningTime = expirationTime - 60 * 1000;
  
  // Schedule warning notification if duration > 1 minute
  if (kid.ticketDuration > 1) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ 1 Minute Left!',
        body: `${kid.name} has 1 minute of game time remaining.`,
        sound: 'default',
        data: {
          kidId: kid.id,
          kidName: kid.name,
          ticketId,
          type: 'warning',
        } as TimerNotificationData,
      },
      trigger: {
        date: new Date(warningTime),
      },
      identifier: `timer-${kid.id}-warning`,
    });
  }

  // Schedule expiration notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "⏰ Time's Up!",
      body: `${kid.name}'s game time has ended.`,
      sound: 'default',
      interruptionLevel: Notifications.InterruptionLevel.TIME_SENSITIVE,
      data: {
        kidId: kid.id,
        kidName: kid.name,
        ticketId,
        type: 'expiration',
      } as TimerNotificationData,
    },
    trigger: {
      date: new Date(expirationTime),
    },
    identifier: `timer-${kid.id}-expire`,
  });
}
```

### 3. Cancelling Notifications

```typescript
// lib/notifications.ts

async cancelTimerNotifications(kidId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    `timer-${kidId}-warning`
  );
  await Notifications.cancelScheduledNotificationAsync(
    `timer-${kidId}-expire`
  );
}

async cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Get pending notifications (useful for debugging)
async getPendingNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}
```

### 4. Handling Notification Taps (Deep Linking)

```typescript
// lib/notifications.ts
import { router } from 'expo-router';

setupNotificationListeners(): void {
  // Handle notification when app is in foreground
  Notifications.addNotificationReceivedListener(notification => {
    const data = notification.request.content.data as TimerNotificationData;
    
    if (data.type === 'expiration') {
      // End the session in the store
      useAppStore.getState().endSession(data.kidId);
    }
    
    // Show in-app notification or update UI
    console.log('Notification received in foreground:', data);
  });

  // Handle notification tap (app was backgrounded or terminated)
  Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as TimerNotificationData;
    
    // Navigate to the timer screen
    router.push(`/timer/${data.kidId}`);
  });
}
```

### 5. App State Handling

When the app goes to background, we need to ensure notifications are scheduled:

```typescript
// hooks/useAppState.ts
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAppStore } from '@/lib/store';
import { NotificationManager } from '@/lib/notifications';

export function useAppState() {
  const appState = useRef(AppState.currentState);
  const { kids } = useAppStore();
  const notificationManager = NotificationManager.getInstance();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground
        // Recalculate timer states
        handleAppForeground();
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App went to background
        // Ensure notifications are scheduled for active timers
        handleAppBackground();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [kids]);

  const handleAppForeground = () => {
    // Cancel any stale notifications
    // Update UI with actual remaining time
    const store = useAppStore.getState();
    
    for (const kid of store.kids) {
      if (kid.activeSession && !kid.activeSession.isPaused) {
        const remaining = calculateRemainingTime(kid);
        
        if (remaining <= 0) {
          // Timer expired while app was backgrounded
          store.endSession(kid.id);
          notificationManager.cancelTimerNotifications(kid.id);
        }
      }
    }
  };

  const handleAppBackground = () => {
    // Ensure notifications are scheduled
    const store = useAppStore.getState();
    
    for (const kid of store.kids) {
      if (kid.activeSession && !kid.activeSession.isPaused) {
        notificationManager.scheduleTimerNotifications(kid, kid.activeSession.ticketId);
      }
    }
  };
}
```

## Notification Content Strategy

### Expiration Notification
```typescript
{
  title: "⏰ Time's Up!",
  body: "{kidName}'s game time has ended.",
  sound: 'default',
  interruptionLevel: 'timeSensitive', // Breaks through Focus
  data: { kidId, type: 'expiration' }
}
```

### Warning Notification
```typescript
{
  title: '⚠️ 1 Minute Left!',
  body: "{kidName} has 1 minute of game time remaining.",
  sound: 'default',
  interruptionLevel: 'normal',
  data: { kidId, type: 'warning' }
}
```

## Testing Strategy

### Unit Tests
```typescript
// __tests__/notifications.test.ts
describe('NotificationManager', () => {
  it('should schedule expiration notification', async () => {
    const kid = createMockKid({ ticketDuration: 30 });
    
    await notificationManager.scheduleTimerNotifications(kid, 'ticket-1');
    
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    expect(pending).toHaveLength(2); // Warning + expiration
  });

  it('should cancel notifications for kid', async () => {
    await notificationManager.cancelTimerNotifications('kid-1');
    
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    const kidNotifications = pending.filter(n => 
      n.identifier.includes('kid-1')
    );
    expect(kidNotifications).toHaveLength(0);
  });
});
```

### Manual Testing Checklist

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Foreground notification | Start timer, wait in app | In-app handling, no system notification |
| Background notification | Start timer, press home, wait | System notification appears with sound |
| Terminated notification | Start timer, kill app, wait | System notification still appears |
| Locked device | Start timer, lock device, wait | Notification on lock screen |
| Tap notification | Tap expired timer notification | App opens to correct timer screen |
| Cancel on pause | Start timer, pause it | Notifications cancelled |
| Resume reschedules | Pause, then resume timer | New notifications scheduled |
| Multiple timers | Start timers for 2 kids | Each gets independent notifications |

## Edge Cases

### 1. Timer Started Just Before App Termination
```typescript
// In handleAppBackground, ensure this runs even for quick transitions
if (nextAppState === 'background') {
  // Schedule immediately, don't wait
  await scheduleNotifications();
}
```

### 2. Device Restart
- iOS persists scheduled notifications across reboots
- No action needed from app

### 3. Timezone Change
```typescript
// Notifications scheduled with absolute dates
// iOS automatically adjusts for timezone changes
const trigger = { date: new Date(expirationTime) }; // Auto-adjusts
```

### 4. Daylight Saving Time
- iOS handles DST transitions automatically
- Notifications fire at correct local time

### 5. Low Power Mode
- Notifications may be delayed in Low Power Mode
- This is system behavior, not app bug

## iOS Configuration

### Info.plist Entries
```xml
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>
```

### App Store Description
Include in app description:
- "This app uses local notifications to alert you when game time is up"
- Required for App Store review

## Debugging

### View Pending Notifications
```typescript
const pending = await Notifications.getAllScheduledNotificationsAsync();
console.log('Pending notifications:', pending.map(n => ({
  id: n.identifier,
  trigger: n.trigger,
})));
```

### Clear All Notifications
```typescript
await Notifications.cancelAllScheduledNotificationsAsync();
```

## Performance Considerations

- Notifications are scheduled via iOS, not app code
- Scheduling is fast (<10ms per notification)
- No battery impact from scheduling
- iOS handles delivery efficiently
