// React Native sync hook using the core SyncClient
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
  // Store state — destructured for dependency tracking
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

  // Set connected immediately if we already have an auth token
  const initAuthToken = useAppStore((state) => state.authToken);
  useEffect(() => {
    if (initAuthToken) {
      setIsConnected(true);
      setIsRegistered(true);
    }
  }, [initAuthToken]);

  // Refs for intervals and loop prevention
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const aggressivePollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPollTimeRef = useRef<number>(0);
  const syncDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const lastSyncHashRef = useRef<string>('');

  // Sync client ref
  const syncClientRef = useRef<SyncClient | null>(null);

  // Initialize sync client — callbacks use store actions directly
  useEffect(() => {
    syncClientRef.current = new SyncClient(
      nativeHttpClient,
      {
        onKidsUpdate: (newKids, newDeleted) => {
          mergeKidsData(newKids);
          setDeletedKids(newDeleted);
          triggerSyncFlash();
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
        // Always read fresh from store to handle async hydration
        getState: () => {
          const s = useAppStore.getState();
          return {
            deviceId: s.deviceId,
            deviceName: s.deviceName,
            authToken: s.authToken || null,
            kids: s.kids,
            pairedDevices: s.pairedDevices,
            deletedKids: s.deletedKids,
          };
        },
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
  }, []);

  // Initialize sync when deviceId becomes available (after store hydration)
  useEffect(() => {
    if (!deviceId || !syncClientRef.current) return;

    let mounted = true;

    const init = async () => {
      const client = syncClientRef.current!;
      const success = await client.register();
      if (!success || !mounted) return;

      // Mark connected — setAuthToken callback may not fire if token already existed
      setIsConnected(true);
      setIsRegistered(true);

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
    };
  }, [deviceId]);

  // Broadcast on kids change — matches web app debounce pattern
  const broadcastUpdate = useCallback((kidsData: Kid[]): void => {
    if (pairedDevices.length === 0) return;
    if (isProcessingRef.current) return;

    const hash = JSON.stringify({ kids: kidsData, deleted: deletedKids });
    if (hash === lastSyncHashRef.current) return;
    lastSyncHashRef.current = hash;

    if (syncDebounceRef.current) {
      clearTimeout(syncDebounceRef.current);
    }

    syncDebounceRef.current = setTimeout(() => {
      const state = useAppStore.getState();
      if (!isProcessingRef.current && state.pairedDevices.length > 0 && syncClientRef.current) {
        console.log('[SYNC] Broadcasting update:', state.kids.length, 'kids');
        syncClientRef.current.pushEvent('KIDS_UPDATE', {
          kids: state.kids,
          deletedKids: state.deletedKids,
        });
      }
    }, SYNC_CONSTANTS.BROADCAST_DEBOUNCE);
  }, [pairedDevices.length, deletedKids]);

  useEffect(() => {
    broadcastUpdate(kids);
  }, [kids, broadcastUpdate]);

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
    console.log('[SYNC] Requesting full sync');

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
