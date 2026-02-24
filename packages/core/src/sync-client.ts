// Platform-agnostic sync client for Game Time Tracker
// Can be used with any HTTP client and state management

import {
  Kid,
  DeletedKid,
  SyncEvent,
  PairedDevice,
  SyncEventPayload,
} from './types';
import { SYNC_SERVER_URL, SYNC_CONSTANTS } from './sync-config';
import { generateEventId } from './device';

// Sync response types
export interface SyncResponse {
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

// HTTP client interface - implement with fetch, axios, etc.
export interface HttpClient {
  fetch: (url: string, options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }) => Promise<{ json: () => Promise<unknown> }>;
}

// Callback types for sync events
export interface SyncCallbacks {
  onKidsUpdate: (kids: Kid[], deletedKids: DeletedKid[]) => void;
  onSyncRequest: (fromDevice: string) => void;
  onUnpair: (deviceId: string) => void;
  onError: (error: string) => void;
  onSyncFlash: () => void;
}

// State getters interface
export interface SyncState {
  deviceId: string;
  deviceName: string;
  authToken: string | null;
  kids: Kid[];
  deletedKids: DeletedKid[];
  pairedDevices: PairedDevice[];
}

export class SyncClient {
  private httpClient: HttpClient;
  private callbacks: SyncCallbacks;
  private getState: () => SyncState;
  private setAuthToken: (token: string) => void;
  private addPairedDevice: (device: PairedDevice) => void;
  private removePairedDevice: (deviceId: string) => void;
  private updateDeviceOnline: (deviceId: string, isOnline: boolean) => void;

  // Tracking sets for loop prevention
  private sentEventIds: Set<string> = new Set();
  private processedEventIds: Set<string> = new Set();
  private isProcessing: boolean = false;
  private lastSyncHash: string = '';

  constructor(
    httpClient: HttpClient,
    callbacks: SyncCallbacks,
    stateHandlers: {
      getState: () => SyncState;
      setAuthToken: (token: string) => void;
      addPairedDevice: (device: PairedDevice) => void;
      removePairedDevice: (deviceId: string) => void;
      updateDeviceOnline: (deviceId: string, isOnline: boolean) => void;
    }
  ) {
    this.httpClient = httpClient;
    this.callbacks = callbacks;
    this.getState = stateHandlers.getState;
    this.setAuthToken = stateHandlers.setAuthToken;
    this.addPairedDevice = stateHandlers.addPairedDevice;
    this.removePairedDevice = stateHandlers.removePairedDevice;
    this.updateDeviceOnline = stateHandlers.updateDeviceOnline;
  }

  // Private HTTP helper
  private async authFetch(
    action: string,
    data: Record<string, unknown> = {},
    method: string = 'POST'
  ): Promise<SyncResponse> {
    const { deviceId, authToken } = this.getState();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['X-Device-Id'] = deviceId || '';
      headers['X-Auth-Token'] = authToken;
    }

