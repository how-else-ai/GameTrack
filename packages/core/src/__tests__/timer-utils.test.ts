import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateRemainingTime,
  isWarningState,
  formatTimeDisplay,
  calculateEndTime,
  calculateResumeDuration,
} from '../timer-utils';

describe('timer-utils', () => {
  describe('calculateRemainingTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate remaining time for a running session', () => {
      const now = new Date('2024-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const startTime = new Date('2024-01-01T11:55:00Z').toISOString(); // 5 minutes ago
      const durationMinutes = 10;
      const isPaused = false;

      const remaining = calculateRemainingTime(startTime, durationMinutes, isPaused);
      // 5 minutes elapsed, 5 minutes remaining = 300 seconds
      expect(remaining).toBe(300);
    });

    it('should return 0 when time has elapsed', () => {
      const now = new Date('2024-01-01T12:15:00Z');
      vi.setSystemTime(now);

      const startTime = new Date('2024-01-01T12:00:00Z').toISOString();
      const durationMinutes = 10;
      const isPaused = false;

      const remaining = calculateRemainingTime(startTime, durationMinutes, isPaused);
      expect(remaining).toBe(0);
    });

    it('should calculate remaining time when paused', () => {
      const now = new Date('2024-01-01T12:10:00Z');
      vi.setSystemTime(now);

      const startTime = new Date('2024-01-01T11:50:00Z').toISOString();
      const pausedAt = new Date('2024-01-01T11:55:00Z').toISOString(); // Paused 5 minutes in
      const durationMinutes = 10;
      const isPaused = true;

      const remaining = calculateRemainingTime(startTime, durationMinutes, isPaused, pausedAt);
      // Started at 11:50, paused at 11:55 (5 min elapsed), so 5 min remaining
      expect(remaining).toBe(300);
    });

    it('should account for total paused duration', () => {
      const now = new Date('2024-01-01T12:20:00Z');
      vi.setSystemTime(now);

      const startTime = new Date('2024-01-01T12:00:00Z').toISOString();
      const durationMinutes = 10;
      const isPaused = false;
      const totalPausedDuration = 5 * 60 * 1000; // 5 minutes paused

      const remaining = calculateRemainingTime(startTime, durationMinutes, isPaused, undefined, totalPausedDuration);
      // 20 min elapsed - 5 min paused = 15 min actual = 0 remaining (exceeded)
      expect(remaining).toBe(0);
    });

    it('should handle edge case of exactly 1 second remaining', () => {
      const now = new Date('2024-01-01T12:09:59Z');
      vi.setSystemTime(now);

      const startTime = new Date('2024-01-01T12:00:00Z').toISOString();
      const durationMinutes = 10;
      const isPaused = false;

      const remaining = calculateRemainingTime(startTime, durationMinutes, isPaused);
      expect(remaining).toBe(1);
    });
  });

  describe('isWarningState', () => {
    it('should return true when 60 seconds or less remaining', () => {
      expect(isWarningState(60)).toBe(true);
      expect(isWarningState(30)).toBe(true);
      expect(isWarningState(1)).toBe(true);
    });

    it('should return false when more than 60 seconds remaining', () => {
      expect(isWarningState(61)).toBe(false);
      expect(isWarningState(120)).toBe(false);
      expect(isWarningState(300)).toBe(false);
    });

    it('should return false when 0 seconds remaining', () => {
      expect(isWarningState(0)).toBe(false);
    });
  });

  describe('formatTimeDisplay', () => {
    it('should format seconds into MM:SS', () => {
      expect(formatTimeDisplay(0)).toBe('00:00');
      expect(formatTimeDisplay(30)).toBe('00:30');
      expect(formatTimeDisplay(60)).toBe('01:00');
      expect(formatTimeDisplay(90)).toBe('01:30');
      expect(formatTimeDisplay(599)).toBe('09:59');
      expect(formatTimeDisplay(600)).toBe('10:00');
      expect(formatTimeDisplay(3600)).toBe('60:00');
    });

    it('should pad single digits with zeros', () => {
      expect(formatTimeDisplay(5)).toBe('00:05');
      expect(formatTimeDisplay(61)).toBe('01:01');
    });
  });

  describe('calculateEndTime', () => {
    it('should calculate end time correctly', () => {
      const startTime = '2024-01-01T12:00:00Z';
      const durationMinutes = 30;

      const endTime = calculateEndTime(startTime, durationMinutes);
      const expectedEndTime = new Date('2024-01-01T12:30:00Z').getTime();

      expect(endTime).toBe(expectedEndTime);
    });

    it('should account for paused duration', () => {
      const startTime = '2024-01-01T12:00:00Z';
      const durationMinutes = 30;
      const totalPausedDuration = 5 * 60 * 1000; // 5 minutes

      const endTime = calculateEndTime(startTime, durationMinutes, totalPausedDuration);
      const expectedEndTime = new Date('2024-01-01T12:35:00Z').getTime();

      expect(endTime).toBe(expectedEndTime);
    });
  });

  describe('calculateResumeDuration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate new total paused duration when resuming', () => {
      const now = new Date('2024-01-01T12:10:00Z');
      vi.setSystemTime(now);

      const pausedAt = new Date('2024-01-01T12:05:00Z').toISOString();
      const totalPausedDuration = 2 * 60 * 1000; // 2 minutes already paused

      const newDuration = calculateResumeDuration(pausedAt, totalPausedDuration);
      // 2 min previous + 5 min new = 7 min = 420000 ms
      expect(newDuration).toBe(420000);
    });
  });
});
