# Mobile App Alignment with Web App

This document summarizes the changes made to align the mobile app (Expo/React Native) with the web app (Next.js/React).

## Major Changes

### 1. Main Screen (`apps/mobile/src/app/index.tsx`)
- **Layout**: Aligned with web app's header (logo + device name + sync status + settings)
- **Header**: Added logo placeholder, proper device info display, sync status indicator with flash animation
- **Kid Cards**: Redesigned to match web app:
  - Avatar circle with pixel-style border
  - Name and ticket count display
  - Active session progress bar with countdown
  - Tickets visual display (dots)
  - Play button when no active session
  - Quick actions (edit/delete) on right
- **Styling**: Applied retro theme colors matching web app exactly
- **Empty State**: Matches web app's "NO PLAYERS" message and add button
- **Footer**: Matches web app with "ADD PLAYER" button
- **Delete Modal**: Custom modal matching web app's alert dialog

### 2. Add/Edit Kid Screen (`apps/mobile/src/app/add-kid.tsx`)
- **Header**: Back button + title matching web app dialog header
- **Name Input**: Styled input matching web app's design
- **Category Tabs**: 4 tabs (Aliens, Kids, Adults, Animals) matching web app
- **Avatar Grid**: 5x4 grid (20 avatars) matching web app's selection
- **Ticket Limit Slider**: Replaced number buttons with slider matching web app
- **Ticket Duration Slider**: Slider with duration labels (5 min to 2h) matching web app
- **Buttons**: Cancel/Save buttons matching web app's dialog buttons
- **Edit Mode**: Pre-fills form when editing existing kid

### 3. Timer Screen (`apps/mobile/src/app/timer/[kidId].tsx`)
- **Header**: Back button + avatar + name + notification toggle
- **Active Session View**:
  - Large timer display matching web app
  - Progress bar below timer
  - Pause/Resume/End buttons matching web app layout
  - Warning message at 1 minute
- **Ticket Selection View**:
  - Large avatar display
  - "Tickets Available" count
  - Ticket grid (up to 9 visible) matching web app
  - "No tickets" state matching web app
- **Tickets Status**: Shows all tickets at bottom matching web app
- **Notifications**: Toggle button in header (bell on/off)
- **Footer**: Back button matching web app
- **End Session Modal**: Custom modal matching web app's confirmation

### 4. Sync Screen (`apps/mobile/src/app/sync.tsx`)
- **Menu View**:
  - "How Sync Works" info card with icon
  - Connection status with flash animation (green/cyan)
  - Device info display with copy button
  - Paired devices list with online indicators
  - "SHOW QR CODE" and "SCAN QR CODE" buttons
- **Generate QR View**:
  - Instructions matching web app
  - QR code display
  - Device ID with share button
  - Expiry text
- **Scan QR View**:
  - Camera/Manual toggle buttons
  - Camera view with scan frame overlay
  - Manual input with paste button
  - Tips text
  - Permission request fallback
- **Styling**: Full retro theme alignment

### 5. Layout (`apps/mobile/src/app/_layout.tsx`)
- Updated to match web app header styling
- Applied retro theme colors to all screens
- Set proper status bar styling

### 6. Timer Hook (`apps/mobile/src/hooks/useTimer.ts`)
- Refactored to use global timer approach similar to web app's timerManager
- Single interval updates all active timers (better performance)
- Subscriber pattern for reactive updates
- Matches web app's 1-second update interval

### 7. Package Dependencies
Added to `apps/mobile/package.json`:
- `@react-native-community/slider`: For ticket limit/duration sliders
- `expo-av`: For audio playback (alarm sound)

## Theme Colors
Applied exact colors from web app's `globals.css`:
- `background`: #0a0a12
- `card`: #12121f
- `primary`: #ffea00 (retro yellow)
- `retroCyan`: #00f0ff
- `retroMagenta`: #ff2a6d
- `retroGreen`: #05ffa1
- `retroOrange`: #ff6b35
- `retroPurple`: #b967ff
- `border`: #3a3a5e
- `muted`: #1a1a2e
- `mutedForeground`: #8888aa
- `text`: #f0f0f0

## Key Features Aligned

### ✅ Kid Cards
- Avatar display
- Ticket count (available/total)
- Active session countdown
- Progress bar
- Tickets visual indicator
- Play button
- Edit/Delete quick actions

### ✅ Timer View
- Ticket selection grid
- Large countdown timer
- Pause/Resume/End controls
- Progress bar
- Warning at 1 minute
- Ticket status display
- Notification toggle

### ✅ Add/Edit Kid
- Category tabs
- Avatar grid (4 categories × 5 avatars)
- Ticket limit slider (1-10)
- Duration slider (5min - 2h)
- Name input
- Save/Cancel buttons

### ✅ Sync Flow
- How it works instructions
- Connection status indicator
- QR code generation
- QR code scanning
- Manual URL entry
- Paired devices list
- Unpair functionality
- Copy/share device ID

### ✅ UI/UX
- Retro pixel art aesthetic
- Consistent color scheme
- Bold borders and shadows
- Scanlines effect (via styling)
- Flash animations on sync
- Tap feedback
- Loading states
- Error handling
- Confirmation modals

## Differences Remaining (Platform-Specific)

Some differences are intentional and unavoidable due to platform differences:

1. **Avatars**: Mobile uses emoji fallback, web uses pixel art images
2. **Fonts**: Mobile uses system fonts, web uses "Press Start 2P" pixel font
3. **Navigation**: Mobile uses Stack navigation, web uses browser routing
4. **Audio**: Mobile uses expo-av, web uses Web Audio API
5. **Notifications**: Mobile uses expo-notifications, web uses browser notifications
6. **Camera**: Mobile uses expo-camera, web uses html5-qrcode
7. **Safe Areas**: Mobile has safe area handling for notches
8. **Touch**: Mobile has tap feedback, web has hover states

These differences are platform-appropriate and maintain the same look/feel/functionality.

## Testing Recommendations

1. Test all user flows (add kid, start timer, sync, delete)
2. Verify timer accuracy across app background/foreground
3. Test notifications (allow permission, trigger at 1 min/expiry)
4. Test sync flow (QR generation, scan, pairing)
5. Test all button interactions and animations
6. Verify persistence across app restarts
7. Test error states (no tickets, no network, etc.)

## Future Enhancements

To further align with web app, consider:

1. Add pixel art images for avatars (vs emoji)
2. Install and use "Press Start 2P" font
3. Add sound effects for button presses
4. Add haptic feedback
5. Add scanlines overlay effect
6. Add CRT flicker effect
7. Improve transitions between screens
