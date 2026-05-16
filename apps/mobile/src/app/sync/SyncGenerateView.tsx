// SyncGenerateView — QR generate mode presentational component
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { COLORS } from '@/lib/ui-constants';

export interface SyncGenerateViewProps {
  isLoading: boolean;
  qrSvg: string | null;
  error: string;
  deviceId: string;
  insets: { top: number; bottom: number };
  onBack: () => void;
  onShare: () => void;
}

export default function SyncGenerateView({
  isLoading,
  qrSvg,
  error,
  deviceId,
  insets,
  onBack,
  onShare,
}: SyncGenerateViewProps) {
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Show QR Code</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.generateContent, { paddingBottom: insets.bottom + 24 }]}>
        {/* Instructions */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTextCenter}>
            1. Keep this screen open{'\n'}
            2. On other device: tap SCAN QR{'\n'}
            3. Point camera at this QR code
          </Text>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : qrSvg ? (
            <View style={styles.qrCode}>
              <SvgXml xml={qrSvg} width={280} height={280} />
            </View>
          ) : null}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.expiryText}>QR code expires in 5 minutes</Text>

        {/* Device Info */}
        <View style={styles.card}>
          <View style={styles.deviceIdHeader}>
            <Text style={styles.cardLabel}>Your Device ID:</Text>
            <TouchableOpacity onPress={onShare} style={styles.shareButton}>
              <Ionicons name="share" size={16} color={COLORS.mutedForeground} />
            </TouchableOpacity>
          </View>
          <Text style={styles.deviceId}>{deviceId}</Text>
        </View>
      </ScrollView>
    </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.border,
    backgroundColor: `${COLORS.card}99`,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: 8,
  },
  generateContent: {
    padding: 16,
    gap: 16,
  },
  infoCard: {
    padding: 12,
    backgroundColor: `${COLORS.retroCyan}20`,
    borderWidth: 2,
    borderColor: COLORS.retroCyan,
    borderRadius: 8,
  },
  infoTextCenter: {
    fontSize: 8,
    color: COLORS.retroCyan,
    textAlign: 'center',
    lineHeight: 12,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 16,
  },
  qrCode: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
  },
  errorText: {
    color: COLORS.retroMagenta,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
  expiryText: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    borderWidth: 4,
    borderColor: COLORS.border,
  },
  deviceIdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  shareButton: {
    padding: 4,
  },
  deviceId: {
    fontSize: 10,
    color: COLORS.mutedForeground,
  },
});
