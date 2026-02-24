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

## Implementation Plan

### Phase 1: Project Setup
1. Initialize Expo app in `/apps/mobile` with TypeScript and Expo Router.
2. Add `expo-notifications`, `expo-device`, `expo-constants`, `expo-barcode-scanner` (or `expo-camera`), `zustand`, `@react-native-async-storage/async-storage`.
3. Configure `app.json`/`app.config.ts` for iOS permissions:
   - `NSUserNotificationsUsageDescription`.
   - `NSCameraUsageDescription` (QR pairing).
4. Add a shared package (`/packages/core`) for non-UI logic:
   - Kids/tickets/session state shape.
   - Timer math utilities and helpers.
   - Sync event types and payloads.
5. Create a storage adapter interface to swap `localStorage` (web) with `AsyncStorage` (mobile).

### Phase 2: Port Core Features
1. Rebuild the main “Game Time Tracker” screens in React Native components.
2. Port session lifecycle actions (start/pause/resume/end) using shared logic.
3. Implement local persistence via Zustand + AsyncStorage.
4. Implement QR/manual pairing flows with native UI and camera permissions.

### Phase 3: Notifications
1. Request permissions on first use and show a native prompt.
2. Schedule a local notification when a session starts/resumes using the computed end time.
3. Cancel scheduled notifications on pause/end and reschedule on resume.
4. When the app opens, reconcile scheduled notification state with persisted session state.
5. Provide a user setting for sound/vibration (if required) and fallback to default iOS notification sound.

### Phase 4: Syncing
1. Port the existing polling-based sync to React Native.
2. Ensure event IDs and debouncing behavior match web logic.
3. Add network error handling and offline state UI.

### Phase 5: QA + Release Readiness
1. Manual verification on real iOS devices (foreground/background/terminated scenarios).
2. Add EAS build configuration for ad-hoc TestFlight and production release.
3. Document iOS-specific behavior and troubleshooting in `docs/IOS_EXPO_PLAN.md`.

---

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
