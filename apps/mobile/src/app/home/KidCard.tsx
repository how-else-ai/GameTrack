import { View, Text, Pressable, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Kid } from '@game-time-tracker/core';
import { useTimer } from '@/hooks/useTimer';
import { COLORS, getAvatarUrl } from '@/lib/ui-constants';
import { ActiveSessionView } from './ActiveSessionView';
import { IdleTicketView } from './IdleTicketView';

export interface KidCardProps {
  kid: Kid;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onResetTickets: () => void;
}

export function KidCard({
  kid,
  onPress,
  onEdit,
  onDelete,
  onResetTickets,
}: KidCardProps) {
  const { remainingSeconds, isWarning, isPaused } = useTimer(kid.id);
  const availableTickets = kid.tickets.filter(t => t.status === 'available').length;
  const hasActiveSession = !!kid.activeSession;

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
        <TouchableOpacity onPress={onPress} style={styles.avatarContainer}>
          <Image
            source={getAvatarUrl(kid.avatarEmoji)}
            style={styles.avatar}
            resizeMode="cover"
          />
        </TouchableOpacity>

        <View style={styles.cardInfo}>
          <Text style={styles.name}>{kid.name}</Text>
          <View style={styles.ticketInfo}>
            <Ionicons name="ticket" size={12} color={COLORS.mutedForeground} />
            <Text style={styles.ticketCount}>
              {availableTickets} / {kid.ticketLimit} left
            </Text>
          </View>

          {hasActiveSession && remainingSeconds !== null && (
            <ActiveSessionView
              remainingSeconds={remainingSeconds}
              isWarning={isWarning}
              isPaused={isPaused}
              ticketDuration={kid.ticketDuration}
            />
          )}

          {!hasActiveSession && (
            <IdleTicketView
              kid={kid}
              onResetTickets={onResetTickets}
              onPress={onPress}
              isWarning={isWarning}
            />
          )}
        </View>

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

const styles = StyleSheet.create({
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
  quickActions: {
    gap: 4,
  },
  iconButton: {
    padding: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
});
