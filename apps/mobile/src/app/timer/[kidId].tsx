// Timer screen for active session (aligned with web app)
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Image } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { useTimer } from '@/hooks/useTimer';
import { Kid } from '@game-time-tracker/core';
import { useState, useCallback, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Theme colors
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
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Progress bar component
function ProgressBar({ progress, isWarning }: { progress: number; isWarning: boolean }) {
  return (
    <View style={styles.progressContainer}>
      <View 
        style={[
          styles.progressBar,
          { width: `${Math.min(100, Math.max(0, progress))}%` },
          isWarning && styles.progressBarWarning,
        ]} 
      />
    </View>
  );
}

// Ticket button component
function TicketButton({ ticket, index, available, onPress, isWarning }: {
  ticket: any;
  index: number;
  available: boolean;
  onPress: () => void;
  isWarning?: boolean;
}) {
  let bgColor = COLORS.border;
  let borderColor = COLORS.border;
  
  if (ticket.status === 'available') {
    bgColor = `${COLORS.retroGreen}20`;
    borderColor = COLORS.retroGreen;
  } else if (ticket.status === 'in-use') {
    bgColor = `${COLORS.primary}20`;
    borderColor = isWarning ? COLORS.retroOrange : COLORS.primary;
  } else if (ticket.status === 'used') {
    bgColor = COLORS.muted;
    borderColor = COLORS.border;
  }

  return (
    <TouchableOpacity
      onPress={available ? onPress : undefined}
      disabled={!available}
      style={[
        styles.ticketButton,
        { backgroundColor: bgColor, borderColor },
        ticket.status === 'used' && styles.ticketButtonUsed,
      ]}
    >
      <Text style={[
        styles.ticketButtonNumber,
        ticket.status === 'used' && styles.ticketButtonNumberUsed,
      ]}>
        {index + 1}
      </Text>
    </TouchableOpacity>
  );
}

export default function TimerScreen() {
  const { kidId } = useLocalSearchParams<{ kidId: string }>();
  const kid = useAppStore((state) => state.kids.find((k) => k.id === kidId));
  const { remainingTime, isWarning, isPaused } = useTimer(kidId);
  const insets = useSafeAreaInsets();

  const startSession = useAppStore((state) => state.startSession);
  const pauseSession = useAppStore((state) => state.pauseSession);
  const resumeSession = useAppStore((state) => state.resumeSession);
  const endSession = useAppStore((state) => state.endSession);

  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [alarmPlayed, setAlarmPlayed] = useState(false);
  const [warningNotified, setWarningNotified] = useState(false);

  // Check notification permission
  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotificationsEnabled(status === 'granted');
    });
  }, []);

  // Play alarm using notification sound (simpler than audio file)
  const playAlarm = useCallback(async () => {
    // Use notification with sound as alarm
    if (notificationsEnabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time\'s Up!',
          body: `${kid?.name}'s gaming session has ended.`,
          sound: 'default',
        },
        trigger: null,
      });
    }
  }, [notificationsEnabled, kid?.name]);

  // Send notification
  const sendNotification = useCallback(async (title: string, body: string) => {
    if (notificationsEnabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
        },
        trigger: null,
      });
    }
  }, [notificationsEnabled]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setNotificationsEnabled(status === 'granted');
  }, []);

  // Handle timer expiration
  useEffect(() => {
    if (remainingTime === 0 && !alarmPlayed && !isPaused) {
      setAlarmPlayed(true);
      playAlarm();
      sendNotification('Time\'s Up!', `${kid?.name}'s gaming session has ended.`);
    }
  }, [remainingTime, alarmPlayed, isPaused, kid?.name, playAlarm, sendNotification]);

  // Handle warning notification
  useEffect(() => {
    if (isWarning && !warningNotified && !isPaused) {
      setWarningNotified(true);
      sendNotification('1 Minute Left', `${kid?.name}'s gaming session will end soon.`);
    }
  }, [isWarning, warningNotified, isPaused, kid?.name, sendNotification]);

  // Reset flags when session changes
  useEffect(() => {
    if (!kid?.activeSession) {
      setAlarmPlayed(false);
      setWarningNotified(false);
    }
  }, [kid?.activeSession]);

  // Auto-close when timer ends
  useEffect(() => {
    if (remainingTime === 0 && kid?.activeSession && !isPaused && alarmPlayed) {
      const timer = setTimeout(() => {
        endSession(kidId);
        router.back();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [remainingTime, kid?.activeSession, isPaused, alarmPlayed, endSession, kidId]);

  const handleStart = useCallback((ticketId: string) => {
    if (!kid) return;
    setAlarmPlayed(false);
    setWarningNotified(false);
    startSession(kidId, ticketId);
  }, [kid, kidId, startSession]);

  const handlePause = useCallback(() => {
    pauseSession(kidId);
  }, [kidId, pauseSession]);

  const handleResume = useCallback(() => {
    resumeSession(kidId);
  }, [kidId, resumeSession]);

  const handleEnd = useCallback(() => {
    setShowEndConfirmation(true);
  }, []);

  const handleConfirmEnd = useCallback(() => {
    endSession(kidId);
    setShowEndConfirmation(false);
    router.back();
  }, [endSession, kidId]);

  if (!kid) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Kid not found</Text>
      </View>
    );
  }

  const hasActiveSession = kid.activeSession !== null;
  const availableTickets = kid.tickets.filter(t => t.status === 'available');
  const inUseTicket = kid.tickets.find(t => t.status === 'in-use');
  
  const totalTime = kid.ticketDuration * 60;
  const progress = hasActiveSession && remainingTime !== null 
    ? ((totalTime - remainingTime) / totalTime) * 100 
    : 0;

  const displayTime = remainingTime !== null ? remainingTime : totalTime;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header - with safe area to avoid dynamic island */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <View style={styles.headerAvatar}>
              <Image
                source={getAvatarUrl(kid.avatarEmoji)}
                style={styles.headerAvatarImage}
                resizeMode="cover"
              />
            </View>
            <View>
              <Text style={styles.headerName}>{kid.name}</Text>
              <Text style={styles.headerSubtitle}>
                {kid.ticketDuration} min per ticket
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            onPress={requestNotificationPermission}
            style={[
              styles.notificationButton,
              notificationsEnabled && styles.notificationButtonEnabled,
            ]}
          >
            <Ionicons 
              name={notificationsEnabled ? 'notifications' : 'notifications-off'} 
              size={24} 
              color={notificationsEnabled ? COLORS.retroCyan : COLORS.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {hasActiveSession ? (
            /* Active Session View */
            <View style={styles.activeSessionView}>
              <Text style={styles.timerTextLarge}>
                {formatTime(displayTime)}
              </Text>
              
              {isPaused && (
                <Text style={styles.pausedText}>PAUSED</Text>
              )}

              <ProgressBar progress={progress} isWarning={isWarning} />

              <View style={styles.controls}>
                {isPaused ? (
                  <TouchableOpacity 
                    onPress={handleResume}
                    style={styles.primaryButton}
                  >
                    <Ionicons name="play" size={24} color={COLORS.background} />
                    <Text style={styles.primaryButtonText}>RESUME</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    onPress={handlePause}
                    style={styles.secondaryButton}
                  >
                    <Ionicons name="pause" size={24} color={COLORS.text} />
                    <Text style={styles.secondaryButtonText}>PAUSE</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  onPress={handleEnd}
                  style={styles.dangerButton}
                >
                  <Ionicons name="stop" size={20} color={COLORS.retroMagenta} />
                  <Text style={styles.dangerButtonText}>END</Text>
                </TouchableOpacity>
              </View>

              {isWarning && !isPaused && (
                <Text style={styles.warningText}>
                  1 minute remaining!
                </Text>
              )}
            </View>
          ) : (
            /* Ticket Selection View */
            <View style={styles.ticketSelectionView}>
              <View style={styles.avatarDisplay}>
                <Image
                  source={getAvatarUrl(kid.avatarEmoji)}
                  style={styles.avatarLarge}
                  resizeMode="cover"
                />
              </View>

              <View style={styles.ticketsInfo}>
                <Text style={styles.ticketsInfoLabel}>Tickets Available</Text>
                <Text style={styles.ticketsInfoValue}>{availableTickets.length}</Text>
              </View>

              {availableTickets.length > 0 ? (
                <>
                  <Text style={styles.instructionText}>
                    Tap to start a {kid.ticketDuration} minute session
                  </Text>
                  
                  <View style={styles.ticketGrid}>
                    {availableTickets.slice(0, 9).map((ticket, index) => (
                      <TicketButton
                        key={ticket.id}
                        ticket={ticket}
                        index={index}
                        available={true}
                        onPress={() => handleStart(ticket.id)}
                        isWarning={isWarning}
                      />
                    ))}
                  </View>
                </>
              ) : (
                <View style={styles.noTicketsView}>
                  <Text style={styles.noTicketsText}>
                    No tickets remaining for today
                  </Text>
                  <Text style={styles.noTicketsSubtext}>
                    Come back tomorrow for new tickets!
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Tickets Status (always shown) */}
          {hasActiveSession && (
            <View style={styles.ticketsStatus}>
              <Text style={styles.ticketsStatusLabel}>TICKETS</Text>
              <View style={styles.ticketsStatusRow}>
                {kid.tickets.map((ticket, index) => (
                  <TicketButton
                    key={ticket.id}
                    ticket={ticket}
                    index={index}
                    available={false}
                    onPress={() => {}}
                    isWarning={isWarning && ticket.status === 'in-use'}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.footerButton}
          >
            <Ionicons name="arrow-back" size={16} color={COLORS.text} />
            <Text style={styles.footerButtonText}>BACK</Text>
          </TouchableOpacity>
        </View>

        {/* End Session Confirmation Modal */}
        <Modal
          visible={showEndConfirmation}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEndConfirmation(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>END SESSION?</Text>
              <Text style={styles.modalText}>
                Are you sure you want to end this gaming session?
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  onPress={() => setShowEndConfirmation(false)}
                  style={styles.modalButton}
                >
                  <Text style={styles.modalButtonText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleConfirmEnd}
                  style={[styles.modalButton, styles.modalButtonDanger]}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextDanger]}>
                    END SESSION
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.border,
    backgroundColor: `${COLORS.card}99`,
  },
  backButton: {
    padding: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.muted,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerAvatarImage: {
    width: 40,
    height: 40,
  },
  headerName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: 'PressStart2P',
  },
  headerSubtitle: {
    fontSize: 8,
    color: COLORS.mutedForeground,
    fontFamily: 'PressStart2P',
  },
  notificationButton: {
    padding: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  notificationButtonEnabled: {
    borderColor: COLORS.retroCyan,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    minHeight: '100%',
  },
  activeSessionView: {
    alignItems: 'center',
    gap: 32,
    paddingTop: 40,
  },
  timerTextLarge: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'],
    fontFamily: 'PressStart2P',
  },
  pausedText: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    fontFamily: 'PressStart2P',
  },
  progressContainer: {
    width: 200,
    height: 16,
    backgroundColor: COLORS.muted,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressBarWarning: {
    backgroundColor: COLORS.retroMagenta,
  },
  controls: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'PressStart2P',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 4,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'PressStart2P',
  },
  dangerButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.retroMagenta,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  dangerButtonText: {
    color: COLORS.retroMagenta,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'PressStart2P',
  },
  warningText: {
    fontSize: 10,
    color: COLORS.retroMagenta,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'PressStart2P',
  },
  ticketSelectionView: {
    alignItems: 'center',
    gap: 24,
    paddingTop: 20,
  },
  avatarDisplay: {
    width: 96,
    height: 96,
    borderWidth: 4,
    borderColor: COLORS.border,
    backgroundColor: COLORS.muted,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarLarge: {
    width: 96,
    height: 96,
  },
  ticketsInfo: {
    alignItems: 'center',
  },
  ticketsInfoLabel: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    marginBottom: 8,
    fontFamily: 'PressStart2P',
  },
  ticketsInfoValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: 'PressStart2P',
  },
  instructionText: {
    fontSize: 8,
    color: COLORS.mutedForeground,
    textAlign: 'center',
    fontFamily: 'PressStart2P',
  },
  ticketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  ticketButton: {
    width: 64,
    height: 80,
    borderWidth: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketButtonUsed: {
    opacity: 0.5,
  },
  ticketButtonNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: 'PressStart2P',
  },
  ticketButtonNumberUsed: {
    color: COLORS.mutedForeground,
  },
  noTicketsView: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noTicketsText: {
    fontSize: 10,
    color: COLORS.retroMagenta,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'PressStart2P',
  },
  noTicketsSubtext: {
    fontSize: 8,
    color: COLORS.mutedForeground,
    fontFamily: 'PressStart2P',
  },
  ticketsStatus: {
    marginTop: 32,
    alignItems: 'center',
  },
  ticketsStatusLabel: {
    fontSize: 12,
    color: COLORS.border,
    marginBottom: 12,
    letterSpacing: 2,
    fontFamily: 'PressStart2P',
  },
  ticketsStatusRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 4,
    borderTopColor: COLORS.border,
    backgroundColor: `${COLORS.card}99`,
  },
  footerButton: {
    backgroundColor: 'transparent',
    borderWidth: 4,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  footerButtonText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'PressStart2P',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
    fontFamily: 'PressStart2P',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 4,
    borderColor: COLORS.border,
    alignItems: 'center',
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
  errorText: {
    color: COLORS.retroMagenta,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 40,
    fontFamily: 'PressStart2P',
  },
});