    try {
      const response = await this.httpClient.fetch(
        `${SYNC_SERVER_URL}?action=${action}`,
        {
          method,
          headers,
          body: Object.keys(data).length > 0 ? JSON.stringify(data) : undefined,
        }
      );
      return (await response.json()) as SyncResponse;
    } catch (error) {
      console.error('[SYNC] Network error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // Register device with sync server
  async register(): Promise<boolean> {
    const { deviceId, authToken } = this.getState();

    if (authToken) return true;
    if (!deviceId) return false;

    try {
      console.log('[SYNC] Registering device:', deviceId.substring(0, 8));
      const result = await this.authFetch('register', { deviceId });

      if (result.success && result.token) {
        this.setAuthToken(result.token);
        console.log('[SYNC] Registered successfully');
        return true;
      }

      console.error('[SYNC] Registration failed:', result.error);
      return false;
    } catch (error) {
      console.error('[SYNC] Registration error:', error);
      return false;
    }
  }

  // Generate pairing token for QR code
  async generatePairingToken(): Promise<string | null> {
    const { authToken, deviceName } = this.getState();
    if (!authToken) return null;

    const result = await this.authFetch('generate-pairing', {
      deviceName,
    });

    return result.success ? result.pairingToken || null : null;
  }

  // Complete pairing with token from another device
  async completePairing(pairingToken: string): Promise<{ success: boolean; error?: string; peerDeviceId?: string; peerDeviceName?: string }> {
    const { authToken, deviceName } = this.getState();
    if (!authToken) {
      return { success: false, error: 'Not connected' };
    }

    const result = await this.authFetch('complete-pairing', {
      pairingToken,
      deviceName,
    });

    if (result.success && result.peerDeviceId && result.peerDeviceName) {
      this.addPairedDevice({
        deviceId: result.peerDeviceId,
        deviceName: result.peerDeviceName,
        pairedAt: new Date().toISOString(),
        isOnline: true,
      });

      console.log('[SYNC] Paired with:', result.peerDeviceName);

      // Send our data to new peer after a short delay
      setTimeout(() => {
        this.pushEvent('KIDS_UPDATE', {
          kids: this.getState().kids,
          deletedKids: this.getState().deletedKids,
        }, result.peerDeviceId);
      }, 500);

      return { success: true, peerDeviceId: result.peerDeviceId, peerDeviceName: result.peerDeviceName };
    }

    return { success: false, error: result.error || 'Pairing failed' };
  }

  // Push event to paired devices
  async pushEvent(
    action: string,
    payload: SyncEventPayload,
    targetDeviceId?: string
  ): Promise<boolean> {
    const { authToken, pairedDevices } = this.getState();

    if (!authToken) {
      console.error('[SYNC] Cannot push - not registered');
      return false;
    }

    if (pairedDevices.length === 0) {
      console.log('[SYNC] No paired devices');
      return false;
    }

    const eventId = generateEventId();

    // Track sent event for echo prevention
    this.sentEventIds.add(eventId);
    if (this.sentEventIds.size > SYNC_CONSTANTS.MAX_SENT_EVENTS) {
      const arr = Array.from(this.sentEventIds);
      this.sentEventIds = new Set(arr.slice(-SYNC_CONSTANTS.MAX_SENT_EVENTS / 2));
    }

    const result = await this.authFetch('push', {
      eventId,
      action,
      payload,
      targetDeviceId,
    });

    console.log('[SYNC] Pushed:', action, '→', result.deliveredTo || []);

    if (result.success) {
      this.callbacks.onSyncFlash();
    }

    return result.success;
  }

  // Process incoming event
  async processEvent(event: SyncEvent): Promise<void> {
    const { deviceId } = this.getState();

    // Skip own events
    if (event.from_device === deviceId) return;

    // Skip already processed events
    if (this.processedEventIds.has(event.id)) return;

    // Skip events we sent (echo)
    if (this.sentEventIds.has(event.id)) {
      console.log('[SYNC] Skipping echo:', event.id);
      return;
    }

    // Prevent concurrent processing
    if (this.isProcessing) {
      console.log('[SYNC] Busy, queuing event:', event.action);
      return;
    }

    this.isProcessing = true;
    this.processedEventIds.add(event.id);

    // Keep processed set bounded
    if (this.processedEventIds.size > SYNC_CONSTANTS.MAX_PROCESSED_EVENTS) {
      const arr = Array.from(this.processedEventIds);
      this.processedEventIds = new Set(arr.slice(-SYNC_CONSTANTS.MAX_PROCESSED_EVENTS / 2));
    }

    console.log('[SYNC] Processing:', event.action, 'from', event.from_device.substring(0, 8));

    try {
      switch (event.action) {
        case 'KIDS_UPDATE': {
          const payload = event.payload as SyncEventPayload;
          if (!Array.isArray(payload.kids)) break;

          const incomingKids = payload.kids;
          const incomingDeleted = payload.deletedKids || [];

          console.log('[SYNC] Received', incomingKids.length, 'kids,', incomingDeleted.length, 'deleted');

          // Merge deletedKids - keep most recent for each kid
          const { deletedKids } = this.getState();
          const mergedDeleted = new Map<string, DeletedKid>();

          for (const d of deletedKids) {
            mergedDeleted.set(d.id, d);
          }

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
          const { kids } = this.getState();
          const incomingIds = new Set(filteredKids.map(k => k.id));
          const localOnlyKids = kids.filter(k => !incomingIds.has(k.id) && !deletedIds.has(k.id));

          const mergedKids = [...filteredKids, ...localOnlyKids];

          // Notify via callback
          this.callbacks.onKidsUpdate(mergedKids, finalDeleted);
          this.callbacks.onSyncFlash();

          console.log('[SYNC] Merged:', mergedKids.length, 'kids,', finalDeleted.length, 'deleted');
          break;
        }

        case 'REQUEST_SYNC': {
          console.log('[SYNC] Sync requested, sending data');
          await this.pushEvent('KIDS_UPDATE', {
            kids: this.getState().kids,
            deletedKids: this.getState().deletedKids,
          }, event.from_device);
          break;
        }

        case 'UNPAIR': {
          if (typeof event.payload === 'string') {
            this.callbacks.onUnpair(event.payload);
          }
          break;
        }
      }

      // Acknowledge the event
      await this.authFetch('ack', {
        eventId: event.id,
        fromDeviceId: event.from_device,
      });
    } finally {
      setTimeout(() => {
        this.isProcessing = false;
      }, 50);
    }
  }

  // Poll for new events
  async poll(since: number): Promise<number> {
    const { authToken } = this.getState();
    if (!authToken) return since;

    const result = await this.authFetch(`poll&since=${since}`, {}, 'GET');

    if (!result.success) return since;

    const newTimestamp = result.timestamp || Date.now();

    // Process events
    if (result.events?.length) {
      console.log('[SYNC] Poll received', result.events.length, 'events');

      for (const event of result.events) {
        await this.processEvent(event);
      }
    }

    return newTimestamp;
  }

  // Fetch paired devices
  async fetchPairedDevices(): Promise<void> {
    const { authToken } = this.getState();
    if (!authToken) return;

    const result = await this.authFetch('get-paired-devices', {}, 'GET');

    if (result.success && result.devices) {
      const { pairedDevices } = this.getState();

      for (const device of result.devices) {
        const existing = pairedDevices.find(d => d.deviceId === device.device_id);

        if (!existing) {
          this.addPairedDevice({
            deviceId: device.device_id,
            deviceName: device.device_name,
            pairedAt: new Date(device.paired_at * 1000).toISOString(),
            isOnline: device.is_online,
          });
        } else {
          this.updateDeviceOnline(device.device_id, device.is_online);
        }
      }
    }
  }

  // Send heartbeat
  async heartbeat(): Promise<void> {
    const { authToken } = this.getState();
    if (!authToken) return;
    await this.authFetch('heartbeat', {});
  }

  // Unpair from a device
  async unpairDevice(targetDeviceId: string): Promise<void> {
    await this.authFetch('unpair', { peerDeviceId: targetDeviceId });
    this.removePairedDevice(targetDeviceId);
  }

  // Broadcast update to all paired devices (with debouncing)
  shouldBroadcast(kidsData: Kid[], deletedKidsData: DeletedKid[]): boolean {
    if (this.isProcessing) return false;

    const hash = JSON.stringify({ kids: kidsData, deleted: deletedKidsData });
    if (hash === this.lastSyncHash) return false;
    this.lastSyncHash = hash;

    return true;
  }
}
