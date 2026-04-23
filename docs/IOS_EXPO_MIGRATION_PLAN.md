# Game Time Tracker - iOS Expo Migration Plan

## Executive Summary

This plan outlines the migration of the Game Time Tracker web app to a native iOS app using Expo. The primary goal is to achieve reliable background notifications and alarms when timers expire, providing a true native app experience that works even when the device is locked or the app is in the background.

---

## Current Architecture Overview

### Web App Stack
- **Framework**: Next.js 16 + React 19 + TypeScript 5
- **State Management**: Zustand with localStorage persistence
- **Timer System**: Global `TimerManager` class using `setInterval` (250ms ticks)
- **Notifications**: Browser Notification API (limited to foreground/background tab)
- **Sync**: HTTP polling to external PHP server
- **UI**: Tailwind CSS 4 + shadcn/ui components
- **Styling**: Pixel/retro arcade theme

### Current Timer Flow
1. User starts session → `startSession()` creates `Session` object with ISO timestamps
2. `TimerManager` polls every 250ms, calculates remaining time from timestamps
3. When timer expires → `handleExpired()` ends session + plays Web Audio alarm + shows notification
4. Sessions support pause/resume with `totalPausedDuration` tracking

### Current Limitations (Web)
- Notifications require browser tab to be active or recently used
- Web Audio API doesn't work when Safari is in background
- No reliable way to wake up app when timer expires
- iOS Safari has aggressive background tab throttling

---

## Target Architecture (Expo iOS)

### New Stack
- **Framework**: Expo SDK 52+ with Expo Router
- **State Management**: Zustand with AsyncStorage persistence
- **Timer System**: Hybrid: JavaScript timestamp tracking + native iOS notifications
- **Notifications**: Expo Notifications with background scheduling
- **Sync**: Same HTTP polling (works fine in React Native)
- **UI**: React Native with custom pixel-themed components

### Key Native Features to Leverage
- `expo-notifications`: Local notifications that work when app is killed/backgrounded
- `expo-av`: Native audio playback for alarm sounds
- `expo-background-fetch`: Keep sync running in background
- `expo-task-manager`: Handle notification responses
- `expo-haptics`: Tactile feedback for arcade feel
- `@react-native-async-storage/async-storage`: Replace localStorage

---

## Phase 1: Project Setup & Foundation

### 1.1 Initialize Expo Project
```bash
# Create new Expo project
npx create-expo-app game-time-tracker-ios --template blank-typescript

# Or use our custom setup
mkdir game-time-tracker-ios
cd game-time-tracker-ios
npx expo init . --template blank-typescript
```

### 1.2 Install Core Dependencies
```bash
# Navigation
npx expo install expo-router react-native-safe-area-context

# State & Storage
npm install zustand @react-native-async-storage/async-storage

# Notifications (CRITICAL for alarms)
npx expo install expo-notifications expo-device expo-constants

# Audio
npx expo install expo-av

# Background tasks
npx expo install expo-background-fetch expo-task-manager

# Haptics
npx expo install expo-haptics

# UI utilities
npm install react-native-reanimated react-native-gesture-handler
npm install lucide-react-native  # Native version of icons

# Utilities
npm install date-fns uuid
npm install -D @types/uuid
```

