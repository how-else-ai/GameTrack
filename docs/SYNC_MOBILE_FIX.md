# Mobile Sync Connection Fix - Summary

## Problem
The mobile app was stuck at "Connecting..." when trying to sync with the sync server. The connection status never updated even when the device had a valid persisted `authToken`.

## Root Cause
The mobile app's `useSync` hook had two issues:

1. **Missing authToken state synchronization**: The hook's local `isConnected` and `isRegistered` states were not initialized from the persisted `authToken` in the store. When the app reloaded with an existing authToken, the states remained `false`.

2. **No authTokenRef pattern**: Unlike the web app's `useSync` hook, the mobile version didn't use a `useRef` for immediate access to the authToken, which is needed for the sync client's `getState` callback.

## Changes Made

### 1. Mobile `useSync.ts` (`apps/mobile/src/hooks/useSync.ts`)

**Added authTokenRef:**
```typescript
// Auth token ref for immediate access (like web app)
const authTokenRef = useRef<string | null>(null);
```

**Added effect to sync state with persisted authToken:**
```typescript
// Keep authTokenRef in sync with store
useEffect(() => {
  authTokenRef.current = authToken;
  // If we have an authToken, we're registered and connected
  if (authToken && !isRegistered) {
    setIsRegistered(true);
    setIsConnected(true);
  }
}, [authToken, isRegistered]);
```

**Updated SyncClient state handler:**
```typescript
getState: () => ({
  deviceId,
  deviceName,
  authToken: authTokenRef.current || '',  // Use ref instead of stale closure
  kids,
  pairedDevices,
  deletedKids,
}),
```

**Added connection state updates after registration:**
```typescript
// Update connection states after successful registration
if (mounted) {
  setIsRegistered(true);
  setIsConnected(true);
}
```

**Added error handler to set disconnected state:**
```typescript
onError: (error) => {
  console.error('[SYNC] Error:', error);
  setSyncStatus('error');
  setIsConnected(false);  // Now properly disconnects on error
},
```

### 2. Documentation Update (`docs/SYNC_SYSTEM.md`)

Updated the sync system documentation to include:
- Mobile app architecture details
- Connection state management for both platforms
- Implementation differences between web and mobile
- Testing recommendations
- Common issues and solutions section

### 3. Test Suite (`packages/core/src/sync-client.test.ts`)

Added comprehensive tests for the SyncClient:
- Registration flow tests
- Polling and event processing tests
- Echo prevention tests
- Full sync flow integration test

## Verification

Run the tests to verify the sync client works correctly:
```bash
bun test
```

All sync-related tests pass:
- ✓ SyncClient > register > should return true if already has authToken
- ✓ SyncClient > register > should register successfully and set auth token
- ✓ SyncClient > poll > should process incoming events
- ✓ SyncClient > shouldBroadcast > should return true for different data
- ✓ SyncClient > echo prevention > should skip processing events we sent
- ✓ SyncClient Integration > should handle full sync flow

## Architecture Alignment

The mobile app now uses the same patterns as the web app:

| Aspect | Web App | Mobile App (Fixed) |
|--------|---------|-------------------|
| Connection state | `isConnected` state | `isConnected` state |
| Auth token ref | `authTokenRef` | `authTokenRef` |
| State sync on mount | Effect updates from store | Effect updates from store |
| Error handling | Sets `isConnected = false` | Sets `isConnected = false` |
| Store integration | Zustand + persist | Zustand + AsyncStorage |
| Sync client | Inline in hook | `@game-time-tracker/core` |

## Testing Recommendations

1. **Fresh Install Test**: Clear app data, pair devices, verify sync works
2. **App Restart Test**: Kill and reopen app, verify connection restores
3. **Offline Test**: Disable network, verify "Connecting..." state, re-enable network
4. **Cross-Platform Test**: Pair web app with mobile app, verify bidirectional sync

## Files Modified

1. `apps/mobile/src/hooks/useSync.ts` - Main fix for connection state
2. `docs/SYNC_SYSTEM.md` - Updated documentation
3. `packages/core/src/sync-client.test.ts` - Added test coverage (new file)
