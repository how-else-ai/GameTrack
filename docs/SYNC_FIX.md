# Sync System Fix - Mobile App Connection Issue

## Problem

The mobile app was stuck at "Connecting..." and unable to connect to the sync server. The root cause was a **stale closure bug** in the mobile's `useSync` hook.

## Root Cause

In `/apps/mobile/src/hooks/useSync.ts`, the `SyncClient` was initialized with a `getState` callback that captured initial state values (especially `deviceId`) when the effect ran. Since React hooks create closures, the `getState` function always returned the **initial empty values**, even after `initializeDevice()` had set the actual `deviceId`.

### The Bug (Before)

```typescript
useEffect(() => {
  syncClientRef.current = new SyncClient(
    nativeHttpClient,
    { /* callbacks */ },
    {
      getState: () => ({
        deviceId,        // Captured empty string initially
        deviceName,      // Captured empty string initially
        authToken,       // Captured empty string initially
        // ... rest of state
      }),
      // ... other handlers
    }
  );
}, []); // Empty deps - only runs once with initial values
```

When `deviceId` was initialized later via `initializeDevice()`, the `getState` callback still returned the old empty value, causing `register()` to fail immediately.

## Solution

The fix uses **refs** to always access the current state values, matching the pattern used in the web app's `useSync.ts`:

### The Fix (After)

```typescript
// Refs for immediate state access (prevents stale closures)
const deviceIdRef = useRef(deviceId);
const deviceNameRef = useRef(deviceName);
const authTokenRef = useRef(authToken);
// ... other refs

// Keep refs updated with current state
useEffect(() => {
  deviceIdRef.current = deviceId;
  deviceNameRef.current = deviceName;
  authTokenRef.current = authToken;
  // ... update other refs
}, [deviceId, deviceName, authToken, /* ... */]);

// Initialize sync client with refs that always have current values
useEffect(() => {
  syncClientRef.current = new SyncClient(
    nativeHttpClient,
    { /* callbacks */ },
    {
      getState: () => ({
        deviceId: deviceIdRef.current,      // Always current value
        deviceName: deviceNameRef.current,  // Always current value
        authToken: authTokenRef.current,    // Always current value
        // ... rest of state via refs
      }),
      // ... other handlers
    }
  );
}, [/* stable dependencies only */]);
```

## Additional Improvements

1. **Initialization Tracking**: Added `initAttemptedRef` to prevent multiple initialization attempts
2. **Better Logging**: Added console logs for debugging connection issues
3. **Error State**: Set `syncStatus` to `'error'` when registration fails
4. **Retry Logic**: Reset `initAttemptedRef` on failure to allow retry

## Testing

Created comprehensive tests in `/packages/core/src/__tests__/sync-client.test.ts`:

```bash
bun test packages/core/src/__tests__/sync-client.test.ts
```

### Test Coverage

- ✅ Registration with/without auth token
- ✅ Empty deviceId handling
- ✅ Network error handling
- ✅ Server error handling
- ✅ Dynamic state updates via refs
- ✅ Polling functionality
- ✅ Pairing token generation
- ✅ Event pushing
- ✅ Event processing (including echo prevention)
- ✅ Heartbeat functionality
- ✅ Constants validation

## Verification Checklist

After applying this fix:

- [ ] Mobile app initializes device correctly on first launch
- [ ] Sync status shows "Connected" instead of "Connecting..."
- [ ] QR code generation works
- [ ] QR code scanning works
- [ ] Device pairing succeeds
- [ ] Data syncs between devices
- [ ] Sync flash animation appears on sync

## Files Changed

1. `/apps/mobile/src/hooks/useSync.ts` - Fixed stale closure bug
2. `/packages/core/src/__tests__/sync-client.test.ts` - Added comprehensive tests (new file)
3. `/docs/SYNC_FIX.md` - This documentation (new file)

## Architecture Comparison

### Web App (Working)
- Uses `useRef` for state values accessed in callbacks
- Refs updated via `useEffect` when state changes
- Sync client always gets current values

### Mobile App (Fixed)
- Now uses the same `useRef` pattern as web app
- Maintains sync with web app architecture
- Consistent behavior across platforms

## Future Considerations

To prevent similar issues:

1. Always use refs for state values accessed in callbacks that outlive the render
2. Document the pattern for cross-platform shared code
3. Consider a shared `useSync` hook in the core package if possible
