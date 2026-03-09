// Main screen - Kids list (aligned with web app)
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TouchableOpacity, Animated, Image } from 'react-native';
import { Link, router } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { useTimer } from '@/hooks/useTimer';
import { useSync } from '@/hooks/useSync';
import { Kid } from '@game-time-tracker/core';
import { useState, useCallback, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Theme colors matching web app
const COLORS = {
  background: '#0a0a12',
  card: '#12121f',
  primary: '#ffea00',
  retroCyan: '#00f0ff',
  retroMagenta: '#ff2a6d',
  retroGreen: '#05ffa1',
  retroOrange: '#ff6b35',
  retroPurple: '#b967ff',
  border: '#3a3a5e',
  muted: '#1a1a2e',
  mutedForeground: '#8888aa',
  text: '#f0f0f0',
};

// Get avatar image source
function getAvatarUrl(avatarId: string): any {
  // Map avatar IDs to local assets
  const avatarMap: Record<string, any> = {
    'alien-1': require('@assets/alien-1.png'),
    'alien-2': require('@assets/alien-2.png'),
    'alien-3': require('@assets/alien-3.png'),
    'alien-4': require('@assets/alien-4.png'),
    'alien-5': require('@assets/alien-5.png'),
    'kid-1': require('@assets/kid-1.png'),
    'kid-2': require('@assets/kid-2.png'),
    'kid-3': require('@assets/kid-3.png'),
    'kid-4': require('@assets/kid-4.png'),
    'kid-5': require('@assets/kid-5.png'),
    'adult-1': require('@assets/adult-1.png'),
    'adult-2': require('@assets/adult-2.png'),
    'adult-3': require('@assets/adult-3.png'),
    'adult-4': require('@assets/adult-4.png'),
    'adult-5': require('@assets/adult-5.png'),
    'animal-1': require('@assets/animal-1.png'),
    'animal-2': require('@assets/animal-2.png'),
    'animal-3': require('@assets/animal-3.png'),
    'animal-4': require('@assets/animal-4.png'),
    'animal-5': require('@assets/animal-5.png'),
  };
  return avatarMap[avatarId] || avatarMap['kid-1'];
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function TicketDot({ status, isWarning }: { status: 'available' | 'in-use' | 'used'; isWarning?: boolean }) {
  let bgColor = COLORS.border;
  let borderColor = COLORS.border;
  
  if (status === 'available') {
    bgColor = COLORS.retroGreen;
    borderColor = COLORS.retroGreen;
  } else if (status === 'in-use') {
    bgColor = isWarning ? COLORS.retroOrange : COLORS.primary;
    borderColor = isWarning ? COLORS.retroOrange : COLORS.primary;
  }
  
  return (
    <View style={[
      styles.ticketDot,
      { backgroundColor: `${bgColor}33`, borderColor }
    ]}>
      {status === 'available' && (
        <Text style={[styles.ticketDotText, { color: COLORS.retroGreen }]}>✓</Text>
      )}
    </View>
  );
}

function KidCard({ kid, onPress, onEdit, onDelete, onResetTickets }: {
  kid: Kid;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onResetTickets: () => void;
}) {
  const { remainingSeconds, isWarning, isPaused } = useTimer(kid.id);
  const availableTickets = kid.tickets.filter(t => t.status === 'available').length;
  const usedTickets = kid.tickets.filter(t => t.status === 'used').length;
  const hasActiveSession = !!kid.activeSession;

  const totalTime = kid.ticketDuration * 60;
  const progress = hasActiveSession && remainingSeconds !== null 
    ? ((totalTime - remainingSeconds) / totalTime) * 100 
    : 0;

  return (
    <View>
      <Pressable 
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          hasActiveSession && styles.cardActive,
          pressed && styles.cardPressed,
        ]}
      >
        {/* Avatar - Using image instead of emoji */}
        <TouchableOpacity onPress={onPress} style={styles.avatarContainer}>
          <Image
            source={getAvatarUrl(kid.avatarEmoji)}
            style={styles.avatar}
            resizeMode="cover"
          />
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{kid.name}</Text>
          <View style={styles.ticketInfo}>
            <Ionicons name="ticket" size={12} color={COLORS.mutedForeground} />
            <Text style={styles.ticketCount}>{availableTickets} / {kid.ticketLimit} left</Text>
          </View>

          {/* Active Session Progress */}
          {hasActiveSession && remainingSeconds !== null && (
            <View style={styles.activeSession}>
              <View style={styles.sessionHeader}>
                <Ionicons 
                  name={isPaused ? "pause" : "time"} 
                  size={12} 
                  color={isWarning ? COLORS.retroMagenta : COLORS.primary}
                />
                <Text style={[
                  styles.sessionStatus,
                  isWarning && styles.sessionStatusWarning,
                  isPaused && styles.sessionStatusPaused,
                ]}>
                  {isPaused ? 'Paused' : 'Playing'}
                </Text>
              </View>
              <Text style={[
                styles.sessionTime,
                isWarning && styles.sessionTimeWarning,
              ]}>
                {formatTime(remainingSeconds)}
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
          )}

          {/* Tickets Display */}
          {!hasActiveSession && (
            <View style={styles.ticketsDisplay}>
              <View style={styles.ticketsRow}>
                {kid.tickets.map((ticket, index) => (
                  <TicketDot 
                    key={ticket.id} 
                    status={ticket.status} 
                    isWarning={isWarning && ticket.status === 'in-use'}
                  />
                ))}
              </View>
              {usedTickets > 0 && (
                <TouchableOpacity onPress={onResetTickets} style={styles.resetButton}>
                  <Ionicons name="refresh" size={12} color={COLORS.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Play Button */}
          {!hasActiveSession && availableTickets > 0 && (
            <TouchableOpacity onPress={onPress} style={styles.playButton}>
              <Ionicons name="play" size={14} color={COLORS.background} />
              <Text style={styles.playButtonText}>Play</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity onPress={onEdit} style={styles.iconButton}>
            <Ionicons name="create" size={16} color={COLORS.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.iconButton}>
            <Ionicons name="trash" size={16} color={COLORS.retroMagenta} />
          </TouchableOpacity>
        </View>
      </Pressable>
    </View>
  );
}

export default function KidsScreen() {
  const kids = useAppStore((state) => state.kids);
  const { isConnected, syncStatus, requestFullSync } = useSync();
  const pairedDevices = useAppStore((state) => state.pairedDevices);
  const lastSyncFlash = useAppStore((state) => state.lastSyncFlash);
  const insets = useSafeAreaInsets();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showSyncFlash, setShowSyncFlash] = useState(false);
  const [deleteKidId, setDeleteKidId] = useState<string | null>(null);
  const [editingKid, setEditingKid] = useState<Kid | null>(null);

  // Track sync flash animation
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

  const handleKidPress = (kid: Kid) => {
    if (kid.activeSession || kid.tickets.some(t => t.status === 'available')) {
      router.push(`/timer/${kid.id}`);
    }
  };

  const handleEditKid = (kid: Kid) => {
    setEditingKid(kid);
    router.push(`/add-kid?kidId=${kid.id}`);
  };

  const handleDeleteKid = (kidId: string) => {
    setDeleteKidId(kidId);
  };

  const handleConfirmDelete = () => {
    if (deleteKidId) {
      useAppStore.getState().deleteKid(deleteKidId);
      setDeleteKidId(null);
    }
  };

  const handleResetTickets = (kidId: string) => {
    useAppStore.getState().resetTickets(kidId);
  };

  const onlineDevices = pairedDevices.filter(d => d.isOnline).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header - with safe area top padding */}
      <View style={[styles.header, { paddingTop: 12 }]}>
        <View style={styles.headerLeft}>
          {/* Logo placeholder */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🎮</Text>
          </View>
          <View>
            <Text style={styles.headerTitle1}>Game Time</Text>
            <Text style={styles.headerTitle2}>Tracker</Text>
          </View>
        </View>
        
        {/* Sync Status */}
        <View style={styles.headerRight}>
          {pairedDevices.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                if (syncStatus !== 'syncing' && isConnected) {
                  requestFullSync();
                }
              }}
              disabled={syncStatus === 'syncing' || !isConnected}
              style={[
                styles.syncButton,
                showSyncFlash && styles.syncButtonFlash,
                !isConnected && styles.syncButtonDisabled,
              ]}
            >
              <Ionicons 
                name={showSyncFlash ? "wifi" : syncStatus === 'syncing' ? "refresh" : "wifi"} 
                size={14} 
                color={showSyncFlash ? COLORS.retroGreen : isConnected ? COLORS.mutedForeground : COLORS.retroOrange}
              />
              <Text style={[
                styles.syncButtonText,
                showSyncFlash && styles.syncButtonTextFlash,
                !isConnected && styles.syncButtonTextDisabled,
              ]}>
                {onlineDevices}/{pairedDevices.length}
              </Text>
            </TouchableOpacity>
          )}
          
          <Link href="/sync" asChild>
            <TouchableOpacity style={styles.iconButtonLarge}>
              <Ionicons name="people" size={20} color={COLORS.mutedForeground} />
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Loading State */}
        {kids.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>NO PLAYERS</Text>
            <Text style={styles.emptyText}>
              Add your first kid to start tracking their gaming time with tickets
            </Text>
            <Link href="/add-kid" asChild>
              <TouchableOpacity style={styles.addButton}>
                <Ionicons name="add" size={20} color={COLORS.background} />
                <Text style={styles.addButtonText}>ADD PLAYER</Text>
              </TouchableOpacity>
            </Link>
          </View>
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

      {/* Footer with Add Button */}
      {kids.length > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity 
            onPress={() => {
              setEditingKid(null);
              router.push('/add-kid');
            }}
            style={styles.addButtonFooter}
          >
            <Ionicons name="add" size={20} color={COLORS.background} />
            <Text style={styles.addButtonText}>ADD PLAYER</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Delete Confirmation Modal */}
      {deleteKidId && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>DELETE PLAYER?</Text>
            <Text style={styles.modalText}>
              This will permanently delete {kids.find(k => k.id === deleteKidId)?.name || 'this kid'} and all their ticket history.
              {'\n'}This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                onPress={() => setDeleteKidId(null)}
                style={styles.modalButton}
              >
                <Text style={styles.modalButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleConfirmDelete}
                style={[styles.modalButton, styles.modalButtonDanger]}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextDanger]}>DELETE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.border,
    backgroundColor: `${COLORS.card}99`,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.muted,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 20,
  },
  headerTitle1: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 1,
    fontFamily: 'PressStart2P',
  },
  headerTitle2: {
    fontSize: 8,
    color: COLORS.mutedForeground,
    letterSpacing: 1,
    fontFamily: 'PressStart2P',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.muted,
  },
  syncButtonFlash: {
    borderColor: COLORS.retroCyan,
    backgroundColor: `${COLORS.retroCyan}20`,
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    fontSize: 8,
    color: COLORS.mutedForeground,
    fontWeight: '600',
    fontFamily: 'PressStart2P',
  },
  syncButtonTextFlash: {
    color: COLORS.retroGreen,
  },
  syncButtonTextDisabled: {
    color: COLORS.mutedForeground,
  },
  iconButtonLarge: {
    padding: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
    letterSpacing: 1,
    fontFamily: 'PressStart2P',
  },
  emptyText: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 300,
    fontFamily: 'PressStart2P',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  addButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'PressStart2P',
  },
  list: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 4,
    borderColor: COLORS.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 4,
  },
  cardActive: {
    borderColor: COLORS.retroGreen,
    backgroundColor: '#1a2a2a',
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderWidth: 4,
    borderColor: COLORS.border,
    backgroundColor: COLORS.muted,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 56,
    height: 56,
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
    fontFamily: 'PressStart2P',
  },
  ticketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  ticketCount: {
    fontSize: 8,
    color: COLORS.mutedForeground,
    fontFamily: 'PressStart2P',
  },
  activeSession: {
    marginTop: 8,
    gap: 8,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionStatus: {
    fontSize: 8,
    color: COLORS.primary,
    fontFamily: 'PressStart2P',
  },
  sessionStatusWarning: {
    color: COLORS.retroMagenta,
  },
  sessionStatusPaused: {
    color: COLORS.mutedForeground,
  },
  sessionTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: 'PressStart2P',
  },
  sessionTimeWarning: {
    color: COLORS.retroMagenta,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.muted,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  ticketsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  ticketsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  ticketDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketDotText: {
    fontSize: 6,
    fontWeight: 'bold',
    fontFamily: 'PressStart2P',
  },
  resetButton: {
    padding: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  playButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginTop: 12,
    gap: 6,
  },
  playButtonText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'PressStart2P',
  },
  quickActions: {
    gap: 4,
  },
  iconButton: {
    padding: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 4,
    borderTopColor: COLORS.border,
    backgroundColor: `${COLORS.card}99`,
  },
  addButtonFooter: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    zIndex: 100,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 24,
    maxWidth: 400,
    width: '100%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    fontFamily: 'PressStart2P',
  },
  modalText: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    marginBottom: 24,
    lineHeight: 20,
    fontFamily: 'PressStart2P',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  modalButtonDanger: {
    backgroundColor: COLORS.retroMagenta,
    borderColor: COLORS.retroMagenta,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: 'PressStart2P',
  },
  modalButtonTextDanger: {
    color: COLORS.background,
  },
});
