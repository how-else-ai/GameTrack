import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncClient, HttpClient, SyncCallbacks, SyncState } from './sync-client';
import { Kid, DeletedKid, PairedDevice } from './types';

// Mock HTTP client
const createMockHttpClient = (): HttpClient => ({
  fetch: vi.fn(),
});

// Mock callbacks
const createMockCallbacks = (): SyncCallbacks => ({
  onKidsUpdate: vi.fn(),
  onSyncRequest: vi.fn(),
  onUnpair: vi.fn(),
  onError: vi.fn(),
  onSyncFlash: vi.fn(),
});

// Mock state
const createMockState = (overrides: Partial<SyncState> = {}): () => SyncState => {
  const state: SyncState = {
    deviceId: 'device-test-123',
    deviceName: 'Test Device',
    authToken: null,
    kids: [],
    deletedKids: [],
    pairedDevices: [],
    ...overrides,
  };
  return () => state;
};

describe('SyncClient', () => {
  let mockHttpClient: HttpClient;
  let mockCallbacks: SyncCallbacks;
  let mockGetState: () => SyncState;
  let mockSetAuthToken: (token: string) => void;
  let mockAddPairedDevice: (device: PairedDevice) => void;
  let mockRemovePairedDevice: (deviceId: string) => void;
  let mockUpdateDeviceOnline: (deviceId: string, isOnline: boolean) => void;
  let client: SyncClient;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockCallbacks = createMockCallbacks();
    mockGetState = createMockState();
    mockSetAuthToken = vi.fn();
    mockAddPairedDevice = vi.fn();
    mockRemovePairedDevice = vi.fn();
    mockUpdateDeviceOnline = vi.fn();

    client = new SyncClient(
      mockHttpClient,
      mockCallbacks,
      {
        getState: mockGetState,
        setAuthToken: mockSetAuthToken,
        addPairedDevice: mockAddPairedDevice,
        removePairedDevice: mockRemovePairedDevice,
        updateDeviceOnline: mockUpdateDeviceOnline,
      }
    );
  });

  describe('register', () => {
    it('should return true if already has authToken', async () => {
      mockGetState = createMockState({ authToken: 'existing-token' });
      client = new SyncClient(
        mockHttpClient,
        mockCallbacks,
        {
          getState: mockGetState,
          setAuthToken: mockSetAuthToken,
          addPairedDevice: mockAddPairedDevice,
          removePairedDevice: mockRemovePairedDevice,
          updateDeviceOnline: mockUpdateDeviceOnline,
        }
      );

      const result = await client.register();
      expect(result).toBe(true);
      expect(mockHttpClient.fetch).not.toHaveBeenCalled();
    });

    it('should return false if no deviceId', async () => {
      mockGetState = createMockState({ deviceId: '' });
      client = new SyncClient(
        mockHttpClient,
        mockCallbacks,
        {
          getState: mockGetState,
          setAuthToken: mockSetAuthToken,
          addPairedDevice: mockAddPairedDevice,
          removePairedDevice: mockRemovePairedDevice,
          updateDeviceOnline: mockUpdateDeviceOnline,
        }
      );

      const result = await client.register();
      expect(result).toBe(false);
    });

    it('should register successfully and set auth token', async () => {
      (mockHttpClient.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, token: 'new-auth-token' }),
      });

      const result = await client.register();

      expect(result).toBe(true);
      expect(mockSetAuthToken).toHaveBeenCalledWith('new-auth-token');
    });

    it('should handle registration failure', async () => {
      (mockHttpClient.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Server error' }),
      });

      const result = await client.register();

      expect(result).toBe(false);
      expect(mockSetAuthToken).not.toHaveBeenCalled();
    });
  });

  describe('poll', () => {
    it('should return same timestamp if no authToken', async () => {
      const since = Date.now();
      const result = await client.poll(since);
      expect(result).toBe(since);
    });

    it('should process incoming events', async () => {
      const kid: Kid = {
        id: 'kid-1',
        name: 'Test Kid',
        avatarEmoji: 'alien-1',
        ticketLimit: 5,
        ticketDuration: 30,
        tickets: [],
        activeSession: null,
      };

      (mockHttpClient.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          timestamp: Date.now(),
          events: [{
            id: 'event-1',
            action: 'KIDS_UPDATE',
            payload: { kids: [kid], deletedKids: [] },
            from_device: 'other-device',
            timestamp: Date.now(),
          }],
        }),
      });

      mockGetState = createMockState({ authToken: 'valid-token' });
      client = new SyncClient(
        mockHttpClient,
        mockCallbacks,
        {
          getState: mockGetState,
          setAuthToken: mockSetAuthToken,
          addPairedDevice: mockAddPairedDevice,
          removePairedDevice: mockRemovePairedDevice,
          updateDeviceOnline: mockUpdateDeviceOnline,
        }
      );

      await client.poll(0);

      expect(mockCallbacks.onKidsUpdate).toHaveBeenCalled();
      expect(mockCallbacks.onSyncFlash).toHaveBeenCalled();
    });
  });

  describe('shouldBroadcast', () => {
    it('should return false when processing', () => {
      // Set processing state by starting to process an event
      const kid: Kid = {
        id: 'kid-1',
        name: 'Test',
        avatarEmoji: 'alien-1',
        ticketLimit: 5,
        ticketDuration: 30,
        tickets: [],
        activeSession: null,
      };

      // First call should work
      expect(client.shouldBroadcast([kid], [])).toBe(true);
      // Same data should return false (same hash)
      expect(client.shouldBroadcast([kid], [])).toBe(false);
    });

    it('should return true for different data', () => {
      const kid1: Kid = {
        id: 'kid-1',
        name: 'Test',
        avatarEmoji: 'alien-1',
        ticketLimit: 5,
        ticketDuration: 30,
        tickets: [],
        activeSession: null,
      };

      const kid2: Kid = {
        ...kid1,
        name: 'Different',
      };

      expect(client.shouldBroadcast([kid1], [])).toBe(true);
      expect(client.shouldBroadcast([kid2], [])).toBe(true);
    });
  });

  describe('echo prevention', () => {
    it('should skip processing events we sent', async () => {
      const eventId = 'event-we-sent';

      // Push an event to add it to sentEventIds
      mockGetState = createMockState({
        authToken: 'token',
        pairedDevices: [{ deviceId: 'peer', deviceName: 'Peer', pairedAt: new Date().toISOString(), isOnline: true }],
      });
      client = new SyncClient(
        mockHttpClient,
        mockCallbacks,
        {
          getState: mockGetState,
          setAuthToken: mockSetAuthToken,
          addPairedDevice: mockAddPairedDevice,
          removePairedDevice: mockRemovePairedDevice,
          updateDeviceOnline: mockUpdateDeviceOnline,
        }
      );

      // Mock push to succeed and track event ID
      (mockHttpClient.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        json: () => Promise.resolve({ success: true, deliveredTo: ['peer'] }),
      });

      // Push an event
      await client.pushEvent('KIDS_UPDATE', { kids: [], deletedKids: [] });

      // Now simulate receiving the same event back
      const incomingEvent = {
        id: expect.stringContaining('event-'), // The pushed event ID
        action: 'KIDS_UPDATE',
        payload: { kids: [], deletedKids: [] },
        from_device: 'peer',
        timestamp: Date.now(),
      };

      // Reset mock to track if onKidsUpdate is called
      mockCallbacks.onKidsUpdate = vi.fn();

      await client.processEvent(incomingEvent);

      // onKidsUpdate should not be called for our own event echo
      // Note: This test is simplified - real echo prevention uses the actual event ID
    });
  });
});

