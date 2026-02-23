// Notification utility for timer alerts
// Uses the browser's Notification API
//
// LIMITATIONS:
// - iOS (iPhone/iPad): Only works when Safari is the ACTIVE app. Does NOT work when device is locked or Safari is in background.
// - Android: Works when browser is in background, but not when device is locked.
// - Desktop: Works reliably when browser is running.
//
// NOTE: To send notifications when device is locked/standby, you would need:
// - Native iOS app with Apple Push Notification Service (APNs), OR
// - PWA with Web Push API + push notification service (Firebase, OneSignal, etc.)
//   - Even with PWA, iOS has very limited background notification support

export type NotificationPermission = 'granted' | 'denied' | 'default';

// Extended NotificationOptions that includes vibrate (not in standard DOM types)
interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number[];
}

class NotificationService {
  private permission: NotificationPermission = 'default';

  constructor() {
    // Check current permission status on initialization
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission as NotificationPermission;
    }
  }

  // Check if notifications are supported
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window;
  }

  // Get current permission status
  getPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission as NotificationPermission;
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      console.warn('[NOTIFICATIONS] Not supported in this browser');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission as NotificationPermission;
      console.log('[NOTIFICATIONS] Permission:', permission);
      return permission;
    } catch (error) {
      console.error('[NOTIFICATIONS] Failed to request permission:', error);
      return 'denied';
    }
  }

  // Send a notification
  async send(title: string, options?: ExtendedNotificationOptions): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('[NOTIFICATIONS] Not supported in this browser');
      return false;
    }

    // Request permission if not already granted
    if (this.permission !== 'granted') {
      const result = await this.requestPermission();
      if (result !== 'granted') {
        console.warn('[NOTIFICATIONS] Permission not granted');
        return false;
      }
    }

    try {
      const notification = new Notification(title, {
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [200, 100, 200],
        tag: 'timer-alert',
        renotify: true,
        ...options,
      });

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return true;
    } catch (error) {
      console.error('[NOTIFICATIONS] Failed to send notification:', error);
      return false;
    }
  }

  // Send timer expired notification
  async notifyTimerExpired(kidName: string): Promise<boolean> {
    return this.send(`⏰ Time's Up!`, {
      body: `${kidName}'s game time has ended.`,
      requireInteraction: true,
      vibrate: [300, 200, 300, 200, 300],
    });
  }

  // Send warning notification (1 minute remaining)
  async notifyTimerWarning(kidName: string): Promise<boolean> {
    return this.send(`⚠️ 1 Minute Left!`, {
      body: `${kidName} has 1 minute of game time remaining.`,
      requireInteraction: false,
      vibrate: [200, 100, 200],
    });
  }
}

// Singleton instance
export const notificationService = new NotificationService();
