// Timer screen for active session
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { useTimer } from '@/hooks/useTimer';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect } from 'react';

const AVATAR_EMOJIS: Record<string, string> = {
  'alien-1': '👽', 'alien-2': '👾', 'alien-3': '🛸', 'alien-4': '🚀', 'alien-5': '🌟',
  'kid-1': '🧒', 'kid-2': '👦', 'kid-3': '👧', 'kid-4': '🧑', 'kid-5': '🏃',
  'adult-1': '👨', 'adult-2': '🧔', 'adult-3': '👴', 'adult-4': '💪', 'adult-5': '🦸',
  'animal-1': '🐱', 'animal-2': '🐶', 'animal-3': '🐰', 'animal-4': '🦉', 'animal-5': '🦊',
};

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function TimerScreen() {
  const { kidId } = useLocalSearchParams<{ kidId: string }>();
  const kid = useAppStore((state) => state.kids.find((k) => k.id === kidId));
  const { remainingSeconds, isWarning, isPaused, progress } = useTimer(kidId);

  const startSession = useAppStore((state) => state.startSession);
  const pauseSession = useAppStore((state) => state.pauseSession);
  const resumeSession = useAppStore((state) => state.resumeSession);
  const endSession = useAppStore((state) => state.endSession);

  // Auto-close when timer ends
  useEffect(() => {
    if (remainingSeconds === 0 && kid?.activeSession && !isPaused) {
      // Wait a moment then go back
      const timer = setTimeout(() => {
        router.back();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [remainingSeconds, kid?.activeSession, isPaused]);

  const handleStart = useCallback(() => {
    if (!kid) return;

    // Find first available ticket
    const availableTicket = kid.tickets.find(t => t.status === 'available');
    if (!availableTicket) {
      Alert.alert('No Tickets', 'This kid has no available tickets.');
      return;
    }

    startSession(kidId, availableTicket.id);
  }, [kid, kidId, startSession]);

  const handlePause = useCallback(() => {
    pauseSession(kidId);
  }, [kidId, pauseSession]);

  const handleResume = useCallback(() => {
    resumeSession(kidId);
  }, [kidId, resumeSession]);

  const handleEnd = useCallback(() => {
    Alert.alert(
      'End Session?',
      'Are you sure you want to end this gaming session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: () => {
            endSession(kidId);
            router.back();
          },
        },
      ]
    );
  }, [kidId, endSession]);

  if (!kid) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Kid not found</Text>
      </View>
    );
  }

  const hasActiveSession = !!kid.activeSession;
  const displayTime = remainingSeconds !== null ? remainingSeconds : kid.ticketDuration * 60;

  return (
    <View style={styles.container}>
      {/* Kid Info */}
      <View style={styles.kidInfo}>
        <Text style={styles.avatar}>{AVATAR_EMOJIS[kid.avatarEmoji] || '👤'}</Text>
        <Text style={styles.name}>{kid.name}</Text>
        <Text style={styles.ticketInfo}>
          {kid.ticketDuration} min per ticket
        </Text>
      </View>

      {/* Timer Display */}
      <View style={styles.timerContainer}>
        <View style={[
          styles.timerCircle,
          isWarning && styles.timerCircleWarning,
          isPaused && styles.timerCirclePaused,
        ]}>
          <Text style={[
            styles.timerText,
            isWarning && styles.timerTextWarning,
            isPaused && styles.timerTextPaused,
          ]}>
            {formatTime(displayTime)}
          </Text>
          {isPaused && <Text style={styles.pausedText}>PAUSED</Text>}
          {!hasActiveSession && (
            <Text style={styles.readyText}>Ready to Start</Text>
          )}
        </View>

        {/* Progress Bar */}
        {hasActiveSession && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }, isWarning && styles.progressBarWarning]} />
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!hasActiveSession ? (
          <Pressable onPress={handleStart} style={styles.mainButton}>
            <Ionicons name="play" size={32} color="#1a1a2e" />
            <Text style={styles.mainButtonText}>START SESSION</Text>
          </Pressable>
        ) : (
          <>
            {isPaused ? (
              <Pressable onPress={handleResume} style={[styles.mainButton, styles.resumeButton]}>
                <Ionicons name="play" size={32} color="#1a1a2e" />
                <Text style={styles.mainButtonText}>RESUME</Text>
              </Pressable>
            ) : (
              <Pressable onPress={handlePause} style={[styles.mainButton, styles.pauseButton]}>
                <Ionicons name="pause" size={32} color="#1a1a2e" />
                <Text style={styles.mainButtonText}>PAUSE</Text>
              </Pressable>
            )}

            <Pressable onPress={handleEnd} style={styles.endButton}>
              <Ionicons name="stop" size={24} color="#ff2a6d" />
              <Text style={styles.endButtonText}>END SESSION</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Tickets Status */}
      <View style={styles.ticketsSection}>
        <Text style={styles.ticketsTitle}>TICKETS</Text>
        <View style={styles.ticketsRow}>
          {kid.tickets.map((ticket, index) => (
            <View
              key={ticket.id}
              style={[
                styles.ticketBox,
                ticket.status === 'available' && styles.ticketAvailable,
                ticket.status === 'in-use' && styles.ticketInUse,
                ticket.status === 'used' && styles.ticketUsed,
              ]}
            >
              <Text style={styles.ticketNumber}>{index + 1}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 24,
  },
  errorText: {
    color: '#ff2a6d',
    fontSize: 18,
    textAlign: 'center',
  },
  kidInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    fontSize: 64,
    marginBottom: 8,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  ticketInfo: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#2a2a4e',
    borderWidth: 4,
    borderColor: '#ffea00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerCircleWarning: {
    borderColor: '#ff6b35',
    backgroundColor: '#3a2a2e',
  },
  timerCirclePaused: {
    borderColor: '#666',
    backgroundColor: '#2a2a3e',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffea00',
    fontVariant: ['tabular-nums'],
  },
  timerTextWarning: {
    color: '#ff6b35',
  },
  timerTextPaused: {
    color: '#888',
  },
  pausedText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  readyText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  progressContainer: {
    width: 200,
    height: 8,
    backgroundColor: '#2a2a4e',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffea00',
  },
  progressBarWarning: {
    backgroundColor: '#ff6b35',
  },
  controls: {
    gap: 16,
    marginBottom: 32,
  },
  mainButton: {
    backgroundColor: '#ffea00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  resumeButton: {
    backgroundColor: '#05ffa1',
  },
  pauseButton: {
    backgroundColor: '#ffea00',
  },
  mainButtonText: {
    color: '#1a1a2e',
    fontSize: 18,
    fontWeight: 'bold',
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ff2a6d',
    gap: 8,
  },
  endButtonText: {
    color: '#ff2a6d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ticketsSection: {
    marginTop: 'auto',
  },
  ticketsTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    letterSpacing: 2,
  },
  ticketsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  ticketBox: {
    width: 40,
    height: 50,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a4e',
  },
  ticketAvailable: {
    borderColor: '#05ffa1',
    backgroundColor: '#05ffa120',
  },
  ticketInUse: {
    borderColor: '#ffea00',
    backgroundColor: '#ffea0020',
  },
  ticketUsed: {
    borderColor: '#444',
    backgroundColor: '#1a1a2e',
    opacity: 0.5,
  },
  ticketNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
