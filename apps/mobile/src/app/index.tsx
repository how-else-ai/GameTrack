// Main screen - Kids list
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { Link, router } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { useTimer, useActiveTimers } from '@/hooks/useTimer';
import { useSync } from '@/hooks/useSync';
import { Kid } from '@game-time-tracker/core';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';

// Avatar emoji map (simplified for mobile)
const AVATAR_EMOJIS: Record<string, string> = {
  'alien-1': '👽', 'alien-2': '👾', 'alien-3': '🛸', 'alien-4': '🚀', 'alien-5': '🌟',
  'kid-1': '🧒', 'kid-2': '👦', 'kid-3': '👧', 'kid-4': '🧑', 'kid-5': '🏃',
  'adult-1': '👨', 'adult-2': '🧔', 'adult-3': '👴', 'adult-4': '💪', 'adult-5': '🦸',
  'animal-1': '🐱', 'animal-2': '🐶', 'animal-3': '🐰', 'animal-4': '🦉', 'animal-5': '🦊',
};

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function KidCard({ kid, onPress }: { kid: Kid; onPress: () => void }) {
  const { remainingSeconds, isWarning, isPaused } = useTimer(kid.id);
  const availableTickets = kid.tickets.filter(t => t.status === 'available').length;
  const inUseTickets = kid.tickets.filter(t => t.status === 'in-use').length;
  const usedTickets = kid.tickets.filter(t => t.status === 'used').length;
  const hasActiveSession = !!kid.activeSession;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.card,
      pressed && styles.cardPressed,
      hasActiveSession && styles.cardActive,
    ]}>
      <View style={styles.cardContent}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>{AVATAR_EMOJIS[kid.avatarEmoji] || '👤'}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{kid.name}</Text>

          {/* Tickets */}
          <View style={styles.ticketsRow}>
            {Array.from({ length: kid.ticketLimit }).map((_, i) => {
              const ticket = kid.tickets[i];
              let dotStyle = styles.ticketAvailable;
              if (ticket?.status === 'in-use') dotStyle = styles.ticketInUse;
              if (ticket?.status === 'used') dotStyle = styles.ticketUsed;

              return (
                <View
                  key={i}
                  style={[
                    styles.ticketDot,
                    dotStyle,
                    ticket?.status === 'in-use' && isWarning && styles.ticketWarning,
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* Timer Display */}
        {hasActiveSession && remainingSeconds !== null && (
          <View style={styles.timerContainer}>
            <Text style={[
              styles.timerText,
              isWarning && styles.timerWarningText,
              isPaused && styles.timerPausedText,
            ]}>
              {formatTime(remainingSeconds)}
            </Text>
            {isPaused && <Text style={styles.pausedLabel}>PAUSED</Text>}
          </View>
        )}

        {!hasActiveSession && availableTickets > 0 && (
          <View style={styles.startButton}>
            <Text style={styles.startButtonText}>START</Text>
          </View>
        )}

        {!hasActiveSession && availableTickets === 0 && (
          <Text style={styles.noTickets}>No tickets</Text>
        )}
      </View>
    </Pressable>
  );
}

export default function KidsScreen() {
  const kids = useAppStore((state) => state.kids);
  const { isConnected, requestFullSync } = useSync();
  const [refreshing, setRefreshing] = useState(false);
  const activeTimers = useActiveTimers();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await requestFullSync();
    setRefreshing(false);
  }, [requestFullSync]);

  const handleKidPress = (kid: Kid) => {
    if (kid.activeSession) {
      router.push(`/timer/${kid.id}`);
    } else if (kid.tickets.some(t => t.status === 'available')) {
      router.push(`/timer/${kid.id}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>KIDS</Text>
        <View style={styles.headerActions}>
          <Link href="/sync" asChild>
            <Pressable style={styles.iconButton}>
              <Ionicons
                name="sync"
                size={24}
                color={isConnected ? '#05ffa1' : '#ff6b35'}
              />
            </Pressable>
          </Link>
          <Link href="/add-kid" asChild>
            <Pressable style={styles.iconButton}>
              <Ionicons name="add" size={28} color="#ffea00" />
            </Pressable>
          </Link>
        </View>
      </View>

      {/* Active Timers Summary */}
      {activeTimers.length > 0 && (
        <View style={styles.activeTimersBanner}>
          <Ionicons name="time" size={16} color="#05ffa1" />
          <Text style={styles.activeTimersText}>
            {activeTimers.length} active timer{activeTimers.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Kids List */}
      {kids.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No kids added yet</Text>
          <Link href="/add-kid" asChild>
            <Pressable style={styles.addButton}>
              <Text style={styles.addButtonText}>Add Your First Kid</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <FlatList
          data={kids}
          keyExtractor={(kid) => kid.id}
          renderItem={({ item }) => (
            <KidCard kid={item} onPress={() => handleKidPress(item)} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffea00"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffea00',
    letterSpacing: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2a2a4e',
  },
  activeTimersBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#05ffa120',
    paddingVertical: 8,
    gap: 8,
  },
  activeTimersText: {
    color: '#05ffa1',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#444',
    padding: 16,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  cardActive: {
    borderColor: '#05ffa1',
    backgroundColor: '#2a4a4e',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3a3a5e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatar: {
    fontSize: 28,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  ticketsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  ticketDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  ticketAvailable: {
    backgroundColor: '#05ffa1',
    borderColor: '#05ffa1',
  },
  ticketInUse: {
    backgroundColor: '#ffea00',
    borderColor: '#ffea00',
  },
  ticketUsed: {
    backgroundColor: '#444',
    borderColor: '#555',
  },
  ticketWarning: {
    backgroundColor: '#ff6b35',
    borderColor: '#ff6b35',
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffea00',
    fontVariant: ['tabular-nums'],
  },
  timerWarningText: {
    color: '#ff6b35',
  },
  timerPausedText: {
    color: '#888',
  },
  pausedLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
  },
  startButton: {
    backgroundColor: '#ffea00',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 12,
  },
  noTickets: {
    color: '#666',
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#ffea00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
