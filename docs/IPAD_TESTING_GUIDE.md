# iPad Testing Guide for Game Time Tracker

This guide will help you test the Game Time Tracker iOS app on your iPad during Phase 5 QA.

## Prerequisites

1. **iPad Requirements**:
   - iPad running iOS 16.0 or later
   - TestFlight app installed (free from App Store)
   - Apple ID with two-factor authentication enabled

2. **Development Setup** (on your Mac):
   - macOS with Xcode 15+
   - Expo CLI: `npm install -g expo-cli`
   - EAS CLI: `npm install -g eas-cli`
   - Bun/Node.js installed

3. **Apple Developer Account**:
   - Apple Developer account ($99/year) required for TestFlight
   - Or use the "development" build method for local testing (free)

## Method 1: TestFlight (Recommended for QA)

### Step 1: Configure EAS

1. Log in to EAS:
   ```bash
   cd apps/mobile
   eas login
   ```

2. Configure the project:
   ```bash
   eas build:configure
   ```
   - Select iOS when prompted
   - This creates the `eas.json` file (already created)

3. Update `app.config.ts` with your Apple Team ID:
   ```typescript
   ios: {
     bundleIdentifier: 'com.yourdomain.gametimetracker',
     buildNumber: '1.0.0',
     // ... rest of config
   }
   ```

### Step 2: Create a Build

For internal testing (up to 100 devices):
```bash
eas build --platform ios --profile preview
```

For TestFlight submission:
```bash
eas build --platform ios --profile production
```

### Step 3: Install on iPad

1. Wait for the build to complete (5-15 minutes)
2. You'll receive an email with a link to TestFlight
3. On your iPad:
   - Open the TestFlight link
   - Install the Game Time Tracker app
   - The app will be available for 90 days

## Method 2: Development Build (Free, Local Only)

If you don't have an Apple Developer account, you can create a development build:

### Step 1: Register Your Device

1. Connect your iPad to your Mac via USB
2. Find your device UDID:
   ```bash
   xcrun devicemgmt list devices
   ```
   Or in Finder, select your iPad and click the serial number to reveal UDID

3. Register the device in your Apple Developer account (free developer account works)

### Step 2: Create Development Build

```bash
cd apps/mobile
eas build --platform ios --profile development
```

### Step 3: Install via Xcode

1. Download the build when complete
2. Open Xcode
3. Go to Window → Devices and Simulators
4. Drag the .ipa file to your connected iPad

## Testing Checklist

### A. First Launch & Permissions

- [ ] **A1: Notification Permission**
  - Fresh install the app
  - Add a kid
  - Start a timer
  - Expected: iOS asks for notification permission
  - Tap "Allow"
  - Verify in iOS Settings → Notifications → Game Time Tracker that permissions are granted

- [ ] **A2: Camera Permission**
  - Go to Sync screen
  - Tap "Scan QR Code"
  - Expected: iOS asks for camera permission
  - Tap "Allow"
  - Expected: Camera preview appears

- [ ] **A3: Denied Permissions Handling**
  - Deny notifications
  - Try to start a timer
  - Expected: App shows a message explaining why notifications are needed
  - Go to iOS Settings → Game Time Tracker → enable notifications
  - Return to app and verify notifications work

### B. Timer & Notifications (Foreground)

- [ ] **B1: Start Session Schedules Notification**
  - Create a kid with 1 ticket, 1 minute duration
  - Start the timer
  - Check scheduled notifications:
    ```bash
    # On Mac with iPad connected
    xcrun simctl list | grep -i gametimetracker
    ```
  - Or trust that the notification will fire

- [ ] **B2: Pause Cancels Notification**
  - Start a 5-minute timer
  - Wait 30 seconds
  - Pause the timer
  - Expected: Original notification is cancelled

- [ ] **B3: Resume Reschedules Notification**
  - Resume the paused timer
  - Expected: New notification scheduled for the updated end time

- [ ] **B4: End Session Cancels Notification**
  - Start a timer
  - End it manually
  - Expected: No notification fires

### C. Timer & Notifications (Background/Terminated)

