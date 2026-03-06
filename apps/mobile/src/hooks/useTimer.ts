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
const timerIntervals = new Map<string, NodeJS.Timeout>();
const subscribers = new Map<string, Set<(state: TimerState) => void>>();

// Global tick function that updates all timers
function startGlobalTimer() {
  const interval = setInterval(() => {
    // Get all kids with active sessions
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
  }, 1000); // Update every second (same as web)
  
  return interval;
}

// Initialize global timer
let globalInterval: NodeJS.Timeout | null = null;

function getGlobalTimer() {
  if (!globalInterval) {
    globalInterval = startGlobalTimer();
  }
  return globalInterval;
}

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

export function useTimer(kidId: string) {
  const [state, setState] = useState<TimerState>({
    remainingSeconds: null,
    isWarning: false,
    isPaused: false,
    progress: 0,
  });

  const kid = useAppStore(
    useCallback(
      (state) => state.kids.find((k) => k.id === kidId),
      [kidId]
    )
  );

  const callbackRef = useRef<(state: TimerState) => void>();

  // Set up callback
  useEffect(() => {
    callbackRef.current = (newState: TimerState) => {
      setState(newState);
    };
  });

  // Initialize timer state immediately
  useEffect(() => {
    if (kid?.activeSession) {
      setState(calculateTimerState(kid));
    } else {
      setState({
        remainingSeconds: null,
        isWarning: false,
        isPaused: false,
        progress: 0,
      });
    }
  }, [kid?.id, kid?.activeSession?.startTime, kid?.ticketDuration]);

  // Subscribe to global timer updates
  useEffect(() => {
    if (!kidId) return;

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

    // Also subscribe to store changes
    const unsubscribeStore = useAppStore.subscribe(() => {
      const currentKid = useAppStore.getState().kids.find(k => k.id === kidId);
      if (currentKid?.activeSession) {
        setState(calculateTimerState(currentKid));
      } else {
        setState({
          remainingSeconds: null,
          isWarning: false,
          isPaused: false,
          progress: 0,
        });
      }
    });

    return () => {
      subscribers.get(kidId)?.delete(updateState);
      if (subscribers.get(kidId)?.size === 0) {
        subscribers.delete(kidId);
      }
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
