# Data Migration Plan: Web to Native

## Overview

Migrating data from the Next.js web app (localStorage) to the React Native app (AsyncStorage).

## Storage Comparison

| Feature | Web (localStorage) | React Native (AsyncStorage) |
|---------|-------------------|----------------------------|
| API | Synchronous | Asynchronous (Promise-based) |
| Data type | Strings only | Strings only |
| Storage limit | ~5-10MB | ~6MB default, configurable |
| Structure | Key-value pairs | Key-value pairs |
| Persistence | Survives browser restart | Survives app restart |
| Backup | None (unless synced) | iCloud backup (iOS) |

## Migration Strategies

### Option 1: Manual Export/Import (Recommended)

User manually transfers data via QR code or file export.

**Pros:**
- No server dependency
- User controls their data
- Works offline

**Cons:**
- User must perform action
- One-time migration

**Implementation:**

```typescript
// Web app export feature
export function exportData(): string {
  const data = {
    kids: localStorage.getItem('game-time-tracker-kids'),
    devices: localStorage.getItem('game-time-tracker-devices'),
    version: '1.0',
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data);
}

// Generate QR code from export data
export function generateQRCode(): string {
  const data = exportData();
  // Use qrcode library to generate
  return generateQR(data);
}
```

```typescript
// React Native import feature
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

async function importFromQRCode(qrData: string): Promise<void> {
  try {
    const data = JSON.parse(qrData);
    
    // Validate data structure
    if (!data.kids || !data.version) {
      throw new Error('Invalid data format');
    }
    
    // Import to AsyncStorage
    await AsyncStorage.setItem('game-time-tracker-storage', JSON.stringify({
      state: {
        kids: JSON.parse(data.kids),
        // ... other state
      },
      version: 0,
    }));
    
    // Reload app or update store
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}
```

### Option 2: Sync Server Transfer

Use existing sync infrastructure to transfer data.

**Pros:**
- Seamless experience
- Automatic sync

**Cons:**
- Requires server
- Both apps must be running

**Implementation:**
- Web app pushes data to sync server
- Native app pulls data on first launch
- Uses existing `useSync` hook

### Option 3: iCloud Key-Value Storage

Store data in iCloud for automatic transfer.

**Pros:**
- Automatic if same Apple ID
- No user action needed

**Cons:**
- iOS only
- Requires iCloud entitlements
- Complex implementation

## Data Structure Mapping

### Web Storage Key
```
game-time-tracker
```

### React Native Storage Key
```
@game-time-tracker
```

### State Shape (Identical)

```typescript
// Both web and native use same state shape
interface AppState {
  deviceId: string;
  deviceName: string;
  authToken: string;
  kids: Kid[];
  pairedDevices: PairedDevice[];
  deletedKids: DeletedKid[];
  syncVersion: number;
  lastSyncFlash: number;
}
```

## Implementation: AsyncStorage Adapter

```typescript
// lib/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@game-time-tracker';

export const storage = {
  async getItem(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.error('Storage read error:', error);
      return null;
    }
  },

  async setItem(value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value);
    } catch (error) {
      console.error('Storage write error:', error);
    }
  },

  async removeItem(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  },
};
```

## Store Migration

```typescript
// lib/store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from './storage';

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ... store implementation (same as web)
    }),
    {
      name: '@game-time-tracker',
      storage: createJSONStorage(() => storage),
      // Add migration if needed
      migrate: (persistedState: unknown, version: number) => {
        // Handle version migrations here
        return persistedState as AppState;
      },
    }
  )
);
```

## Migration UI

### First Launch Screen

