// Sync server configuration - shared across platforms
export const SYNC_SERVER_URL = 'https://sync.how-else.com/sync.php';

// Sync constants
export const SYNC_CONSTANTS = {
  // Polling interval in milliseconds
  POLL_INTERVAL: 2000,
  // Heartbeat interval in milliseconds
  HEARTBEAT_INTERVAL: 10000,
  // Debounce delay for broadcasting updates
  BROADCAST_DEBOUNCE: 500,
  // Aggressive polling duration for manual sync
  AGGRESSIVE_POLL_DURATION: 5000,
  // QR code expiry time in milliseconds
  QR_EXPIRY: 5 * 60 * 1000,
  // Max sent event IDs to track (for echo prevention)
  MAX_SENT_EVENTS: 100,
  // Max processed event IDs to track
  MAX_PROCESSED_EVENTS: 200,
} as const;