### 1.3 Configure Expo (`app.json`)
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
        "NSUserNotificationUsageDescription": "Game Time Tracker needs to send you notifications when game timers expire.",
        "NSLocalNotificationUsageDescription": "Game Time Tracker schedules local notifications to alert you when game time ends."
      }
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#4ade80",
          "sounds": ["./assets/alarm.wav", "./assets/warning.wav"]
        }
      ]
    ]
  }
}
```

### 1.4 Project Structure
```
game-time-tracker-ios/
├── app/                          # Expo Router file-based routing
│   ├── _layout.tsx              # Root layout with providers
│   ├── index.tsx                # Main screen (kid list)
│   └── timer/
│       └── [kidId].tsx          # Timer screen
├── src/
│   ├── components/              # React Native components
│   │   ├── KidCard.tsx
│   │   ├── TimerView.tsx
│   │   ├── AddKidDialog.tsx
│   │   ├── SyncManager.tsx
│   │   └── ui/                  # Shared UI primitives
│   │       ├── Button.tsx
│   │       ├── Progress.tsx
│   │       └── Dialog.tsx
│   ├── lib/
│   │   ├── store.ts             # Zustand store (AsyncStorage)
│   │   ├── timer.ts             # Timer logic
│   │   ├── notifications.ts     # Native notification service
│   │   ├── notifications.ios.ts # iOS-specific notification handling
│   │   ├── audio.ts             # Native audio service
│   │   ├── types.ts             # TypeScript types
│   │   ├── device.ts            # Device ID generation
│   │   ├── avatar.ts            # Avatar utilities
│   │   └── sync-config.ts       # Sync server config
│   └── hooks/
│       ├── useSync.ts           # Sync hook
│       └── useTimer.ts          # Timer hook
├── assets/
│   ├── icon.png
│   ├── splash.png
│   ├── alarm.wav               # Native alarm sound
│   ├── warning.wav             # Warning notification sound
│   └── notification-icon.png
└── package.json
```

---

## Phase 2: Core Services Implementation

### 2.1 Native Notification Service (`src/lib/notifications.ts`)

**Key Differences from Web:**
- Schedule local notifications with `expo-notifications`
- Use iOS notification categories for actions ("Stop Alarm", "Add Time")
- Handle notification responses even when app is killed
- Store scheduled notification IDs to cancel/reschedule

```typescript
// Core interface
interface NotificationService {
  // Initialize and request permissions
  initialize(): Promise<boolean>;
  
  // Schedule timer expiration notification
  scheduleTimerExpired(kidId: string, kidName: string, fireDate: Date): Promise<string>;
  
  // Schedule warning notification (1 min left)
  scheduleTimerWarning(kidId: string, kidName: string, fireDate: Date): Promise<string>;
  
  // Cancel scheduled notifications for a kid
  cancelNotifications(kidId: string): Promise<void>;
  
  // Cancel all notifications
  cancelAllNotifications(): Promise<void>;
}
```

**iOS-Specific Implementation Details:**

1. **Notification Categories for Actions:**
   ```typescript
   // Define notification category with actions
   Notifications.setNotificationCategoryAsync('timer_expired', [
     {
       identifier: 'STOP_ALARM',
       buttonTitle: 'Stop Alarm',
       options: { isDestructive: true }
     },
     {
       identifier: 'ADD_TIME',
       buttonTitle: 'Add 5 Minutes',
       options: { isAuthenticationRequired: true }
     }
   ]);
   ```

2. **Sound Handling:**
   - Bundle custom sounds in app.json
   - Use `sound: 'alarm.wav'` in notification content
   - iOS will loop alarm sound until user interacts

3. **Critical Alerts (Optional but recommended):**
   - Request critical alert permission for guaranteed sound
   - Requires special Apple entitlement
   - Bypasses Do Not Disturb and Ring/Silent switch

### 2.2 Native Audio Service (`src/lib/audio.ts`)

**Purpose:** Play alarm sounds when app is in foreground

```typescript
interface AudioService {
  // Load and cache sounds
  initialize(): Promise<void>;
  
  // Play alarm sound (foreground only)
  playAlarm(): Promise<void>;
  
  // Play warning sound
  playWarning(): Promise<void>;
  
  // Stop all sounds
  stop(): Promise<void>;
}
```

**Implementation with expo-av:**
- Pre-load sounds in `_layout.tsx`
- Use `Audio.Sound.createAsync()` for native playback
- Handle audio session interruptions (calls, other apps)

### 2.3 Background Task Handler (`src/lib/backgroundTasks.ts`)

**Purpose:** Handle notification responses and maintain sync when app is backgrounded

```typescript
// Register background task
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) return;
  
  // Handle notification response
  const { actionIdentifier, notification } = data;
  
  if (actionIdentifier === 'STOP_ALARM') {
    // End the session
    await endSession(notification.request.content.data.kidId);
  }
});

