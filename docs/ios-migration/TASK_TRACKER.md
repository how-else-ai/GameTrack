# Task Tracker: iOS Native Migration

## How to Use This Document

- [ ] Unchecked = Not started
- [-] Dash = In progress
- [x] Checked = Complete

---

## Phase 1: Foundation

### Setup & Configuration
- [ ] Initialize Expo project with TypeScript
- [ ] Configure NativeWind
- [ ] Set up folder structure
- [ ] Configure absolute imports
- [ ] Set up ESLint + Prettier
- [ ] Configure app.json / app.config.js
- [ ] Add app icon assets
- [ ] Configure splash screen

### Core Dependencies
- [ ] Install Zustand
- [ ] Install AsyncStorage
- [ ] Install expo-notifications
- [ ] Install expo-haptics
- [ ] Install expo-router
- [ ] Install react-native-reanimated
- [ ] Install lucide-react-native
- [ ] Install date-fns

### Type System
- [ ] Copy type definitions from web
- [ ] Add React Native specific types
- [ ] Export shared types

### State Management
- [ ] Create AsyncStorage adapter
- [ ] Migrate store.ts
- [ ] Test store persistence
- [ ] Handle loading states (AsyncStorage is async)

### Notification Foundation
- [ ] Create NotificationManager class
- [ ] Implement permission request
- [ ] Set up notification handler
- [ ] Configure notification categories
- [ ] Add notification listeners

**Phase 1 Completion Criteria:**
- [ ] App runs on simulator
- [ ] Store persists across restarts
- [ ] Notifications permission works
- [ ] Test notification fires

---

## Phase 2: Core Features

### Navigation
- [ ] Set up Expo Router
- [ ] Create root layout
- [ ] Configure stack navigator
- [ ] Add screen options
- [ ] Implement deep linking

### UI Components
- [ ] Create Button component
- [ ] Create Card component
- [ ] Create Avatar component
- [ ] Create ProgressBar component
- [ ] Create Dialog/Modal component
- [ ] Create TextInput component
- [ ] Create Header component
- [ ] Add pixel font

### Screens

#### Home Screen
- [ ] Create screen layout
- [ ] Display kid list
- [ ] Add kid card component
- [ ] Implement empty state
- [ ] Add header with sync status
- [ ] Add floating action button
- [ ] Handle kid selection

#### Timer Screen
- [ ] Create screen layout
- [ ] Display large timer
- [ ] Add progress bar
- [ ] Create play/pause controls
- [ ] Create end button
- [ ] Show warning state
- [ ] Handle back navigation
- [ ] Show available tickets

#### Add/Edit Kid Screen
- [ ] Create form layout
- [ ] Add name input
- [ ] Create avatar picker
- [ ] Add ticket limit input
- [ ] Add duration input
- [ ] Implement save
- [ ] Implement cancel
- [ ] Handle validation

### Timer Logic
- [ ] Port timer calculations
- [ ] Handle app state changes
- [ ] Calculate remaining time
- [ ] Update UI every second
- [ ] Handle pause/resume

### Notifications Integration
- [ ] Schedule on timer start
- [ ] Cancel on timer pause
- [ ] Reschedule on resume
- [ ] Handle notification tap
- [ ] Navigate to timer on tap
- [ ] End session on expiration notification

**Phase 2 Completion Criteria:**
- [ ] Can add kid
- [ ] Can start timer
- [ ] Timer counts down
- [ ] Notification fires at end
- [ ] Can pause/resume
- [ ] Can end timer early

---

## Phase 3: Advanced Features

### Sync System
- [ ] Adapt useSync hook
- [ ] Handle network state
- [ ] Test device pairing
- [ ] Test data sync
- [ ] Handle conflicts
- [ ] Add sync UI indicators

### Data Migration
- [ ] Export feature in web app
- [ ] QR code generation
- [ ] QR code scanning
- [ ] Data validation
- [ ] Import to native app
- [ ] Error handling
- [ ] Success feedback

