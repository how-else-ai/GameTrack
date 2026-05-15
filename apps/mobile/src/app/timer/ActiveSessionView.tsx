import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Kid, Ticket } from '@game-time-tracker/core';
import { COLORS, formatTime } from '@/lib/ui-constants';

interface ActiveSessionViewProps {
  kid: Kid;
  remainingTime: number | null;
  isWarning: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
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

// Ticket status color lookup
function getTicketColors(status: string, isWarning?: boolean) {
  const colorMap = {
    available: { bg: `${COLORS.retroGreen}20`, border: COLORS.retroGreen },
    'in-use': { bg: `${COLORS.primary}20`, border: isWarning ? COLORS.retroOrange : COLORS.primary },
    used: { bg: COLORS.muted, border: COLORS.border },
  };
  return colorMap[status as keyof typeof colorMap] ?? { bg: COLORS.border, border: COLORS.border };
}

// Ticket button for status row
function TicketButton({ ticket, index, isWarning }: {
  ticket: Ticket;
  index: number;
  isWarning?: boolean;
}) {
  const { bg, border } = getTicketColors(ticket.status, isWarning);

  return (
    <View
      style={[
        styles.ticketButton,
        { backgroundColor: bg, borderColor: border },
        ticket.status === 'used' && styles.ticketButtonUsed,
      ]}
    >
      <Text style={[
        styles.ticketButtonNumber,
        ticket.status === 'used' && styles.ticketButtonNumberUsed,
      ]}>
        {index + 1}
      </Text>
    </View>
  );
}

export function ActiveSessionView({
  kid, remainingTime, isWarning, isPaused,
  onPause, onResume, onEnd,
}: ActiveSessionViewProps) {
  const totalTime = kid.ticketDuration * 60;
  const progress = remainingTime !== null
    ? ((totalTime - remainingTime) / totalTime) * 100
    : 0;
  const displayTime = remainingTime !== null ? remainingTime : totalTime;

  return (
    <>
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
              onPress={onResume}
              style={styles.primaryButton}
            >
              <Ionicons name="play" size={24} color={COLORS.background} />
              <Text style={styles.primaryButtonText}>RESUME</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={onPause}
              style={styles.secondaryButton}
            >
              <Ionicons name="pause" size={24} color={COLORS.text} />
              <Text style={styles.secondaryButtonText}>PAUSE</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onEnd}
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

      {/* Tickets Status */}
      <View style={styles.ticketsStatus}>
        <Text style={styles.ticketsStatusLabel}>TICKETS</Text>
        <View style={styles.ticketsStatusRow}>
          {kid.tickets.map((ticket, index) => (
            <TicketButton
              key={ticket.id}
              ticket={ticket}
              index={index}
              isWarning={isWarning && ticket.status === 'in-use'}
            />
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
});
