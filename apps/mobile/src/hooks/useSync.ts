// React Native sync hook - aligned with web app implementation
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
  // Store state
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
    setAuthToken,
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

  // Refs for immediate state access (prevents stale closures)
  const deviceIdRef = useRef(deviceId);
  const deviceNameRef = useRef(deviceName);
  const authTokenRef = useRef(authToken);
  const kidsRef = useRef<Kid[]>(kids);
  const deletedKidsRef = useRef<DeletedKid[]>(deletedKids);
  const pairedDevicesRef = useRef(pairedDevices);

  // Sync client ref
  const syncClientRef = useRef<SyncClient | null>(null);
  const initAttemptedRef = useRef(false);

  // Keep refs updated with current state
  useEffect(() => {
    deviceIdRef.current = deviceId;
    deviceNameRef.current = deviceName;
    authTokenRef.current = authToken;
    kidsRef.current = kids;
    deletedKidsRef.current = deletedKids;
    pairedDevicesRef.current = pairedDevices;
  }, [deviceId, deviceName, authToken, kids, deletedKids, pairedDevices]);

  // Initialize sync client once (with refs that always have current values)
  useEffect(() => {
    if (syncClientRef.current) return; // Already initialized

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
        },
        onSyncFlash: () => {
          triggerSyncFlash();
        },
      },
      {
        // Use refs to always get current values - prevents stale closure issues
        getState: () => ({
          deviceId: deviceIdRef.current,
          deviceName: deviceNameRef.current,
          authToken: authTokenRef.current,
          kids: kidsRef.current,
          pairedDevices: pairedDevicesRef.current,
          deletedKids: deletedKidsRef.current,
        }),
        setAuthToken: (token) => {
          setAuthToken(token);
          setIsRegistered(true);
          setIsConnected(true);
        },
        addPairedDevice,
        removePairedDevice,
        updateDeviceOnline,
      }
    );
  }, [mergeKidsData, setDeletedKids, removePairedDevice, triggerSyncFlash, setAuthToken, addPairedDevice, updateDeviceOnline]);

  // Initialize sync when deviceId is available
  useEffect(() => {
    // Don't run if already attempted or no deviceId or no client
    if (initAttemptedRef.current || !deviceId || !syncClientRef.current) return;

    let mounted = true;
    initAttemptedRef.current = true;

    const init = async () => {
      const client = syncClientRef.current!;
      console.log('[SYNC] Initializing with deviceId:', deviceId.substring(0, 8));

      const success = await client.register();
      if (!success || !mounted) {
        if (!success) {
          console.error('[SYNC] Registration failed');
          setSyncStatus('error');
        }
        initAttemptedRef.current = false; // Allow retry
        return;
      }

      console.log('[SYNC] Connected successfully');
      setIsConnected(true);
      setIsRegistered(true);

      await client.heartbeat();

      // Regular polling
      pollIntervalRef.current = setInterval(async () => {
        if (syncClientRef.current) {
          lastPollTimeRef.current = await syncClientRef.current.poll(lastPollTimeRef.current);
        }
      }, SYNC_CONSTANTS.POLL_INTERVAL);

      // Heartbeat
      heartbeatIntervalRef.current = setInterval(async () => {
        if (syncClientRef.current) {
          await syncClientRef.current.heartbeat();
        }
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
  }, [deviceId]);

  // Broadcast on kids change
  useEffect(() => {
    if (!isConnected || pairedDevices.length === 0 || !syncClientRef.current) return;

    const client = syncClientRef.current;
    if (!client.shouldBroadcast(kids, deletedKids)) return;

    // Debounce
    if (syncDebounceRef.current) {
      clearTimeout(syncDebounceRef.current);
    }

    syncDebounceRef.current = setTimeout(() => {
      if (syncClientRef.current) {
        syncClientRef.current.pushEvent('KIDS_UPDATE', {
          kids,
          deletedKids,
        });
      }
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
