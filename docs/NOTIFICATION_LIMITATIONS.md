# Notification System Limitations

## Current Implementation

The app uses the **Web Notifications API** to send timer alerts when game time expires or when there's 1 minute remaining.

## Platform Limitations

### iOS (iPhone/iPad) ⚠️
- **Notifications**: Only work when Safari is the **ACTIVE app**
- **Alarms**: Only work when Safari is the **ACTIVE app**
- **When device is LOCKED**: ❌ No notifications, no alarms
- **When Safari is in BACKGROUND**: ❌ No notifications, no alarms
- **Vibration**: ❌ Not supported by iOS Safari
- `requireInteraction`: ❌ Not supported by iOS Safari

### Android
- **Notifications**: ✅ Work when browser is in background
- **Alarms**: ✅ Work when browser is in background
- **When device is LOCKED**: ❌ No notifications, no alarms
- **Vibration**: ✅ Supported on most devices

### Desktop
- **Notifications**: ✅ Work reliably when browser is running
- **Alarms**: ✅ Work reliably when browser is running
- **Vibration**: ❌ Not supported

## What Users Experience

| Platform | Safari Active | Safari Background | Device Locked |
|----------|---------------|-------------------|----------------|
| **iOS** | ✅ Notifications + Sound | ❌ Nothing | ❌ Nothing |
| **Android** | ✅ Notifications + Sound | ✅ Notifications + Sound | ❌ Nothing |
| **Desktop** | ✅ Notifications + Sound | ❌ Nothing | N/A |

## Solutions for True Background Notifications

To send notifications when the device is locked or the app is in the background, you would need:

### Option 1: Native iOS App (Recommended for iOS)
- **Requirements**:
  - Separate iOS development project (Swift/SwiftUI)
  - Apple Developer account ($99/year)
  - Apple Push Notification Service (APNs) integration
  - Backend server for sending push notifications
- **Pros**:
  - Full notification support when device is locked
  - Reliable delivery
  - Can use vibration, custom sounds, badges
- **Cons**:
  - Requires separate development effort
  - App Store approval process
  - Annual cost

### Option 2: Progressive Web App (PWA) with Web Push
- **Requirements**:
  - Service Worker implementation
  - Web Push API integration
  - Push notification service (Firebase, OneSignal, VAPID, etc.)
  - User must add PWA to home screen
- **Pros**:
  - Cross-platform (web technologies)
  - Works on Android when locked
  - No app store required
- **Cons**:
  - **iOS support is very limited** (even on iOS 16.4+)
  - Still may not work reliably when iOS device is locked
  - User friction (add to home screen)
  - Requires backend infrastructure

### Option 3: Hybrid Approach
- **Web app** for basic use cases
- **Native iOS app** for full notification support
- **Native Android app** for enhanced features
- Share data via backend API (sync system already exists)

## Current Mitigation

The app includes:
1. **Clear documentation** about iOS limitations
2. **User-facing warnings** on iOS devices
3. **Audio alarms** that work when browser is active
4. **Visual warnings** (1-minute countdown in UI)

## Future Recommendations

For a production app that needs reliable notifications when devices are locked:

1. **Short term** (1-2 months):
   - Implement PWA with Service Worker
   - Add Web Push API integration (e.g., Firebase Cloud Messaging)
   - This improves Android experience significantly

2. **Medium term** (3-6 months):
   - Develop native iOS app wrapper
   - Use React Native or Capacitor to share code
   - Implement APNs for iOS
   - This provides full iOS notification support

3. **Long term** (6+ months):
   - Consider separate native apps for each platform
   - Provide best-in-class notification experience
   - Use platform-specific features (badges, custom sounds, action buttons)

## Testing Notifications

To test the current notification system:

1. **On iOS**:
   - Open Safari
   - Enable notifications in the app
   - Start a timer
   - **Keep Safari active and device unlocked** → You'll see notifications and hear alarms
   - **Lock device or switch apps** → No notifications/alarm

2. **On Android**:
   - Open Chrome
   - Enable notifications in the app
   - Start a timer
   - **Keep Chrome active** → You'll see notifications and hear alarms
   - **Switch apps** → You'll see notifications (maybe hear alarms depending on OS)
   - **Lock device** → No notifications/alarm

3. **On Desktop**:
   - Open browser
   - Enable notifications
   - Start a timer
   - **Keep browser active** → You'll see notifications and hear alarms
   - **Minimize browser** → No notifications/alarm

## Related Code

- `src/lib/notifications.ts` - Notification service implementation
- `src/components/TimerView.tsx` - Timer UI with notification triggers
- `src/lib/timer.ts` - Global timer manager

## Additional Resources

- [MDN: Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server)
- [PWA on iOS](https://webkit.org/blog/10882/progressive-web-apps-on-ios-16-4/)
