// Type definitions for Game Time Tracker

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
