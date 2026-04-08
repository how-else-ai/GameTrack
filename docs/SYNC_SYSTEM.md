# Game Time Tracker - Synchronization System

## Overview

The Game Time Tracker uses a **HTTP polling-based sync mechanism** to keep player data synchronized between paired devices. This document describes the system architecture and implementation details for both web and mobile platforms.

## Architecture

### Server (PHP)
- **REST API** at `https://sync.how-else.com/sync.php`
- **Event-based communication** - devices push events and poll for new events
- **Acknowledgment system** - events are acknowledged after processing

### Clients

#### Web App (Next.js)
- **useSync hook** (`src/hooks/useSync.ts`) - manages all sync operations
- **Zustand store** (`src/lib/store.ts`) - persists data locally in localStorage
- **Real-time polling** - checks for new events every 2 seconds

#### Mobile App (Expo/React Native)
- **useSync hook** (`apps/mobile/src/hooks/useSync.ts`) - uses the core SyncClient
- **Shared Zustand store** (`packages/core/src/store.ts`) - platform-agnostic store with AsyncStorage adapter
- **Real-time polling** - same 2-second interval as web

### Shared Core Package (`packages/core/`)
- **SyncClient** (`sync-client.ts`) - Platform-agnostic sync logic
- **Store Factory** (`store.ts`) - Creates Zustand stores with any storage adapter
- **Types** (`types.ts`) - Shared TypeScript definitions
- **Timer Utilities** (`timer-utils.ts`) - Time calculation functions
- **Storage Adapters** (`storage-adapter.ts`) - Web and memory adapters

## Event Types

### KIDS_UPDATE
- Sent when kids data changes
- Includes deleted kids list for proper merge
- Payload: `{ kids: Kid[], deletedKids: DeletedKid[] }`

### REQUEST_SYNC
- Asks the other device to send its data
- Used for manual sync triggers
- Payload: `{}`

### UNPAIR
- Sent when unpairing from a device
- Payload: `deviceId: string`

## Sync Rules

1. **Merge deletedKids** - keep the most recent deletion for each kid
2. **Filter out deleted kids** - remove any kids in deletedKids list
3. **Event ID tracking** - prevent echo loops using sent/processed event ID sets
4. **Debouncing** - 500ms debounce on local changes before broadcasting
5. **Acknowledgments** - events are acknowledged to prevent duplicate processing

## Connection State Management

### Web App
- Uses `authTokenRef` for immediate token access
- `isConnected` state reflects actual connection status
- Registration happens automatically on mount if deviceId exists

### Mobile App
- Uses `authTokenRef` pattern matching web app
- Syncs local `isConnected`/`isRegistered` state with persisted `authToken`
- Connection status is restored from persisted authToken on app launch

## Manual Sync Flow

1. Push REQUEST_SYNC to paired devices
2. Poll aggressively (every 500ms) for 5 seconds
3. Process incoming KIDS_UPDATE events
4. Return to normal polling interval (2 seconds)

## Pairing Flow

1. Device A generates pairing token via `generate-pairing` API
2. Device A displays QR code containing: `{ deviceId, deviceName, pairingToken, timestamp }`
3. Device B scans QR and calls `complete-pairing` with the token
4. Server pairs the devices
5. Device A automatically sends KIDS_UPDATE to Device B after 500ms delay

## Implementation Details

### State Persistence
- **Web**: localStorage via `webStorageAdapter`
- **Mobile**: AsyncStorage via `asyncStorageAdapter`
- Both use the same Zustand store factory from `@game-time-tracker/core`

### Polling Intervals
- Normal: 2000ms (2 seconds)
- Heartbeat: 10000ms (10 seconds)
- Aggressive (manual sync): 500ms

### Echo Prevention
- `sentEventIds` Set tracks events this device has sent
- `processedEventIds` Set tracks events this device has processed
- Events are skipped if found in either set

### Reconnection
- If authToken exists in persisted state, device is considered registered
- Registration is attempted on app start if no authToken exists
- Heartbeat keeps connection alive and updates online status

## Testing Recommendations

1. Test pairing between web and mobile apps
2. Verify data syncs correctly in both directions
3. Test offline mode and reconnection
4. Verify echo prevention (no duplicate events)
5. Test unpairing functionality
6. Verify sync flash visual feedback

## Common Issues & Solutions

### Issue: Mobile app stuck at "Connecting..."
**Cause**: `isConnected` state not syncing with persisted `authToken`
**Solution**: Ensure `useSync` hook syncs local state when `authToken` changes from persistence

### Issue: Duplicate events after sync
**Cause**: Echo not being properly prevented
**Solution**: Check that `sentEventIds` is properly initialized and bounded

### Issue: Changes not broadcasting
**Cause**: `shouldBroadcast` returning false or debounce not working
**Solution**: Verify `shouldBroadcast` hash comparison and debounce timeout cleanup

## API Endpoints

All endpoints accept `action` parameter and require authentication via `X-Device-Id` and `X-Auth-Token` headers.

- `POST ?action=register` - Register new device
- `POST ?action=generate-pairing` - Generate pairing token
- `POST ?action=complete-pairing` - Complete pairing with token
- `POST ?action=push` - Push event to paired devices
- `GET ?action=poll&since={timestamp}` - Poll for new events
- `POST ?action=ack` - Acknowledge event processing
- `GET ?action=get-paired-devices` - List paired devices
- `POST ?action=heartbeat` - Update online status
- `POST ?action=unpair` - Unpair from device
