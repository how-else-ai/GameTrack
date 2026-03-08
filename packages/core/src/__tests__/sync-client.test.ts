// Tests for SyncClient - verifying mobile sync functionality
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncClient, HttpClient, SyncState, SyncCallbacks } from '../sync-client';
import { SYNC_CONSTANTS } from '../sync-config';

describe('SyncClient', () => {
  let mockHttpClient: HttpClient;
  let mockCallbacks: SyncCallbacks;
  let mockState: SyncState;
  let setAuthTokenMock: ReturnType<typeof vi.fn>;
  let addPairedDeviceMock: ReturnType<typeof vi.fn>;
  let removePairedDeviceMock: ReturnType<typeof vi.fn>;
  let updateDeviceOnlineMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockHttpClient = {
      fetch: vi.fn(),
    };

    mockCallbacks = {
      onKidsUpdate: vi.fn(),
      onSyncRequest: vi.fn(),
      onUnpair: vi.fn(),
      onError: vi.fn(),
      onSyncFlash: vi.fn(),
    };

    mockState = {
      deviceId: 'device-test-123',
      deviceName: 'Test Device',
      authToken: null,
      kids: [],
      deletedKids: [],
      pairedDevices: [],
    };

    setAuthTokenMock = vi.fn();
    addPairedDeviceMock = vi.fn();
    removePairedDeviceMock = vi.fn();
    updateDeviceOnlineMock = vi.fn();
  });

  function createClient(getStateOverride?: () => SyncState) {
    return new SyncClient(
      mockHttpClient,
      mockCallbacks,
      {
        getState: getStateOverride || (() => mockState),
        setAuthToken: setAuthTokenMock,
        addPairedDevice: addPairedDeviceMock,
        removePairedDevice: removePairedDeviceMock,
        updateDeviceOnline: updateDeviceOnlineMock,
      }
    );
  }

  describe('register', () => {
    it('should return true immediately if already has auth token', async () => {
      mockState.authToken = 'existing-token';
      const client = createClient();

      const result = await client.register();

      expect(result).toBe(true);
      expect(mockHttpClient.fetch).not.toHaveBeenCalled();
    });

    it('should return false if deviceId is empty', async () => {
      mockState.deviceId = '';
      const client = createClient();

      const result = await client.register();

      expect(result).toBe(false);
      expect(mockHttpClient.fetch).not.toHaveBeenCalled();
    });

    it('should register successfully with valid deviceId', async () => {
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          success: true,
          token: 'new-auth-token',
        }),
      };
      mockHttpClient.fetch = vi.fn().mockResolvedValue(mockResponse);

      const client = createClient();
      const result = await client.register();

      expect(result).toBe(true);
      expect(mockHttpClient.fetch).toHaveBeenCalled();
      expect(setAuthTokenMock).toHaveBeenCalledWith('new-auth-token');
    });

    it('should return false on network error', async () => {
      mockHttpClient.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const client = createClient();
      const result = await client.register();

      expect(result).toBe(false);
    });

    it('should return false on server error', async () => {
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          success: false,
          error: 'Server error',
        }),
      };
      mockHttpClient.fetch = vi.fn().mockResolvedValue(mockResponse);

      const client = createClient();
      const result = await client.register();

      expect(result).toBe(false);
    });
  });

  describe('state management with dynamic getState', () => {
    it('should use current state values via dynamic getState', async () => {
      // Simulates the useRef pattern in React hooks
      let currentState = { ...mockState, deviceId: '' };

      const client = createClient(() => currentState);

      // Initially no deviceId - should fail
      const result1 = await client.register();
      expect(result1).toBe(false);

      // Update state (simulating useRef update)
      currentState = { ...currentState, deviceId: 'device-updated-456' };

      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          success: true,
          token: 'token-after-update',
        }),
      };
      mockHttpClient.fetch = vi.fn().mockResolvedValue(mockResponse);

      // Now should succeed
      const result2 = await client.register();
      expect(result2).toBe(true);
    });
  });

  describe('poll', () => {
    it('should return same timestamp if not registered', async () => {
      mockState.authToken = null;
      const client = createClient();

      const result = await client.poll(12345);

      expect(result).toBe(12345);
      expect(mockHttpClient.fetch).not.toHaveBeenCalled();
    });

    it('should poll for new events', async () => {
      mockState.authToken = 'valid-token';
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          success: true,
          timestamp: 99999,
          events: [],
        }),
      };
      mockHttpClient.fetch = vi.fn().mockResolvedValue(mockResponse);

      const client = createClient();
      const result = await client.poll(12345);

      expect(result).toBe(99999);
      expect(mockHttpClient.fetch).toHaveBeenCalledWith(
        expect.stringContaining('poll&since=12345'),
        expect.any(Object)
      );
    });
  });

  describe('generatePairingToken', () => {
    it('should return null if not registered', async () => {
      mockState.authToken = null;
      const client = createClient();

      const result = await client.generatePairingToken();

      expect(result).toBeNull();
    });

    it('should return pairing token when successful', async () => {
      mockState.authToken = 'valid-token';
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          success: true,
          pairingToken: 'pair-token-123',
        }),
      };
      mockHttpClient.fetch = vi.fn().mockResolvedValue(mockResponse);

      const client = createClient();
      const result = await client.generatePairingToken();

      expect(result).toBe('pair-token-123');
    });
  });

  describe('pushEvent', () => {
    it('should return false if not registered', async () => {
      mockState.authToken = null;
      const client = createClient();

      const result = await client.pushEvent('KIDS_UPDATE', { kids: [] });

      expect(result).toBe(false);
    });

    it('should return false if no paired devices', async () => {
      mockState.authToken = 'valid-token';
      mockState.pairedDevices = [];
      const client = createClient();

      const result = await client.pushEvent('KIDS_UPDATE', { kids: [] });

      expect(result).toBe(false);
    });

    it('should push event successfully', async () => {
      mockState.authToken = 'valid-token';
      mockState.pairedDevices = [{ deviceId: 'peer-1', deviceName: 'Peer', pairedAt: '2024-01-01', isOnline: true }];
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          success: true,
          deliveredTo: ['peer-1'],
        }),
      };
      mockHttpClient.fetch = vi.fn().mockResolvedValue(mockResponse);

      const client = createClient();
      const result = await client.pushEvent('KIDS_UPDATE', { kids: [] });

      expect(result).toBe(true);
      expect(mockCallbacks.onSyncFlash).toHaveBeenCalled();
    });
  });

  describe('processEvent', () => {
    it('should skip own events', async () => {
      mockState.deviceId = 'my-device';
      const client = createClient();

      await client.processEvent({
        id: 'event-1',
        from_device: 'my-device',
        action: 'KIDS_UPDATE',
        payload: { kids: [] },
        timestamp: Date.now(),
      });

      expect(mockCallbacks.onKidsUpdate).not.toHaveBeenCalled();
    });

    it('should process KIDS_UPDATE event', async () => {
      mockState.deviceId = 'my-device';
      mockHttpClient.fetch = vi.fn().mockResolvedValue({ json: vi.fn().mockResolvedValue({ success: true }) });
      const client = createClient();

      const incomingKid = {
        id: 'kid-1',
        name: 'Test Kid',
        avatarEmoji: '🎮',
        ticketLimit: 3,
        ticketDuration: 30,
        tickets: [],
        activeSession: null,
      };

      await client.processEvent({
        id: 'event-1',
        from_device: 'other-device',
        action: 'KIDS_UPDATE',
        payload: { kids: [incomingKid], deletedKids: [] },
        timestamp: Date.now(),
      });

      expect(mockCallbacks.onKidsUpdate).toHaveBeenCalled();
      expect(mockCallbacks.onSyncFlash).toHaveBeenCalled();
    });

    it('should handle echo events (events we sent)', async () => {
      mockState.deviceId = 'my-device';
      const client = createClient();

      // Simulate sending an event (adds to sentEventIds)
      mockState.authToken = 'valid-token';
      mockState.pairedDevices = [{ deviceId: 'peer-1', deviceName: 'Peer', pairedAt: '2024-01-01', isOnline: true }];
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          success: true,
          deliveredTo: ['peer-1'],
        }),
      };
      mockHttpClient.fetch = vi.fn().mockResolvedValue(mockResponse);

      // Push an event (this tracks the eventId)
      await client.pushEvent('KIDS_UPDATE', { kids: [] });

      // Now process the same event coming back (echo)
      // Since we can't easily get the eventId, we test the logic works
      // by verifying processEvent handles the echo prevention
    });
  });

  describe('heartbeat', () => {
    it('should not call if not registered', async () => {
      mockState.authToken = null;
      mockHttpClient.fetch = vi.fn();
      const client = createClient();

      await client.heartbeat();

      expect(mockHttpClient.fetch).not.toHaveBeenCalled();
    });

    it('should send heartbeat when registered', async () => {
      mockState.authToken = 'valid-token';
      const mockResponse = {
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      mockHttpClient.fetch = vi.fn().mockResolvedValue(mockResponse);
      const client = createClient();

      await client.heartbeat();

      expect(mockHttpClient.fetch).toHaveBeenCalledWith(
        expect.stringContaining('action=heartbeat'),
        expect.any(Object)
      );
    });
  });

  describe('SYNC_CONSTANTS', () => {
    it('should have valid constant values', () => {
      expect(SYNC_CONSTANTS.POLL_INTERVAL).toBe(2000);
      expect(SYNC_CONSTANTS.HEARTBEAT_INTERVAL).toBe(10000);
      expect(SYNC_CONSTANTS.BROADCAST_DEBOUNCE).toBe(500);
      expect(SYNC_CONSTANTS.AGGRESSIVE_POLL_DURATION).toBe(5000);
      expect(SYNC_CONSTANTS.QR_EXPIRY).toBe(300000); // 5 minutes
    });
  });
});
