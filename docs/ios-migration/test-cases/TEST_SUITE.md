# Test Suite: iOS Native Migration

## Test Categories

1. [Unit Tests](#unit-tests)
2. [Integration Tests](#integration-tests)
3. [E2E Tests](#e2e-tests)
4. [Notification Tests](#notification-tests)
5. [Performance Tests](#performance-tests)

---

## Unit Tests

### Store Tests (`src/lib/__tests__/store.test.ts`)

#### UT-001: Initialize Device
```gherkin
Given the app is launched for the first time
When the store initializes
Then a unique deviceId should be generated
And a deviceName should be auto-generated
```

**Test Data:**
- Fresh install (no persisted state)
- Existing persisted state

**Expected Results:**
```typescript
expect(store.deviceId).toBeDefined();
expect(store.deviceId.length).toBeGreaterThan(0);
expect(store.deviceName).toMatch(/^Device-/);
```

---

#### UT-002: Add Kid
```gherkin
Given the user is on the home screen
When addKid is called with valid data
Then a new kid should be added to the store
And syncVersion should increment
And tickets should be created for the kid
```

**Test Data:**
```typescript
const kidData = {
  name: 'Test Kid',
  avatarEmoji: '👦',
  ticketLimit: 5,
  ticketDuration: 30,
};
```

**Expected Results:**
- Kid array length increases by 1
- Kid has correct properties
- Tickets array has 5 items
- All tickets have status 'available'

---

#### UT-003: Delete Kid
```gherkin
Given a kid exists in the store
When deleteKid is called with the kid's id
Then the kid should be removed from kids array
And the kid should be added to deletedKids array
And syncVersion should increment
```

**Expected Results:**
- Kids array no longer contains deleted kid
- DeletedKids array contains entry with kid id
- deletedAt timestamp is set
- deletedBy is current deviceId

---

#### UT-004: Start Session
```gherkin
Given a kid has available tickets
When startSession is called with kidId and ticketId
Then the ticket status should change to 'in-use'
And an activeSession should be created
And startTime should be set to current ISO timestamp
And isPaused should be false
```

**Expected Results:**
```typescript
expect(kid.activeSession).toBeDefined();
expect(kid.activeSession.ticketId).toBe(ticketId);
expect(kid.activeSession.isPaused).toBe(false);
expect(kid.tickets.find(t => t.id === ticketId).status).toBe('in-use');
```

---

#### UT-005: Pause Session
```gherkin
Given an active session is running
When pauseSession is called
Then isPaused should be true
And pausedAt should be set to current timestamp
```

---

#### UT-006: Resume Session
```gherkin
Given a session is paused
When resumeSession is called
Then isPaused should be false
And pausedAt should be undefined
And totalPausedDuration should be updated
```

---

#### UT-007: End Session
```gherkin
Given an active session exists
When endSession is called
Then activeSession should be null
And the ticket status should change to 'used'
```

---

#### UT-008: Persistence with AsyncStorage
```gherkin
Given the store has been modified
When the app is closed and reopened
Then the store state should be restored from AsyncStorage
```

---

### Timer Tests (`src/lib/__tests__/timer.test.ts`)

#### UT-101: Calculate Remaining Time - Running
```gherkin
Given a session started 5 minutes ago with 30 minute duration
And the session is not paused
When calculateRemainingTime is called
Then it should return 25 minutes in seconds (1500)
```

**Test Cases:**
| Start Time | Duration | Paused | Expected Result |
|------------|----------|--------|-----------------|
| Now | 30 min | No | 1800 seconds |
| 15 min ago | 30 min | No | 900 seconds |
| 30 min ago | 30 min | No | 0 seconds |
| 31 min ago | 30 min | No | 0 seconds (clamped) |

---

#### UT-102: Calculate Remaining Time - Paused
```gherkin
Given a session started 10 minutes ago
And it was paused 5 minutes ago
When calculateRemainingTime is called
Then it should return 25 minutes (accounting for elapsed before pause)
```

---

#### UT-103: Warning State Detection
```gherkin
Given various remaining times
When isWarning is called
Then it should return true only when remaining <= 60 seconds and > 0
```

**Test Cases:**
| Remaining Seconds | Expected isWarning |
|-------------------|-------------------|
| 0 | false |
| 30 | true |
| 60 | true |
| 61 | false |
| 300 | false |

---

### Notification Tests (`src/lib/__tests__/notifications.test.ts`)

#### UT-201: Request Permission - Granted
```gherkin
Given the user has not previously denied permission
When requestPermission is called
And the user grants permission
Then the method should return 'granted'
And notifications should be scheduled
```

---

#### UT-202: Request Permission - Denied
```gherkin
Given the user previously denied permission
When requestPermission is called
Then the method should return 'denied'
And no notifications should be scheduled
```

---

#### UT-203: Schedule Timer Notifications
```gherkin
Given permission is granted
When scheduleTimerNotifications is called with kid and duration
Then two notifications should be scheduled
With correct fire dates (warning and expiration)
```

---

#### UT-204: Cancel Notifications
```gherkin
Given notifications are scheduled for a kid
When cancelTimerNotifications is called
Then all pending notifications for that kid should be removed
```

---

## Integration Tests

### IT-001: Full Timer Flow
```gherkin
Given a kid exists with available tickets
When the user starts a timer
Then the notification should be scheduled
And the UI should show the countdown
And when the timer expires
Then the local notification should fire
And the session should end automatically
```

**Steps:**
1. Create test kid
2. Start session
3. Verify notification scheduled (mock or spy)
4. Fast-forward time (or mock)
5. Verify notification fires
6. Verify session ends

---

### IT-002: App Background Handling
```gherkin
Given a timer is running
When the app goes to background
Then the notification should remain scheduled
And when the user returns to the app
Then the countdown should be accurate
```

---

### IT-003: App Termination Handling
```gherkin
Given a timer is running
When the app is terminated
Then the local notification should still fire at the scheduled time
And when the user taps the notification
Then the app should open to the timer screen
```

---

### IT-004: Pause and Resume with Notifications
```gherkin
Given a timer is running
When the user pauses the timer
Then the notification should be cancelled
And when the user resumes the timer
Then a new notification should be scheduled with updated time
```

---

### IT-005: Sync Across Devices
```gherkin
Given Device A and Device B are paired
When a kid is added on Device A
Then the kid should appear on Device B
And when a timer is started on Device B
Then Device A should show the timer state
```

---

## E2E Tests

### E2E-001: Complete User Journey - Add Kid and Start Timer
```gherkin
Scenario: Parent adds a kid and starts a gaming session

Given the app is on the home screen
When the user taps "Add Player"
And enters name "Alex"
And selects avatar "👦"
And sets ticket limit to 5
And sets duration to 30 minutes
And taps "Save"
Then the kid "Alex" should appear in the list

When the user taps on "Alex"
Then the timer screen should open

When the user taps "Start"
Then the countdown should begin at 30:00
And the progress bar should start filling

When 1 minute remains
Then a warning notification should fire (if testing on device)

When the timer reaches 0
Then an expiration notification should fire
And the ticket should be marked as used
```

---

### E2E-002: Pause and Resume Timer
```gherkin
Scenario: Parent pauses timer for dinner, then resumes

Given a timer is running at 15:00 remaining
When the user taps "Pause"
Then the countdown should stop
And the UI should show "Paused"

When 5 minutes pass in real time
And the user opens the app
Then the timer should still show 15:00

When the user taps "Resume"
Then the countdown should continue from 15:00
```

---

### E2E-003: Multiple Kids Management
```gherkin
Scenario: Parent manages multiple children's game time

Given the home screen is empty
When the user adds "Alex" with 30 min tickets
And adds "Sam" with 45 min tickets
Then both kids should appear in the list

When the user starts a timer for "Alex"
And goes back to home screen
Then "Alex" should show timer active indicator

When the user starts a timer for "Sam"
Then both timers should be tracked independently
```

---

### E2E-004: Data Persistence
```gherkin
Scenario: App data survives restart

Given the user has added 2 kids
And started a timer for one kid
When the user force-quits the app
And reopens the app
Then both kids should still be present
And the timer state should be accurate (accounting for elapsed time)
```

---

## Notification Tests (Device Required)

### NT-001: Notification in Foreground
```gherkin
Given the app is open
And a timer is running
When the timer expires
Then the notification should be handled in-app
And not show as system notification
```

---

### NT-002: Notification in Background
```gherkin
Given the app is in background (not terminated)
And a timer is running
When the timer expires
Then a system notification should appear
With sound and vibration
And tapping it should open the app
```

---

### NT-003: Notification When Terminated
```gherkin
Given the app is swiped away (terminated)
And a timer was running
When the timer expires
Then a system notification should still appear
And tapping it should launch the app
And show the correct screen
```

---

### NT-004: Notification with Locked Device
```gherkin
Given the device is locked
And a timer is running
When the timer expires
Then the notification should appear on lock screen
And the user should be able to unlock and go to app
```

---

### NT-005: Notification with Do Not Disturb
```gherkin
Given Do Not Disturb is enabled
And a timer expires
Then the notification should NOT appear (or appear silently based on settings)
```

---

### NT-006: Time-Sensitive Notification
```gherkin
Given Focus mode is active
When a timer expires
Then the time-sensitive notification should break through Focus
And appear with sound
```

---

## Performance Tests

### PT-001: App Launch Time
```gherkin
Given the app is not running
When the user taps the app icon
Then the app should be interactive within 2 seconds
```

**Metrics to Track:**
- Cold start time: < 2s
- Warm start time: < 1s

---

### PT-002: List Scroll Performance
```gherkin
Given there are 50 kids in the list (stress test)
When the user scrolls the list
Then the scroll should maintain 60 FPS
And no frames should be dropped
```

---

### PT-003: Timer Update Performance
```gherkin
Given multiple timers are running simultaneously
When the timers update every second
Then the UI should remain responsive
And animations should be smooth
```

---

### PT-004: Memory Usage
```gherkin
Given the app has been running for an hour
With multiple timer start/stop cycles
Then memory usage should remain stable
And no memory leaks should be detected
```

**Acceptance Criteria:**
- Memory growth < 10MB over 1 hour
- No crashes due to memory pressure

---

## Accessibility Tests

### A11Y-001: VoiceOver Support
```gherkin
Given VoiceOver is enabled
When the user navigates the app
Then all interactive elements should be labeled
And the timer countdown should be announced
```

### A11Y-002: Dynamic Type
```gherkin
Given the user has set large text size in iOS settings
When the app is opened
Then all text should scale appropriately
And no text should be truncated or clipped
```

### A11Y-003: Color Contrast
```gherkin
Given the app is running
Then all text should meet WCAG AA contrast requirements (4.5:1)
```

---

## Edge Cases

### EC-001: Timer Started Just Before Midnight
```gherkin
Given the time is 23:59
When a 30-minute timer is started
Then the timer should correctly expire at 00:29 next day
```

### EC-002: Device Timezone Change
```gherkin
Given a timer is scheduled
When the user changes timezone
Then the timer should still expire at the correct local time
```

### EC-003: Daylight Saving Time Transition
```gherkin
Given a timer is scheduled before DST change
When DST starts/ends
Then the timer should still expire at the correct time
```

### EC-004: Device Restart
```gherkin
Given a timer is scheduled
When the device is restarted
Then the notification should still be delivered
```

### EC-005: Low Battery Mode
```gherkin
Given the device is in Low Battery Mode
When a timer expires
Then the notification should still be delivered (may be delayed)
```

---

## Test Execution Matrix

| Test Type | Simulator | Physical Device | CI/CD |
|-----------|-----------|-----------------|-------|
| Unit Tests | ✅ | ✅ | ✅ |
| Integration Tests | ✅ | ✅ | ✅ |
| E2E Tests | ✅ | ✅ | ⚠️ Limited |
| Notification Tests | ❌ | ✅ Required | ❌ |
| Performance Tests | ⚠️ Limited | ✅ | ⚠️ Limited |
| Accessibility Tests | ✅ | ✅ | ❌ |

---

## Coverage Targets

| Category | Target Coverage | Priority |
|----------|-----------------|----------|
| Store Logic | 95% | P0 |
| Timer Logic | 95% | P0 |
| Notification Logic | 95% | P0 |
| UI Components | 80% | P1 |
| Screens | 75% | P1 |
| Utilities | 80% | P2 |
| **Overall** | **85%** | **P0** |
