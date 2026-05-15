// Timer screen for active session — orchestrator component
import { View, Text, ScrollView, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { useTimer } from '@/hooks/useTimer';
import { useTimerNotifications } from '@/hooks/useTimerNotifications';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/lib/ui-constants';
import { TimerHeader } from './TimerHeader';
import { TicketSelectionView } from './TicketSelectionView';
import { ActiveSessionView } from './ActiveSessionView';

export default function TimerScreen() {
  const { kidId } = useLocalSearchParams<{ kidId: string }>();
  const kid = useAppStore(
    useCallback(
      (state) => state.kids.find((k) => k.id === kidId),
      [kidId],
    ),
  );
  const { remainingTime, isWarning, isPaused } = useTimer(kidId);
  const {
    notificationsEnabled,
    handleExpiration,
    handleWarning,
    requestPermission,
  } = useTimerNotifications(kid);
  const insets = useSafeAreaInsets();

  const startSession = useAppStore((state) => state.startSession);
  const pauseSession = useAppStore((state) => state.pauseSession);
  const resumeSession = useAppStore((state) => state.resumeSession);
  const endSession = useAppStore((state) => state.endSession);

  const [showEndConfirmation, setShowEndConfirmation] = useState(false);

  // Fire expiration alarm when timer hits zero
  useEffect(() => {
    if (remainingTime === 0 && !isPaused) {
      handleExpiration();
    }
  }, [remainingTime, isPaused, handleExpiration]);

  // Fire warning at 1 minute remaining
  useEffect(() => {
    if (isWarning && !isPaused) {
      handleWarning();
    }
  }, [isWarning, isPaused, handleWarning]);

  // Auto-close after alarm has played
  useEffect(() => {
    if (remainingTime !== 0) return;
    if (!kid?.activeSession || isPaused) return;

    const timer = setTimeout(() => {
      endSession(kidId);
      router.back();
    }, 1500);
    return () => clearTimeout(timer);
  }, [remainingTime, kid?.activeSession, isPaused, endSession, kidId]);

  const handleStart = useCallback((ticketId: string) => {
    if (!kid) return;
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

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TimerHeader
          kid={kid}
          notificationsEnabled={notificationsEnabled}
          onNotifyPermission={requestPermission}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {hasActiveSession ? (
            <ActiveSessionView
              kid={kid}
              remainingTime={remainingTime}
              isWarning={isWarning}
              isPaused={isPaused}
              onPause={handlePause}
              onResume={handleResume}
              onEnd={handleEnd}
            />
          ) : (
            <TicketSelectionView
              kid={kid}
              onTicketSelect={handleStart}
            />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    minHeight: '100%',
    paddingBottom: 100,
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
