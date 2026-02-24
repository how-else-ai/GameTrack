// Core package exports for Game Time Tracker

// Types
export * from './types';

// Device utilities
export * from './device';

// Sync configuration
export { SYNC_SERVER_URL, SYNC_CONSTANTS } from './sync-config';

// Storage adapters
export { webStorageAdapter, memoryStorageAdapter } from './storage-adapter';

// Store factory
export { createAppStore, type AppState, type AppStore } from './store';

// Timer utilities
export {
  calculateRemainingTime,
  isWarningState,
  formatTimeDisplay,
  calculateEndTime,
  calculateResumeDuration,
} from './timer-utils';

// Sync client
export {
  SyncClient,
  type HttpClient,
  type SyncCallbacks,
  type SyncState,
  type SyncResponse,
} from './sync-client';

// Avatar system
export {
  AVATAR_CATEGORIES,
  ALL_AVATARS,
  AVATAR_NAMES,
  getAvatarName,
  getRandomAvatar,
  getAvatarCategory,
} from './avatar';
