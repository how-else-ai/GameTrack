# Expo iOS Plan for Native Timer Notifications

## Goal
Bring the existing Game Time Tracker to a native iOS app using Expo so the timer completion notification/alarm is reliable even when the app is backgrounded or terminated.

## Assumptions
- The mobile app will live in this repository as a sibling to the web app (e.g., `/apps/mobile`).
- We will reuse domain logic (kids, tickets, sessions, syncing) by extracting shared TypeScript modules into a common package (e.g., `/packages/core`).
- iOS notifications will be implemented with `expo-notifications` and scheduled at the time a timer ends.

## Architecture Notes
- **State/persistence:** Use Zustand with `AsyncStorage` on mobile. Shared store logic can be platform-agnostic with a storage adapter.
- **Notifications:** Schedule a local notification at `session.endAt` and cancel/reschedule on pause/resume/end.
- **Background behavior:** Rely on iOS local notification scheduling (not background timers) so the notification fires even if the app is closed.
- **Syncing:** Port the existing polling sync to React Native using `fetch` and a background-safe interval while app is active.
- **QR pairing:** Use `expo-barcode-scanner` or `expo-camera` for QR scanning.
- **Navigation/UI:** Use Expo Router with a stack-based UI tailored to iOS.

## Project Structure

```
game-time-tracker/
├── apps/
│   ├── mobile/              # Expo iOS/Android app
│   └── web/                 # Next.js web app (existing)
├── packages/
│   └── core/                # Shared domain logic
│       ├── src/
│       │   ├── types.ts     # Shared TypeScript types
│       │   ├── store.ts     # Zustand store factory
│       │   ├── sync-client.ts # Platform-agnostic sync
│       │   ├── timer-utils.ts # Timer calculations
│       │   ├── storage-adapter.ts # Storage interface
│       │   ├── device.ts    # Device ID generation
│       │   ├── sync-config.ts # Sync constants
│       │   └── avatar.ts    # Avatar system
│       └── package.json
├── docs/
│   ├── IOS_EXPO_PLAN.md     # This file
│   └── SYNC_SYSTEM.md       # Sync system documentation
└── package.json             # Root monorepo config
```

## Implementation Status

### Phase 1: Project Setup ✅ COMPLETE
1. ✅ Initialize Expo app in `/apps/mobile` with TypeScript and Expo Router.
2. ✅ Add `expo-notifications`, `expo-device`, `expo-constants`, `expo-camera`, `zustand`, `@react-native-async-storage/async-storage`.
3. ✅ Configure `app.config.ts` for iOS permissions:
   - `NSUserNotificationsUsageDescription`.
   - `NSCameraUsageDescription` (QR pairing).
   - Background modes for fetch and notifications.
4. ✅ Add shared package (`/packages/core`) for non-UI logic:
   - ✅ Kids/tickets/session state shape.
   - ✅ Timer math utilities and helpers.
   - ✅ Sync event types and payloads.
   - ✅ Storage adapter interface.
5. ✅ Create storage adapter interface with web and AsyncStorage implementations.

### Phase 2: Port Core Features ✅ COMPLETE
1. ✅ Rebuilt main "Game Time Tracker" screens in React Native:
   - ✅ Kids list screen (`/app/index.tsx`)
   - ✅ Timer screen (`/app/timer/[kidId].tsx`)
   - ✅ Add kid screen (`/app/add-kid.tsx`)
   - ✅ Sync/pairing screen (`/app/sync.tsx`)
2. ✅ Ported session lifecycle actions (start/pause/resume/end) using shared logic.
3. ✅ Implemented local persistence via Zustand + AsyncStorage.
4. ✅ Implemented QR/manual pairing flows with native UI and camera permissions.

### Phase 3: Notifications ✅ COMPLETE
1. ✅ Request permissions on first use (`requestNotificationPermissions()`).
2. ✅ Schedule local notification when session starts/resumes (`scheduleTimerNotification()`).
3. ✅ Cancel scheduled notifications on pause/end (`cancelTimerNotification()`).
4. ✅ Reconcile scheduled notifications on app startup (`useNotifications` hook).
5. ✅ Default iOS notification sound and vibration.

### Phase 4: Syncing ✅ COMPLETE
1. ✅ Ported polling-based sync to React Native using `useSync` hook.
2. ✅ Event IDs and debouncing behavior match web logic via `SyncClient` class.
3. ✅ Network error handling and offline state UI in sync screen.

### Phase 5: QA + Release Readiness 🔄 IN PROGRESS
1. 🔄 Manual verification on real iOS devices (foreground/background/terminated scenarios).
   - See [iPad Testing Guide](./IPAD_TESTING_GUIDE.md) for detailed testing instructions
2. ✅ EAS build configuration for ad-hoc TestFlight and production release.
   - Created `eas.json` with development, preview, and production profiles
3. ✅ Documented iOS-specific behavior in this file and testing guide.

## Running the Mobile App

### Prerequisites
- Node.js 18+ or Bun
- iOS Simulator (macOS) or physical iOS device
- Expo CLI: `npm install -g expo-cli`

### Installation
```bash
# From repository root
bun install:all
```

### Development
```bash
# Start the mobile app
bun run dev:mobile

# Or directly
cd apps/mobile
expo start
```

Press `i` to open iOS Simulator.

### Testing on Physical iPad/iPhone

