// Global Timer Manager
// Manages all active timers using timestamps for persistence

import { useAppStore } from './store';

type TimerCallback = (kidId: string, remainingSeconds: number, isPaused: boolean) => void;
type ExpiredCallback = (kidId: string) => void;

class TimerManager {
  private tickInterval: NodeJS.Timeout | null = null;
  private subscribers: Set<TimerCallback> = new Set();
  private expiredCallbacks: Set<ExpiredCallback> = new Set();
  private notifiedExpired: Set<string> = new Set();
  private isRunning: boolean = false;

  // Start the global timer tick (call once at app start)
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log('[TIMER] Starting global timer manager');
    
    // Tick every 250ms for smooth countdown
    this.tickInterval = setInterval(() => {
      this.tick();
    }, 250);
    
    // Initial tick
    this.tick();
  }

  // Stop the global timer
  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.isRunning = false;
  }

  // Subscribe to timer updates
  subscribe(callback: TimerCallback): () => void {
    this.subscribers.add(callback);
    // Immediately notify with current state
    this.notifyCurrentState(callback);
    return () => this.subscribers.delete(callback);
  }

  // Notify a single callback with current state
  private notifyCurrentState(callback: TimerCallback) {
    const store = useAppStore.getState();
    for (const kid of store.kids) {
      if (kid.activeSession) {
        const remaining = this.calculateRemainingTime(
          kid.activeSession.startTime,
          kid.ticketDuration,
          kid.activeSession.isPaused,
          kid.activeSession.pausedAt,
          kid.activeSession.totalPausedDuration || 0
        );
        callback(kid.id, remaining, kid.activeSession.isPaused);
      }
    }
  }

  // Force notify all subscribers immediately (call when session starts/changes)
  forceNotify() {
    const store = useAppStore.getState();
    for (const kid of store.kids) {
      if (kid.activeSession) {
        const remaining = this.calculateRemainingTime(
          kid.activeSession.startTime,
          kid.ticketDuration,
          kid.activeSession.isPaused,
          kid.activeSession.pausedAt,
          kid.activeSession.totalPausedDuration || 0
        );
        this.subscribers.forEach(cb => cb(kid.id, remaining, kid.activeSession!.isPaused));
      }
    }
  }

  // Subscribe to timer expiration
  onExpired(callback: ExpiredCallback): () => void {
    this.expiredCallbacks.add(callback);
    return () => this.expiredCallbacks.delete(callback);
  }

  // Calculate remaining time for a session
  calculateRemainingTime(
    startTime: string,
    durationMinutes: number,
    isPaused: boolean,
    pausedAt?: string,
    totalPausedDuration: number = 0
  ): number {
    const start = new Date(startTime).getTime();
    const duration = durationMinutes * 60 * 1000; // Convert to milliseconds
    const now = Date.now();
    
    let elapsed: number;
    
    if (isPaused && pausedAt) {
      // When paused, calculate time up to the pause point
      const pauseTime = new Date(pausedAt).getTime();
      elapsed = pauseTime - start - totalPausedDuration;
    } else {
      // When running, calculate time from now
      elapsed = now - start - totalPausedDuration;
    }
    
    const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
    return remaining;
  }

  // Get all active sessions with their remaining times
  getActiveTimers(): Map<string, { remaining: number; isPaused: boolean }> {
    const store = useAppStore.getState();
    const timers = new Map<string, { remaining: number; isPaused: boolean }>();
    
    for (const kid of store.kids) {
      if (kid.activeSession) {
        const remaining = this.calculateRemainingTime(
          kid.activeSession.startTime,
          kid.ticketDuration,
          kid.activeSession.isPaused,
          kid.activeSession.pausedAt,
          kid.activeSession.totalPausedDuration || 0
        );
        timers.set(kid.id, { remaining, isPaused: kid.activeSession.isPaused });
      }
    }
    
    return timers;
  }

  // Main tick function - runs every 250ms
  private tick() {
    const store = useAppStore.getState();
    
    for (const kid of store.kids) {
      if (!kid.activeSession) continue;
      
      const remaining = this.calculateRemainingTime(
        kid.activeSession.startTime,
        kid.ticketDuration,
        kid.activeSession.isPaused,
        kid.activeSession.pausedAt,
        kid.activeSession.totalPausedDuration || 0
      );
      
      // Notify all subscribers
      this.subscribers.forEach(cb => cb(kid.id, remaining, kid.activeSession!.isPaused));
      
      // Check if expired (only for non-paused sessions)
      if (!kid.activeSession.isPaused && remaining <= 0 && !this.notifiedExpired.has(kid.id)) {
        this.notifiedExpired.add(kid.id);
        this.handleExpired(kid.id);
      }
    }
  }

  // Handle timer expiration
  private handleExpired(kidId: string) {
    console.log('[TIMER] Session expired for kid:', kidId);
    
    // End the session in store
    const store = useAppStore.getState();
    store.endSession(kidId);
    
    // Notify expired callbacks
    this.expiredCallbacks.forEach(cb => cb(kidId));
  }

  // Clear expired notification when new session starts
  clearExpiredNotification(kidId: string) {
    this.notifiedExpired.delete(kidId);
    // Force immediate update after clearing
    this.forceNotify();
  }

  // Check if timer is close to expiring (for warnings)
  isWarning(remainingSeconds: number): boolean {
    return remainingSeconds > 0 && remainingSeconds <= 60;
  }
}

