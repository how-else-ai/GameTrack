import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Kid, Ticket, PairedDevice, Session, DeletedKid } from './types';
import { generateDeviceId } from './device';

interface AppState {
  deviceId: string;
  deviceName: string;
  authToken: string;
  kids: Kid[];
  pairedDevices: PairedDevice[];
  deletedKids: DeletedKid[];  // Track deleted kids for sync
  syncVersion: number;
  lastSyncFlash: number; // Timestamp of last sync acknowledgment for visual feedback

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

  // Sessions (timestamp-based)
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

const createTickets = (limit: number, date: string): Ticket[] => {
  return Array.from({ length: limit }, (_, i) => ({
    id: `ticket-${Date.now()}-${i}`,
    status: 'available' as const,
    lastResetDate: date,
  }));
};

// Migration function to handle old session format
const migrateSession = (session: Session | null): Session | null => {
  if (!session) return null;
  
  // If session doesn't have totalPausedDuration, add it
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

export const useAppStore = create<AppState>()(
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
          id: `kid-${Date.now()}`,
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

      // Start a new session with timestamp
      startSession: (kidId, ticketId) => {
        const now = new Date().toISOString();
        set((state) => {
          const kid = state.kids.find(k => k.id === kidId);
          if (!kid) return state;
          
          // Calculate total duration for the ticket
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

      // Pause session - record when we paused
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

      // Resume session - add paused duration to total
      resumeSession: (kidId) => set((state) => {
        const kid = state.kids.find(k => k.id === kidId);
        if (!kid?.activeSession || !kid.activeSession.isPaused) return state;
        
        // Calculate how long we were paused
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

      // End session
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
        
        // Filter out kids that were deleted locally
        const filteredIncoming = incomingKids.filter(k => !deletedIds.has(k.id));
        
        // Merge: incoming kids + local kids that aren't in incoming
        const incomingIds = new Set(incomingKids.map(k => k.id));
        const localOnlyKids = state.kids.filter(k => !incomingIds.has(k.id));
        
        // For kids that exist in both, prefer the one with more recent activity
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

      // Merge kids data from sync (replaces local kids)
      mergeKidsData: (mergedKids) => set((state) => ({
        kids: migrateKids(mergedKids),
        syncVersion: state.syncVersion + 1,
      })),

      // Set deleted kids list from sync
      setDeletedKids: (newDeletedKids) => set((state) => ({
        deletedKids: newDeletedKids,
        syncVersion: state.syncVersion + 1,
      })),

      // Trigger sync flash visual feedback
      triggerSyncFlash: () => set({ lastSyncFlash: Date.now() }),

      getDeletedKidIds: () => get().deletedKids.map(d => d.id),
      
      clearDeletedKid: (id) => set((state) => ({
        deletedKids: state.deletedKids.filter(d => d.id !== id),
      })),
    }),
    {
      name: 'game-time-tracker',
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
    }
  )
);
