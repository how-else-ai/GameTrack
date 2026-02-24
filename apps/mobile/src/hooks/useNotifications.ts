// Hook to manage notifications based on session state
import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  scheduleTimerNotification,
  cancelTimerNotification,
  rescheduleAllNotifications,
  setupNotificationHandlers,
  requestNotificationPermissions,
} from '@/lib/notifications';
import { useAppStore } from '@/lib/store';
import { endSession } from '@game-time-tracker/core';

export function useNotifications() {
  const kids = useAppStore((state) => state.kids);
  const endSessionAction = useAppStore((state) => state.endSession);

  // Track previous sessions to detect changes
  const prevSessionsRef = useRef<Map<string, {
    startTime: string;
    isPaused: boolean;
    totalPausedDuration: number;
  }>>(new Map());

  // Handle timer completion
  const handleTimerComplete = useCallback((kidId: string) => {
    console.log('[NOTIFICATIONS] Timer complete for kid:', kidId);
    // The session should already be ended, but ensure it's marked
    const kid = kids.find(k => k.id === kidId);
    if (kid?.activeSession) {
      endSessionAction(kidId);
    }
  }, [kids, endSessionAction]);

  // Setup notification handlers on mount
  useEffect(() => {
    // Request permissions on first launch
    requestNotificationPermissions();

    // Setup handlers
    const cleanup = setupNotificationHandlers(handleTimerComplete);

    // Reschedule notifications when app comes to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[NOTIFICATIONS] App active, rescheduling notifications');
        rescheduleFromState();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      cleanup();
      subscription.remove();
    };
  }, [handleTimerComplete]);

  // Helper to reschedule all from current state
  const rescheduleFromState = useCallback(() => {
    const sessions = kids
      .filter(kid => kid.activeSession)
      .map(kid => ({
        kidId: kid.id,
        kidName: kid.name,
        startTime: kid.activeSession!.startTime,
        durationMinutes: kid.ticketDuration,
        isPaused: kid.activeSession!.isPaused,
        totalPausedDuration: kid.activeSession!.totalPausedDuration || 0,
      }));

    rescheduleAllNotifications(sessions);
  }, [kids]);

  // Watch for session changes and update notifications
  useEffect(() => {
    const currentSessions = new Map<string, {
      startTime: string;
      isPaused: boolean;
      totalPausedDuration: number;
    }>();

    for (const kid of kids) {
      if (kid.activeSession) {
        currentSessions.set(kid.id, {
          startTime: kid.activeSession.startTime,
          isPaused: kid.activeSession.isPaused,
          totalPausedDuration: kid.activeSession.totalPausedDuration || 0,
        });

        const prev = prevSessionsRef.current.get(kid.id);
        const current = kid.activeSession;

        // Check if we need to update notification
        const needsReschedule = !prev ||
          prev.startTime !== current.startTime ||
          prev.isPaused !== current.isPaused ||
          prev.totalPausedDuration !== (current.totalPausedDuration || 0);

        if (needsReschedule) {
          if (current.isPaused) {
            // Cancel notification when paused
            cancelTimerNotification(kid.id);
          } else {
            // Schedule notification for active session
            scheduleTimerNotification(
              kid.id,
              kid.name,
              current.startTime,
              kid.ticketDuration,
              current.totalPausedDuration || 0
            );
          }
        }
      } else {
        // No active session - cancel any pending notification
        const prev = prevSessionsRef.current.get(kid.id);
        if (prev) {
          cancelTimerNotification(kid.id);
        }
      }
    }

    // Cancel notifications for kids that no longer have sessions
    for (const [kidId] of prevSessionsRef.current) {
      if (!currentSessions.has(kidId)) {
        cancelTimerNotification(kidId);
      }
    }

    prevSessionsRef.current = currentSessions;
  }, [kids]);
}
