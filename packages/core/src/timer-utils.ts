// Timer utilities - platform agnostic
// These functions calculate timer state without relying on any platform-specific APIs

/**
 * Calculate remaining time for a session in seconds
 */
export function calculateRemainingTime(
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

/**
 * Check if timer is in warning state (less than 60 seconds remaining)
 */
export function isWarningState(remainingSeconds: number): boolean {
  return remainingSeconds > 0 && remainingSeconds <= 60;
}

/**
 * Format seconds into MM:SS display
 */
export function formatTimeDisplay(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate the end time timestamp for a session
 */
export function calculateEndTime(
  startTime: string,
  durationMinutes: number,
  totalPausedDuration: number = 0
): number {
  const start = new Date(startTime).getTime();
  const duration = durationMinutes * 60 * 1000;
  return start + duration + totalPausedDuration;
}

/**
 * Calculate remaining duration when resuming a paused session
 */
export function calculateResumeDuration(pausedAt: string, totalPausedDuration: number): number {
  const pausedTime = new Date(pausedAt).getTime();
  const pausedDuration = Date.now() - pausedTime;
  return totalPausedDuration + pausedDuration;
}
