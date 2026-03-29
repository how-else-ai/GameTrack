// React Native sync hook using the core SyncClient - Aligned with web app
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SyncClient,
  HttpClient,
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
  // Store state - get all values including authToken
  const {
    deviceId,
    deviceName,
    authToken,
    kids,
    pairedDevices,
    deletedKids,
    addPairedDevice,
    removePairedDevice,
    updateDeviceOnline,
    mergeKidsData,
    setDeletedKids,
    triggerSyncFlash,
    setAuthToken: setStoreAuthToken,
  } = useAppStore();

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

  // Auth token ref for immediate access (like web app)
  const authTokenRef = useRef<string | null>(null);

  // Sync client ref
  const syncClientRef = useRef<SyncClient | null>(null);

  // Keep authTokenRef in sync with store
  useEffect(() => {
    authTokenRef.current = authToken;
    // If we have an authToken, we're registered and connected
    if (authToken && !isRegistered) {
      setIsRegistered(true);
      setIsConnected(true);
    }
  }, [authToken, isRegistered]);

  // Initialize sync client once
  useEffect(() => {
    syncClientRef.current = new SyncClient(
      nativeHttpClient,
      {
        onKidsUpdate: (newKids, newDeleted) => {
          mergeKidsData(newKids);
          setDeletedKids(newDeleted);
        },
        onSyncRequest: () => {
          // Handled by sync client
        },
        onUnpair: (deviceId) => {
          removePairedDevice(deviceId);
        },
        onError: (error) => {
          console.error('[SYNC] Error:', error);
          setSyncStatus('error');
          setIsConnected(false);
        },
        onSyncFlash: () => {
          triggerSyncFlash();
        },
      },
      {
        getState: () => ({
          deviceId,
          deviceName,
          authToken: authTokenRef.current || '',
          kids,
          pairedDevices,
          deletedKids,
        }),
        setAuthToken: (token) => {
          setStoreAuthToken(token);
          authTokenRef.current = token;
          setIsRegistered(true);
          setIsConnected(true);
        },
        addPairedDevice,
        removePairedDevice,
        updateDeviceOnline,
      }
    );
  }, []); // Empty array - create client once

  // Initialize sync when deviceId is available
  useEffect(() => {
    if (!deviceId || !syncClientRef.current) return;

    let mounted = true;

    const init = async () => {
      const client = syncClientRef.current!;

      // Register if not already registered
      const success = await client.register();
      if (!success || !mounted) return;

      // Update connection states
      if (mounted) {
        setIsRegistered(true);
        setIsConnected(true);
      }

      await client.heartbeat();

      // Regular polling every 2 seconds
      pollIntervalRef.current = setInterval(async () => {
        lastPollTimeRef.current = await client.poll(lastPollTimeRef.current);
      }, SYNC_CONSTANTS.POLL_INTERVAL);

      // Heartbeat every 10 seconds
      heartbeatIntervalRef.current = setInterval(async () => {
        await client.heartbeat();
      }, SYNC_CONSTANTS.HEARTBEAT_INTERVAL);

      await client.fetchPairedDevices();
    };

    console.log('[SYNC] Initializing with deviceId:', deviceId?.substring(0, 8));
    init();

    return () => {
      mounted = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
      if (aggressivePollTimeoutRef.current) clearTimeout(aggressivePollTimeoutRef.current);
    };
  }, [deviceId]);

  // Broadcast on kids change - with debouncing
  useEffect(() => {
    if (!isConnected || pairedDevices.length === 0 || !syncClientRef.current) return;

    const client = syncClientRef.current;
    if (!client.shouldBroadcast(kids, deletedKids)) return;

    // Debounce
    if (syncDebounceRef.current) {
      clearTimeout(syncDebounceRef.current);
    }

    syncDebounceRef.current = setTimeout(() => {
      client.pushEvent('KIDS_UPDATE', {
        kids,
        deletedKids,
      });
    }, SYNC_CONSTANTS.BROADCAST_DEBOUNCE);
  }, [kids, deletedKids, isConnected, pairedDevices.length]);

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
    if (pairedDevices.length === 0 || !syncClientRef.current) return;

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
  }, [pairedDevices.length]);

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
