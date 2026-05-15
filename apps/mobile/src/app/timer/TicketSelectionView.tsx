import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Kid, Ticket } from '@game-time-tracker/core';
import { COLORS, getAvatarUrl } from '@/lib/ui-constants';

interface TicketSelectionViewProps {
  kid: Kid;
  onTicketSelect: (ticketId: string) => void;
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

// Ticket button component
function TicketButton({ ticket, index, available, onPress }: {
  ticket: Ticket;
  index: number;
  available: boolean;
  onPress: () => void;
}) {
  const { bg, border } = getTicketColors(ticket.status);

  return (
    <TouchableOpacity
      onPress={available ? onPress : undefined}
      disabled={!available}
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
    </TouchableOpacity>
  );
}

export function TicketSelectionView({ kid, onTicketSelect }: TicketSelectionViewProps) {
  const availableTickets = kid.tickets.filter(t => t.status === 'available');

  return (
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
                onPress={() => onTicketSelect(ticket.id)}
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
  );
}

const styles = StyleSheet.create({
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
});
