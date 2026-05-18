// Main screen - Kids list orchestrator
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useAppStore } from '@/lib/store';
import { useSync } from '@/hooks/useSync';
import { Kid } from '@game-time-tracker/core';
import { useState, useCallback, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS } from '@/lib/ui-constants';
import { HomeHeader } from './home/HomeHeader';
import { KidCard } from './home/KidCard';
import { EmptyState } from './home/EmptyState';
import { DeleteConfirmation } from './home/DeleteConfirmation';
import { HomeFooter } from './home/HomeFooter';

export default function KidsScreen() {
  const kids = useAppStore((s) => s.kids);
  const pairedDevices = useAppStore((s) => s.pairedDevices);
  const lastSyncFlash = useAppStore((s) => s.lastSyncFlash);
  const { isConnected, syncStatus, requestFullSync } = useSync();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [showSyncFlash, setShowSyncFlash] = useState(false);
  const [deleteKidId, setDeleteKidId] = useState<string | null>(null);

  useEffect(() => {
    if (lastSyncFlash > 0) {
      setShowSyncFlash(true);
      const timer = setTimeout(() => setShowSyncFlash(false), 800);
      return () => clearTimeout(timer);
    }
  }, [lastSyncFlash]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await requestFullSync();
    setRefreshing(false);
  }, [requestFullSync]);

  const handleKidPress = useCallback((kid: Kid) => {
    if (kid.activeSession || kid.tickets.some(t => t.status === 'available')) {
      router.push(`/timer/${kid.id}`);
    }
  }, []);

  const handleEditKid = useCallback((kid: Kid) => {
    router.push(`/add-kid?kidId=${kid.id}`);
  }, []);

  const handleDeleteKid = useCallback((kidId: string) => {
    setDeleteKidId(kidId);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteKidId) {
      useAppStore.getState().deleteKid(deleteKidId);
      setDeleteKidId(null);
    }
  }, [deleteKidId]);

  const handleResetTickets = useCallback((kidId: string) => {
    useAppStore.getState().resetTickets(kidId);
  }, []);

  const handleAddKid = useCallback(() => {
    router.push('/add-kid');
  }, []);

  const onlineDevices = pairedDevices.filter(d => d.isOnline).length;

  const kidToDelete = kids.find(k => k.id === deleteKidId);

  return (
    <View style={styles.container}>
      <HomeHeader
        pairedDevices={pairedDevices}
        isConnected={isConnected}
        syncStatus={syncStatus}
        showSyncFlash={showSyncFlash}
        onlineDevices={onlineDevices}
        onSync={requestFullSync}
        insetsTop={insets.top}
      />

      <View style={styles.content}>
        {kids.length === 0 ? (
          <EmptyState />
        ) : (
          <FlatList
            data={kids}
            keyExtractor={(kid) => kid.id}
            renderItem={({ item }) => (
              <KidCard
                kid={item}
                onPress={() => handleKidPress(item)}
                onEdit={() => handleEditKid(item)}
                onDelete={() => handleDeleteKid(item.id)}
                onResetTickets={() => handleResetTickets(item.id)}
              />
            )}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
              />
            }
          />
        )}
      </View>

      {kids.length > 0 && (
        <HomeFooter onPress={handleAddKid} paddingBottom={insets.bottom + 12} />
      )}

      {deleteKidId && kidToDelete && (
        <DeleteConfirmation
          kidName={kidToDelete.name}
          onCancel={() => setDeleteKidId(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  list: {
    padding: 16,
    gap: 16,
  },
});
