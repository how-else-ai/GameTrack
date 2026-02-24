# 🎮 Game Time Tracker

A retro-styled gaming time management application for parents to track and control their kids' screen time using a ticket-based system with real-time cross-device synchronization.

![Game Time Tracker](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=for-the-badge&logo=tailwind-css)
![Expo](https://img.shields.io/badge/Expo-52.0-000020?style=for-the-badge&logo=expo)
![iOS](https://img.shields.io/badge/iOS-16+-000000?style=for-the-badge&logo=ios)

> **Now available as a Web App and native iOS App!** The iOS app provides reliable timer notifications even when the app is closed. See [iOS Expo Plan](./docs/IOS_EXPO_PLAN.md) for details.

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Core Functionality](#core-functionality)
- [Cross-Device Sync](#cross-device-sync)
- [Privacy & Data Storage](#privacy--data-storage)
- [Data Model](#data-model)
- [UI/UX Design](#uiux-design)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Deployment](#deployment)

## 🎯 Overview

Game Time Tracker helps parents manage their children's gaming time through a fun, ticket-based system. Each child receives a daily allowance of time "tickets" that can be used to start timed gaming sessions. The app features:

- **Daily Ticket Allowance**: Configure how many tickets and how many minutes each ticket provides per child
- **Live Timer Tracking**: Real-time countdown with pause/resume functionality
- **Automatic Daily Reset**: Tickets reset at midnight each day
- **Cross-Device Sync**: Pair multiple devices (phones, tablets) to sync data in real-time
- **Retro Gaming Aesthetic**: 8-bit pixel art style with nostalgic design elements

### 🔒 Privacy & Data Storage

**This app does NOT save any data about your children/kids.**

All data (kids, tickets, timers, sessions) is stored **locally on your device only** using browser `localStorage`.

- ❌ No server-side database stores your children's information
- ❌ No cloud backup or data collection
- ❌ No analytics or tracking of your usage
- ✅ Data stays on your device unless you choose to sync with paired devices
- ✅ Cross-device sync uses a neutral relay server that only forwards data between your paired devices
- ✅ Clear data at any time by clearing your browser's local storage

Your children's data is private and remains under your control.

## ✨ Key Features

### Ticket System
- **Customizable Limits**: Set 1-10 tickets per day per child
- **Flexible Duration**: Configure 15-120 minutes per ticket
- **Visual Ticket Display**: See available, in-use, and used tickets at a glance
- **Daily Reset**: Tickets automatically refresh at midnight

### Timer Management
- **Real-time Countdown**: Live timer updates every 250ms for smooth display
- **Pause/Resume**: Pause sessions without losing progress
- **Warning Indicators**: Visual and audio alerts when time is running low
- **Auto-End**: Sessions automatically end when time expires with audio notification

### Cross-Device Synchronization
- **QR Code Pairing**: Easy device pairing via QR code scanning
- **Manual Token Entry**: Alternative pairing method for devices without cameras
- **Real-time Sync**: Data syncs automatically between paired devices
- **Online Status**: See which devices are currently online
- **Conflict Resolution**: Smart merging handles simultaneous edits

### User Experience
- **Retro 8-Bit Theme**: Pixel art avatars and nostalgic gaming aesthetic
- **Multiple Avatar Categories**: Choose from Aliens, Kids, Adults, or Animals
- **Smooth Animations**: Fluid transitions powered by Framer Motion
- **Mobile-First Design**: Optimized for touch interactions on phones and tablets

## 🛠 Technology Stack

### Core Framework
- **Next.js 16** (App Router) - React framework for production applications
- **React 19** - Latest React with improved performance
- **TypeScript 5** - Type-safe development experience
- **Bun** - Fast JavaScript runtime and package manager

### Styling & UI
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - High-quality accessible components built on Radix UI
- **Framer Motion** - Production-ready motion library
- **Lucide React** - Beautiful icon library
- **Press Start 2P** - Retro pixel font

### State Management
- **Zustand** - Lightweight state management with persistence
- **Zustand Persist** - localStorage persistence middleware

### Sync & Networking
- **html5-qrcode** - QR code scanning library
- **qrcode** - QR code generation
- **Fetch API** - HTTP requests to sync server

### Data Persistence
- **Browser localStorage** - All data stored locally on device
- **No server-side database** - Privacy-first design

## 🏗 Architecture

### State Management Architecture

The application uses a centralized Zustand store (`src/lib/store.ts`) as the single source of truth. **All data is persisted locally using browser localStorage**:

```
┌─────────────────────────────────────┐
│     useAppStore (Zustand)           │
│  ┌───────────────────────────────┐  │
│  │  - deviceId                   │  │
│  │  - kids[]                     │  │
│  │  - pairedDevices[]            │  │
│  │  - deletedKids[]              │  │
│  │  - syncVersion                │  │
│  │  - lastSyncFlash              │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
                ↓
        ┌───────────────┐
        │  localStorage │
        │  (persist)    │
        │               │
        │  🔒 LOCAL ONLY│
        └───────────────┘
```

### Timer System Architecture

A global singleton `TimerManager` (`src/lib/timer.ts`) manages all active timers:

```
┌─────────────────────────────────────┐
│     timerManager (Singleton)        │
│  ┌───────────────────────────────┐  │
│  │  - tickInterval (250ms)       │  │
│  │  - subscribers (callbacks)    │  │
│  │  - expiredCallbacks           │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
         ↓                      ↓
    useTimer()             useKidTimer()
    (TimerView)            (KidCard)
```

**Key Design Decisions:**
- **Timestamp-based Sessions**: Sessions use ISO timestamps (`startTime`, `pausedAt`) for persistence across page refreshes
- **Global Tick**: Single timer loop updates all active timers to prevent drift
- **Subscriber Pattern**: Components subscribe to timer updates for efficient re-renders

### Component Architecture

```
src/app/page.tsx (Main Page)
├── KidCard (List view)
├── TimerView (Active session)
├── AddKidDialog (Form)
└── SyncManager (Pairing UI)
```

## 💡 Core Functionality

### Kid Management

Each kid has the following configurable properties:
- `name`: Display name (max 20 characters)
- `avatarEmoji`: Avatar ID (from 20 pixel art options)
- `ticketLimit`: Number of daily tickets (1-10)
- `ticketDuration`: Minutes per ticket (15-120)

### Ticket Lifecycle

```
Created (Daily Reset)
    ↓
Available (Ready to use)
    ↓
In-Use (Session active)
    ↓
Used (Session completed/expired)
```

### Session Management

Sessions are timestamp-based objects that track:

```typescript
{
  ticketId: string;           // Which ticket is being used
  startTime: string;          // ISO timestamp when started
  isPaused: boolean;          // Current pause state
  pausedAt?: string;          // When last paused (ISO timestamp)
  totalPausedDuration: number; // Cumulative paused time (ms)
}
```

**Time Calculation:**
```typescript
if (paused) {
  elapsed = pauseTime - startTime - totalPausedDuration;
} else {
  elapsed = now - startTime - totalPausedDuration;
}
remaining = duration - elapsed;
```

### Daily Reset Logic

On app initialization, the system checks if tickets need resetting:

```typescript
const today = new Date().toISOString().split('T')[0];
kids.forEach(kid => {
  const needsReset = kid.tickets.some(t => t.lastResetDate < today);
  if (needsReset) {
    resetTickets(kid.id); // Resets all tickets to 'available'
  }
});
```

## 🔄 Cross-Device Sync

**Important:** The sync server acts only as a neutral relay. It does NOT store your data - it simply forwards messages between your paired devices.

### Sync Architecture

The sync system uses a **polling-based HTTP mechanism** with a neutral relay server:

```
Device A                     Sync Server                    Device B
   │                              │                              │
   │─── Register ────────────────→│                              │
   │←──────── Token ──────────────│                              │
   │                              │                              │
   │─── Push Event ──────────────→│─── Poll ←────────────────────│
   │   (KIDS_UPDATE)              │   (every 2s)                 │
   │                              │                              │
   │                              │─── Event ───────────────────→│
   │←─────────────────────────────┘   (KIDS_UPDATE)              │
   │                                                             │
   │←──────── Acknowledgment ────────────────────────────────────│
```

### Pairing Flow

1. **Generate QR Code** (Device A):
   ```typescript
   {
     deviceId: "abc-123",
     deviceName: "Device-ABC",
     pairingToken: "token-xyz",
     timestamp: 1234567890
   }
   ```

2. **Scan QR Code** (Device B):
   - Parses QR data
   - Validates token (5-minute expiry)
   - Completes pairing via server

3. **Pairing Complete**:
   - Both devices exchange full kids data
   - Auto-sync begins on future changes

### Event Types

- **KIDS_UPDATE**: Broadcasts when kids data changes
  ```json
  {
    "action": "KIDS_UPDATE",
    "payload": {
      "kids": [...],
      "deletedKids": [...]
    }
  }
  ```

- **REQUEST_SYNC**: Manual sync trigger
- **UNPAIR**: Device disconnection

### Conflict Resolution

The sync system uses several strategies to handle conflicts:

1. **Event ID Tracking**: Prevents echo loops (devices processing their own events)
2. **Deleted Kids Tracking**: Maintains a `deletedKids` list to filter out deleted items
3. **Merge by Activity**: For kids existing on both devices, prefers more recent changes
4. **Debouncing**: 500ms debounce on local changes to reduce sync traffic

### Sync Loop Prevention

```typescript
// Track sent events
sentEventIdsRef.current.add(eventId);

// Skip own events
if (event.from_device === deviceIdRef.current) return;

// Skip already processed events
if (processedEventIdsRef.current.has(event.id)) return;

// Skip echo (events we sent)
if (sentEventIdsRef.current.has(event.id)) return;
```

## 📊 Data Model

### Kid Schema

```typescript
interface Kid {
  id: string;                    // "kid-1234567890"
  name: string;                  // "Alex"
  avatarEmoji: string;           // "kid-1" (avatar ID)
  ticketLimit: number;           // 3
  ticketDuration: number;        // 30 (minutes)
  tickets: Ticket[];             // Array of tickets
  activeSession: Session | null; // Current active session
}
```

### Ticket Schema

```typescript
interface Ticket {
  id: string;            // "ticket-1234567890-0"
  status: 'available' | 'in-use' | 'used';
  lastResetDate: string; // "2025-01-15"
}
```

### Session Schema

```typescript
interface Session {
  ticketId: string;               // Reference to ticket
  startTime: string;              // "2025-01-15T10:30:00.000Z"
  isPaused: boolean;              // true/false
  pausedAt?: string;              // "2025-01-15T11:00:00.000Z"
  totalPausedDuration: number;    // 120000 (ms)
}
```

### Paired Device Schema

```typescript
interface PairedDevice {
  deviceId: string;       // Unique device identifier
  deviceName: string;     // Display name
  pairedAt: string;       // ISO timestamp
  isOnline: boolean;      // Current online status
  lastSeen?: string;      // Last activity timestamp
}
```

## 🎨 UI/UX Design

### Retro 8-Bit Theme

The app features a nostalgic 1980s arcade aesthetic:

**Color Palette:**
```css
--retro-yellow: #ffea00;   /* Primary */
--retro-cyan: #00f0ff;     /* Sync/Success */
--retro-magenta: #ff2a6d;  /* Destructive */
--retro-green: #05ffa1;    /* Active/Online */
--retro-orange: #ff6b35;   /* Warning */
--retro-purple: #b967ff;   /* Accent */
```

**Visual Effects:**
- **Scanlines**: CRT-style overlay
- **Neon Glow**: Text and border glow effects
- **Pixel Borders**: Sharp 4px borders with shadows
- **Pixel Art Rendering**: `image-rendering: pixelated` for crisp avatars

### Typography

- **Primary Font**: Press Start 2P (Google Fonts)
- **Pixel-Perfect**: All text uses pixel font for consistency
- **Case**: Uppercase text for retro aesthetic

### Avatar System

20 unique pixel art avatars across 4 categories:
- **Aliens** (5): Zorg, Blip, Gloop, Nova, Zyx
- **Kids** (5): Spike, Pip, Ace, Sunny, Dot
- **Adults** (5): Dash, Spark, Beard, Blaze, Tank
- **Animals** (5): Whiskers, Rover, Hop, Hoot, Ember

### Interactive Elements

**Animations:**
- Page transitions using Framer Motion
- Sync heartbeat pulse for successful syncs
- Timer warning pulsation when < 1 minute remaining
- Smooth hover states on all interactive elements

**Feedback:**
- Visual progress bars for timer countdown
- Color-coded ticket status (green=available, pulsing=in-use, gray=used)
- Audio alarm when timer expires (Web Audio API)
- Toast notifications for sync events

## 📁 Project Structure

This is a monorepo containing both the web app and iOS mobile app:

```
game-time-tracker/
├── apps/
│   ├── mobile/                  # 📱 iOS Expo App
│   │   ├── src/
│   │   │   ├── app/             # Expo Router screens
│   │   │   ├── hooks/           # RN hooks (useSync, useTimer, useNotifications)
│   │   │   └── lib/             # Notifications, storage, store
│   │   ├── app.config.ts        # iOS/Android configuration
│   │   ├── eas.json             # EAS build configuration
│   │   └── package.json
│   │
│   └── web/                     # 🌐 Next.js Web App (existing)
│       └── src/
│           ├── app/             # Next.js App Router
│           ├── components/      # React components
│           ├── hooks/           # Web hooks
│           └── lib/             # Core logic
│
├── packages/
│   └── core/                    # 📦 Shared domain logic
│       ├── src/
│       │   ├── types.ts         # Shared TypeScript types
│       │   ├── store.ts         # Platform-agnostic Zustand store
│       │   ├── sync-client.ts   # Reusable sync logic
│       │   ├── timer-utils.ts   # Timer calculations
│       │   └── ...
│       └── package.json
│
├── docs/
│   ├── IOS_EXPO_PLAN.md         # iOS implementation plan
│   ├── IPAD_TESTING_GUIDE.md    # Testing on physical iPad
│   └── SYNC_SYSTEM.md           # Sync system documentation
│
├── package.json                 # Root monorepo configuration
└── ...
```

### Web App (Next.js)
```
src/
├── app/                     # Next.js App Router
│   ├── layout.tsx           # Root layout with fonts
│   ├── page.tsx             # Main page (kids list + timer)
│   └── globals.css          # Tailwind + custom styles
│
├── components/               # React components
│   ├── KidCard.tsx          # Kid list item with timer preview
│   ├── TimerView.tsx        # Full-screen timer view
│   ├── AddKidDialog.tsx     # Add/edit kid form
│   ├── SyncManager.tsx      # Device pairing UI
│   └── ui/                  # shadcn/ui components
│
├── hooks/                   # Custom React hooks
│   └── useSync.ts           # Sync logic & polling
│
└── lib/                     # Core logic & utilities
    ├── store.ts             # Zustand state management
    ├── types.ts             # TypeScript interfaces
    ├── timer.ts             # Global timer manager
    ├── avatar.ts            # Avatar system
    ├── sync-config.ts       # Sync server URL
    └── device.ts            # Device ID generation
```

### iOS App (Expo)
```
apps/mobile/src/
├── app/                     # Expo Router screens
│   ├── _layout.tsx          # Root layout with providers
│   ├── index.tsx            # Kids list screen
│   ├── timer/[kidId].tsx    # Timer screen
│   ├── add-kid.tsx          # Add kid form
│   └── sync.tsx             # Device pairing
│
├── hooks/                   # React Native hooks
│   ├── useSync.ts           # Sync functionality
│   ├── useTimer.ts          # Timer state
│   └── useNotifications.ts  # iOS notification management
│
└── lib/                     # Utilities
    ├── notifications.ts     # expo-notifications integration
    ├── storage.ts           # AsyncStorage adapter
    └── store.ts             # Zustand store instance
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ or **Bun** latest
- **Git** for cloning

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd game-time-tracker

# Install dependencies with Bun (recommended)
bun install

# Or with npm/yarn
npm install
# yarn install
```

### Development

#### Web App
```bash
# Start development server
bun run dev
# or
npm run dev

# Open http://localhost:3000
```

#### iOS Mobile App
```bash
# Install all dependencies (including mobile)
bun run install:all

# Start the mobile app
bun run dev:mobile
# or
cd apps/mobile && expo start

# In the terminal, press:
# - 'i' to open iOS Simulator
# - 'a' to open Android emulator
# - 'w' to open web version
```

#### Testing on Physical iPad/iPhone
See the [iPad Testing Guide](./docs/IPAD_TESTING_GUIDE.md) for detailed instructions on testing the app on your physical device.

Quick build for your device:
```bash
cd apps/mobile

# Build for internal testing (TestFlight)
eas build --platform ios --profile preview

# Or development build for local install
eas build --platform ios --profile development
```

### Building for Production

#### Web App
```bash
# Build the application
bun run build

# Start production server
bun start
```

#### iOS App
```bash
cd apps/mobile

# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

## 🔧 Development

### Available Scripts

```bash
# Development
bun run dev              # Start web dev server on port 3000
bun run dev:mobile       # Start mobile app (expo start)

# Build & Production
bun run build            # Build web app for production
bun run build:core       # Build shared core package
bun start                # Start production server

# Mobile (requires cd apps/mobile)
eas build --platform ios --profile preview    # Build for TestFlight
eas build --platform ios --profile production # Build for App Store

# Linting & Type Checking
bun run lint             # Run ESLint
bun run typecheck        # Run TypeScript checks on all packages

# Installation
bun run install:all      # Install dependencies for all packages
```

### Key Development Concepts

1. **State Changes Always Go Through Store**: All mutations use store actions for sync integration
2. **Timer Manager Starts Globally**: The timer manager is initialized once in `page.tsx`
3. **Sync is Transparent**: Components don't need to worry about sync; useSync hook handles everything
4. **Avatar IDs Not Emojis**: Legacy emoji support exists, but new code uses avatar IDs

### Adding New Features

**To add a new kid property:**
1. Update `Kid` interface in `src/lib/types.ts`
2. Update `addKid` and `updateKid` in `src/lib/store.ts`
3. Add form fields in `src/components/AddKidDialog.tsx`
4. Update sync event payload if needed

**To add a new sync event type:**
1. Add event handler in `src/hooks/useSync.ts` `processEvent` switch statement
2. Add push function if needed
3. Update `docs/SYNC_SYSTEM.md` documentation

### Testing Locally

To test cross-device sync without multiple physical devices:

1. Open app in two different browsers (Chrome + Firefox)
2. Pair them using QR code
3. Make changes on one device
4. Observe sync on other device within 2 seconds

## 🚀 Deployment

### Build Configuration

The app is configured for standalone output (Docker-friendly):

```typescript
// next.config.ts
{
  output: "standalone",        // Self-contained build
  reactStrictMode: false,      // Disabled for timer accuracy
  typescript: {
    ignoreBuildErrors: true,   // Scaffold setting
  }
}
```

### Deployment Options

1. **Vercel** (Recommended for Next.js)
2. **Docker** using standalone output
3. **Node.js** server directly
4. **Static export** (if removing sync features)

### Environment Variables

Currently no required environment variables. The sync server URL is configured in `src/lib/sync-config.ts`:

```typescript
export const SYNC_SERVER_URL = 'https://sync.how-else.com/sync.php';
```

## 📝 License

See [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- **shadcn/ui** for the beautiful component library
- **Press Start 2P** font by Code Maniak
- **Framer Motion** for smooth animations
- **Zustand** for elegant state management

---

Built with ❤️ for parents managing screen time. Enjoy the retro gaming aesthetic! 🎮
