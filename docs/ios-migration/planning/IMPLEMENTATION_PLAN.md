# Implementation Plan: iOS Native Migration

## Phase 1: Foundation (Week 1)

### 1.1 Project Setup

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Initialize Expo project with TypeScript | P0 | 2 | None |
| Configure NativeWind for styling | P0 | 2 | Expo setup |
| Set up folder structure | P0 | 1 | Expo setup |
| Configure ESLint + Prettier | P1 | 1 | Expo setup |
| Set up absolute imports | P1 | 1 | Expo setup |

**Deliverable:** Running "Hello World" app on iOS simulator

### 1.2 Core Dependencies

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Install Zustand + persist middleware | P0 | 1 | Project setup |
| Install AsyncStorage | P0 | 1 | Project setup |
| Install expo-notifications | P0 | 2 | Project setup |
| Install expo-haptics | P1 | 1 | Project setup |
| Install lucide-react-native | P1 | 1 | Project setup |
| Install react-native-reanimated | P1 | 2 | Project setup |

**Deliverable:** All dependencies installed and configured

### 1.3 Type System Migration

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Copy type definitions from web | P0 | 2 | Project setup |
| Add React Native specific types | P1 | 1 | Type copy |
| Create shared types package | P2 | 2 | Type definitions |

**Files to migrate:**
- `src/lib/types.ts` → `src/types/index.ts`

### 1.4 State Management Migration

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Migrate store.ts to use AsyncStorage | P0 | 4 | Dependencies installed |
| Adapt persist middleware for RN | P0 | 3 | Store migration |
| Test store persistence | P0 | 2 | Store adaptation |
| Migrate device.ts utilities | P1 | 2 | Store migration |

**Key Changes:**
```typescript
// Before (Web)
import { persist } from 'zustand/middleware';
// Uses localStorage automatically

// After (React Native)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

storage: createJSONStorage(() => AsyncStorage)
```

## Phase 2: Core Features (Week 2)

### 2.1 Notification System

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Create NotificationManager class | P0 | 4 | Dependencies |
| Implement permission request flow | P0 | 2 | Notification manager |
| Implement schedule notification | P0 | 4 | Permission flow |
| Implement cancel notification | P0 | 2 | Schedule notification |
| Handle notification tap events | P0 | 3 | Notification manager |
| Implement 1-minute warning | P0 | 2 | Schedule notification |

**Test Cases Required:**
- [ ] Permission granted flow
- [ ] Permission denied handling
- [ ] Notification fires at correct time
- [ ] Notification fires when app is backgrounded
- [ ] Notification fires when app is terminated
- [ ] Notification tap opens correct screen
- [ ] Cancel removes pending notifications
- [ ] Warning notification fires 1 min before

### 2.2 Timer Logic Migration

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Port timer.ts calculation logic | P0 | 3 | Store migrated |
| Adapt for RN environment | P0 | 2 | Port complete |
| Handle app state changes | P0 | 4 | Timer adaptation |
| Sync notifications with timer state | P0 | 4 | Handle app state |
| Implement background state persistence | P0 | 3 | Sync notifications |

**Key Consideration:**
When app goes to background, we must:
1. Calculate remaining time
2. Schedule local notification for expiration
3. Save current state

When app returns:
1. Calculate actual remaining time
2. Cancel any stale notifications
3. Update UI

### 2.3 UI Components

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Create Button component | P0 | 2 | NativeWind setup |
| Create Card component | P0 | 2 | Button component |
| Create Avatar component | P0 | 2 | Card component |
| Create ProgressBar component | P0 | 2 | Card component |
| Create Dialog/Modal component | P0 | 3 | Card component |
| Create Text component (pixel font) | P1 | 2 | NativeWind setup |

**Component Mapping:**
| Web Component | React Native Component |
|---------------|------------------------|
| `div` | `View` |
| `button` | `TouchableOpacity` / `Pressable` |
| `img` | `Image` |
| `span` / `p` | `Text` |
| `dialog` | `Modal` from react-native |
| shadcn Button | Custom with TouchableOpacity |
| shadcn Card | Custom with View + shadows |
| shadcn Progress | Custom with View + animated width |
| shadcn AlertDialog | Modal + animations |

