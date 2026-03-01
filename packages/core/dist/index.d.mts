import * as zustand from 'zustand';
import { StoreApi } from 'zustand';
import { PersistOptions } from 'zustand/middleware';

interface Ticket {
    id: string;
    status: 'available' | 'in-use' | 'used';
    lastResetDate: string;
}
interface Session {
    ticketId: string;
    startTime: string;
    isPaused: boolean;
    pausedAt?: string;
    totalPausedDuration: number;
}
interface DeletedKid {
    id: string;
    deletedAt: number;
    deletedBy: string;
}
interface Kid {
    id: string;
    name: string;
    avatarEmoji: string;
    ticketLimit: number;
    ticketDuration: number;
    tickets: Ticket[];
    activeSession: Session | null;
}
interface PairedDevice {
    deviceId: string;
    deviceName: string;
    pairedAt: string;
    isOnline: boolean;
    lastSeen?: string;
}
interface SyncEvent {
    id: string;
    action: string;
    payload: unknown;
    from_device: string;
    timestamp: number;
    acknowledged_by?: string[];
}
interface StorageAdapter {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
}
interface SyncEventPayload {
    kids?: Kid[];
    deletedKids?: DeletedKid[];
}
type SyncAction = 'KIDS_UPDATE' | 'REQUEST_SYNC' | 'UNPAIR';
interface TimerState {
    remainingSeconds: number;
    isPaused: boolean;
    isWarning: boolean;
}
type TimerCallback = (kidId: string, remainingSeconds: number, isPaused: boolean) => void;
type ExpiredCallback = (kidId: string) => void;

declare function generateDeviceId(): string;
declare function generateKidId(): string;
declare function generateTicketId(index: number): string;
declare function generateEventId(): string;

declare const SYNC_SERVER_URL = "https://sync.how-else.com/sync.php";
declare const SYNC_CONSTANTS: {
    readonly POLL_INTERVAL: 2000;
    readonly HEARTBEAT_INTERVAL: 10000;
    readonly BROADCAST_DEBOUNCE: 500;
    readonly AGGRESSIVE_POLL_DURATION: 5000;
    readonly QR_EXPIRY: number;
    readonly MAX_SENT_EVENTS: 100;
    readonly MAX_PROCESSED_EVENTS: 200;
};

declare const webStorageAdapter: StorageAdapter;
declare const memoryStorageAdapter: StorageAdapter;

interface AppState {
    deviceId: string;
    deviceName: string;
    authToken: string;
    kids: Kid[];
    pairedDevices: PairedDevice[];
    deletedKids: DeletedKid[];
    syncVersion: number;
    lastSyncFlash: number;
    initializeDevice: () => void;
    setDeviceName: (name: string) => void;
    setAuthToken: (token: string) => void;
    addKid: (data: {
        name: string;
        avatarEmoji: string;
        ticketLimit: number;
        ticketDuration: number;
    }) => void;
    updateKid: (id: string, data: Partial<Kid>) => void;
    deleteKid: (id: string) => void;
    resetTickets: (kidId: string) => void;
    markTicketUsed: (ticketId: string, kidId: string) => void;
    startSession: (kidId: string, ticketId: string) => void;
    pauseSession: (kidId: string) => void;
    resumeSession: (kidId: string) => void;
    endSession: (kidId: string) => void;
    addPairedDevice: (device: PairedDevice) => void;
    removePairedDevice: (deviceId: string) => void;
    updateDeviceOnline: (deviceId: string, isOnline: boolean) => void;
    importData: (kids: Kid[]) => void;
    mergeKidsData: (kids: Kid[]) => void;
    setDeletedKids: (deletedKids: DeletedKid[]) => void;
    triggerSyncFlash: () => void;
    getDeletedKidIds: () => string[];
    clearDeletedKid: (id: string) => void;
}
declare function createAppStore(storageAdapter: StorageAdapter): zustand.UseBoundStore<Omit<StoreApi<AppState>, "setState" | "persist"> & {
    setState(partial: AppState | Partial<AppState> | ((state: AppState) => AppState | Partial<AppState>), replace?: false | undefined): unknown;
    setState(state: AppState | ((state: AppState) => AppState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<PersistOptions<AppState, AppState, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: AppState) => void) => () => void;
        onFinishHydration: (fn: (state: AppState) => void) => () => void;
        getOptions: () => Partial<PersistOptions<AppState, AppState, unknown>>;
    };
}>;
type AppStore = StoreApi<AppState>;

/**
 * Calculate remaining time for a session in seconds
 */
