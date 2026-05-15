import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Kid } from '@game-time-tracker/core';
import { COLORS, getAvatarUrl } from '@/lib/ui-constants';

interface TimerHeaderProps {
  kid: Kid;
  notificationsEnabled: boolean;
  onNotifyPermission: () => void;
}

export function TimerHeader({ kid, notificationsEnabled, onNotifyPermission }: TimerHeaderProps) {
  return (
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
        onPress={onNotifyPermission}
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
  );
}

const styles = StyleSheet.create({
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
});
