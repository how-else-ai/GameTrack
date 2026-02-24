// Platform-agnostic Zustand store factory for Game Time Tracker
// Works with any storage adapter (localStorage, AsyncStorage, etc.)

import { create, StoreApi } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';
import {
  Kid,
  Ticket,
  PairedDevice,
  Session,
  DeletedKid,
  StorageAdapter,
} from './types';
import { generateDeviceId, generateKidId, generateTicketId } from './device';

// Store state interface
export interface AppState {
  deviceId: string;
  deviceName: string;
  authToken: string;
  kids: Kid[];
  pairedDevices: PairedDevice[];
  deletedKids: DeletedKid[];
  syncVersion: number;
  lastSyncFlash: number;

  // Device
  initializeDevice: () => void;
  setDeviceName: (name: string) => void;
  setAuthToken: (token: string) => void;

  // Kids
  addKid: (data: { name: string; avatarEmoji: string; ticketLimit: number; ticketDuration: number }) => void;
  updateKid: (id: string, data: Partial<Kid>) => void;
  deleteKid: (id: string) => void;

  // Tickets
  resetTickets: (kidId: string) => void;
  markTicketUsed: (ticketId: string, kidId: string) => void;

  // Sessions
  startSession: (kidId: string, ticketId: string) => void;
  pauseSession: (kidId: string) => void;
  resumeSession: (kidId: string) => void;
  endSession: (kidId: string) => void;

  // Sync
  addPairedDevice: (device: PairedDevice) => void;
  removePairedDevice: (deviceId: string) => void;
  updateDeviceOnline: (deviceId: string, isOnline: boolean) => void;

  // Import/Export
  importData: (kids: Kid[]) => void;

  // Sync merge functions
  mergeKidsData: (kids: Kid[]) => void;
  setDeletedKids: (deletedKids: DeletedKid[]) => void;

  // Sync visual feedback
  triggerSyncFlash: () => void;

  // Deleted kids management
  getDeletedKidIds: () => string[];
  clearDeletedKid: (id: string) => void;
}

// Helper functions
const createTickets = (limit: number, date: string): Ticket[] => {
  return Array.from({ length: limit }, (_, i) => ({
    id: generateTicketId(i),
    status: 'available' as const,
    lastResetDate: date,
  }));
};

// Migration function to handle old session format
const migrateSession = (session: Session | null): Session | null => {
  if (!session) return null;

  if (typeof session.totalPausedDuration === 'undefined') {
    return {
      ...session,
      totalPausedDuration: 0,
    };
  }
  return session;
};

// Migrate kids data
const migrateKids = (kids: Kid[]): Kid[] => {
  return kids.map(kid => ({
    ...kid,
    activeSession: migrateSession(kid.activeSession),
  }));
};

