// React Native timer hook for active sessions
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import {
  calculateRemainingTime,
  isWarningState,
  Kid,
  Session,
} from '@game-time-tracker/core';

interface TimerState {
  remainingSeconds: number | null;
  isWarning: boolean;
  isPaused: boolean;
  progress: number;
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

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!kid?.activeSession) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setState({
        remainingSeconds: null,
        isWarning: false,
        isPaused: false,
        progress: 0,
      });
      return;
    }

    const calculateState = (): TimerState => {
      const remaining = calculateRemainingTime(
        kid.activeSession!.startTime,
        kid.ticketDuration,
        kid.activeSession!.isPaused,
        kid.activeSession!.pausedAt,
        kid.activeSession!.totalPausedDuration || 0
      );

      const totalSeconds = kid.ticketDuration * 60;
      const progress = Math.min(100, Math.max(0, ((totalSeconds - remaining) / totalSeconds) * 100));

      return {
        remainingSeconds: remaining,
        isWarning: isWarningState(remaining),
        isPaused: kid.activeSession!.isPaused,
        progress,
      };
    };

    // Initial calculation
    setState(calculateState());

    // Update every second (slower than web for battery)
    intervalRef.current = setInterval(() => {
      setState(calculateState());
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [kid?.id, kid?.activeSession?.startTime, kid?.ticketDuration]);

  return state;
}

export function useActiveTimers() {
  const kids = useAppStore((state) => state.kids);
  const [activeTimers, setActiveTimers] = useState<
    Array<{ kid: Kid; remainingSeconds: number }>
  >([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const calculateActiveTimers = () => {
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

    calculateActiveTimers();

    intervalRef.current = setInterval(calculateActiveTimers, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [kids]);

  return activeTimers;
}
