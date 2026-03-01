import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAppStore, AppState } from '../store';
import { StorageAdapter, Kid, Ticket, Session } from '../types';

// Mock storage adapter for testing
const createMockStorage = (): StorageAdapter & { store: Map<string, string> } => {
  const store = new Map<string, string>();
  return {
    store,
    getItem: async (key: string) => store.get(key) || null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
  };
};

describe('store', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;
  let useStore: ReturnType<typeof createAppStore>;

  beforeEach(() => {
    mockStorage = createMockStorage();
    useStore = createAppStore(mockStorage);
  });

  describe('initializeDevice', () => {
    it('should generate a device ID if none exists', () => {
      useStore.getState().initializeDevice();
      const state = useStore.getState();

      expect(state.deviceId).toMatch(/^device-/);
      expect(state.deviceName).toMatch(/^Device-/);
    });

    it('should not override existing device ID', () => {
      useStore.setState({ deviceId: 'existing-id', deviceName: 'Existing' });
      useStore.getState().initializeDevice();
      const state = useStore.getState();

      expect(state.deviceId).toBe('existing-id');
      expect(state.deviceName).toBe('Existing');
    });
  });

  describe('addKid', () => {
    it('should add a new kid with correct properties', () => {
      useStore.getState().addKid({
        name: 'Test Kid',
        avatarEmoji: 'kid-1',
        ticketLimit: 3,
        ticketDuration: 30,
      });

      const state = useStore.getState();
      expect(state.kids).toHaveLength(1);
      expect(state.kids[0].name).toBe('Test Kid');
      expect(state.kids[0].avatarEmoji).toBe('kid-1');
      expect(state.kids[0].ticketLimit).toBe(3);
      expect(state.kids[0].ticketDuration).toBe(30);
      expect(state.kids[0].tickets).toHaveLength(3);
      expect(state.kids[0].activeSession).toBeNull();
    });

    it('should create all tickets as available', () => {
      useStore.getState().addKid({
        name: 'Test Kid',
        avatarEmoji: 'kid-1',
        ticketLimit: 5,
        ticketDuration: 30,
      });

      const kid = useStore.getState().kids[0];
      kid.tickets.forEach((ticket: Ticket) => {
        expect(ticket.status).toBe('available');
      });
    });

    it('should increment syncVersion', () => {
      const initialVersion = useStore.getState().syncVersion;
      useStore.getState().addKid({
        name: 'Test Kid',
        avatarEmoji: 'kid-1',
        ticketLimit: 3,
        ticketDuration: 30,
      });

      expect(useStore.getState().syncVersion).toBe(initialVersion + 1);
    });
  });

  describe('updateKid', () => {
    it('should update kid properties', () => {
      useStore.getState().addKid({
        name: 'Original',
        avatarEmoji: 'kid-1',
        ticketLimit: 3,
        ticketDuration: 30,
      });

      const kidId = useStore.getState().kids[0].id;
      useStore.getState().updateKid(kidId, { name: 'Updated' });

      const kid = useStore.getState().kids[0];
      expect(kid.name).toBe('Updated');
    });
  });

  describe('deleteKid', () => {
    it('should remove kid from list', () => {
      useStore.getState().addKid({
        name: 'Test Kid',
        avatarEmoji: 'kid-1',
        ticketLimit: 3,
        ticketDuration: 30,
      });

      const kidId = useStore.getState().kids[0].id;
      useStore.getState().deleteKid(kidId);

      expect(useStore.getState().kids).toHaveLength(0);
    });

    it('should add to deletedKids list', () => {
      useStore.getState().addKid({
        name: 'Test Kid',
        avatarEmoji: 'kid-1',
        ticketLimit: 3,
        ticketDuration: 30,
      });

      const kidId = useStore.getState().kids[0].id;
      useStore.getState().deleteKid(kidId);

      const state = useStore.getState();
      expect(state.deletedKids).toHaveLength(1);
      expect(state.deletedKids[0].id).toBe(kidId);
    });
  });

  describe('sessions', () => {
    let kidId: string;
    let ticketId: string;

    beforeEach(() => {
      useStore.getState().addKid({
        name: 'Test Kid',
        avatarEmoji: 'kid-1',
        ticketLimit: 3,
        ticketDuration: 30,
      });
      kidId = useStore.getState().kids[0].id;
      ticketId = useStore.getState().kids[0].tickets[0].id;
    });

    describe('startSession', () => {
      it('should create an active session', () => {
        useStore.getState().startSession(kidId, ticketId);

        const kid = useStore.getState().kids[0];
        expect(kid.activeSession).not.toBeNull();
        expect(kid.activeSession?.ticketId).toBe(ticketId);
        expect(kid.activeSession?.isPaused).toBe(false);
        expect(kid.activeSession?.totalPausedDuration).toBe(0);
      });

      it('should mark ticket as in-use', () => {
        useStore.getState().startSession(kidId, ticketId);

        const kid = useStore.getState().kids[0];
        const ticket = kid.tickets.find((t: Ticket) => t.id === ticketId);
        expect(ticket?.status).toBe('in-use');
      });
    });

    describe('pauseSession', () => {
      it('should pause active session', () => {
        useStore.getState().startSession(kidId, ticketId);
        useStore.getState().pauseSession(kidId);

        const kid = useStore.getState().kids[0];
        expect(kid.activeSession?.isPaused).toBe(true);
        expect(kid.activeSession?.pausedAt).toBeDefined();
      });
    });

    describe('resumeSession', () => {
      it('should resume paused session and track paused duration', () => {
        useStore.getState().startSession(kidId, ticketId);
        useStore.getState().pauseSession(kidId);
        useStore.getState().resumeSession(kidId);

        const kid = useStore.getState().kids[0];
        expect(kid.activeSession?.isPaused).toBe(false);
        expect(kid.activeSession?.totalPausedDuration).toBeGreaterThanOrEqual(0);
      });
    });

    describe('endSession', () => {
      it('should clear active session', () => {
        useStore.getState().startSession(kidId, ticketId);
        useStore.getState().endSession(kidId);

        const kid = useStore.getState().kids[0];
        expect(kid.activeSession).toBeNull();
      });

      it('should mark ticket as used', () => {
        useStore.getState().startSession(kidId, ticketId);
        useStore.getState().endSession(kidId);

        const kid = useStore.getState().kids[0];
        const ticket = kid.tickets.find((t: Ticket) => t.id === ticketId);
        expect(ticket?.status).toBe('used');
      });
    });
  });

  describe('resetTickets', () => {
    it('should reset all tickets to available', () => {
      useStore.getState().addKid({
        name: 'Test Kid',
        avatarEmoji: 'kid-1',
        ticketLimit: 3,
        ticketDuration: 30,
      });

      const kidId = useStore.getState().kids[0].id;
      const ticketId = useStore.getState().kids[0].tickets[0].id;

      // Start and end a session to use a ticket
      useStore.getState().startSession(kidId, ticketId);
      useStore.getState().endSession(kidId);

      // Reset tickets
      useStore.getState().resetTickets(kidId);

      const kid = useStore.getState().kids[0];
      kid.tickets.forEach((ticket: Ticket) => {
        expect(ticket.status).toBe('available');
      });
      expect(kid.activeSession).toBeNull();
    });
  });

  describe('pairedDevices', () => {
    it('should add a paired device', () => {
      useStore.getState().addPairedDevice({
        deviceId: 'device-123',
        deviceName: 'Test Device',
        pairedAt: new Date().toISOString(),
        isOnline: true,
        lastSeen: new Date().toISOString(),
      });

      expect(useStore.getState().pairedDevices).toHaveLength(1);
    });

    it('should remove a paired device', () => {
      useStore.getState().addPairedDevice({
        deviceId: 'device-123',
        deviceName: 'Test Device',
        pairedAt: new Date().toISOString(),
        isOnline: true,
        lastSeen: new Date().toISOString(),
      });

      useStore.getState().removePairedDevice('device-123');

      expect(useStore.getState().pairedDevices).toHaveLength(0);
    });

    it('should update device online status', () => {
      useStore.getState().addPairedDevice({
        deviceId: 'device-123',
        deviceName: 'Test Device',
        pairedAt: new Date().toISOString(),
        isOnline: true,
        lastSeen: new Date().toISOString(),
      });

      useStore.getState().updateDeviceOnline('device-123', false);

      const device = useStore.getState().pairedDevices[0];
      expect(device.isOnline).toBe(false);
    });
  });

  describe('persistence', () => {
    it('should persist state to storage adapter', async () => {
      useStore.getState().addKid({
        name: 'Test Kid',
        avatarEmoji: 'kid-1',
        ticketLimit: 3,
        ticketDuration: 30,
      });

      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      const stored = mockStorage.store.get('game-time-tracker');
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.state.kids).toHaveLength(1);
      expect(parsed.state.kids[0].name).toBe('Test Kid');
    });
  });
});
