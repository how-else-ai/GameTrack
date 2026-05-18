import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Kid, Ticket } from '@game-time-tracker/core';
import { COLORS } from '@/lib/ui-constants';

interface TicketDotProps {
  status: Ticket['status'];
  isWarning?: boolean;
}

function TicketDot({ status, isWarning }: TicketDotProps) {
  const dotStyles = getTicketDotStyles(status, isWarning);

  return (
    <View style={[styles.ticketDot, { backgroundColor: dotStyles.bg, borderColor: dotStyles.border }]}>
      {status === 'available' && (
        <Text style={[styles.ticketDotText, { color: COLORS.retroGreen }]}>✓</Text>
      )}
    </View>
  );
}

function getTicketDotStyles(
  status: Ticket['status'],
  isWarning?: boolean,
): { bg: string; border: string } {
  if (status === 'available') {
    return { bg: `${COLORS.retroGreen}33`, border: COLORS.retroGreen };
  }
  if (status === 'in-use') {
    const color = isWarning ? COLORS.retroOrange : COLORS.primary;
    return { bg: `${color}33`, border: color };
  }
  return { bg: `${COLORS.border}33`, border: COLORS.border };
}

export interface IdleTicketViewProps {
  kid: Kid;
  onResetTickets: () => void;
  onPress: () => void;
  isWarning: boolean;
}

export function IdleTicketView({
  kid,
  onResetTickets,
  onPress,
  isWarning,
}: IdleTicketViewProps) {
  const availableTickets = kid.tickets.filter(t => t.status === 'available').length;
  const usedTickets = kid.tickets.filter(t => t.status === 'used').length;

  return (
    <View style={styles.container}>
      <View style={styles.ticketsRow}>
        {kid.tickets.map((ticket) => (
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
      {availableTickets > 0 && (
        <TouchableOpacity onPress={onPress} style={styles.playButton}>
          <Ionicons name="play" size={14} color={COLORS.background} />
          <Text style={styles.playButtonText}>Play</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  ticketsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
});
