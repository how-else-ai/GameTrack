# Game Time Tracker - iOS Mobile App

A native iOS app for the Game Time Tracker, built with Expo and React Native. Provides reliable timer notifications even when the app is backgrounded or terminated.

## Features

- 🔔 **Reliable Notifications** - Timer completion notifications fire even when the app is closed
- 📱 **Native iOS UI** - Built with React Native for a smooth, native experience
- 🔄 **Cross-Device Sync** - Pair with web app and other devices via QR code
- 💾 **Local Persistence** - All data stored locally using AsyncStorage
- 🎮 **Full Feature Parity** - All features from the web app: kids, tickets, timers, sync

## Tech Stack

- **Framework**: [Expo](https://expo.dev/) ~55.0 (SDK 55)
- **React Native**: 0.83.2
- **React**: 19.2.0
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) v55
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) with persistence
- **Storage**: [@react-native-async-storage/async-storage](https://github.com/react-native-async-storage/async-storage)
- **Notifications**: [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- **Camera/QR**: [expo-camera](https://docs.expo.dev/versions/latest/sdk/camera/)
- **Shared Logic**: `@game-time-tracker/core` workspace package

## Project Structure

```
apps/mobile/
├── src/
│   ├── app/                    # Expo Router screens
│   │   ├── _layout.tsx         # Root layout with providers
│   │   ├── index.tsx           # Kids list screen
│   │   ├── timer/[kidId].tsx   # Timer screen
│   │   ├── add-kid.tsx         # Add kid form
│   │   └── sync.tsx            # Device pairing screen
│   ├── components/             # Shared components
│   ├── hooks/                  # Custom hooks
│   │   ├── useSync.ts          # Sync functionality
│   │   ├── useTimer.ts         # Timer state
│   │   └── useNotifications.ts # Notification management
│   └── lib/                    # Utilities
│       ├── store.ts            # Zustand store instance
│       ├── storage.ts          # AsyncStorage adapter
│       └── notifications.ts    # Notification scheduling
├── assets/                     # App icons, splash screen
├── app.config.ts               # Expo configuration
├── babel.config.js             # Babel with module resolver
└── metro.config.js             # Metro with monorepo support
```

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- iOS Simulator (macOS only) or physical iOS device
- Expo CLI is included locally in the project

### Installation

From the repository root:

```bash
# Install all dependencies
bun install:all
```

Or manually:

```bash
# Install root dependencies
bun install

# Install core package
cd packages/core
bun install

# Install mobile app
cd ../../apps/mobile
bun install
```

### Running the App

```bash
# From repository root
bun run dev:mobile

# Or from mobile directory
cd apps/mobile
npx expo start
```

Press `i` to open iOS Simulator.

## Key Implementation Details

### Notifications

The app uses `expo-notifications` to schedule local notifications that fire at the exact time a timer ends:

```typescript
// Schedule a notification when session starts
await scheduleTimerNotification(
  kidId,
  kidName,
  startTime,
  durationMinutes,
  totalPausedDuration
);

// Cancel when paused or ended
await cancelTimerNotification(kidId);
```

Key features:
- Notifications fire even when the app is terminated
- Automatically cancelled on pause/end
- Rescheduled when app comes to foreground (state reconciliation)
- Uses iOS's native notification scheduling for reliability

### Storage

Uses `@react-native-async-storage/async-storage` with the shared store:

```typescript
// AsyncStorage adapter implements the StorageAdapter interface
export const asyncStorageAdapter: StorageAdapter = {
  getItem: async (key) => AsyncStorage.getItem(key),
  setItem: async (key, value) => AsyncStorage.setItem(key, value),
  removeItem: async (key) => AsyncStorage.removeItem(key),
};

// Create store with AsyncStorage
export const useAppStore = createAppStore(asyncStorageAdapter);
```

### Sync

Uses the shared `SyncClient` from `@game-time-tracker/core`:

```typescript
const syncClient = new SyncClient(
  nativeHttpClient,  // fetch-based
  callbacks,         // event handlers
  stateHandlers      // getState, setAuthToken, etc.
);
```

Features:
- 2-second polling interval
- Visual feedback on successful sync
- Network error handling
- Echo prevention via event ID tracking

## Building for Production

### Using EAS Build (Recommended)

```bash
cd apps/mobile

# Build for TestFlight
eas build --platform ios

# Or for simulator
eas build --platform ios --profile simulator
```

### Local Build

```bash
cd apps/mobile

# Generate native project
npx expo prebuild

# Install pods
cd ios && pod install && cd ..

# Build in Xcode
open ios/GameTimeTracker.xcworkspace
```

## iOS-Specific Configuration

### Permissions (app.config.ts)

```typescript
ios: {
  infoPlist: {
    NSUserNotificationsUsageDescription: 'Game Time Tracker needs to send notifications when your gaming session ends...',
    NSCameraUsageDescription: 'Game Time Tracker uses the camera to scan QR codes for pairing devices...',
    UIBackgroundModes: ['fetch', 'remote-notification'],
  },
},
plugins: [
  'expo-notifications',
  ['expo-camera', { cameraPermission: 'Allow Game Time Tracker to access your camera...' }],
],
```

## Troubleshooting

### Notifications not appearing
1. Check notification permissions in iOS Settings
2. Ensure you're testing on a physical device (simulator has limited notification support)
3. Verify the app has been properly provisioned for notifications

### Sync not working
1. Check internet connection
2. Verify both devices are paired correctly
3. Check console logs for registration errors

### Camera not working
1. Grant camera permission in iOS Settings
2. Try the manual paste option instead
3. Check that `NSCameraUsageDescription` is set in app.config.ts

## License

See the root repository LICENSE file.
