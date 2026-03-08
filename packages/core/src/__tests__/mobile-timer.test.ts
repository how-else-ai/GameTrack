// Timer hook tests for mobile app
import { describe, it, expect } from 'vitest';
import { calculateRemainingTime, isWarningState } from '../timer-utils';

describe('mobile timer utilities', () => {
  describe('calculateRemainingTime', () => {
    it('should calculate remaining time for active session', () => {
      // Use recent time so test works reliably
      const startTime = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // started 5 mins ago
      const remaining = calculateRemainingTime(startTime, 30, false);
      // 30 minutes = 1800 seconds, 5 minutes have passed = 1500 remaining
      expect(remaining).toBe(1500);
    });

    it('should return 0 when time has elapsed', () => {
      const startTime = new Date('2024-01-01T11:00:00Z').toISOString();
      const remaining = calculateRemainingTime(startTime, 30, false);
      expect(remaining).toBe(0);
    });

    it('should handle paused session correctly', () => {
      // When paused, remaining is calculated up to pause point
      const startTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const pausedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const remaining = calculateRemainingTime(startTime, 30, true, pausedAt, 0);
      // Elapsed = pausedAt - startTime = 5 min = 300 seconds
      // Remaining = 1800 - 300 = 1500
      expect(remaining).toBe(1500);
    });

    it('should return full duration when session is paused with zero elapsed', () => {
      // Session just started and immediately paused
      const startTime = new Date().toISOString();
      const pausedAt = new Date().toISOString();
      const remaining = calculateRemainingTime(startTime, 30, true, pausedAt, 0);
      expect(remaining).toBe(1800);
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
      expect(isWarningState(1800)).toBe(false);
    });

    it('should return false when 0 seconds remaining (expired)', () => {
      expect(isWarningState(0)).toBe(false);
    });
  });
});