- [ ] **C1: Notification Fires in Background**
  - Start a 2-minute timer
  - Press Home button (background the app)
  - Wait 2 minutes
  - Expected: Notification appears with sound
  - Tap notification
  - Expected: App opens, session is marked complete

- [ ] **C2: Notification Fires When Terminated**
  - Start a 2-minute timer
  - Force-quit the app (swipe up from app switcher)
  - Wait 2 minutes
  - Expected: Notification still appears!
  - This is the key feature that makes the native app valuable

- [ ] **C3: Reopen After Notification**
  - After notification fires, tap it
  - Expected: App opens to the kid's timer screen
  - Session should be marked as ended

### D. Persistence & Recovery

- [ ] **D1: App Restart With Active Session**
  - Start a 5-minute timer
  - Kill the app (swipe up)
  - Reopen immediately
  - Expected: Timer shows remaining time accurately
  - Notification should still be scheduled

- [ ] **D2: App Restart After End Time**
  - Start a 1-minute timer
  - Kill the app
  - Wait 2 minutes
  - Reopen app
  - Expected: Session is marked ended, ticket is used

### E. Syncing

- [ ] **E1: Pairing via QR Code**
  - Open web app on your computer
  - Open iOS app on iPad
  - On web: Generate QR code
  - On iPad: Scan QR code
  - Expected: Devices pair successfully

- [ ] **E2: Sync Event Propagation**
  - Add a kid on the web app
  - Expected: Kid appears on iPad within 2-3 seconds
  - Edit the kid on iPad
  - Expected: Changes appear on web app

- [ ] **E3: Offline Handling**
  - Enable Airplane mode on iPad
  - Add a kid
  - Disable Airplane mode
  - Expected: Changes sync once online

### F. iPad-Specific Tests

- [ ] **F1: iPad Multitasking**
  - Open Game Time Tracker in Split View with another app
  - Start a timer
  - Use the other app
  - Expected: Timer continues, notification fires

- [ ] **F2: Background App Refresh**
  - Go to iOS Settings → General → Background App Refresh
  - Ensure it's enabled for Game Time Tracker
  - Start a timer, background the app
  - Expected: App state is preserved

- [ ] **F3: Dark Mode**
  - Enable Dark Mode in iOS Settings
  - Verify app UI looks correct

- [ ] **F4: Orientation**
  - Rotate iPad between portrait and landscape
  - Verify UI adapts correctly

## Reporting Issues

When you find issues, please include:

1. **iPad Model**: (e.g., iPad Pro 12.9" 6th gen)
2. **iOS Version**: (Settings → General → About)
3. **App Version**: (visible in TestFlight or in-app)
4. **Steps to Reproduce**
5. **Expected vs Actual Behavior**
6. **Screenshots/Videos** if applicable

## Quick Build Commands

```bash
# Development build (for your device only)
cd apps/mobile
eas build --platform ios --profile development

# Preview build (TestFlight internal)
eas build --platform ios --profile preview

# Production build (App Store)
eas build --platform ios --profile production

# Check build status
eas build:list

# Submit to App Store
eas submit --platform ios
```

## Troubleshooting

### "No valid certificate found"
- Run `eas credentials` to set up iOS certificates
- Or let EAS manage them automatically with `--auto-submit`

### "Device not registered"
- Add your iPad's UDID to your Apple Developer account
- Wait a few minutes, then rebuild

### Notifications not appearing
- Check iOS Settings → Notifications → Game Time Tracker
- Ensure "Allow Notifications" is on
- Check that "Sounds" and "Banners" are enabled

### App crashes on launch
- Check that all assets are present (icon, splash screen)
- Verify bundle identifier is unique
- Check Console app on Mac for crash logs

## Next Steps After Testing

1. Fix any critical issues found
2. Update version number in `app.config.ts`
3. Create production build: `eas build --platform ios --profile production`
4. Submit to App Store: `eas submit --platform ios`
5. Fill out App Store listing information
6. Wait for App Review (usually 1-2 days)

---

**Thank you for helping test Game Time Tracker on iPad!**
