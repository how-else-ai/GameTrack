// React Native sync hook using the core SyncClient
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SyncClient,
  HttpClient,
  SyncResponse,
  Kid,
  DeletedKid,
  SYNC_CONSTANTS,
} from '@game-time-tracker/core';
import { useAppStore } from '@/lib/store';

// Native fetch-based HTTP client
const nativeHttpClient: HttpClient = {
  fetch: async (url: string, options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }) => {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
    });
    return { json: () => response.json() };
  },
};

type SyncStatus = 'idle' | 'syncing' | 'error';

export function useSync() {
  // Local state
  const [isConnected, setIsConnected] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // Refs for intervals
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const aggressivePollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPollTimeRef = useRef<number>(0);
  const syncDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync client ref
  const syncClientRef = useRef<SyncClient | null>(null);

  // Initialize sync client — getState reads fresh from store each call
  useEffect(() => {
    syncClientRef.current = new SyncClient(
      nativeHttpClient,
      {
        onKidsUpdate: (newKids, newDeleted) => {
          useAppStore.getState().mergeKidsData(newKids);
          useAppStore.getState().setDeletedKids(newDeleted);
        },
        onSyncRequest: () => {
          // Handled by sync client
        },
        onUnpair: (deviceId) => {
          useAppStore.getState().removePairedDevice(deviceId);
        },
        onError: (error) => {
          console.error('[SYNC] Error:', error);
          setSyncStatus('error');
        },
        onSyncFlash: () => {
          useAppStore.getState().triggerSyncFlash();
        },
      },
      {
        // Always read fresh state from the store — avoids stale closure issue
        // when Zustand persist middleware hasn't hydrated yet
        getState: () => {
          const state = useAppStore.getState();
          return {
            deviceId: state.deviceId,
            deviceName: state.deviceName,
            authToken: state.authToken || null,
            kids: state.kids,
            pairedDevices: state.pairedDevices,
            deletedKids: state.deletedKids,
          };
        },
        setAuthToken: (token) => {
          useAppStore.getState().setAuthToken(token);
          setIsRegistered(true);
          setIsConnected(true);
        },
        addPairedDevice: (device) => {
          useAppStore.getState().addPairedDevice(device);
        },
        removePairedDevice: (deviceId) => {
          useAppStore.getState().removePairedDevice(deviceId);
        },
        updateDeviceOnline: (deviceId, isOnline) => {
          useAppStore.getState().updateDeviceOnline(deviceId, isOnline);
        },
      }
    );
  }, []);

  // Initialize sync when deviceId is available
  useEffect(() => {
    const state = useAppStore.getState();
    if (!state.deviceId || !syncClientRef.current) return;

    let mounted = true;

    const init = async () => {
      const client = syncClientRef.current!;
      const success = await client.register();
      if (!success || !mounted) return;

      await client.heartbeat();

      // Regular polling
      pollIntervalRef.current = setInterval(async () => {
        lastPollTimeRef.current = await client.poll(lastPollTimeRef.current);
      }, SYNC_CONSTANTS.POLL_INTERVAL);

      // Heartbeat
      heartbeatIntervalRef.current = setInterval(async () => {
        await client.heartbeat();
      }, SYNC_CONSTANTS.HEARTBEAT_INTERVAL);

      await client.fetchPairedDevices();
    };

    init();

    return () => {
      mounted = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
      if (aggressivePollTimeoutRef.current) clearTimeout(aggressivePollTimeoutRef.current);
    };
  }, []);

  // Broadcast on kids change
  useEffect(() => {
    const state = useAppStore.getState();
    if (!isConnected || state.pairedDevices.length === 0 || !syncClientRef.current) return;

    const client = syncClientRef.current;
    if (!client.shouldBroadcast(state.kids, state.deletedKids)) return;

    // Debounce
    if (syncDebounceRef.current) {
      clearTimeout(syncDebounceRef.current);
    }

    syncDebounceRef.current = setTimeout(() => {
      const freshState = useAppStore.getState();
      client.pushEvent('KIDS_UPDATE', {
        kids: freshState.kids,
        deletedKids: freshState.deletedKids,
      });
    }, SYNC_CONSTANTS.BROADCAST_DEBOUNCE);
  }, [isConnected]);

  // Public API
  const generatePairingToken = useCallback(async (): Promise<string | null> => {
    if (!syncClientRef.current) return null;
    return await syncClientRef.current.generatePairingToken();
  }, []);

  const completePairing = useCallback(async (pairingToken: string): Promise<{ success: boolean; error?: string }> => {
    if (!syncClientRef.current) return { success: false, error: 'Sync not initialized' };

    const registered = await syncClientRef.current.register();
    if (!registered) {
      return { success: false, error: 'Not connected to sync server' };
    }

    const result = await syncClientRef.current.completePairing(pairingToken);
    return result;
  }, []);

  const requestFullSync = useCallback(async (): Promise<void> => {
    const state = useAppStore.getState();
    if (state.pairedDevices.length === 0 || !syncClientRef.current) return;

    setSyncStatus('syncing');

    await syncClientRef.current.pushEvent('REQUEST_SYNC', {});

    // Aggressive polling for 5 seconds
    let pollCount = 0;
    const aggressivePoll = async () => {
      if (pollCount >= 10) {
        setSyncStatus('idle');
        return;
      }
      pollCount++;
      if (syncClientRef.current) {
        lastPollTimeRef.current = await syncClientRef.current.poll(lastPollTimeRef.current);
      }
      aggressivePollTimeoutRef.current = setTimeout(aggressivePoll, 500);
    };

    aggressivePoll();
  }, []);

  const unpairDevice = useCallback(async (targetDeviceId: string): Promise<void> => {
    if (!syncClientRef.current) return;
    await syncClientRef.current.unpairDevice(targetDeviceId);
  }, []);

  const ensureRegistered = useCallback(async (): Promise<boolean> => {
    if (!syncClientRef.current) return false;
    return await syncClientRef.current.register();
  }, []);

  return {
    isConnected,
    isRegistered,
    syncStatus,
    ensureRegistered,
    generatePairingToken,
    completePairing,
    requestFullSync,
    unpairDevice,
  };
}