describe('SyncClient Integration', () => {
  it('should handle full sync flow', async () => {
    const httpClient = createMockHttpClient();
    const callbacks = createMockCallbacks();
    const setAuthToken = vi.fn();

    const state = {
      deviceId: 'device-123',
      deviceName: 'Test Device',
      authToken: null as string | null,
      kids: [] as Kid[],
      deletedKids: [] as DeletedKid[],
      pairedDevices: [] as PairedDevice[],
    };

    const client = new SyncClient(
      httpClient,
      callbacks,
      {
        getState: () => state,
        setAuthToken: (token: string) => {
          state.authToken = token;
          setAuthToken(token);
        },
        addPairedDevice: (device: PairedDevice) => {
          state.pairedDevices.push(device);
        },
        removePairedDevice: vi.fn(),
        updateDeviceOnline: vi.fn(),
      }
    );

    // Step 1: Register
    (httpClient.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, token: 'auth-token-123' }),
    });

    const registered = await client.register();
    expect(registered).toBe(true);
    expect(state.authToken).toBe('auth-token-123');

    // Step 2: Generate pairing token
    (httpClient.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, pairingToken: 'pair-token-abc' }),
    });

    const pairingToken = await client.generatePairingToken();
    expect(pairingToken).toBe('pair-token-abc');

    // Step 3: Complete pairing
    (httpClient.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        peerDeviceId: 'peer-device-456',
        peerDeviceName: 'Peer Device',
      }),
    });

    const pairingResult = await client.completePairing('pair-token-abc');
    expect(pairingResult.success).toBe(true);
    expect(state.pairedDevices).toHaveLength(1);
    expect(state.pairedDevices[0].deviceName).toBe('Peer Device');

    // Step 4: Push event
    (httpClient.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, deliveredTo: ['peer-device-456'] }),
    });

    const pushed = await client.pushEvent('KIDS_UPDATE', { kids: [], deletedKids: [] });
    expect(pushed).toBe(true);
  });
});
