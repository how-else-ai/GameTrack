# iOS Native Migration Project

## Overview

Converting the Game Time Tracker from a Next.js web app to a native iOS app using React Native with Expo, enabling reliable local notifications that work in standby mode.

## Project Status

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Foundation | 🔲 Not Started | 0% |
| Phase 2: Core Features | 🔲 Not Started | 0% |
| Phase 3: Polish & Launch | 🔲 Not Started | 0% |

## Quick Links

- [Implementation Plan](./planning/IMPLEMENTATION_PLAN.md) - Detailed task breakdown
- [Architecture Decision Record](./architecture/ADR.md) - Why React Native + Expo
- [Test Cases](./test-cases/TEST_SUITE.md) - Full test coverage requirements
- [Component Mapping](./planning/COMPONENT_MAPPING.md) - Web → Native component mapping
- [Data Migration](./planning/DATA_MIGRATION.md) - localStorage → AsyncStorage
- [Notification Strategy](./architecture/NOTIFICATION_STRATEGY.md) - Local notification implementation

## Goals

1. **Primary:** Enable timer alarms that work when iPhone is in standby/locked/background
2. **Secondary:** Maintain feature parity with web app
3. **Tertiary:** Add iOS-specific enhancements (widgets, Siri shortcuts)

## Technical Stack

- **Framework:** React Native with Expo SDK 52
- **State Management:** Zustand (same as web)
- **Storage:** AsyncStorage (replacing localStorage)
- **Notifications:** expo-notifications
- **Navigation:** Expo Router
- **Styling:** NativeWind (Tailwind for RN)
- **Animations:** React Native Reanimated

## Project Structure

```
/
├── src/
│   ├── components/        # Reusable UI components
│   ├── screens/          # Screen components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities, store, logic
│   ├── navigation/       # Navigation configuration
│   ├── types/            # TypeScript definitions
│   └── constants/        # App constants
├── assets/               # Images, fonts, sounds
├── docs/ios-migration/   # This documentation
└── App.tsx              # Entry point
```

## Success Criteria

- [ ] All web app features work identically in native app
- [ ] Local notifications fire reliably in all states
- [ ] Passes App Store review guidelines
- [ ] Achieves 90%+ test coverage
- [ ] Performance: <2s cold start, 60fps animations
