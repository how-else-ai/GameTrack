# Architecture Decision Record: iOS Native Migration

## ADR-001: React Native with Expo as Development Framework

### Status
Accepted

### Context
We need to convert the Game Time Tracker web app to a native iOS app to enable reliable local notifications that work in standby mode. We evaluated three options:

1. **Capacitor** - Wrap web app in native shell
2. **React Native** - Cross-platform native framework
3. **SwiftUI** - Apple's native framework

### Decision
We will use **React Native with Expo**.

### Consequences

#### Positive
- **Code reuse**: Can reuse ~50% of business logic (store, timer calculations, types)
- **Familiarity**: Team already knows React patterns
- **Single codebase**: iOS and Android can share code (future-proofing)
- **Ecosystem**: Large community, extensive library support
- **Expo benefits**: Simplified build process, over-the-air updates, managed workflow
- **Local notifications**: Full support via expo-notifications

#### Negative
- **UI rewrite required**: Must convert HTML/Tailwind to React Native components
- **Learning curve**: Team needs to learn React Native specifics
- **Build dependencies**: EAS Build service or local Xcode setup required
- **Not truly native**: Bridge overhead compared to pure SwiftUI

### Alternatives Considered

#### Capacitor
- **Pros**: Minimal code changes (95% reuse), fastest to implement
- **Cons**: WebView-based, Apple rejecting simple wrappers, limited native feel
- **Verdict**: Rejected due to App Store risk

#### SwiftUI
- **Pros**: True native performance, best iOS integration, easiest App Store approval
- **Cons**: Complete rewrite, new language (Swift), no code reuse
- **Verdict**: Rejected due to time/resource constraints

---

## ADR-002: Zustand with AsyncStorage for State Management

### Status
Accepted

### Context
The web app uses Zustand with localStorage persistence. We need equivalent persistence in React Native.

### Decision
Continue using **Zustand** with **AsyncStorage** via `persist` middleware.

### Implementation
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({ /* store logic */ }),
    {
      name: 'game-time-tracker',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### Consequences
- **Positive**: Minimal changes to store logic, battle-tested solution
- **Negative**: AsyncStorage is async (unlike localStorage), may need loading states

---

## ADR-003: expo-notifications for Local Notifications

### Status
Accepted

### Context
Core requirement is reliable timer alarms in standby mode. Options:
1. react-native-push-notification (3rd party)
2. expo-notifications (Expo official)
3. Native iOS APIs via Expo modules

### Decision
Use **expo-notifications**.

### Rationale
- Official Expo library, well maintained
- Comprehensive API for scheduling, canceling, handling notifications
- Works in all app states (foreground, background, terminated)
- Supports time-sensitive notifications (breaks through Focus)
- No ejecting from Expo managed workflow required

### Key Features Used
```typescript
// Schedule notifications
Notifications.scheduleNotificationAsync({
  content: {
    title: "Time's Up!",
    body: 'Game time has ended',
    sound: 'default',
    interruptionLevel: Notifications.InterruptionLevel.TIME_SENSITIVE,
  },
  trigger: { seconds: remainingSeconds },
});

// Handle notification taps
Notifications.addNotificationResponseReceivedListener(response => {
  // Navigate to appropriate screen
});
```

---

## ADR-004: NativeWind for Styling

### Status
Accepted

### Context
Web app uses Tailwind CSS extensively. We want to maintain similar styling approach.

### Decision
Use **NativeWind** (Tailwind CSS for React Native).

### Rationale
- Same utility-first approach as web app
- Can reuse Tailwind config
- Familiar className syntax
- Works with React Native's StyleSheet under the hood

### Example
```tsx
// Web (current)
<div className="flex items-center justify-between p-4 bg-card rounded-lg">

// React Native with NativeWind
<View className="flex flex-row items-center justify-between p-4 bg-card rounded-lg">
```

### Limitations
- Some Tailwind features don't apply (e.g., grid gaps need explicit styling)
- Platform-specific styles may need StyleSheet

---

## ADR-005: Expo Router for Navigation

### Status
Accepted

### Context
Need navigation solution for multiple screens (Home, Timer, Add Kid, Settings).

### Decision
Use **Expo Router** (file-based routing for React Native).

### Rationale
- File-based routing (similar to Next.js App Router)
- Deep linking built-in
- TypeScript support
- Native stack navigation

### Structure
```
app/
├── _layout.tsx           # Root layout with providers
├── index.tsx             # Home screen (kid list)
├── timer/
│   └── [kidId].tsx       # Timer screen with kid ID param
├── add-kid.tsx           # Add/Edit kid screen
└── settings.tsx          # Settings screen
```

---

## ADR-006: No Server Dependency for Core Features

### Status
Accepted

### Context
Web app has optional sync server. Should native app require server?

### Decision
Core timer functionality works **offline**. Sync is optional enhancement.

### Rationale
- Local notifications don't require server
- Timer logic is entirely client-side
- Users expect timer to work without internet
- Sync can be added as premium/optional feature

### Implementation
```
Core Features (Offline):
├── Timer countdown
├── Local notifications
├── Kid/Ticket management
└── Data persistence (AsyncStorage)

Optional Features (Online):
├── Device sync
├── Data backup
└── Multi-device support
```

---

## ADR-007: Incremental Migration Strategy

### Status
Accepted

### Context
Should we migrate all features at once or incrementally?

### Decision
**Feature-parity approach**: Migrate all core features in single release.

### Rationale
- App Store prefers complete apps over MVP
- Users expect full functionality
- Single migration is cleaner than partial app

### Phases
1. **Foundation** (Week 1): Setup, store, notifications
2. **Core Features** (Week 2): UI, screens, timer
3. **Polish** (Week 3): Testing, edge cases, App Store prep

---

## ADR-008: Test Strategy

### Status
Accepted

### Decision
- **Unit tests**: Jest for store, timer, utilities
- **Integration tests**: React Native Testing Library for component interaction
- **E2E tests**: Maestro for critical user flows
- **Manual testing**: Required for notifications (device-only feature)

### Coverage Targets
- P0 code paths: 95%
- UI components: 80%
- Overall: 85%
