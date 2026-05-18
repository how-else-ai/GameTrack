import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, formatTime } from '@/lib/ui-constants';

export interface ActiveSessionViewProps {
  remainingSeconds: number;
  isWarning: boolean;
  isPaused: boolean;
  ticketDuration: number;
}

export function ActiveSessionView({
  remainingSeconds,
  isWarning,
  isPaused,
  ticketDuration,
}: ActiveSessionViewProps) {
  const totalTime = ticketDuration * 60;
  const progress = ((totalTime - remainingSeconds) / totalTime) * 100;

  const iconColor = isWarning ? COLORS.retroMagenta : COLORS.primary;

  return (
    <View style={styles.container}>
      <View style={styles.sessionHeader}>
        <Ionicons
          name={isPaused ? 'pause' : 'time'}
          size={12}
          color={iconColor}
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
  );
}

const styles = StyleSheet.create({
  container: {
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
});
