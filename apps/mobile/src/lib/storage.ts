// React Native AsyncStorage adapter for the shared store
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageAdapter } from '@game-time-tracker/core';

export const asyncStorageAdapter: StorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Ignore storage errors
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};