// Singleton instance
export const timerManager = new TimerManager();

// React hook for using the timer
import { useState, useEffect, useMemo } from 'react';

export function useTimer(kidId: string | null) {
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isWarning, setIsWarning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Memoize the handler to avoid recreation
  const handleTimerUpdate = useMemo(() => (id: string, time: number, paused: boolean) => {
    if (id === kidId) {
      setRemainingTime(time);
      setIsWarning(timerManager.isWarning(time));
      setIsPaused(paused);
    }
  }, [kidId]);

  useEffect(() => {
    if (!kidId) {
      // Use rAF to defer setState
      const raf = requestAnimationFrame(() => {
        setRemainingTime(null);
        setIsPaused(false);
      });
      return () => cancelAnimationFrame(raf);
    }

    // Calculate initial time immediately
    const calculateAndSet = () => {
      const store = useAppStore.getState();
      const kid = store.kids.find(k => k.id === kidId);
      
      if (kid?.activeSession) {
        const remaining = timerManager.calculateRemainingTime(
          kid.activeSession.startTime,
          kid.ticketDuration,
          kid.activeSession.isPaused,
          kid.activeSession.pausedAt,
          kid.activeSession.totalPausedDuration || 0
        );
        setRemainingTime(remaining);
        setIsWarning(timerManager.isWarning(remaining));
        setIsPaused(kid.activeSession.isPaused);
      } else {
        setRemainingTime(null);
        setIsPaused(false);
      }
    };

    // Initial calculation
    calculateAndSet();

    // Subscribe to updates from timer manager
    const unsubscribe = timerManager.subscribe(handleTimerUpdate);
    
    // Also subscribe to store changes to catch session starts immediately
    const unsubscribeStore = useAppStore.subscribe(() => {
      calculateAndSet();
    });

    return () => {
      unsubscribe();
      unsubscribeStore();
    };
  }, [kidId, handleTimerUpdate]);

  return { remainingTime, isWarning, isPaused };
}

// Hook for a specific kid's timer (for KidCard)
export function useKidTimer(kidId: string) {
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isWarning, setIsWarning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Memoize the handler
  const handleTimerUpdate = useMemo(() => (id: string, time: number, paused: boolean) => {
    if (id === kidId) {
      setRemainingTime(time);
      setIsWarning(timerManager.isWarning(time));
      setIsPaused(paused);
    }
  }, [kidId]);

  useEffect(() => {
    // Calculate initial time
    const calculateAndSet = () => {
      const store = useAppStore.getState();
      const kid = store.kids.find(k => k.id === kidId);
      
      if (kid?.activeSession) {
        const remaining = timerManager.calculateRemainingTime(
          kid.activeSession.startTime,
          kid.ticketDuration,
          kid.activeSession.isPaused,
          kid.activeSession.pausedAt,
          kid.activeSession.totalPausedDuration || 0
        );
        setRemainingTime(remaining);
        setIsPaused(kid.activeSession.isPaused);
        setIsWarning(timerManager.isWarning(remaining));
      } else {
        setRemainingTime(null);
        setIsPaused(false);
      }
    };

    // Initial calculation
    calculateAndSet();

    // Subscribe to global timer updates
    const unsubscribe = timerManager.subscribe(handleTimerUpdate);
    
    // Also subscribe to store changes to catch session starts immediately
    const unsubscribeStore = useAppStore.subscribe(() => {
      calculateAndSet();
    });

    return () => {
      unsubscribe();
      unsubscribeStore();
    };
  }, [kidId, handleTimerUpdate]);

  return { remainingTime, isWarning, isPaused };
}
