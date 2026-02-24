// iOS notification management for Game Time Tracker
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { calculateEndTime } from '@game-time-tracker/core';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<NotificationPermissionStatus> {
  if (!Device.isDevice) {
    console.log('[NOTIFICATIONS] Must use physical device for notifications');
    return { granted: false, canAskAgain: false };
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Only ask if permissions have not already been determined
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowDisplayInCarPlay: false,
        allowCriticalAlerts: false,
      },
    });
    finalStatus = status;
  }

  return {
    granted: finalStatus === 'granted',
    canAskAgain: finalStatus !== 'denied',
  };
}

/**
 * Check current notification permission status
 */
export async function checkNotificationPermissions(): Promise<NotificationPermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return {
    granted: status === 'granted',
    canAskAgain: status !== 'denied',
  };
}

/**
 * Schedule a timer completion notification
 */
export async function scheduleTimerNotification(
  kidId: string,
  kidName: string,
  startTime: string,
  durationMinutes: number,
  totalPausedDuration: number = 0
): Promise<string | null> {
  try {
    // Calculate when the timer ends
    const endTime = calculateEndTime(startTime, durationMinutes, totalPausedDuration);
    const triggerDate = new Date(endTime);

    // Don't schedule if the time has already passed
    if (triggerDate.getTime() <= Date.now()) {
      console.log('[NOTIFICATIONS] Not scheduling - time already passed');
      return null;
    }

    // Cancel any existing notification for this kid
    await cancelTimerNotification(kidId);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Time\'s Up!',
        body: `${kidName}'s gaming session has ended.`,
        sound: 'default',
        badge: 0,
        data: {
          kidId,
          type: 'TIMER_COMPLETE',
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    console.log('[NOTIFICATIONS] Scheduled timer for', kidName, 'at', triggerDate.toISOString());
    return notificationId;
  } catch (error) {
    console.error('[NOTIFICATIONS] Failed to schedule notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled timer notification
 */
export async function cancelTimerNotification(kidId: string): Promise<void> {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduledNotifications) {
      const data = notification.content.data as { kidId?: string; type?: string } | undefined;
      if (data?.kidId === kidId && data?.type === 'TIMER_COMPLETE') {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log('[NOTIFICATIONS] Cancelled notification for kid:', kidId);
      }
    }
  } catch (error) {
    console.error('[NOTIFICATIONS] Failed to cancel notification:', error);
  }
}

/**
 * Cancel all scheduled timer notifications
 */
export async function cancelAllTimerNotifications(): Promise<void> {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduledNotifications) {
      const data = notification.content.data as { type?: string } | undefined;
      if (data?.type === 'TIMER_COMPLETE') {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }

    console.log('[NOTIFICATIONS] Cancelled all timer notifications');
  } catch (error) {
    console.error('[NOTIFICATIONS] Failed to cancel notifications:', error);
  }
}

/**
 * Get all scheduled timer notifications
 */
export async function getScheduledTimerNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    return allNotifications.filter(notification => {
      const data = notification.content.data as { type?: string } | undefined;
      return data?.type === 'TIMER_COMPLETE';
    });
  } catch (error) {
    console.error('[NOTIFICATIONS] Failed to get scheduled notifications:', error);
    return [];
  }
}

/**
 * Setup notification received handlers
 */
export function setupNotificationHandlers(
  onTimerComplete: (kidId: string) => void
): void {
  // Handle notification when app is in foreground
  Notifications.addNotificationReceivedListener(notification => {
    const data = notification.request.content.data as { kidId?: string; type?: string } | undefined;

    if (data?.type === 'TIMER_COMPLETE' && data?.kidId) {
      console.log('[NOTIFICATIONS] Timer complete notification received (foreground)');
      onTimerComplete(data.kidId);
    }
  });

  // Handle notification when user taps it
  Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as { kidId?: string; type?: string } | undefined;

    if (data?.type === 'TIMER_COMPLETE' && data?.kidId) {
      console.log('[NOTIFICATIONS] Timer complete notification tapped');
      onTimerComplete(data.kidId);
    }
  });
}

/**
 * Reschedule all active session notifications
 * Call this on app startup to ensure notifications are correct
 */
export async function rescheduleAllNotifications(
  sessions: Array<{
    kidId: string;
    kidName: string;
    startTime: string;
    durationMinutes: number;
    isPaused: boolean;
    totalPausedDuration: number;
  }>
): Promise<void> {
  // First cancel all existing timer notifications
  await cancelAllTimerNotifications();

  // Reschedule for each active (non-paused) session
  for (const session of sessions) {
    if (!session.isPaused) {
      await scheduleTimerNotification(
        session.kidId,
        session.kidName,
        session.startTime,
        session.durationMinutes,
        session.totalPausedDuration
      );
    }
  }

  console.log('[NOTIFICATIONS] Rescheduled', sessions.filter(s => !s.isPaused).length, 'notifications');
}