// Store factory that accepts a storage adapter
export function createAppStore(storageAdapter: StorageAdapter) {
  const persistOptions: PersistOptions<AppState> = {
    name: 'game-time-tracker',
    storage: {
      getItem: async (name) => {
        const value = await storageAdapter.getItem(name);
        return value ? JSON.parse(value) : null;
      },
      setItem: async (name, value) => {
        await storageAdapter.setItem(name, JSON.stringify(value));
      },
      removeItem: async (name) => {
        await storageAdapter.removeItem(name);
      },
    },
    migrate: (persistedState: unknown) => {
      const state = persistedState as AppState & { kids?: Kid[] };
      if (state.kids) {
        state.kids = migrateKids(state.kids);
      }
      if (!state.deletedKids) {
        state.deletedKids = [];
      }
      if (typeof state.lastSyncFlash === 'undefined') {
        state.lastSyncFlash = 0;
      }
      return state;
    },
  };

  return create<AppState>()(
    persist(
      (set, get) => ({
        deviceId: '',
        deviceName: '',
        authToken: '',
        kids: [],
        pairedDevices: [],
        deletedKids: [],
        syncVersion: 0,
        lastSyncFlash: 0,

        initializeDevice: () => {
          const state = get();
          if (!state.deviceId) {
            set({
              deviceId: generateDeviceId(),
              deviceName: `Device-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            });
          }
        },

        setDeviceName: (name) => set({ deviceName: name }),
        setAuthToken: (token) => set({ authToken: token }),

        addKid: (data) => {
          const today = new Date().toISOString().split('T')[0];
          const newKid: Kid = {
            id: generateKidId(),
            ...data,
            tickets: createTickets(data.ticketLimit, today),
            activeSession: null,
          };
          set((state) => ({
            kids: [...state.kids, newKid],
            syncVersion: state.syncVersion + 1,
          }));
        },

        updateKid: (id, data) => set((state) => ({
          kids: state.kids.map((kid) =>
            kid.id === id ? { ...kid, ...data } : kid
          ),
          syncVersion: state.syncVersion + 1,
        })),

        deleteKid: (id) => {
          const state = get();
          const deletedEntry: DeletedKid = {
            id,
            deletedAt: Date.now(),
            deletedBy: state.deviceId,
          };
          set((state) => ({
            kids: state.kids.filter((kid) => kid.id !== id),
            deletedKids: [...state.deletedKids.filter(d => d.id !== id), deletedEntry],
            syncVersion: state.syncVersion + 1,
          }));
        },

        resetTickets: (kidId) => {
          const today = new Date().toISOString().split('T')[0];
          set((state) => ({
            kids: state.kids.map((kid) =>
              kid.id === kidId
                ? {
                    ...kid,
                    tickets: createTickets(kid.ticketLimit, today),
                    activeSession: null,
                  }
                : kid
            ),
            syncVersion: state.syncVersion + 1,
          }));
        },

        markTicketUsed: (ticketId, kidId) => set((state) => ({
          kids: state.kids.map((kid) =>
            kid.id === kidId
              ? {
                  ...kid,
                  tickets: kid.tickets.map((t) =>
                    t.id === ticketId ? { ...t, status: 'used' as const } : t
                  ),
                }
              : kid
          ),
          syncVersion: state.syncVersion + 1,
        })),

        startSession: (kidId, ticketId) => {
          const now = new Date().toISOString();
          set((state) => {
            const kid = state.kids.find(k => k.id === kidId);
            if (!kid) return state;

            const session: Session = {
              ticketId,
              startTime: now,
              isPaused: false,
              totalPausedDuration: 0,
            };

            return {
              kids: state.kids.map((k) =>
                k.id === kidId
                  ? {
                      ...k,
                      activeSession: session,
                      tickets: k.tickets.map((t) =>
                        t.id === ticketId
                          ? { ...t, status: 'in-use' as const }
                          : t
                      ),
                    }
                  : k
              ),
              syncVersion: state.syncVersion + 1,
            };
          });
        },

        pauseSession: (kidId) => set((state) => {
          const kid = state.kids.find(k => k.id === kidId);
          if (!kid?.activeSession || kid.activeSession.isPaused) return state;

          return {
            kids: state.kids.map((k) =>
              k.id === kidId && k.activeSession
                ? {
                    ...k,
                    activeSession: {
                      ...k.activeSession,
                      isPaused: true,
                      pausedAt: new Date().toISOString(),
                    },
                  }
                : k
            ),
            syncVersion: state.syncVersion + 1,
          };
        }),

        resumeSession: (kidId) => set((state) => {
          const kid = state.kids.find(k => k.id === kidId);
          if (!kid?.activeSession || !kid.activeSession.isPaused) return state;

          const pausedAt = kid.activeSession.pausedAt
            ? new Date(kid.activeSession.pausedAt).getTime()
            : Date.now();
          const pausedDuration = Date.now() - pausedAt;
          const totalPausedDuration = (kid.activeSession.totalPausedDuration || 0) + pausedDuration;

          return {
            kids: state.kids.map((k) =>
              k.id === kidId && k.activeSession
                ? {
                    ...k,
                    activeSession: {
                      ...k.activeSession,
                      isPaused: false,
                      pausedAt: undefined,
                      totalPausedDuration,
                    },
                  }
                : k
            ),
            syncVersion: state.syncVersion + 1,
          };
        }),

        endSession: (kidId) => set((state) => {
          const kid = state.kids.find((k) => k.id === kidId);
          if (!kid || !kid.activeSession) return state;

          return {
            kids: state.kids.map((k) =>
              k.id === kidId
                ? {
                    ...k,
                    activeSession: null,
                    tickets: k.tickets.map((t) =>
                      t.id === kid.activeSession!.ticketId
                        ? { ...t, status: 'used' as const }
                        : t
                    ),
                  }
                : k
            ),
            syncVersion: state.syncVersion + 1,
          };
        }),

        addPairedDevice: (device) => set((state) => ({
          pairedDevices: [...state.pairedDevices.filter(d => d.deviceId !== device.deviceId), device],
        })),

        removePairedDevice: (deviceId) => set((state) => ({
          pairedDevices: state.pairedDevices.filter((d) => d.deviceId !== deviceId),
        })),

        updateDeviceOnline: (deviceId, isOnline) => set((state) => ({
          pairedDevices: state.pairedDevices.map((d) =>
            d.deviceId === deviceId ? { ...d, isOnline, lastSeen: new Date().toISOString() } : d
          ),
        })),

        importData: (incomingKids) => set((state) => {
          const deletedIds = new Set(state.deletedKids.map(d => d.id));

          const filteredIncoming = incomingKids.filter(k => !deletedIds.has(k.id));
          const incomingIds = new Set(incomingKids.map(k => k.id));
          const localOnlyKids = state.kids.filter(k => !incomingIds.has(k.id));

          const mergedKids = [...filteredIncoming];
          for (const localKid of localOnlyKids) {
            const incomingKid = incomingKids.find(k => k.id === localKid.id);
            if (!incomingKid) {
              mergedKids.push(localKid);
            }
          }

          return {
            kids: migrateKids(mergedKids),
            syncVersion: state.syncVersion + 1,
          };
        }),

        mergeKidsData: (mergedKids) => set((state) => ({
          kids: migrateKids(mergedKids),
          syncVersion: state.syncVersion + 1,
        })),

        setDeletedKids: (newDeletedKids) => set((state) => ({
          deletedKids: newDeletedKids,
          syncVersion: state.syncVersion + 1,
        })),

        triggerSyncFlash: () => set({ lastSyncFlash: Date.now() }),

        getDeletedKidIds: () => get().deletedKids.map(d => d.id),

        clearDeletedKid: (id) => set((state) => ({
          deletedKids: state.deletedKids.filter(d => d.id !== id),
        })),
      }),
      persistOptions
    )
  );
}

// Export store instance type
export type AppStore = StoreApi<AppState>;
