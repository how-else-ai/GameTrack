// Type definitions for Game Time Tracker - Shared between web and mobile

export interface Ticket {
  id: string;
  status: 'available' | 'in-use' | 'used';
  lastResetDate: string;
}

export interface Session {
  ticketId: string;
  startTime: string;  // ISO timestamp when session started
  isPaused: boolean;
  pausedAt?: string;  // ISO timestamp when last paused
  totalPausedDuration: number;  // Total milliseconds spent paused
}

export interface DeletedKid {
  id: string;
  deletedAt: number;  // timestamp
  deletedBy: string;  // device id
}

export interface Kid {
  id: string;
  name: string;
  avatarEmoji: string;
  ticketLimit: number;
  ticketDuration: number;
  tickets: Ticket[];
  activeSession: Session | null;
}

export interface PairedDevice {
  deviceId: string;
  deviceName: string;
  pairedAt: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface SyncEvent {
  id: string;
  action: string;
  payload: unknown;
  from_device: string;
  timestamp: number;
  acknowledged_by?: string[];
}

// Storage adapter interface for cross-platform persistence
export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

// Sync types
export interface SyncEventPayload {
  kids?: Kid[];
  deletedKids?: DeletedKid[];
}

export type SyncAction = 'KIDS_UPDATE' | 'REQUEST_SYNC' | 'UNPAIR';

// Timer types
export interface TimerState {
  remainingSeconds: number;
  isPaused: boolean;
  isWarning: boolean;
}

export type TimerCallback = (kidId: string, remainingSeconds: number, isPaused: boolean) => void;
export type ExpiredCallback = (kidId: string) => void;
