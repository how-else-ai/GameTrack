import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { SYNC_SERVER_URL } from '@/lib/sync-config';
import { Kid, DeletedKid } from '@/lib/types';

// ============================================================================
// Types
// ============================================================================

interface SyncEvent {
  id: string;
  from_device: string;
  action: string;
  payload: unknown;
  timestamp: number;
}

interface SyncResponse {
  success: boolean;
  error?: string;
  token?: string;
  pairingToken?: string;
  peerDeviceId?: string;
  peerDeviceName?: string;
  devices?: Array<{
    device_id: string;
    device_name: string;
    paired_at: number;
    is_online: boolean;
  }>;
  events?: SyncEvent[];
  timestamp?: number;
  deliveredTo?: string[];
}

type SyncStatus = 'idle' | 'syncing' | 'error';

// ============================================================================
// useSync Hook
// ============================================================================

export function useSync() {
  // Store state
  const {
    deviceId,
    deviceName,
    kids,
    pairedDevices,
    deletedKids,
    addPairedDevice,
    removePairedDevice,
    updateDeviceOnline,
    mergeKidsData,
    setDeletedKids,
    triggerSyncFlash,
  } = useAppStore();

  // Local state
  const [isConnected, setIsConnected] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // Refs for immediate access
  const authTokenRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const aggressivePollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPollTimeRef = useRef<number>(0);
  const deviceIdRef = useRef(deviceId);
  const deviceNameRef = useRef(deviceName);
  const kidsRef = useRef<Kid[]>(kids);
  const deletedKidsRef = useRef<DeletedKid[]>(deletedKids);
  const pairedDevicesRef = useRef(pairedDevices);
  const registrationPromiseRef = useRef<Promise<boolean> | null>(null);

  // Sync loop prevention
  const sentEventIdsRef = useRef<Set<string>>(new Set());
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef(false);
  const syncDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncHashRef = useRef<string>('');

  // Keep refs updated
  useEffect(() => {
    deviceIdRef.current = deviceId;
    deviceNameRef.current = deviceName;
    kidsRef.current = kids;
    deletedKidsRef.current = deletedKids;
    pairedDevicesRef.current = pairedDevices;
  }, [deviceId, deviceName, kids, deletedKids, pairedDevices]);

  // ============================================================================
  // Network Functions
  // ============================================================================

  const authFetch = useCallback(async (
    action: string,
    data: Record<string, unknown> = {},
    method: string = 'POST'
  ): Promise<SyncResponse> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authTokenRef.current) {
      headers['X-Device-Id'] = deviceIdRef.current || '';
      headers['X-Auth-Token'] = authTokenRef.current;
    }

    try {
      const response = await fetch(`${SYNC_SERVER_URL}?action=${action}`, {
        method,
        headers,
        body: Object.keys(data).length > 0 ? JSON.stringify(data) : undefined,
      });

      return await response.json();
    } catch (error) {
      console.error('[SYNC] Network error:', error);
      return { success: false, error: 'Network error' };
    }
  }, []);

  const register = useCallback(async (): Promise<boolean> => {
    if (authTokenRef.current) return true;
    if (registrationPromiseRef.current) return registrationPromiseRef.current;
    if (!deviceIdRef.current) return false;

    registrationPromiseRef.current = (async () => {
      try {
        console.log('[SYNC] Registering device:', deviceIdRef.current?.substring(0, 8));
        const result = await authFetch('register', { deviceId: deviceIdRef.current });

        if (result.success && result.token) {
          authTokenRef.current = result.token;
          setIsRegistered(true);
          setIsConnected(true);
          console.log('[SYNC] Registered successfully');
          return true;
        }

        console.error('[SYNC] Registration failed:', result.error);
        return false;
      } finally {
        registrationPromiseRef.current = null;
      }
    })();

    return registrationPromiseRef.current;
  }, [authFetch]);

  const ensureRegistered = useCallback(async (): Promise<boolean> => {
    return authTokenRef.current ? true : register();
  }, [register]);

  // ============================================================================
  // Event Handling
  // ============================================================================

  const pushEvent = useCallback(async (
    action: string,
    payload: unknown,
    targetDeviceId?: string
  ): Promise<boolean> => {
    if (!authTokenRef.current) {
      console.error('[SYNC] Cannot push - not registered');
      return false;
    }

    if (pairedDevicesRef.current.length === 0) {
      console.log('[SYNC] No paired devices');
      return false;
    }

    const eventId = `event-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    // Track sent event
    sentEventIdsRef.current.add(eventId);
    if (sentEventIdsRef.current.size > 100) {
      const arr = Array.from(sentEventIdsRef.current);
      sentEventIdsRef.current = new Set(arr.slice(-50));
    }

    const result = await authFetch('push', {
      eventId,
      action,
      payload,
      targetDeviceId,
    });

    console.log('[SYNC] Pushed:', action, '→', result.deliveredTo || []);
    
    // Trigger visual flash on successful push
    if (result.success) {
      triggerSyncFlash();
    }
    
    return result.success;
  }, [authFetch, triggerSyncFlash]);

  const processEvent = useCallback(async (event: SyncEvent): Promise<void> => {
    // Skip own events
    if (event.from_device === deviceIdRef.current) {
      return;
    }

    // Skip already processed events
    if (processedEventIdsRef.current.has(event.id)) {
      return;
    }

    // Skip events we sent (echo)
    if (sentEventIdsRef.current.has(event.id)) {
      console.log('[SYNC] Skipping echo:', event.id);
      return;
    }

    // Prevent concurrent processing
    if (isProcessingRef.current) {
      console.log('[SYNC] Busy, queuing event:', event.action);
      return;
    }

    isProcessingRef.current = true;
    processedEventIdsRef.current.add(event.id);

    // Keep processed set bounded
    if (processedEventIdsRef.current.size > 200) {
      const arr = Array.from(processedEventIdsRef.current);
      processedEventIdsRef.current = new Set(arr.slice(-100));
    }

    console.log('[SYNC] Processing:', event.action, 'from', event.from_device.substring(0, 8));

    try {
      switch (event.action) {
        case 'KIDS_UPDATE': {
          const payload = event.payload as { kids?: Kid[]; deletedKids?: DeletedKid[] };
          if (!Array.isArray(payload.kids)) break;

          const incomingKids = payload.kids;
          const incomingDeleted = payload.deletedKids || [];

          console.log('[SYNC] Received', incomingKids.length, 'kids,', incomingDeleted.length, 'deleted');

          // Merge deletedKids - keep most recent for each kid
          const mergedDeleted = new Map<string, DeletedKid>();
          
          // Add existing deleted
          for (const d of deletedKidsRef.current) {
            mergedDeleted.set(d.id, d);
          }
          
          // Merge incoming deleted (keep newer)
          for (const d of incomingDeleted) {
            const existing = mergedDeleted.get(d.id);
            if (!existing || d.deletedAt > existing.deletedAt) {
              mergedDeleted.set(d.id, d);
            }
          }

          const finalDeleted = Array.from(mergedDeleted.values());
          const deletedIds = new Set(finalDeleted.map(d => d.id));

          // Filter kids that are deleted
          const filteredKids = incomingKids.filter(k => !deletedIds.has(k.id));

          // Merge with local kids not in incoming
          const incomingIds = new Set(filteredKids.map(k => k.id));
          const localOnlyKids = kidsRef.current.filter(k => !incomingIds.has(k.id) && !deletedIds.has(k.id));

          const mergedKids = [...filteredKids, ...localOnlyKids];

          // Update store
          setDeletedKids(finalDeleted);
          mergeKidsData(mergedKids);
          
          // Trigger visual flash - data received
          triggerSyncFlash();

          console.log('[SYNC] Merged:', mergedKids.length, 'kids,', finalDeleted.length, 'deleted');
          break;
        }

        case 'REQUEST_SYNC': {
          console.log('[SYNC] Sync requested, sending data');
          await pushEvent('KIDS_UPDATE', {
            kids: kidsRef.current,
            deletedKids: deletedKidsRef.current,
          }, event.from_device);
          break;
        }

        case 'UNPAIR': {
          if (typeof event.payload === 'string') {
            removePairedDevice(event.payload);
          }
          break;
        }
      }
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 50);
    }
  }, [mergeKidsData, setDeletedKids, pushEvent, removePairedDevice, triggerSyncFlash]);

  // ============================================================================
  // Polling
  // ============================================================================

  const poll = useCallback(async (): Promise<void> => {
    if (!authTokenRef.current) return;

    const result = await authFetch(`poll&since=${lastPollTimeRef.current}`, {}, 'GET');

    if (!result.success) return;

    lastPollTimeRef.current = result.timestamp || Date.now();

    // Process events
    if (result.events?.length) {
      console.log('[SYNC] Poll received', result.events.length, 'events');

      for (const event of result.events) {
        await processEvent(event);

        // Acknowledge
        await authFetch('ack', {
          eventId: event.id,
          fromDeviceId: event.from_device,
        });
      }
    }
  }, [authFetch, processEvent]);

  const fetchPairedDevices = useCallback(async (): Promise<void> => {
    if (!authTokenRef.current) return;

    const result = await authFetch('get-paired-devices', {}, 'GET');

    if (result.success && result.devices) {
      for (const device of result.devices) {
        const existing = pairedDevicesRef.current.find(d => d.deviceId === device.device_id);
        
        if (!existing) {
          addPairedDevice({
            deviceId: device.device_id,
            deviceName: device.device_name,
            pairedAt: new Date(device.paired_at * 1000).toISOString(),
            isOnline: device.is_online,
          });
        } else {
          updateDeviceOnline(device.device_id, device.is_online);
        }
      }
    }
  }, [authFetch, addPairedDevice, updateDeviceOnline]);

  const heartbeat = useCallback(async (): Promise<void> => {
    if (!authTokenRef.current) return;
    await authFetch('heartbeat', {});
  }, [authFetch]);

  // ============================================================================
  // Public API
  // ============================================================================

  const generatePairingToken = useCallback(async (): Promise<string | null> => {
    if (!authTokenRef.current) return null;
    
    const result = await authFetch('generate-pairing', {
      deviceName: deviceNameRef.current,
    });

    return result.success ? result.pairingToken || null : null;
  }, [authFetch]);

  const completePairing = useCallback(async (pairingToken: string): Promise<{ success: boolean; error?: string }> => {
    if (!authTokenRef.current) {
      return { success: false, error: 'Not connected' };
    }

    const result = await authFetch('complete-pairing', {
      pairingToken,
      deviceName: deviceNameRef.current,
    });

    if (result.success && result.peerDeviceId && result.peerDeviceName) {
      addPairedDevice({
        deviceId: result.peerDeviceId,
        deviceName: result.peerDeviceName,
        pairedAt: new Date().toISOString(),
        isOnline: true,
      });

      console.log('[SYNC] Paired with:', result.peerDeviceName);

      // Send our data to new peer
      setTimeout(async () => {
        await pushEvent('KIDS_UPDATE', {
          kids: kidsRef.current,
          deletedKids: deletedKidsRef.current,
        }, result.peerDeviceId);
      }, 500);

      return { success: true };
    }

    return { success: false, error: result.error || 'Pairing failed' };
  }, [authFetch, addPairedDevice, pushEvent]);

  const requestFullSync = useCallback(async (): Promise<void> => {
    if (pairedDevicesRef.current.length === 0) return;

    setSyncStatus('syncing');
    console.log('[SYNC] Requesting full sync');

    // Push request to all paired devices
    await pushEvent('REQUEST_SYNC', {});

    // Aggressive polling for 5 seconds
    let pollCount = 0;
    const aggressivePoll = async () => {
      if (pollCount >= 10) {
        setSyncStatus('idle');
        return;
      }
      pollCount++;
      await poll();
      aggressivePollTimeoutRef.current = setTimeout(aggressivePoll, 500);
    };

    aggressivePoll();
  }, [pushEvent, poll]);

  const unpairDevice = useCallback(async (targetDeviceId: string): Promise<void> => {
    await authFetch('unpair', { peerDeviceId: targetDeviceId });
    removePairedDevice(targetDeviceId);
  }, [authFetch, removePairedDevice]);

  // ============================================================================
  // Auto-sync on data change
  // ============================================================================

  const broadcastUpdate = useCallback((kidsData: Kid[]): void => {
    if (pairedDevicesRef.current.length === 0) return;
    if (isProcessingRef.current) return;

    // Create hash to detect actual changes
    const hash = JSON.stringify({ kids: kidsData, deleted: deletedKidsRef.current });
    if (hash === lastSyncHashRef.current) return;
    lastSyncHashRef.current = hash;

    // Debounce
    if (syncDebounceRef.current) {
      clearTimeout(syncDebounceRef.current);
    }

    syncDebounceRef.current = setTimeout(() => {
      if (!isProcessingRef.current && pairedDevicesRef.current.length > 0) {
        console.log('[SYNC] Broadcasting update:', kidsData.length, 'kids');
        pushEvent('KIDS_UPDATE', {
          kids: kidsData,
          deletedKids: deletedKidsRef.current,
        });
      }
    }, 500);
  }, [pushEvent]);

  // ============================================================================
  // Initialization
  // ============================================================================

  useEffect(() => {
    // Wait for deviceId to be available
    if (!deviceId) return;

    let mounted = true;

    const init = async () => {
      const success = await register();
      if (!success || !mounted) return;

      await heartbeat();

      // Regular polling every 2 seconds
      pollIntervalRef.current = setInterval(poll, 2000);

      // Heartbeat every 10 seconds
      heartbeatIntervalRef.current = setInterval(heartbeat, 10000);

      await fetchPairedDevices();
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
  }, [deviceId, register, poll, heartbeat, fetchPairedDevices]);

  // Broadcast on kids change
  useEffect(() => {
    if (isConnected && pairedDevices.length > 0) {
      broadcastUpdate(kids);
    }
  }, [kids, deletedKids, isConnected, pairedDevices.length, broadcastUpdate]);

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
