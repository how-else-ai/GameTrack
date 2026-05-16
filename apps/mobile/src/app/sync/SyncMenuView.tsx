// SyncMenuView — menu mode presentational component
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/ui-constants';

export interface SyncMenuViewProps {
  isConnected: boolean;
  showFlash: boolean;
  deviceName: string;
  deviceId: string;
  copied: boolean;
  pairedDevices: { deviceId: string; deviceName: string; isOnline: boolean }[];
  onlineCount: number;
  onCopyDeviceId: () => void;
  onGenerateQR: () => void;
  onScan: () => void;
  onUnpair: (deviceId: string) => void;
  insets: { top: number; bottom: number };
}

const STATUS_MAP = {
  flash: { icon: 'wifi' as const, color: COLORS.retroGreen, bg: `${COLORS.retroCyan}20`, border: COLORS.retroCyan, label: 'Synced!' },
  connected: { icon: 'cloud-done' as const, color: COLORS.retroGreen, bg: `${COLORS.retroGreen}20`, border: COLORS.retroGreen, label: 'Connected' },
  disconnected: { icon: 'cloud-offline' as const, color: COLORS.retroOrange, bg: `${COLORS.retroOrange}20`, border: COLORS.retroOrange, label: 'Connecting...' },
} as const;

function getStatusKey(showFlash: boolean, isConnected: boolean): keyof typeof STATUS_MAP {
  if (showFlash) return 'flash';
  return isConnected ? 'connected' : 'disconnected';
}

export default function SyncMenuView({
  isConnected,
  showFlash,
  deviceName,
  deviceId,
  copied,
  pairedDevices,
  onlineCount,
  onCopyDeviceId,
  onGenerateQR,
  onScan,
  onUnpair,
  insets,
}: SyncMenuViewProps) {
  const status = STATUS_MAP[getStatusKey(showFlash, isConnected)];

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
      {/* How it works */}
      <View style={styles.infoCard}>
        <Ionicons name="swap-horizontal" size={16} color={COLORS.retroCyan} />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>How Sync Works</Text>
          <Text style={styles.infoText}>
            1. Device A: Show QR{'\n'}
            2. Device B: Scan QR{'\n'}
            3. Both stay on this screen
          </Text>
        </View>
      </View>

      {/* Connection Status */}
      <View style={[styles.statusCard, { backgroundColor: status.bg, borderColor: status.border }]}>
        <Ionicons name={status.icon} size={20} color={status.color} />
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>

      {/* Your Device Info */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Your Device</Text>
        <Text style={styles.deviceName}>{deviceName}</Text>
        <View style={styles.deviceIdRow}>
          <Text style={styles.deviceId} numberOfLines={1}>{deviceId}</Text>
          <TouchableOpacity onPress={onCopyDeviceId} style={styles.copyButton}>
            <Ionicons name={copied ? 'checkmark' : 'copy'} size={12} color={copied ? COLORS.retroGreen : COLORS.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Paired Devices */}
      {pairedDevices.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>
            Paired ({onlineCount}/{pairedDevices.length} online)
          </Text>
          {pairedDevices.map((device) => (
            <View key={device.deviceId} style={styles.pairedDevice}>
              <View style={styles.deviceInfo}>
                <Ionicons name="phone-portrait" size={16} color={COLORS.mutedForeground} />
                <Text style={styles.pairedDeviceName}>{device.deviceName}</Text>
                <View style={[styles.onlineIndicator, device.isOnline ? styles.onlineIndicatorOn : styles.onlineIndicatorOff]} />
              </View>
              <TouchableOpacity onPress={() => onUnpair(device.deviceId)} style={styles.deleteButton}>
                <Ionicons name="trash" size={16} color={COLORS.retroMagenta} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onGenerateQR}
          style={[styles.actionButton, !isConnected && styles.actionButtonDisabled]}
          disabled={!isConnected}
        >
          <Ionicons name="qr-code" size={32} color={COLORS.background} />
          <Text style={styles.actionButtonText}>SHOW QR CODE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onScan}
          style={[styles.actionButton, styles.actionButtonSecondary, !isConnected && styles.actionButtonDisabled]}
          disabled={!isConnected}
        >
          <Ionicons name="scan" size={32} color={COLORS.primary} />
          <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>SCAN QR CODE</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: `${COLORS.retroCyan}20`,
    borderWidth: 2,
    borderColor: COLORS.retroCyan,
    borderRadius: 8,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 8,
    color: COLORS.retroCyan,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 8,
    color: COLORS.mutedForeground,
    lineHeight: 12,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 2,
    borderRadius: 8,
    gap: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    borderWidth: 4,
    borderColor: COLORS.border,
  },
  cardLabel: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  deviceIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceId: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    flex: 1,
  },
  copyButton: {
    padding: 4,
  },
  pairedDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pairedDeviceName: {
    fontSize: 12,
    color: COLORS.text,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineIndicatorOn: {
    backgroundColor: COLORS.retroGreen,
  },
  onlineIndicatorOff: {
    backgroundColor: COLORS.border,
  },
  deleteButton: {
    padding: 8,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 8,
    gap: 12,
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 4,
    borderColor: COLORS.primary,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionButtonTextSecondary: {
    color: COLORS.primary,
  },
});