### 2.4 Screens

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Create Home screen (Kid list) | P0 | 6 | UI components |
| Create Timer screen | P0 | 6 | UI components |
| Create Add/Edit Kid screen | P0 | 4 | UI components |
| Create Settings screen | P1 | 3 | UI components |
| Create Sync screen | P1 | 4 | UI components |

**Screen Breakdown:**

**Home Screen:**
- Header with logo and sync status
- Scrollable kid list
- Add button (floating or footer)
- Empty state

**Timer Screen:**
- Large countdown display
- Progress bar
- Play/Pause/End controls
- Available tickets grid
- Warning state UI

**Add/Edit Kid Screen:**
- Form with text inputs
- Avatar picker
- Number inputs for limits/duration
- Save/Cancel buttons

### 2.5 Navigation

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Set up Expo Router | P0 | 2 | Project setup |
| Configure stack navigator | P0 | 2 | Expo Router setup |
| Implement navigation between screens | P0 | 3 | Stack navigator |
| Handle deep links from notifications | P0 | 3 | Navigation implemented |

## Phase 3: Advanced Features (Week 3)

### 3.1 Sync System Integration

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Adapt useSync hook for RN | P1 | 4 | Store migrated |
| Handle network state changes | P1 | 2 | Sync adaptation |
| Implement background sync | P2 | 4 | Network handling |
| Add sync conflict resolution UI | P2 | 2 | Background sync |

### 3.2 Data Migration from Web App

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Export data from web app | P2 | 3 | None |
| Import data to native app | P2 | 3 | Export feature |
| QR code data transfer | P2 | 4 | Import/export |

### 3.3 iOS Enhancements

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Add app icon | P1 | 2 | None |
| Add splash screen | P1 | 2 | None |
| Configure app metadata | P1 | 1 | None |
| Add haptic feedback | P2 | 2 | Core features |
| Support dynamic type | P2 | 2 | UI components |
| Support dark mode | P2 | 2 | NativeWind config |

### 3.4 Widget Support (iOS 17+)

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Research widget implementation | P3 | 2 | Core features complete |
| Create widget extension | P3 | 4 | Research complete |
| Display active timer in widget | P3 | 4 | Widget extension |

## Phase 4: Testing & Polish (Week 4)

### 4.1 Unit Tests

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Test store logic | P0 | 4 | Store migrated |
| Test timer calculations | P0 | 3 | Timer migrated |
| Test notification scheduling | P0 | 4 | Notifications implemented |
| Test utility functions | P1 | 2 | Utilities migrated |

### 4.2 Integration Tests

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Test full timer flow | P0 | 4 | Screens complete |
| Test sync functionality | P1 | 3 | Sync integrated |
| Test data persistence | P0 | 3 | Store complete |
| Test notification delivery | P0 | 4 | Notifications complete |

### 4.3 E2E Tests

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Test critical user paths | P0 | 6 | App complete |
| Test on physical device | P0 | 4 | E2E setup |
| Test notification in background | P0 | 3 | Physical device |
| Test notification when terminated | P0 | 3 | Physical device |

### 4.4 Performance Optimization

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Optimize list rendering | P1 | 3 | Screens complete |
| Optimize animations | P1 | 2 | Animations added |
| Reduce bundle size | P2 | 2 | Optimization complete |
| Memory leak testing | P1 | 3 | App complete |

### 4.5 App Store Preparation

| Task | Priority | Est. Hours | Dependencies |
|------|----------|------------|--------------|
| Create App Store listing | P0 | 3 | App complete |
| Create screenshots | P0 | 2 | App complete |
| Write app description | P0 | 1 | Screenshots complete |
| Configure App Store Connect | P0 | 2 | Listing complete |
| Build for production | P0 | 2 | All above complete |
| Submit for review | P0 | 1 | Production build |

## Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| App Store rejection | High | Medium | Follow guidelines, add native features |
| Notification reliability issues | High | Low | Extensive testing on physical devices |
| Performance issues | Medium | Low | Use FlatList, optimize renders |
| Sync conflicts | Medium | Medium | Clear conflict resolution UI |
| State management complexity | Low | Low | Thorough unit testing |

## Definition of Done

- [ ] All P0 tasks complete
- [ ] 90%+ test coverage
- [ ] Passes App Store review
- [ ] Notifications work in all app states
- [ ] Feature parity with web app
- [ ] Performance benchmarks met
