// React Native timer hook for active sessions (aligned with web app)
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import {
  calculateRemainingTime,
  isWarningState,
} from '@game-time-tracker/core';

interface TimerState {
  remainingSeconds: number | null;
  isWarning: boolean;
  isPaused: boolean;
  progress: number;
}

// Global timer state refs (similar to web app timer manager)
let globalInterval: ReturnType<typeof setInterval> | null = null;
const subscribers = new Map<string, Set<(state: TimerState) => void>>();

// Calculate timer state for a kid
function calculateTimerState(kid: any): TimerState {
  if (!kid.activeSession) {
    return {
      remainingSeconds: null,
      isWarning: false,
      isPaused: false,
      progress: 0,
    };
  }

  const remaining = calculateRemainingTime(
    kid.activeSession.startTime,
    kid.ticketDuration,
    kid.activeSession.isPaused,
    kid.activeSession.pausedAt,
    kid.activeSession.totalPausedDuration || 0
  );

  const totalSeconds = kid.ticketDuration * 60;
  const progress = Math.min(100, Math.max(0, ((totalSeconds - remaining) / totalSeconds) * 100));

  return {
    remainingSeconds: remaining,
    isWarning: isWarningState(remaining),
    isPaused: kid.activeSession.isPaused,
    progress,
  };
}

// Global tick function that updates all timers
function startGlobalTimer() {
  if (globalInterval) {
    return globalInterval;
  }
  
  globalInterval = setInterval(() => {
    // Get all kids with active sessions from store
    const kids = useAppStore.getState().kids;
    
    for (const kid of kids) {
      if (!kid.activeSession) continue;
      
      const state = calculateTimerState(kid);
      
      // Notify all subscribers for this kid
      const kidSubscribers = subscribers.get(kid.id);
      if (kidSubscribers) {
        kidSubscribers.forEach(callback => callback(state));
      }
    }
  }, 1000);
  
  return globalInterval;
}

function getGlobalTimer() {
  return startGlobalTimer();
}

// Clear interval when no more subscribers
function maybeStopGlobalTimer() {
  if (subscribers.size === 0 && globalInterval) {
    clearInterval(globalInterval);
    globalInterval = null;
  }
}

export function useTimer(kidId: string) {
  const [state, setState] = useState<TimerState>({
    remainingSeconds: null,
    isWarning: false,
    isPaused: false,
    progress: 0,
  });

  // Get the kid from store
  const kid = useAppStore(
    useCallback(
      (state) => state.kids.find((k) => k.id === kidId),
      [kidId]
    )
  );

  // Initialize timer and subscribe to updates
  useEffect(() => {
    if (!kidId) return;

    // Calculate initial state immediately
    if (kid?.activeSession) {
      setState(calculateTimerState(kid));
    }

    // Create callback for this kid
    const updateState = (newState: TimerState) => {
      setState(newState);
    };

    // Add to subscribers
    if (!subscribers.has(kidId)) {
      subscribers.set(kidId, new Set());
    }
    subscribers.get(kidId)?.add(updateState);

    // Start global timer
    getGlobalTimer();

    return () => {
      subscribers.get(kidId)?.delete(updateState);
      if (subscribers.get(kidId)?.size === 0) {
        subscribers.delete(kidId);
      }
      maybeStopGlobalTimer();
    };
  }, [kidId]);

  // Also subscribe to store changes to catch session start/end
  useEffect(() => {
    if (!kidId) return;

    const unsubscribeStore = useAppStore.subscribe(() => {
      const currentKid = useAppStore.getState().kids.find(k => k.id === kidId);
      if (currentKid) {
        const newState = calculateTimerState(currentKid);
        setState(newState);
      }
    });

    return () => {
      unsubscribeStore();
    };
  }, [kidId]);

  return state;
}

export function useActiveTimers() {
  const [activeTimers, setActiveTimers] = useState<
    Array<{ kid: any; remainingSeconds: number }>
  >([]);

  const kids = useAppStore((state) => state.kids);

  useEffect(() => {
    const updateActiveTimers = () => {
      const active = kids
        .filter((kid) => kid.activeSession && !kid.activeSession.isPaused)
        .map((kid) => ({
          kid,
          remainingSeconds: calculateRemainingTime(
            kid.activeSession!.startTime,
            kid.ticketDuration,
            kid.activeSession!.isPaused,
            kid.activeSession!.pausedAt,
            kid.activeSession!.totalPausedDuration || 0
          ),
        }));
      setActiveTimers(active);
    };

    updateActiveTimers();
    getGlobalTimer();

    // Update every second
    const interval = setInterval(updateActiveTimers, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [kids]);

  return activeTimers;
}
