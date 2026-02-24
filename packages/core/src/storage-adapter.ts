// Storage adapter interface for cross-platform persistence
// Web uses localStorage, React Native uses AsyncStorage

import { StorageAdapter } from './types';

// Web storage adapter using localStorage
export const webStorageAdapter: StorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors (e.g., quota exceeded)
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};

// In-memory fallback adapter (for testing or when storage is unavailable)
export const memoryStorageAdapter = (() => {
  const storage = new Map<string, string>();
  return {
    getItem: async (key: string): Promise<string | null> => {
      return storage.get(key) ?? null;
    },
    setItem: async (key: string, value: string): Promise<void> => {
      storage.set(key, value);
    },
    removeItem: async (key: string): Promise<void> => {
      storage.delete(key);
    },
  } as StorageAdapter;
})();