### iOS Enhancements
- [ ] Add haptic feedback
- [ ] Support dynamic type
- [ ] Support dark mode
- [ ] Add widget extension (optional)
- [ ] Configure app categories
- [ ] Add Siri shortcuts (optional)

### Polish
- [ ] Add loading states
- [ ] Add error boundaries
- [ ] Implement retry logic
- [ ] Add animations
- [ ] Optimize performance
- [ ] Handle edge cases

**Phase 3 Completion Criteria:**
- [ ] Sync works between devices
- [ ] Can migrate data from web
- [ ] Haptics work
- [ ] Dark mode works

---

## Phase 4: Testing & Launch

### Unit Tests
- [ ] Test store logic
- [ ] Test timer calculations
- [ ] Test notification scheduling
- [ ] Test utility functions
- [ ] Achieve 95% coverage on P0 code

### Integration Tests
- [ ] Test timer flow
- [ ] Test notification delivery
- [ ] Test data persistence
- [ ] Test sync functionality
- [ ] Test state restoration

### E2E Tests
- [ ] Set up Maestro
- [ ] Test critical paths
- [ ] Test on physical device
- [ ] Test notifications in background
- [ ] Test notifications when terminated

### Performance
- [ ] Test cold start time
- [ ] Test list scroll performance
- [ ] Memory leak testing
- [ ] Bundle size optimization
- [ ] Image optimization

### Accessibility
- [ ] Test VoiceOver
- [ ] Test Dynamic Type
- [ ] Check color contrast
- [ ] Verify focus handling

### App Store Preparation
- [ ] Create app screenshots
- [ ] Write app description
- [ ] Configure App Store Connect
- [ ] Set up privacy policy
- [ ] Configure app pricing
- [ ] Submit for review

**Phase 4 Completion Criteria:**
- [ ] 85%+ test coverage
- [ ] All tests pass
- [ ] App Store approved
- [ ] Ready for launch

---

## Bug Tracker

| ID | Description | Severity | Status | Assigned | Notes |
|----|-------------|----------|--------|----------|-------|
| - | - | - | - | - | - |

---

## Weekly Status

### Week 1
- **Goal:** Complete Phase 1
- **Status:** Not started
- **Blockers:** None
- **Notes:**

### Week 2
- **Goal:** Complete Phase 2
- **Status:** Not started
- **Blockers:** None
- **Notes:**

### Week 3
- **Goal:** Complete Phase 3
- **Status:** Not started
- **Blockers:** None
- **Notes:**

### Week 4
- **Goal:** Complete Phase 4 + Launch
- **Status:** Not started
- **Blockers:** None
- **Notes:**

---

## Review Checkpoints

### Pre-Phase Review
- [ ] Phase 1 review (End of Week 1)
- [ ] Phase 2 review (End of Week 2)
- [ ] Phase 3 review (End of Week 3)
- [ ] Final review (End of Week 4)

### Review Criteria
- Code quality meets standards
- Tests pass
- Feature complete per phase
- Documentation updated
- No critical bugs

---

## Definition of Done

A task is done when:
1. [ ] Code is written and tested
2. [ ] Unit tests pass (if applicable)
3. [ ] Code review completed
4. [ ] No outstanding bugs
5. [ ] Documentation updated
6. [ ] Merged to main branch

---

## Sprint Planning

### Sprint 1 (Week 1)
**Theme:** Foundation
**Story Points:** TBD
**Key Deliverables:** Project setup, store, notifications foundation

### Sprint 2 (Week 2)
**Theme:** Core Features
**Story Points:** TBD
**Key Deliverables:** All screens, timer working, notifications integrated

### Sprint 3 (Week 3)
**Theme:** Polish & Integration
**Story Points:** TBD
**Key Deliverables:** Sync, data migration, iOS enhancements

### Sprint 4 (Week 4)
**Theme:** Testing & Launch
**Story Points:** TBD
**Key Deliverables:** Tests, App Store submission, launch
