"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ALL_AVATARS: () => ALL_AVATARS,
  AVATAR_CATEGORIES: () => AVATAR_CATEGORIES,
  AVATAR_NAMES: () => AVATAR_NAMES,
  SYNC_CONSTANTS: () => SYNC_CONSTANTS,
  SYNC_SERVER_URL: () => SYNC_SERVER_URL,
  SyncClient: () => SyncClient,
  calculateEndTime: () => calculateEndTime,
  calculateRemainingTime: () => calculateRemainingTime,
  calculateResumeDuration: () => calculateResumeDuration,
  createAppStore: () => createAppStore,
  formatTimeDisplay: () => formatTimeDisplay,
  generateDeviceId: () => generateDeviceId,
  generateEventId: () => generateEventId,
  generateKidId: () => generateKidId,
  generateTicketId: () => generateTicketId,
  getAvatarCategory: () => getAvatarCategory,
  getAvatarName: () => getAvatarName,
  getRandomAvatar: () => getRandomAvatar,
  isWarningState: () => isWarningState,
  memoryStorageAdapter: () => memoryStorageAdapter,
  webStorageAdapter: () => webStorageAdapter
});
module.exports = __toCommonJS(index_exports);

// src/device.ts
function generateDeviceId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `device-${timestamp}-${randomPart}`;
}
function generateKidId() {
  return `kid-${Date.now()}`;
}
function generateTicketId(index) {
  return `ticket-${Date.now()}-${index}`;
}
function generateEventId() {
  return `event-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// src/sync-config.ts
var SYNC_SERVER_URL = "https://sync.how-else.com/sync.php";
var SYNC_CONSTANTS = {
  // Polling interval in milliseconds
  POLL_INTERVAL: 2e3,
  // Heartbeat interval in milliseconds
  HEARTBEAT_INTERVAL: 1e4,
  // Debounce delay for broadcasting updates
  BROADCAST_DEBOUNCE: 500,
  // Aggressive polling duration for manual sync
  AGGRESSIVE_POLL_DURATION: 5e3,
  // QR code expiry time in milliseconds
  QR_EXPIRY: 5 * 60 * 1e3,
  // Max sent event IDs to track (for echo prevention)
  MAX_SENT_EVENTS: 100,
  // Max processed event IDs to track
  MAX_PROCESSED_EVENTS: 200
};

// src/storage-adapter.ts
var webStorageAdapter = {
  getItem: async (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
    }
  },
  removeItem: async (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
    }
  }
};
var memoryStorageAdapter = /* @__PURE__ */ (() => {
  const storage = /* @__PURE__ */ new Map();
  return {
    getItem: async (key) => {
      return storage.get(key) ?? null;
    },
    setItem: async (key, value) => {
      storage.set(key, value);
    },
    removeItem: async (key) => {
      storage.delete(key);
    }
  };
})();

// src/store.ts
var import_zustand = require("zustand");
var import_middleware = require("zustand/middleware");
var createTickets = (limit, date) => {
  return Array.from({ length: limit }, (_, i) => ({
    id: generateTicketId(i),
    status: "available",
    lastResetDate: date
  }));
};
var migrateSession = (session) => {
  if (!session) return null;
  if (typeof session.totalPausedDuration === "undefined") {
    return {
      ...session,
      totalPausedDuration: 0
    };
  }
  return session;
};
var migrateKids = (kids) => {
  return kids.map((kid) => ({
    ...kid,
    activeSession: migrateSession(kid.activeSession)
  }));
};
function createAppStore(storageAdapter) {
  const persistOptions = {
    name: "game-time-tracker",
    storage: {
      getItem: async (name) => {
        const value = await storageAdapter.getItem(name);
        return value ? JSON.parse(value) : null;
      },
      setItem: async (name, value) => {
        await storageAdapter.setItem(name, JSON.stringify(value));
      },
      removeItem: async (name) => {
        await storageAdapter.removeItem(name);
      }
    },
    migrate: (persistedState) => {
      const state = persistedState;
      if (state.kids) {
        state.kids = migrateKids(state.kids);
      }
      if (!state.deletedKids) {
        state.deletedKids = [];
      }
      if (typeof state.lastSyncFlash === "undefined") {
        state.lastSyncFlash = 0;
      }
      return state;
    }
  };
  return (0, import_zustand.create)()(
    (0, import_middleware.persist)(
      (set, get) => ({
        deviceId: "",
        deviceName: "",
        authToken: "",
        kids: [],
        pairedDevices: [],
        deletedKids: [],
        syncVersion: 0,
        lastSyncFlash: 0,
        initializeDevice: () => {
          const state = get();
          if (!state.deviceId) {
            set({
              deviceId: generateDeviceId(),
              deviceName: `Device-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
            });
          }
        },
        setDeviceName: (name) => set({ deviceName: name }),
        setAuthToken: (token) => set({ authToken: token }),
        addKid: (data) => {
          const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          const newKid = {
            id: generateKidId(),
            ...data,
            tickets: createTickets(data.ticketLimit, today),
            activeSession: null
          };
          set((state) => ({
            kids: [...state.kids, newKid],
            syncVersion: state.syncVersion + 1
          }));
        },
        updateKid: (id, data) => set((state) => ({
          kids: state.kids.map(
            (kid) => kid.id === id ? { ...kid, ...data } : kid
          ),
          syncVersion: state.syncVersion + 1
        })),
        deleteKid: (id) => {
          const state = get();
          const deletedEntry = {
            id,
            deletedAt: Date.now(),
            deletedBy: state.deviceId
          };
          set((state2) => ({
            kids: state2.kids.filter((kid) => kid.id !== id),
            deletedKids: [...state2.deletedKids.filter((d) => d.id !== id), deletedEntry],
            syncVersion: state2.syncVersion + 1
          }));
        },
        resetTickets: (kidId) => {
          const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          set((state) => ({
            kids: state.kids.map(
              (kid) => kid.id === kidId ? {
                ...kid,
                tickets: createTickets(kid.ticketLimit, today),
                activeSession: null
              } : kid
            ),
            syncVersion: state.syncVersion + 1
          }));
        },
        markTicketUsed: (ticketId, kidId) => set((state) => ({
          kids: state.kids.map(
            (kid) => kid.id === kidId ? {
              ...kid,
              tickets: kid.tickets.map(
                (t) => t.id === ticketId ? { ...t, status: "used" } : t
              )
            } : kid
          ),
          syncVersion: state.syncVersion + 1
        })),
        startSession: (kidId, ticketId) => {
          const now = (/* @__PURE__ */ new Date()).toISOString();
          set((state) => {
            const kid = state.kids.find((k) => k.id === kidId);
            if (!kid) return state;
            const session = {
              ticketId,
              startTime: now,
              isPaused: false,
              totalPausedDuration: 0
            };
            return {
              kids: state.kids.map(
                (k) => k.id === kidId ? {
                  ...k,
                  activeSession: session,
                  tickets: k.tickets.map(
                    (t) => t.id === ticketId ? { ...t, status: "in-use" } : t
                  )
                } : k
              ),
              syncVersion: state.syncVersion + 1
            };
          });
        },
        pauseSession: (kidId) => set((state) => {
          const kid = state.kids.find((k) => k.id === kidId);
          if (!kid?.activeSession || kid.activeSession.isPaused) return state;
          return {
            kids: state.kids.map(
              (k) => k.id === kidId && k.activeSession ? {
                ...k,
                activeSession: {
                  ...k.activeSession,
                  isPaused: true,
                  pausedAt: (/* @__PURE__ */ new Date()).toISOString()
                }
              } : k
            ),
            syncVersion: state.syncVersion + 1
          };
        }),
        resumeSession: (kidId) => set((state) => {
          const kid = state.kids.find((k) => k.id === kidId);
          if (!kid?.activeSession || !kid.activeSession.isPaused) return state;
          const pausedAt = kid.activeSession.pausedAt ? new Date(kid.activeSession.pausedAt).getTime() : Date.now();
          const pausedDuration = Date.now() - pausedAt;
          const totalPausedDuration = (kid.activeSession.totalPausedDuration || 0) + pausedDuration;
          return {
            kids: state.kids.map(
              (k) => k.id === kidId && k.activeSession ? {
                ...k,
                activeSession: {
                  ...k.activeSession,
                  isPaused: false,
                  pausedAt: void 0,
                  totalPausedDuration
                }
              } : k
            ),
            syncVersion: state.syncVersion + 1
          };
        }),
        endSession: (kidId) => set((state) => {
          const kid = state.kids.find((k) => k.id === kidId);
          if (!kid || !kid.activeSession) return state;
          return {
            kids: state.kids.map(
              (k) => k.id === kidId ? {
                ...k,
                activeSession: null,
                tickets: k.tickets.map(
                  (t) => t.id === kid.activeSession.ticketId ? { ...t, status: "used" } : t
                )
              } : k
            ),
            syncVersion: state.syncVersion + 1
          };
        }),
        addPairedDevice: (device) => set((state) => ({
          pairedDevices: [...state.pairedDevices.filter((d) => d.deviceId !== device.deviceId), device]
        })),
        removePairedDevice: (deviceId) => set((state) => ({
          pairedDevices: state.pairedDevices.filter((d) => d.deviceId !== deviceId)
        })),
        updateDeviceOnline: (deviceId, isOnline) => set((state) => ({
          pairedDevices: state.pairedDevices.map(
            (d) => d.deviceId === deviceId ? { ...d, isOnline, lastSeen: (/* @__PURE__ */ new Date()).toISOString() } : d
          )
        })),
        importData: (incomingKids) => set((state) => {
          const deletedIds = new Set(state.deletedKids.map((d) => d.id));
          const filteredIncoming = incomingKids.filter((k) => !deletedIds.has(k.id));
          const incomingIds = new Set(incomingKids.map((k) => k.id));
          const localOnlyKids = state.kids.filter((k) => !incomingIds.has(k.id));
          const mergedKids = [...filteredIncoming];
          for (const localKid of localOnlyKids) {
            const incomingKid = incomingKids.find((k) => k.id === localKid.id);
            if (!incomingKid) {
              mergedKids.push(localKid);
            }
          }
          return {
            kids: migrateKids(mergedKids),
            syncVersion: state.syncVersion + 1
          };
        }),
        mergeKidsData: (mergedKids) => set((state) => ({
          kids: migrateKids(mergedKids),
          syncVersion: state.syncVersion + 1
        })),
        setDeletedKids: (newDeletedKids) => set((state) => ({
          deletedKids: newDeletedKids,
          syncVersion: state.syncVersion + 1
        })),
        triggerSyncFlash: () => set({ lastSyncFlash: Date.now() }),
        getDeletedKidIds: () => get().deletedKids.map((d) => d.id),
        clearDeletedKid: (id) => set((state) => ({
          deletedKids: state.deletedKids.filter((d) => d.id !== id)
        }))
      }),
      persistOptions
    )
  );
}

