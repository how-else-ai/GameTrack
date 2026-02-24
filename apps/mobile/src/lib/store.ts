// Mobile app store instance using AsyncStorage
import { createAppStore, AppState } from '@game-time-tracker/core';
import { asyncStorageAdapter } from './storage';

// Create the store instance with AsyncStorage
export const useAppStore = createAppStore(asyncStorageAdapter);

// Re-export types
export type { AppState };

// Helper to get store state outside of components
export const getStoreState = () => useAppStore.getState();