For detailed instructions on testing the app on your iPad, see the [iPad Testing Guide](./IPAD_TESTING_GUIDE.md).

Quick start:
```bash
cd apps/mobile

# Build for your device (requires Apple Developer account)
eas build --platform ios --profile preview

# Or development build for local testing
eas build --platform ios --profile development
```

### Building for Production
```bash
cd apps/mobile

# Build for TestFlight
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios

# Or local build
expo prebuild
npx pod-install
cd ios
xcodebuild -workspace GameTimeTracker.xcworkspace -scheme GameTimeTracker -configuration Release
```

## Mobile App Features

### Screens
1. **Kids List** - Shows all kids with their tickets and active timers
2. **Timer** - Full-screen timer with pause/resume/end controls
3. **Add Kid** - Form to add a new kid with avatar, tickets, and duration
4. **Sync** - Device pairing via QR code or manual entry

### Key Implementation Details

#### Notifications (`src/lib/notifications.ts`)
- Uses `expo-notifications` for local scheduling
- Notifications fire even when app is terminated
- Automatically cancelled when session is paused/ended
- Rescheduled when app comes to foreground (state reconciliation)

#### Storage (`src/lib/storage.ts`)
- AsyncStorage adapter for the shared store
- Compatible with the core package's storage interface

#### Sync (`src/hooks/useSync.ts`)
- Uses shared `SyncClient` from core package
- Native fetch-based HTTP client
- 2-second polling interval
- Visual feedback on successful sync

#### Timer (`src/hooks/useTimer.ts`)
- 1-second update interval (battery optimized)
- Calculates remaining time using core utilities
- Progress bar for visual feedback

## Test Cases

### A. Setup & Permissions
**A1 – First launch notification permission**
- **Steps:** Install app → open app → navigate to start timer.
- **Expected:** iOS notification permission prompt appears; user choice is respected and stored.

**A2 – Camera permission for QR pairing**
- **Steps:** Open pairing screen → select QR scan.
- **Expected:** Camera permission prompt appears; if granted, camera preview is shown.

**A3 – Denied permissions handling**
- **Steps:** Deny notifications and camera permissions → attempt to use timer and QR scan.
- **Expected:** App displays an in-app message explaining permissions and offers a Settings shortcut.

### B. Timer + Notifications (Foreground)
**B1 – Start session schedules notification**
- **Steps:** Create kid → start a 10-minute session.
- **Expected:** A local notification is scheduled for 10 minutes from start.

**B2 – Pause session cancels notification**
- **Steps:** Start session → pause at 2 minutes.
- **Expected:** Scheduled notification is canceled; no alert at original end time.

**B3 – Resume session reschedules notification**
- **Steps:** Resume paused session.
- **Expected:** Notification is scheduled for the new end time based on remaining duration.

**B4 – End session cancels notification**
- **Steps:** End session manually before time completes.
- **Expected:** Scheduled notification is canceled.

### C. Timer + Notifications (Background/Terminated)
**C1 – Notification fires in background**
- **Steps:** Start session → background app (Home button).
- **Expected:** Notification fires at end time with correct title/body.

**C2 – Notification fires when app is terminated**
- **Steps:** Start session → force quit app → wait until end.
- **Expected:** Notification still fires at end time.

**C3 – Reopen after notification**
- **Steps:** After notification fires, tap it to open app.
- **Expected:** App opens to active session summary and marks session as ended.

### D. Persistence & Recovery
**D1 – App restart with active session**
- **Steps:** Start session → kill app → reopen before end time.
- **Expected:** Session resumes with accurate remaining time; notification remains scheduled.

**D2 – App restart after end time**
- **Steps:** Start session → kill app → reopen after end time.
- **Expected:** Session is marked ended; notification has already fired or is cleared.

### E. Syncing
**E1 – Pairing via manual token**
- **Steps:** Enter pairing token → confirm.
- **Expected:** Device pairs and sync begins.

**E2 – Pairing via QR code**
- **Steps:** Scan QR → confirm.
- **Expected:** Pairing completes; device shows paired state.

**E3 – Sync event propagation**
- **Steps:** Create/edit kid on device A → allow sync.
- **Expected:** Device B receives changes with no duplicates or echo loops.

**E4 – Offline handling**
- **Steps:** Disable network → attempt sync.
- **Expected:** App shows offline state, queues changes, and resumes when online.

### F. UX & Edge Cases
**F1 – Multiple overlapping sessions prevention**
- **Steps:** Attempt to start a new session while another is active.
- **Expected:** App prevents or resolves overlap according to business rules.

**F2 – Timer duration zero or negative**
- **Steps:** Attempt to start with 0 minutes.
- **Expected:** App blocks the action with validation message.

**F3 – System time change**
- **Steps:** Start session → change device time forward/backward.
- **Expected:** Session remaining time recalculates; notifications rescheduled appropriately.

**F4 – Notification sound/vibration**
- **Steps:** Set sound/vibration preference (if supported) → start session.
- **Expected:** Notification uses selected sound/vibration behavior.

### G. App Store Readiness
**G1 – Build configuration**
- **Steps:** Run EAS build for iOS.
- **Expected:** Build succeeds and installs via TestFlight.

**G2 – Privacy labels**
- **Steps:** Review app data collection settings in App Store Connect.
- **Expected:** Labels accurately reflect storage/sync behavior.