// src/timer-utils.ts
function calculateRemainingTime(startTime, durationMinutes, isPaused, pausedAt, totalPausedDuration = 0) {
  const start = new Date(startTime).getTime();
  const duration = durationMinutes * 60 * 1e3;
  const now = Date.now();
  let elapsed;
  if (isPaused && pausedAt) {
    const pauseTime = new Date(pausedAt).getTime();
    elapsed = pauseTime - start - totalPausedDuration;
  } else {
    elapsed = now - start - totalPausedDuration;
  }
  const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1e3));
  return remaining;
}
function isWarningState(remainingSeconds) {
  return remainingSeconds > 0 && remainingSeconds <= 60;
}
function formatTimeDisplay(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
function calculateEndTime(startTime, durationMinutes, totalPausedDuration = 0) {
  const start = new Date(startTime).getTime();
  const duration = durationMinutes * 60 * 1e3;
  return start + duration + totalPausedDuration;
}
function calculateResumeDuration(pausedAt, totalPausedDuration) {
  const pausedTime = new Date(pausedAt).getTime();
  const pausedDuration = Date.now() - pausedTime;
  return totalPausedDuration + pausedDuration;
}

// src/sync-client.ts
var SyncClient = class {
  constructor(httpClient, callbacks, stateHandlers) {
    // Tracking sets for loop prevention
    this.sentEventIds = /* @__PURE__ */ new Set();
    this.processedEventIds = /* @__PURE__ */ new Set();
    this.isProcessing = false;
    this.lastSyncHash = "";
    this.httpClient = httpClient;
    this.callbacks = callbacks;
    this.getState = stateHandlers.getState;
    this.setAuthToken = stateHandlers.setAuthToken;
    this.addPairedDevice = stateHandlers.addPairedDevice;
    this.removePairedDevice = stateHandlers.removePairedDevice;
    this.updateDeviceOnline = stateHandlers.updateDeviceOnline;
  }
  // Private HTTP helper
  async authFetch(action, data = {}, method = "POST") {
    const { deviceId, authToken } = this.getState();
    const headers = {
      "Content-Type": "application/json"
    };
    if (authToken) {
      headers["X-Device-Id"] = deviceId || "";
      headers["X-Auth-Token"] = authToken;
    }
    try {
      const response = await this.httpClient.fetch(
        `${SYNC_SERVER_URL}?action=${action}`,
        {
          method,
          headers,
          body: Object.keys(data).length > 0 ? JSON.stringify(data) : void 0
        }
      );
      return await response.json();
    } catch (error) {
      console.error("[SYNC] Network error:", error);
      return { success: false, error: "Network error" };
    }
  }
  // Register device with sync server
  async register() {
    const { deviceId, authToken } = this.getState();
    if (authToken) return true;
    if (!deviceId) return false;
    try {
      console.log("[SYNC] Registering device:", deviceId.substring(0, 8));
      const result = await this.authFetch("register", { deviceId });
      if (result.success && result.token) {
        this.setAuthToken(result.token);
        console.log("[SYNC] Registered successfully");
        return true;
      }
      console.error("[SYNC] Registration failed:", result.error);
      return false;
    } catch (error) {
      console.error("[SYNC] Registration error:", error);
      return false;
    }
  }
  // Generate pairing token for QR code
  async generatePairingToken() {
    const { authToken, deviceName } = this.getState();
    if (!authToken) return null;
    const result = await this.authFetch("generate-pairing", {
      deviceName
    });
    return result.success ? result.pairingToken || null : null;
  }
  // Complete pairing with token from another device
  async completePairing(pairingToken) {
    const { authToken, deviceName } = this.getState();
    if (!authToken) {
      return { success: false, error: "Not connected" };
    }
    const result = await this.authFetch("complete-pairing", {
      pairingToken,
      deviceName
    });
    if (result.success && result.peerDeviceId && result.peerDeviceName) {
      this.addPairedDevice({
        deviceId: result.peerDeviceId,
        deviceName: result.peerDeviceName,
        pairedAt: (/* @__PURE__ */ new Date()).toISOString(),
        isOnline: true
      });
      console.log("[SYNC] Paired with:", result.peerDeviceName);
      setTimeout(() => {
        this.pushEvent("KIDS_UPDATE", {
          kids: this.getState().kids,
          deletedKids: this.getState().deletedKids
        }, result.peerDeviceId);
      }, 500);
      return { success: true, peerDeviceId: result.peerDeviceId, peerDeviceName: result.peerDeviceName };
    }
    return { success: false, error: result.error || "Pairing failed" };
  }
  // Push event to paired devices
  async pushEvent(action, payload, targetDeviceId) {
    const { authToken, pairedDevices } = this.getState();
    if (!authToken) {
      console.error("[SYNC] Cannot push - not registered");
      return false;
    }
    if (pairedDevices.length === 0) {
      console.log("[SYNC] No paired devices");
      return false;
    }
    const eventId = generateEventId();
    this.sentEventIds.add(eventId);
    if (this.sentEventIds.size > SYNC_CONSTANTS.MAX_SENT_EVENTS) {
      const arr = Array.from(this.sentEventIds);
      this.sentEventIds = new Set(arr.slice(-SYNC_CONSTANTS.MAX_SENT_EVENTS / 2));
    }
    const result = await this.authFetch("push", {
      eventId,
      action,
      payload,
      targetDeviceId
    });
    console.log("[SYNC] Pushed:", action, "\u2192", result.deliveredTo || []);
    if (result.success) {
      this.callbacks.onSyncFlash();
    }
    return result.success;
  }
  // Process incoming event
  async processEvent(event) {
    const { deviceId } = this.getState();
    if (event.from_device === deviceId) return;
    if (this.processedEventIds.has(event.id)) return;
    if (this.sentEventIds.has(event.id)) {
      console.log("[SYNC] Skipping echo:", event.id);
      return;
    }
    if (this.isProcessing) {
      console.log("[SYNC] Busy, queuing event:", event.action);
      return;
    }
    this.isProcessing = true;
    this.processedEventIds.add(event.id);
    if (this.processedEventIds.size > SYNC_CONSTANTS.MAX_PROCESSED_EVENTS) {
      const arr = Array.from(this.processedEventIds);
      this.processedEventIds = new Set(arr.slice(-SYNC_CONSTANTS.MAX_PROCESSED_EVENTS / 2));
    }
    console.log("[SYNC] Processing:", event.action, "from", event.from_device.substring(0, 8));
    try {
      switch (event.action) {
        case "KIDS_UPDATE": {
          const payload = event.payload;
          if (!Array.isArray(payload.kids)) break;
          const incomingKids = payload.kids;
          const incomingDeleted = payload.deletedKids || [];
          console.log("[SYNC] Received", incomingKids.length, "kids,", incomingDeleted.length, "deleted");
          const { deletedKids } = this.getState();
          const mergedDeleted = /* @__PURE__ */ new Map();
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
          const deletedIds = new Set(finalDeleted.map((d) => d.id));
          const filteredKids = incomingKids.filter((k) => !deletedIds.has(k.id));
          const { kids } = this.getState();
          const incomingIds = new Set(filteredKids.map((k) => k.id));
          const localOnlyKids = kids.filter((k) => !incomingIds.has(k.id) && !deletedIds.has(k.id));
          const mergedKids = [...filteredKids, ...localOnlyKids];
          this.callbacks.onKidsUpdate(mergedKids, finalDeleted);
          this.callbacks.onSyncFlash();
          console.log("[SYNC] Merged:", mergedKids.length, "kids,", finalDeleted.length, "deleted");
          break;
        }
        case "REQUEST_SYNC": {
          console.log("[SYNC] Sync requested, sending data");
          await this.pushEvent("KIDS_UPDATE", {
            kids: this.getState().kids,
            deletedKids: this.getState().deletedKids
          }, event.from_device);
          break;
        }
        case "UNPAIR": {
          if (typeof event.payload === "string") {
            this.callbacks.onUnpair(event.payload);
          }
          break;
        }
      }
      await this.authFetch("ack", {
        eventId: event.id,
        fromDeviceId: event.from_device
      });
    } finally {
      setTimeout(() => {
        this.isProcessing = false;
      }, 50);
    }
  }
  // Poll for new events
  async poll(since) {
    const { authToken } = this.getState();
    if (!authToken) return since;
    const result = await this.authFetch(`poll&since=${since}`, {}, "GET");
    if (!result.success) return since;
    const newTimestamp = result.timestamp || Date.now();
    if (result.events?.length) {
      console.log("[SYNC] Poll received", result.events.length, "events");
      for (const event of result.events) {
        await this.processEvent(event);
      }
    }
    return newTimestamp;
  }
  // Fetch paired devices
  async fetchPairedDevices() {
    const { authToken } = this.getState();
    if (!authToken) return;
    const result = await this.authFetch("get-paired-devices", {}, "GET");
    if (result.success && result.devices) {
      const { pairedDevices } = this.getState();
      for (const device of result.devices) {
        const existing = pairedDevices.find((d) => d.deviceId === device.device_id);
        if (!existing) {
          this.addPairedDevice({
            deviceId: device.device_id,
            deviceName: device.device_name,
            pairedAt: new Date(device.paired_at * 1e3).toISOString(),
            isOnline: device.is_online
          });
        } else {
          this.updateDeviceOnline(device.device_id, device.is_online);
        }
      }
    }
  }
  // Send heartbeat
  async heartbeat() {
    const { authToken } = this.getState();
    if (!authToken) return;
    await this.authFetch("heartbeat", {});
  }
  // Unpair from a device
  async unpairDevice(targetDeviceId) {
    await this.authFetch("unpair", { peerDeviceId: targetDeviceId });
    this.removePairedDevice(targetDeviceId);
  }
  // Broadcast update to all paired devices (with debouncing)
  shouldBroadcast(kidsData, deletedKidsData) {
    if (this.isProcessing) return false;
    const hash = JSON.stringify({ kids: kidsData, deleted: deletedKidsData });
    if (hash === this.lastSyncHash) return false;
    this.lastSyncHash = hash;
    return true;
  }
};

// src/avatar.ts
var AVATAR_CATEGORIES = {
  aliens: ["alien-1", "alien-2", "alien-3", "alien-4", "alien-5"],
  kids: ["kid-1", "kid-2", "kid-3", "kid-4", "kid-5"],
  adults: ["adult-1", "adult-2", "adult-3", "adult-4", "adult-5"],
  animals: ["animal-1", "animal-2", "animal-3", "animal-4", "animal-5"]
};
var ALL_AVATARS = [
  ...AVATAR_CATEGORIES.aliens,
  ...AVATAR_CATEGORIES.kids,
  ...AVATAR_CATEGORIES.adults,
  ...AVATAR_CATEGORIES.animals
];
var AVATAR_NAMES = {
  // Aliens
  "alien-1": "Zorg",
  "alien-2": "Blip",
  "alien-3": "Gloop",
  "alien-4": "Nova",
  "alien-5": "Zyx",
  // Kids
  "kid-1": "Spike",
  "kid-2": "Pip",
  "kid-3": "Ace",
  "kid-4": "Sunny",
  "kid-5": "Dot",
  // Adults
  "adult-1": "Dash",
  "adult-2": "Spark",
  "adult-3": "Beard",
  "adult-4": "Blaze",
  "adult-5": "Tank",
  // Animals
  "animal-1": "Whiskers",
  "animal-2": "Rover",
  "animal-3": "Hop",
  "animal-4": "Hoot",
  "animal-5": "Ember"
};
function getAvatarName(avatarId) {
  return AVATAR_NAMES[avatarId] || "Unknown";
}
function getRandomAvatar() {
  return ALL_AVATARS[Math.floor(Math.random() * ALL_AVATARS.length)];
}
function getAvatarCategory(avatarId) {
  for (const [category, avatars] of Object.entries(AVATAR_CATEGORIES)) {
    if (avatars.includes(avatarId)) {
      return category;
    }
  }
  return null;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ALL_AVATARS,
  AVATAR_CATEGORIES,
  AVATAR_NAMES,
  SYNC_CONSTANTS,
  SYNC_SERVER_URL,
  SyncClient,
  calculateEndTime,
  calculateRemainingTime,
  calculateResumeDuration,
  createAppStore,
  formatTimeDisplay,
  generateDeviceId,
  generateEventId,
  generateKidId,
  generateTicketId,
  getAvatarCategory,
  getAvatarName,
  getRandomAvatar,
  isWarningState,
  memoryStorageAdapter,
  webStorageAdapter
});
