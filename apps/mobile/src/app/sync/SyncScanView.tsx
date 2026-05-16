// SyncScanView — scan mode presentational component
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { COLORS } from '@/lib/ui-constants';

export interface SyncScanViewProps {
  isLoading: boolean;
  scanMethod: 'camera' | 'manual';
  scanUrl: string;
  error: string;
  cameraPermission: { granted: boolean } | null;
  scanned: boolean;
  insets: { top: number; bottom: number };
  onBack: () => void;
  onSetScanMethod: (method: 'camera' | 'manual') => void;
  onBarCodeScanned: (data: { data: string }) => void;
  onRequestCameraPermission: () => void;
  onSetScanUrl: (url: string) => void;
  onPaste: () => void;
  onPair: () => void;
}

const METHODS = [
  { key: 'camera' as const, icon: 'camera', label: 'CAMERA' },
  { key: 'manual' as const, icon: 'clipboard', label: 'PASTE URL' },
] as const;

export default function SyncScanView({
  isLoading,
  scanMethod,
  scanUrl,
  error,
  cameraPermission,
  scanned,
  insets,
  onBack,
  onSetScanMethod,
  onBarCodeScanned,
  onRequestCameraPermission,
  onSetScanUrl,
  onPaste,
  onPair,
}: SyncScanViewProps) {
  const showCamera = scanMethod === 'camera' && !isLoading;
  const showManual = scanMethod === 'manual' && !isLoading;
  const hasPermission = cameraPermission?.granted ?? false;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scanContent, { paddingBottom: insets.bottom + 24 }]}>
        {/* Instructions */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTextCenter}>
            Scan QR from other device OR paste URL from camera app
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Pairing...</Text>
          </View>
        ) : (
          <>
            {/* Method selector */}
            <View style={styles.methodSelector}>
              {METHODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => onSetScanMethod(m.key)}
                  style={[styles.methodButton, scanMethod === m.key && styles.methodButtonSelected]}
                >
                  <Ionicons name={m.icon} size={20} color={scanMethod === m.key ? COLORS.background : COLORS.primary} />
                  <Text style={[styles.methodButtonText, scanMethod === m.key && styles.methodButtonTextSelected]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Camera Scanner */}
            {showCamera && (
              <View style={styles.scannerSection}>
                {hasPermission ? (
                  <View style={styles.cameraContainer}>
                    <CameraView
                      style={styles.camera}
                      facing="back"
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                      onBarcodeScanned={scanned ? undefined : onBarCodeScanned}
                    />
                    <View style={styles.scanOverlay}>
                      <View style={styles.scanFrame} />
                    </View>
                    <Text style={styles.scanInstructions}>Point camera at QR code</Text>
                  </View>
                ) : (
                  <View style={styles.permissionContainer}>
                    <Text style={styles.permissionText}>
                      Camera permission is required to scan QR codes
                    </Text>
                    <TouchableOpacity onPress={onRequestCameraPermission} style={styles.permissionButton}>
                      <Text style={styles.permissionButtonText}>Grant Permission</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Manual Input */}
            {showManual && (
              <View style={styles.manualSection}>
                <Text style={styles.manualLabel}>Paste URL from QR scan</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={scanUrl}
                    onChangeText={onSetScanUrl}
                    placeholder="Paste URL here (from camera app)"
                    placeholderTextColor={COLORS.mutedForeground}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={onPaste} style={styles.pasteButton}>
                    <Ionicons name="clipboard" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.tipText}>
                  Tip: Use your phone's camera app to scan, then copy the URL and paste here
                </Text>
                <TouchableOpacity
                  onPress={onPair}
                  style={[styles.pairButton, !scanUrl && styles.pairButtonDisabled]}
                  disabled={!scanUrl}
                >
                  <Text style={styles.pairButtonText}>PAIR DEVICE</Text>
                </TouchableOpacity>
              </View>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </>
        )}
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
  scanContent: {
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
  methodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 4,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  methodButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  methodButtonText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  methodButtonTextSelected: {
    color: COLORS.background,
  },
  scannerSection: {
    gap: 12,
  },
  cameraContainer: {
    height: 280,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: COLORS.border,
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  scanInstructions: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: COLORS.text,
    fontSize: 12,
  },
  permissionContainer: {
    height: 200,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 16,
  },
  permissionText: {
    color: COLORS.mutedForeground,
    fontSize: 12,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  manualSection: {
    gap: 12,
  },
  manualLabel: {
    color: COLORS.mutedForeground,
    fontSize: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.muted,
    borderWidth: 4,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    color: COLORS.text,
    fontSize: 12,
  },
  pasteButton: {
    padding: 12,
    backgroundColor: COLORS.card,
    borderWidth: 4,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
  tipText: {
    fontSize: 8,
    color: COLORS.mutedForeground,
  },
  pairButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  pairButtonDisabled: {
    opacity: 0.5,
  },
  pairButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  loadingText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.retroMagenta,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});
