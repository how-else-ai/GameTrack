# Game Time Tracker - iOS Test Cases

Comprehensive test cases for validating the iOS Expo implementation. These tests cover all critical user flows, edge cases, and native-specific functionality.

---

## Table of Contents

1. [Installation & Onboarding](#installation--onboarding)
2. [Timer Functionality](#timer-functionality)
3. [Notifications](#notifications)
4. [Background & App Lifecycle](#background--app-lifecycle)
5. [Data Persistence](#data-persistence)
6. [Sync System](#sync-system)
7. [Edge Cases & Error Handling](#edge-cases--error-handling)
8. [UI/UX](#uiux)
9. [Performance](#performance)
10. [Regression Tests](#regression-tests)

---

## Installation & Onboarding

### TC-INST-001: First Launch
**Priority:** P0 (Critical)
**Preconditions:** Fresh install, no prior app data

**Steps:**
1. Install app from TestFlight/App Store
2. Launch app
3. Observe splash screen
4. Complete onboarding (if any)

**Expected Results:**
- Splash screen displays correctly with pixel theme
- App transitions to main screen
- Empty state shows "NO PLAYERS" message
- No crashes or errors in console

**Platform:** iOS 16+

---

### TC-INST-002: Notification Permission Flow
**Priority:** P0 (Critical)
**Preconditions:** First launch

**Steps:**
1. Fresh install and launch
2. Tap "Enable Notifications" or wait for prompt
3. Tap "Allow" on iOS permission dialog
4. Check notification settings

**Expected Results:**
- iOS permission dialog appears with app name
- After allowing, notification bell icon shows enabled state
- Settings persist on app restart

**Steps (Deny Path):**
1. Fresh install
2. Tap "Don't Allow" on permission dialog

**Expected Results:**
- App continues without notifications
- UI shows notification disabled state
- User can re-enable in Settings later

---

### TC-INST-003: App Icon & Branding
**Priority:** P1 (High)

**Steps:**
1. Install app
2. Check home screen icon
3. Check App Library icon
4. Check Settings → Notifications icon

**Expected Results:**
- Icon displays correctly at all sizes
- No distortion or pixelation
- Matches pixel/retro theme

---

## Timer Functionality

### TC-TIMER-001: Basic Timer Start
**Priority:** P0 (Critical)

**Steps:**
1. Add a kid with name "Test Kid", 3 tickets, 2 minute duration
2. Tap kid card to open timer view
3. Tap "Start" on first available ticket

**Expected Results:**
- Timer starts counting down from 2:00
- Ticket shows "in-use" status
- Progress bar fills from left
- Timer updates every second (MM:SS format)

---

### TC-TIMER-002: Timer Pause and Resume
**Priority:** P0 (Critical)

**Steps:**
1. Start timer (5 minute duration)
2. Wait 1 minute
3. Tap Pause button
4. Wait 30 seconds
5. Tap Resume button
6. Let timer complete

**Expected Results:**
- After pause: Timer display freezes, "Paused" indicator shown
- After resume: Timer continues from paused time (shows ~4:00)
- Total elapsed time = 5 minutes (not 5:30)
- Session ends at correct time

---

### TC-TIMER-003: Timer End Early
**Priority:** P0 (Critical)

**Steps:**
1. Start timer (5 minute duration)
2. Wait 2 minutes
3. Tap "End" button
4. Confirm if prompted

**Expected Results:**
- Session ends immediately
- Ticket marked as "used"
- Timer view returns to ticket selection
- Progress bar resets to 0%

---

### TC-TIMER-004: Multiple Tickets in Sequence
**Priority:** P1 (High)

**Steps:**
1. Add kid with 3 tickets, 1 minute each
2. Start ticket 1, let complete
3. Start ticket 2, let complete
4. Start ticket 3, end early at 30 seconds

**Expected Results:**
- Each ticket shows correct status progression
- No ticket can be used twice
- Available tickets count decrements correctly
- Used tickets visually distinct

---

### TC-TIMER-005: Warning State (1 Minute Remaining)
**Priority:** P1 (High)

**Steps:**
1. Start timer (2 minute duration)
2. Wait 1 minute

**Expected Results:**
- Timer display changes to warning color (red/orange)
- Display shows pulsing animation
- "1 minute remaining!" text appears
- Warning notification scheduled (for background)

---

### TC-TIMER-006: Timer Precision
**Priority:** P1 (High)

**Steps:**
1. Start 1-minute timer
2. Use stopwatch to verify accuracy

**Expected Results:**
- Timer completes within ±2 seconds of actual minute
- No drift or stuttering in countdown

---

## Notifications

### TC-NOTIF-001: Foreground Timer Expiration
**Priority:** P0 (Critical)
**Preconditions:** App in foreground, notifications enabled

**Steps:**
1. Start 1-minute timer
2. Keep app in foreground
3. Wait for expiration

**Expected Results:**
- Alarm sound plays (native audio)
- In-app notification/toast appears
- "Time's Up!" text displayed
- Session ends automatically

---

### TC-NOTIF-002: Background Timer Expiration
**Priority:** P0 (Critical)
**Preconditions:** App backgrounded, notifications enabled

**Steps:**
1. Start 2-minute timer
2. Press home button (background app)
3. Wait 2 minutes
4. Observe device

**Expected Results:**
- iOS notification appears on lock screen/home screen
- Alarm sound plays (even if device locked)
- Notification shows kid name and "Time's Up!"
- Badge increments on app icon

---

### TC-NOTIF-003: Timer Expiration - App Killed
**Priority:** P0 (Critical)
**Preconditions:** Timer running

**Steps:**
1. Start 2-minute timer
2. Kill app (swipe up in app switcher)
3. Wait 2 minutes
4. Observe device

**Expected Results:**
- Notification still fires (scheduled with iOS)
- Alarm sound plays
- Opening app shows correct expired state

---

### TC-NOTIF-004: Notification Actions - Stop Alarm
**Priority:** P1 (High)
**Preconditions:** Timer expired notification showing

**Steps:**
1. Let timer expire (background app)
2. Long press notification OR swipe and tap action
3. Tap "Stop Alarm" action

**Expected Results:**
- Alarm sound stops
- Notification dismissed
- Session ends
- Opening app shows session ended state

---

### TC-NOTIF-005: Notification Actions - Add Time
**Priority:** P2 (Medium)
**Preconditions:** Timer expired notification showing

**Steps:**
1. Let timer expire
2. Use notification action "Add 5 Minutes"
3. Authenticate if required

**Expected Results:**
- Timer extends by 5 minutes
- New notification scheduled for new end time
- Session continues
- App opens to timer view

---

### TC-NOTIF-006: Warning Notification
**Priority:** P1 (High)
**Preconditions:** App backgrounded, 5+ minute timer

**Steps:**
1. Start 5-minute timer
2. Background app
3. Wait 4 minutes

**Expected Results:**
- Warning notification appears at 1-minute mark
- Different sound than alarm (warning.wav)
- Body: "{kidName} has 1 minute remaining"
- Expiration notification still fires at 5 minutes

---

### TC-NOTIF-007: Multiple Simultaneous Notifications
**Priority:** P2 (Medium)

**Steps:**
1. Start timer for Kid A (2 minutes)
2. Start timer for Kid B (3 minutes)
3. Background app
4. Wait for both to expire

**Expected Results:**
- Two separate notifications appear
- Each shows correct kid name
- Each has distinct notification ID
- Both can be interacted with independently

---

### TC-NOTIF-008: Notification with Do Not Disturb
**Priority:** P2 (Medium)
**Preconditions:** iOS Do Not Disturb enabled

**Steps:**
1. Enable Do Not Disturb in iOS Control Center
2. Start timer
3. Let expire

**Expected Results (with Critical Alerts entitlement):**
- Notification still shows
- Sound still plays
- Bypasses DND setting

**Expected Results (without Critical Alerts):**
- Notification appears silently
- No sound
- Still visible on lock screen

---

### TC-NOTIF-009: Notification Permission Revoked
**Priority:** P1 (High)

**Steps:**
1. Grant notification permission
2. Start timer
3. Go to iOS Settings → Notifications → Game Time Tracker
4. Disable "Allow Notifications"
5. Return to app
6. Let timer expire

**Expected Results:**
- App detects permission change
- UI shows notification disabled warning
- Timer still works in foreground
- Background alarm won't fire

---

### TC-NOTIF-010: Notification Badge Management
**Priority:** P2 (Medium)

**Steps:**
1. Let multiple timers expire without opening app
2. Check app icon badge
3. Open app
4. Check badge after viewing expired timers

**Expected Results:**
- Badge shows correct count of expired timers
- Badge clears when app opened
- Badge increments for each new expiration

---

## Background & App Lifecycle

### TC-LIFE-001: App Background During Timer
**Priority:** P0 (Critical)

**Steps:**
1. Start timer (5 minutes)
2. Background app at 2:00 remaining
3. Wait 3 minutes
4. Foreground app

**Expected Results:**
- Timer shows correct remaining time (0:00 or expired state)
- No crash or UI freeze
- Notification fired while backgrounded

---

### TC-LIFE-002: App Kill and Relaunch
**Priority:** P0 (Critical)

**Steps:**
1. Add kid and start timer
2. Kill app
3. Reopen app

**Expected Results:**
- App launches successfully
- All data preserved
- Timer continues with accurate remaining time
- Scheduled notifications still active

---

### TC-LIFE-003: Low Memory Scenario
**Priority:** P1 (High)

**Steps:**
1. Start timer
2. Open multiple other apps to trigger memory pressure
3. Return to Game Time Tracker

**Expected Results:**
- App not killed by system
- If killed, scheduled notifications still fire
- Data integrity maintained

---

### TC-LIFE-004: Device Lock During Timer
**Priority:** P0 (Critical)

**Steps:**
1. Start timer (2 minutes)
2. Lock device
3. Wait 2 minutes

**Expected Results:**
- Notification appears on lock screen
- Sound plays
- Can interact with notification without unlocking (if configured)

---

### TC-LIFE-005: Phone Call During Timer
**Priority:** P1 (High)

**Steps:**
1. Start timer
2. Receive phone call
3. Decline or accept and end call
4. Return to app

**Expected Results:**
- Timer continued in background
- Audio session handled correctly
- App returns to foreground state correctly

---

## Data Persistence

### TC-DATA-001: Kid Data Persistence
**Priority:** P0 (Critical)

**Steps:**
1. Add 3 kids with different settings
2. Kill app
3. Relaunch app

**Expected Results:**
- All 3 kids displayed
- Correct names, avatars, ticket limits
- Correct ticket durations per kid

---

### TC-DATA-002: Active Session Persistence
**Priority:** P0 (Critical)

**Steps:**
1. Start timer for kid
2. Note remaining time (e.g., 3:45)
3. Kill app
4. Wait 30 seconds
5. Relaunch app

**Expected Results:**
- Session still active
- Timer shows ~3:15 (accounted for elapsed time)
- Notification still scheduled

---

### TC-DATA-003: Ticket Status Persistence
**Priority:** P0 (Critical)

**Steps:**
1. Use some tickets (in-use, used states)
2. Kill app
3. Relaunch

**Expected Results:**
- Each ticket shows correct status
- Available count correct
- Cannot use already-used ticket

---

### TC-DATA-004: Settings Persistence
**Priority:** P1 (High)

**Steps:**
1. Change device name
2. Pair with another device
3. Kill app
4. Relaunch

**Expected Results:**
- Device name preserved
- Paired devices list preserved
- Sync token preserved

---

### TC-DATA-005: Data Migration from Web (if applicable)
**Priority:** P2 (Medium)

**Steps:**
1. Have web app data in localStorage
2. Install native app
3. Import data (if feature exists)

**Expected Results:**
- All kid data imported
- Active sessions preserved
- No data loss

---

## Sync System

### TC-SYNC-001: Basic Device Pairing
**Priority:** P1 (High)
**Preconditions:** Two iOS devices with app installed

**Steps:**
1. Device A: Open sync dialog, generate pairing code
2. Device B: Enter pairing code
3. Confirm pairing on both devices

**Expected Results:**
- Both devices show paired status
- Device names visible on each
- Online status indicators work

---

### TC-SYNC-002: Real-time Data Sync
**Priority:** P1 (High)
**Preconditions:** Devices paired

**Steps:**
1. Device A: Add new kid
2. Wait 3 seconds
3. Device B: Check kid list

**Expected Results:**
- Kid appears on Device B
- All kid details correct
- Sync indicator shows recent sync

---

### TC-SYNC-003: Timer State Sync
**Priority:** P1 (High)

**Steps:**
1. Device A: Start timer
2. Device B: Observe kid card

**Expected Results:**
- Device B shows timer as active
- Timer countdown visible
- Can view timer details

---

### TC-SYNC-004: Offline Sync Queue
**Priority:** P2 (Medium)

**Steps:**
1. Device A: Enable airplane mode
2. Add kid
3. Start timer
4. Disable airplane mode
5. Wait for sync

**Expected Results:**
- Changes sync to Device B once online
- No data loss during offline period
- Sync resumes automatically

---

### TC-SYNC-005: Conflict Resolution
**Priority:** P2 (Medium)

**Steps:**
1. Both devices offline
2. Device A: Edit kid name to "Alice"
3. Device B: Edit same kid name to "Bob"
4. Both come online

**Expected Results:**
- Conflict resolved (later timestamp wins or merge)
- Both devices end with same data
- No duplicate kids created

---

### TC-SYNC-006: Unpair Devices
**Priority:** P2 (Medium)

**Steps:**
1. Have paired devices
2. Device A: Unpair Device B
3. Check Device B

**Expected Results:**
- Device B shows unpaired status
- No further sync occurs
- Local data preserved on both

---

### TC-SYNC-007: Background Sync
**Priority:** P1 (High)

**Steps:**
1. Pair devices
2. Background Device A
3. Device B: Make changes
4. Wait 2 minutes
5. Foreground Device A

**Expected Results:**
- Device A receives updates via background fetch
- Or updates immediately on foreground
- Data consistent across devices

---

## Edge Cases & Error Handling

### TC-EDGE-001: Zero-Minute Timer
**Priority:** P2 (Medium)

**Steps:**
1. Try to set timer duration to 0 (if UI allows)
2. Or manually trigger immediate expiration

**Expected Results:**
- UI prevents 0-minute duration, OR
- Timer expires immediately with notification
- No crash or infinite loop

---

### TC-EDGE-002: Very Long Timer (12+ hours)
**Priority:** P2 (Medium)

**Steps:**
1. Create kid with 720-minute (12 hour) duration
2. Start timer
3. Background app

**Expected Results:**
- Timer works correctly
- Notification scheduled correctly (iOS supports up to 30 days)
- No integer overflow issues

---

### TC-EDGE-003: System Time Change
**Priority:** P2 (Medium)

**Steps:**
1. Start timer
2. Change device time forward 1 hour
3. Observe timer
4. Change device time backward 1 hour
5. Observe timer

**Expected Results:**
- Timer adjusts correctly to system time changes
- Or uses monotonic clock if available
- Notification times adjust

---

### TC-EDGE-004: Low Battery Mode
**Priority:** P1 (High)

**Steps:**
1. Enable Low Power Mode in iOS Settings
2. Start timer
3. Background app
4. Wait for expiration

**Expected Results:**
- Notification still fires
- Background fetch may be delayed but sync eventually happens
- App functions correctly

---

### TC-EDGE-005: Airplane Mode During Timer
**Priority:** P1 (High)

**Steps:**
1. Start timer
2. Enable Airplane Mode
3. Let timer expire
4. Disable Airplane Mode

**Expected Results:**
- Local notification fires (doesn't need network)
- Alarm sound plays
- Sync happens once network restored

---

### TC-EDGE-006: Rapid Start/Stop
**Priority:** P2 (Medium)

**Steps:**
1. Rapidly tap start/stop multiple times
2. Or programmatically trigger rapid state changes

**Expected Results:**
- No crash
- Final state consistent
- No duplicate notifications scheduled

---

### TC-EDGE-007: Many Kids (50+)
**Priority:** P2 (Medium)

**Steps:**
1. Add 50+ kids
2. Scroll through list
3. Start multiple timers

**Expected Results:**
- List scrolls smoothly
- No memory issues
- All timers track correctly

---

### TC-EDGE-008: Special Characters in Names
**Priority:** P2 (Medium)

**Steps:**
1. Add kids with names:
   - "O'Connor"
   - "José"
   - "👨‍👩‍👧‍👦 Family"
   - "<script>alert('xss')</script>"
2. Start timers
3. Check notifications

**Expected Results:**
- Names display correctly
- Notifications show correct names
- No injection or rendering issues

---

## UI/UX

### TC-UI-001: Responsive Layout
**Priority:** P1 (High)

**Steps:**
1. Test on iPhone SE (small screen)
2. Test on iPhone 15 Pro Max (large screen)
3. Test on iPad (if supported)

**Expected Results:**
- Layout adapts to screen size
- Touch targets minimum 44x44 points
- Text readable at all sizes
- No truncation or overflow

---

### TC-UI-002: Dark Mode Support
**Priority:** P2 (Medium)

**Steps:**
1. Test with iOS Dark Mode enabled
2. Test with iOS Light Mode enabled

**Expected Results:**
- App theme consistent with system
- All elements visible in both modes
- Pixel theme maintained

---

### TC-UI-003: Accessibility
**Priority:** P1 (High)

**Steps:**
1. Enable VoiceOver
2. Navigate through all screens
3. Enable Dynamic Type (largest text)
4. Test with Reduce Motion enabled

**Expected Results:**
- All elements have accessibility labels
- VoiceOver reads correctly
- Layout works with large text
- Animations respect Reduce Motion

---

### TC-UI-004: Haptic Feedback
**Priority:** P2 (Medium)

**Steps:**
1. Tap buttons
2. Start/stop timers
3. Receive notifications

**Expected Results:**
- Appropriate haptics for actions
- Light impact for buttons
- Success haptic for timer completion
- No excessive haptic usage

---

### TC-UI-005: Pixel Theme Consistency
**Priority:** P2 (Medium)

**Steps:**
1. Review all screens
2. Check borders, colors, fonts

**Expected Results:**
- Pixel/retro theme consistent
- Border styles match design
- Font choices appropriate
- Arcade aesthetic maintained

---

## Performance

### TC-PERF-001: Cold Start Time
**Priority:** P1 (High)

**Steps:**
1. Kill app
2. Tap app icon
3. Measure time to interactive

**Expected Results:**
- App launches within 2 seconds
- UI responsive immediately
- No frozen frames

---

### TC-PERF-002: Timer Tick Performance
**Priority:** P1 (High)

**Steps:**
1. Start 10+ simultaneous timers
2. Monitor CPU usage
3. Check UI responsiveness

**Expected Results:**
- Smooth 60fps animations
- No dropped frames
- CPU usage reasonable (<10%)

---

### TC-PERF-003: Memory Usage
**Priority:** P2 (Medium)

**Steps:**
1. Launch app
2. Add multiple kids
3. Start timers
4. Use app for 30 minutes
5. Check memory usage

**Expected Results:**
- No memory leaks
- Memory usage stable
- App not killed for memory pressure

---

### TC-PERF-004: Battery Impact
**Priority:** P2 (Medium)

**Steps:**
1. Run app with active timers
2. Background app
3. Monitor battery usage in iOS Settings

**Expected Results:**
- Low battery impact when backgrounded
- No excessive background activity
- Efficient notification scheduling

---

## Regression Tests

### TC-REG-001: Web-to-iOS Parity
**Priority:** P0 (Critical)

**Verify:**
- All web features present in iOS app
- Same kid data structure
- Same timer precision
- Same sync behavior

---

### TC-REG-002: Update from Previous Version
**Priority:** P1 (High)

**Steps:**
1. Install previous version
2. Add data
3. Update to new version
4. Verify data intact

**Expected Results:**
- All data preserved
- No migration errors
- App functions normally

---

### TC-REG-003: Fresh Install vs. Update
**Priority:** P2 (Medium)

**Test both:**
- Fresh install path
- Update path

**Expected Results:**
- Both paths result in working app
- No differences in functionality

---

## Test Environment Matrix

| Device | iOS Version | Priority | Notes |
|--------|-------------|----------|-------|
| iPhone 15 Pro | iOS 18 | P0 | Latest flagship |
| iPhone 14 | iOS 17 | P0 | Popular model |
| iPhone SE (3rd gen) | iOS 17 | P0 | Small screen |
| iPhone 12 | iOS 16 | P1 | Older but common |
| iPad Pro | iPadOS 17 | P2 | If supporting iPad |

---

## Automated Testing Recommendations

### Unit Tests
- Timer calculation logic
- Notification scheduling/cancellation
- Data persistence functions
- Sync protocol handlers

### Integration Tests
- Timer + notification flow
- Store + AsyncStorage integration
- Sync between devices (mock server)

### E2E Tests (Detox/Appium)
- Complete user flows
- Background/foreground transitions
- Notification interactions

---

## Sign-Off Criteria

### Must Pass (P0)
- All P0 test cases pass
- No crashes in core flows
- App Store guidelines compliance

### Should Pass (P1)
- All P1 test cases pass
- Minor bugs documented with workarounds

### Nice to Have (P2)
- P2 test cases pass
- Known issues don't impact core functionality

---

## Bug Report Template

```
**Test Case ID:** TC-XXX-XXX
**Severity:** Critical/High/Medium/Low
**Environment:** Device, iOS Version, App Version

**Steps to Reproduce:**
1. Step one
2. Step two

**Expected Result:**
- Expected behavior

**Actual Result:**
- Actual behavior

**Attachments:**
- Screenshot/Video
- Console logs
- Crash report (if applicable)
```

---

*Last Updated: 2024*
*Version: 1.0*