```tsx
// app/startup.tsx
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAppStore } from '@/lib/store';

export function StartupScreen() {
  const [hasData, setHasData] = useState<boolean | null>(null);
  const { kids, importData } = useAppStore();

  useEffect(() => {
    checkExistingData();
  }, []);

  const checkExistingData = async () => {
    const data = await useAppStore.persist.getOptions().storage?.getItem();
    setHasData(!!data && kids.length > 0);
  };

  const handleImport = async (qrData: string) => {
    try {
      const parsed = JSON.parse(qrData);
      importData(parsed.kids);
      // Navigate to home
    } catch (error) {
      // Show error
    }
  };

  const handleSkip = () => {
    // Navigate to home with empty state
  };

  if (hasData === null) return <Loading />;

  if (hasData) {
    // Has existing data, skip import
    return <Redirect href="/home" />;
  }

  return (
    <View className="flex-1 justify-center p-6">
      <Text className="text-2xl font-bold text-center mb-4">
        Welcome to Game Time Tracker
      </Text>
      
      <Text className="text-center text-muted-foreground mb-8">
        Import data from web app or start fresh
      </Text>

      <TouchableOpacity 
        className="bg-primary p-4 rounded-lg mb-4"
        onPress={() => /* Open QR scanner */}
      >
        <Text className="text-primary-foreground text-center font-bold">
          Scan QR Code from Web App
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        className="border-2 border-border p-4 rounded-lg"
        onPress={handleSkip}
      >
        <Text className="text-center">Start Fresh</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Data Validation

```typescript
// lib/validation.ts
import { Kid, Ticket } from '@/types';

export function validateKid(data: unknown): Kid {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid kid data');
  }

  const kid = data as Partial<Kid>;

  if (!kid.id || typeof kid.id !== 'string') {
    throw new Error('Kid missing valid id');
  }

  if (!kid.name || typeof kid.name !== 'string') {
    throw new Error('Kid missing valid name');
  }

  if (!Array.isArray(kid.tickets)) {
    throw new Error('Kid missing valid tickets array');
  }

  // Validate tickets
  kid.tickets.forEach(validateTicket);

  return kid as Kid;
}

function validateTicket(ticket: unknown): asserts ticket is Ticket {
  if (!ticket || typeof ticket !== 'object') {
    throw new Error('Invalid ticket data');
  }

  const t = ticket as Partial<Ticket>;

  if (!t.id || typeof t.id !== 'string') {
    throw new Error('Ticket missing valid id');
  }

  if (!['available', 'in-use', 'used'].includes(t.status as string)) {
    throw new Error('Ticket has invalid status');
  }
}
```

## Backup and Restore

### iCloud Backup

AsyncStorage data is automatically backed up to iCloud on iOS.

### Manual Backup

```typescript
// lib/backup.ts
import { storage } from './storage';
import Share from 'react-native-share';

export async function createBackup(): Promise<void> {
  const data = await storage.getItem();
  if (!data) return;

  const backup = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    data: JSON.parse(data),
  };

  const filePath = `${RNFS.DocumentDirectoryPath}/gametime-backup.json`;
  await RNFS.writeFile(filePath, JSON.stringify(backup, null, 2));

  await Share.open({
    url: `file://${filePath}`,
    type: 'application/json',
    filename: `gametime-backup-${Date.now()}.json`,
  });
}

export async function restoreBackup(filePath: string): Promise<void> {
  const content = await RNFS.readFile(filePath);
  const backup = JSON.parse(content);

  if (!backup.data) {
    throw new Error('Invalid backup file');
  }

  await storage.setItem(JSON.stringify(backup.data));
  // Reload app
}
```

## Testing Migration

### Unit Tests

```typescript
// __tests__/migration.test.ts
describe('Data Migration', () => {
  it('should validate kid data', () => {
    const validKid = {
      id: 'kid-123',
      name: 'Test',
      avatarEmoji: '👦',
      ticketLimit: 5,
      ticketDuration: 30,
      tickets: [{ id: 't1', status: 'available', lastResetDate: '2024-01-01' }],
      activeSession: null,
    };

    expect(() => validateKid(validKid)).not.toThrow();
  });

  it('should reject invalid kid data', () => {
    const invalidKid = { name: 'Test' }; // Missing required fields

    expect(() => validateKid(invalidKid)).toThrow();
  });

  it('should import data from web format', async () => {
    const webData = {
      kids: JSON.stringify([mockKid]),
      version: '1.0',
    };

    await importFromWeb(JSON.stringify(webData));

    const { kids } = useAppStore.getState();
    expect(kids).toHaveLength(1);
    expect(kids[0].name).toBe(mockKid.name);
  });
});
```

## Migration Checklist

- [ ] Implement export in web app
- [ ] Implement import in native app
- [ ] Add QR code generation (web)
- [ ] Add QR code scanning (native)
- [ ] Add data validation
- [ ] Handle import errors gracefully
- [ ] Test with large datasets
- [ ] Test interrupted migrations
- [ ] Add migration analytics
- [ ] Document for users
