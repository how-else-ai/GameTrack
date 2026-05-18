import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/ui-constants';

export interface HomeHeaderProps {
  pairedDevices: readonly unknown[];
  isConnected: boolean;
  syncStatus: string;
  showSyncFlash: boolean;
  onlineDevices: number;
  onSync: () => void;
  insetsTop: number;
}

export function HomeHeader({
  pairedDevices,
  isConnected,
  syncStatus,
  showSyncFlash,
  onlineDevices,
  onSync,
  insetsTop,
}: HomeHeaderProps) {
  const canSync = isConnected && syncStatus !== 'syncing';

  const syncIconName =
    showSyncFlash
      ? 'wifi'
      : syncStatus === 'syncing'
        ? 'refresh'
        : 'wifi';

  const syncIconColor =
    showSyncFlash
      ? COLORS.retroGreen
      : isConnected
        ? COLORS.mutedForeground
        : COLORS.retroOrange;

  return (
    <View style={[styles.header, { paddingTop: 12 + insetsTop }]}>
      <View style={styles.headerLeft}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🎮</Text>
        </View>
        <View>
          <Text style={styles.headerTitle1}>Game Time</Text>
          <Text style={styles.headerTitle2}>Tracker</Text>
        </View>
      </View>

      <View style={styles.headerRight}>
        {pairedDevices.length > 0 && (
          <TouchableOpacity
            onPress={canSync ? onSync : undefined}
            disabled={!canSync}
            style={[
              styles.syncButton,
              showSyncFlash && styles.syncButtonFlash,
              !isConnected && styles.syncButtonDisabled,
            ]}
          >
            <Ionicons name={syncIconName} size={14} color={syncIconColor} />
            <Text style={[
              styles.syncButtonText,
              showSyncFlash && styles.syncButtonTextFlash,
              !isConnected && styles.syncButtonTextDisabled,
            ]}>
              {onlineDevices}/{pairedDevices.length}
            </Text>
          </TouchableOpacity>
        )}

        <Link href="/sync" asChild>
          <TouchableOpacity style={styles.iconButtonLarge}>
            <Ionicons name="people" size={20} color={COLORS.mutedForeground} />
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.border,
    backgroundColor: `${COLORS.card}99`,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.muted,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 20,
  },
  headerTitle1: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 1,
    fontFamily: 'PressStart2P',
  },
  headerTitle2: {
    fontSize: 8,
    color: COLORS.mutedForeground,
    letterSpacing: 1,
    fontFamily: 'PressStart2P',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.muted,
  },
  syncButtonFlash: {
    borderColor: COLORS.retroCyan,
    backgroundColor: `${COLORS.retroCyan}20`,
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    fontSize: 8,
    color: COLORS.mutedForeground,
    fontWeight: '600',
    fontFamily: 'PressStart2P',
  },
  syncButtonTextFlash: {
    color: COLORS.retroGreen,
  },
  syncButtonTextDisabled: {
    color: COLORS.mutedForeground,
  },
  iconButtonLarge: {
    padding: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
});