declare function calculateRemainingTime(startTime: string, durationMinutes: number, isPaused: boolean, pausedAt?: string, totalPausedDuration?: number): number;
/**
 * Check if timer is in warning state (less than 60 seconds remaining)
 */
declare function isWarningState(remainingSeconds: number): boolean;
/**
 * Format seconds into MM:SS display
 */
declare function formatTimeDisplay(totalSeconds: number): string;
/**
 * Calculate the end time timestamp for a session
 */
declare function calculateEndTime(startTime: string, durationMinutes: number, totalPausedDuration?: number): number;
/**
 * Calculate remaining duration when resuming a paused session
 */
declare function calculateResumeDuration(pausedAt: string, totalPausedDuration: number): number;

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
interface HttpClient {
    fetch: (url: string, options: {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
    }) => Promise<{
        json: () => Promise<unknown>;
    }>;
}
interface SyncCallbacks {
    onKidsUpdate: (kids: Kid[], deletedKids: DeletedKid[]) => void;
    onSyncRequest: (fromDevice: string) => void;
    onUnpair: (deviceId: string) => void;
    onError: (error: string) => void;
    onSyncFlash: () => void;
}
interface SyncState {
    deviceId: string;
    deviceName: string;
    authToken: string | null;
    kids: Kid[];
    deletedKids: DeletedKid[];
    pairedDevices: PairedDevice[];
}
declare class SyncClient {
    private httpClient;
    private callbacks;
    private getState;
    private setAuthToken;
    private addPairedDevice;
    private removePairedDevice;
    private updateDeviceOnline;
    private sentEventIds;
    private processedEventIds;
    private isProcessing;
    private lastSyncHash;
    constructor(httpClient: HttpClient, callbacks: SyncCallbacks, stateHandlers: {
        getState: () => SyncState;
        setAuthToken: (token: string) => void;
        addPairedDevice: (device: PairedDevice) => void;
        removePairedDevice: (deviceId: string) => void;
        updateDeviceOnline: (deviceId: string, isOnline: boolean) => void;
    });
    private authFetch;
    register(): Promise<boolean>;
    generatePairingToken(): Promise<string | null>;
    completePairing(pairingToken: string): Promise<{
        success: boolean;
        error?: string;
        peerDeviceId?: string;
        peerDeviceName?: string;
    }>;
    pushEvent(action: string, payload: SyncEventPayload, targetDeviceId?: string): Promise<boolean>;
    processEvent(event: SyncEvent): Promise<void>;
    poll(since: number): Promise<number>;
    fetchPairedDevices(): Promise<void>;
    heartbeat(): Promise<void>;
    unpairDevice(targetDeviceId: string): Promise<void>;
    shouldBroadcast(kidsData: Kid[], deletedKidsData: DeletedKid[]): boolean;
}

declare const AVATAR_CATEGORIES: {
    readonly aliens: readonly ["alien-1", "alien-2", "alien-3", "alien-4", "alien-5"];
    readonly kids: readonly ["kid-1", "kid-2", "kid-3", "kid-4", "kid-5"];
    readonly adults: readonly ["adult-1", "adult-2", "adult-3", "adult-4", "adult-5"];
    readonly animals: readonly ["animal-1", "animal-2", "animal-3", "animal-4", "animal-5"];
};
declare const ALL_AVATARS: ("alien-1" | "alien-2" | "alien-3" | "alien-4" | "alien-5" | "kid-1" | "kid-2" | "kid-3" | "kid-4" | "kid-5" | "adult-1" | "adult-2" | "adult-3" | "adult-4" | "adult-5" | "animal-1" | "animal-2" | "animal-3" | "animal-4" | "animal-5")[];
declare const AVATAR_NAMES: Record<string, string>;
declare function getAvatarName(avatarId: string): string;
declare function getRandomAvatar(): string;
declare function getAvatarCategory(avatarId: string): string | null;

export { ALL_AVATARS, AVATAR_CATEGORIES, AVATAR_NAMES, type AppState, type AppStore, type DeletedKid, type ExpiredCallback, type HttpClient, type Kid, type PairedDevice, SYNC_CONSTANTS, SYNC_SERVER_URL, type Session, type StorageAdapter, type SyncAction, type SyncCallbacks, SyncClient, type SyncEvent, type SyncEventPayload, type SyncResponse, type SyncState, type Ticket, type TimerCallback, type TimerState, calculateEndTime, calculateRemainingTime, calculateResumeDuration, createAppStore, formatTimeDisplay, generateDeviceId, generateEventId, generateKidId, generateTicketId, getAvatarCategory, getAvatarName, getRandomAvatar, isWarningState, memoryStorageAdapter, webStorageAdapter };