// Register for background fetch to keep sync alive
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  // Perform sync poll
  await performBackgroundSync();
  return BackgroundFetch.Result.NewData;
});
```

---

## Phase 3: State Management Migration

### 3.1 Store Migration (`src/lib/store.ts`)

**Changes from Web:**
- Replace `localStorage` with `AsyncStorage`
- Keep same Zustand structure
- Add notification scheduling side effects

```typescript
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ... same state structure ...
      
      startSession: (kidId, ticketId) => {
        // ... existing logic ...
        
        // Schedule native notification
        const kid = get().kids.find(k => k.id === kidId);
        const endTime = calculateEndTime(kid.ticketDuration);
        notificationService.scheduleTimerExpired(kidId, kid.name, endTime);
        
        // Schedule warning at endTime - 1 minute
        const warningTime = new Date(endTime.getTime() - 60000);
        notificationService.scheduleTimerWarning(kidId, kid.name, warningTime);
      },
      
      endSession: (kidId) => {
        // ... existing logic ...
        
        // Cancel scheduled notifications
        notificationService.cancelNotifications(kidId);
      },
      
      pauseSession: (kidId) => {
        // ... existing logic ...
        
        // Cancel notifications, will reschedule on resume
        notificationService.cancelNotifications(kidId);
      },
      
      resumeSession: (kidId) => {
        // ... existing logic ...
        
        // Recalculate end time and reschedule
        const kid = get().kids.find(k => k.id === kidId);
        const remainingMs = calculateRemainingMs(kid.activeSession);
        const endTime = new Date(Date.now() + remainingMs);
        
        notificationService.scheduleTimerExpired(kidId, kid.name, endTime);
      },
    }),
    {
      name: 'game-time-tracker',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### 3.2 Timer Manager Updates (`src/lib/timer.ts`)

**Changes:**
- Keep timestamp-based calculation for display
- Remove Web Audio alarm (replaced by native notifications)
- Keep `isWarning` logic for UI state

```typescript
class TimerManager {
  // ... existing tick logic ...
  
  private handleExpired(kidId: string) {
    // Don't play sound here - native notification handles it
    // Just update UI state
    const store = useAppStore.getState();
    store.endSession(kidId);
    this.expiredCallbacks.forEach(cb => cb(kidId));
  }
}
```

---

## Phase 4: UI Component Migration

### 4.1 Component Mapping (Web → React Native)

| Web (shadcn) | React Native | Notes |
|-------------|--------------|-------|
| `<Button>` | Custom `<Button>` | TouchableOpacity + styling |
| `<Dialog>` | `@gorhom/bottom-sheet` | Better mobile UX |
| `<Progress>` | `react-native-progress` or custom |
| `<AlertDialog>` | React Native Alert API |
| Framer Motion | `react-native-reanimated` | Native animations |
| Lucide icons | `lucide-react-native` | Same icon names |

### 4.2 Key UI Considerations

1. **Safe Areas:** Use `SafeAreaView` for iPhone notch/Dynamic Island
2. **Pixel Theme:** Recreate pixel borders with `StyleSheet` borders
3. **Touch Targets:** Minimum 44x44 points per iOS HIG
4. **Haptics:** Add `expo-haptics` for button presses

---

## Phase 5: Notification Flow Architecture

### 5.1 Timer Start Flow

```
User taps Start
    ↓
startSession() called
    ↓
Create Session object with timestamps
    ↓
Mark ticket as 'in-use'
    ↓
Calculate endTime = now + ticketDuration
    ↓
Schedule iOS notification:
  - Content: "Time's Up! {kidName}'s game time ended"
  - Fire date: endTime
  - Sound: alarm.wav (loops)
  - Category: timer_expired (with actions)
    ↓
Schedule warning notification:
  - Fire date: endTime - 1 minute
  - Sound: warning.wav
    ↓
Start TimerManager tick for UI updates
```

### 5.2 Timer Expiration Flow

```
iOS fires scheduled notification
    ↓
System shows notification with sound
    ↓
User taps notification OR uses action
    ↓
App wakes up (if killed) or comes to foreground
    ↓
Expo notification handler receives event
    ↓
If STOP_ALARM action: endSession(kidId)
If ADD_TIME action: extend session, reschedule
    ↓
Cancel alarm sound
    ↓
Update UI
```

### 5.3 Background App State Handling

```typescript
// In _layout.tsx
useEffect(() => {
  const subscription = AppState.addEventListener('change', nextAppState => {
    if (nextAppState === 'background') {
      // App going to background
      // Notifications are already scheduled, so nothing needed
      // But we should ensure sync has latest data
    }
    
    if (nextAppState === 'active') {
      // App coming to foreground
      // Check if any sessions expired while away
      timerManager.forceNotify();
    }
  });
  
  return () => subscription.remove();
}, []);
```

---

## Phase 6: Sync System Migration

### 6.1 Changes Needed

The existing sync system will work with minimal changes:

1. **Replace `fetch` with built-in React Native fetch** (already compatible)
2. **Keep polling mechanism** (works in background with `expo-background-fetch`)
3. **Update storage references** (AsyncStorage instead of localStorage)

### 6.2 Background Sync

```typescript
// Register background fetch
async function registerBackgroundFetchAsync() {
  return BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 60 * 2, // 2 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
```

---

## Phase 7: Build & Deployment

### 7.1 Development Build

```bash
# Install Expo Dev Client
npx expo install expo-dev-client

# Create development build
npx expo prebuild --platform ios

# Run on simulator
npx expo run:ios

# Or run on device
npx expo run:ios --device
```

### 7.2 Production Build (EAS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure build
eas build:configure

# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

### 7.3 Required Apple Developer Setup

1. **Apple Developer Account** ($99/year)
2. **App ID** in Certificates, Identifiers & Profiles
3. **Push Notifications** capability enabled
4. **Provisioning Profile** for distribution
5. **App Store Connect** record created

---

## Test Cases

### TC1: Timer Expires in Foreground
**Preconditions:** App open, timer running
**Steps:**
1. Start 1-minute timer for any kid
2. Wait for timer to reach 0
**Expected:**
- UI shows "Time's Up!"
- Native alarm sound plays (expo-av)
- Local notification displayed
- Session automatically ends

### TC2: Timer Expires in Background
**Preconditions:** App backgrounded, timer running
**Steps:**
1. Start 2-minute timer
2. Press home button / swipe up to background app
3. Wait 2 minutes
**Expected:**
- iOS notification appears with alarm sound
- Notification includes "Stop Alarm" action
- Tapping notification opens app to timer screen

### TC3: Timer Expires with App Killed
**Preconditions:** Timer running, app swiped away
**Steps:**
1. Start 2-minute timer
2. Kill app (swipe up from app switcher)
3. Wait 2 minutes
**Expected:**
- iOS notification still fires (scheduled with system)
- Alarm sound plays
- Opening app from notification shows correct state

### TC4: Pause and Resume
**Preconditions:** Timer running
**Steps:**
1. Start 5-minute timer
2. Pause after 1 minute
3. Wait 2 minutes
4. Resume timer
**Expected:**
- Notification cancelled on pause
- New notification scheduled on resume with correct remaining time
- Timer shows correct remaining time (4 minutes)

### TC5: Warning Notification
**Preconditions:** Timer running (5+ minutes)
**Steps:**
1. Start 5-minute timer
2. Background app
3. Wait 4 minutes
**Expected:**
- Warning notification at 1 minute remaining
- "{kidName} has 1 minute remaining"
- Timer expiration notification still fires at 5 minutes

### TC6: Multiple Kids Active
**Preconditions:** Multiple kids with active timers
**Steps:**
1. Start timer for Kid A (3 minutes)
2. Start timer for Kid B (5 minutes)
3. Background app
**Expected:**
- Separate notifications scheduled for each kid
- Each notification fires at correct time
- Notifications include kid name for differentiation

### TC7: Notification Actions
**Preconditions:** Timer expired notification showing
**Steps:**
1. Start 1-minute timer
2. Let expire
3. Long press notification (or swipe for actions)
4. Tap "Stop Alarm"
**Expected:**
- Alarm sound stops
- Session marked as ended
- Ticket marked as used
- Opening app shows correct state

### TC8: Data Persistence
**Preconditions:** App has kids and active timers
**Steps:**
1. Add several kids
2. Start a timer
3. Kill app
4. Reopen app
**Expected:**
- All kid data restored from AsyncStorage
- Active timer continues with correct remaining time
- Scheduled notifications intact

### TC9: Device Sync
**Preconditions:** Two devices paired
**Steps:**
1. Device A: Add kid and start timer
2. Device B: Wait for sync
**Expected:**
- Device B receives kid data
- Timer state synced
- Notification scheduled on Device B (if timer active)

### TC10: Do Not Disturb Override
**Preconditions:** iOS Do Not Disturb enabled
**Steps:**
1. Enable Do Not Disturb in iOS Settings
2. Start timer
3. Let expire
**Expected:**
- With Critical Alerts entitlement: Notification still shows with sound
- Without Critical Alerts: Notification delivered silently

---

## Implementation Checklist

### Phase 1: Setup
- [ ] Initialize Expo project
- [ ] Install all dependencies
- [ ] Configure app.json with notification sounds
- [ ] Set up project structure
- [ ] Add TypeScript paths config

### Phase 2: Core Services
- [ ] Implement notification service with expo-notifications
- [ ] Configure notification categories and actions
- [ ] Implement audio service with expo-av
- [ ] Add sound assets to project
- [ ] Implement background task handlers
- [ ] Test notifications on iOS simulator

### Phase 3: State Management
- [ ] Migrate store to AsyncStorage
- [ ] Add notification scheduling to startSession
- [ ] Add notification cancellation to endSession/pauseSession
- [ ] Implement notification rescheduling on resumeSession
- [ ] Test data persistence across app restarts

### Phase 4: UI Components
- [ ] Create shared UI primitives (Button, Progress, etc.)
- [ ] Migrate KidCard component
- [ ] Migrate TimerView component
- [ ] Migrate AddKidDialog component
- [ ] Migrate SyncManager component
- [ ] Add SafeAreaView handling
- [ ] Implement haptic feedback

### Phase 5: Timer & Notifications Integration
- [ ] Integrate TimerManager with notification service
- [ ] Handle notification responses
- [ ] Implement foreground notification handling
- [ ] Test all timer expiration scenarios

### Phase 6: Sync System
- [ ] Migrate useSync hook
- [ ] Set up background fetch for sync
- [ ] Test sync between two iOS devices

### Phase 7: Polish & Release
- [ ] Add app icon and splash screen
- [ ] Configure app metadata
- [ ] Create EAS build
- [ ] Test on physical device
- [ ] Submit to App Store

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| iOS notification permissions denied | Medium | High | Clear onboarding explaining why notifications are needed |
| Background fetch throttled by iOS | Medium | Medium | Use push notifications for critical sync, poll only for UI updates |
| Alarm sound doesn't loop | Low | High | Use long audio file (30+ sec) as notification sound |
| App killed during timer | Low | Medium | Scheduled notifications work even when app killed |
| Critical alerts entitlement denied | Medium | Low | Fall back to regular notifications |

---

## Appendix: Code Examples

### A1: Notification Permission Handling
```typescript
async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowCriticalAlerts: true, // Request critical alerts
      },
    });
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}
```

### A2: Scheduling Notification with Custom Sound
```typescript
async function scheduleTimerNotification(
  kidId: string,
  kidName: string,
  fireDate: Date
): Promise<string> {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "⏰ Time's Up!",
      body: `${kidName}'s game time has ended.`,
      sound: 'alarm.wav', // Custom sound from assets
      badge: 1,
      data: { kidId, type: 'timer_expired' },
      categoryIdentifier: 'timer_expired',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
    },
  });
  
  return identifier;
}
```

### A3: Handling Notification Response
```typescript
Notifications.addNotificationResponseReceivedListener(response => {
  const { actionIdentifier, notification } = response;
  const { kidId } = notification.request.content.data;
  
  switch (actionIdentifier) {
    case 'STOP_ALARM':
      useAppStore.getState().endSession(kidId);
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
```

---

## Summary

This migration plan provides a roadmap for converting the Game Time Tracker web app into a native iOS app using Expo. The key improvements will be:

1. **Reliable Alarms**: Native iOS notifications fire even when the app is killed
2. **Better UX**: Native UI with haptics and smooth animations
3. **App Store Distribution**: Professional presence on App Store
4. **Future Extensibility**: Foundation for Android port, widgets, etc.

The implementation follows Expo best practices and leverages native iOS capabilities for timer/notification functionality that the web platform cannot reliably provide.
