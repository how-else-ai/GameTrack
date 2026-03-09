// Sync / Pair devices screen (aligned with web app)
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { useSync } from '@/hooks/useSync';
import { useState, useCallback, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'qrcode';
import { SvgXml } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Theme colors
const COLORS = {
  background: '#0a0a12',
  card: '#12121f',
  primary: '#ffea00',
  retroCyan: '#00f0ff',
  retroMagenta: '#ff2a6d',
  retroGreen: '#05ffa1',
  retroOrange: '#ff6b35',
  retroPurple: '#b967ff',
  border: '#3a3a5e',
  muted: '#1a1a2e',
  mutedForeground: '#8888aa',
  text: '#f0f0f0',
};

type SyncMode = 'menu' | 'generate' | 'scan';

export default function SyncScreen() {
  const [mode, setMode] = useState<SyncMode>('menu');
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [scanUrl, setScanUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState(false);
  const [scanMethod, setScanMethod] = useState<'camera' | 'manual'>('manual');
  const insets = useSafeAreaInsets();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const deviceId = useAppStore((state) => state.deviceId);
  const deviceName = useAppStore((state) => state.deviceName);
  const pairedDevices = useAppStore((state) => state.pairedDevices);
  const lastSyncFlash = useAppStore((state) => state.lastSyncFlash);

  const {
    isConnected,
    generatePairingToken,
    completePairing,
    unpairDevice,
    ensureRegistered,
  } = useSync();

  const [showFlash, setShowFlash] = useState(false);
  const [copied, setCopied] = useState(false);

  // Flash animation on sync
  useEffect(() => {
    if (lastSyncFlash > 0) {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 800);
    }
  }, [lastSyncFlash]);

  // Reset state helper
  const resetState = useCallback(() => {
    setMode('menu');
    setQrSvg(null);
    setScanUrl('');
    setIsLoading(false);
    setError('');
    setScanned(false);
    setScanMethod('manual');
  }, []);

  // Copy device ID to clipboard
  const copyDeviceId = useCallback(async () => {
    if (!deviceId) return;
    try {
      await Clipboard.setStringAsync(deviceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [deviceId]);

  // Share device info
  const shareDeviceInfo = useCallback(async () => {
    if (!deviceId) return;
    const shareText = `Game Time Tracker - Pair with me!\nDevice: ${deviceName}\nID: ${deviceId}`;
    try {
      await Clipboard.setStringAsync(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      Alert.alert('Copied', 'Device info copied to clipboard');
    } catch (error) {
      console.error('Failed to share:', error);
    }
  }, [deviceId, deviceName]);

  // Generate QR code
  const handleGenerateQR = useCallback(async () => {
    setMode('generate');
    setIsLoading(true);
    setError('');

    try {
      const token = await generatePairingToken();
      if (!token) {
        setError('Failed to generate pairing token');
        setIsLoading(false);
        return;
      }

      const qrData = {
        deviceId,
        deviceName,
        pairingToken: token,
        timestamp: Date.now(),
      };

      const encodedData = btoa(JSON.stringify(qrData));
      const qrUrl = `https://gametimetracker.app?sync=${encodedData}`;

      const svg = await QRCode.toString(qrUrl, {
        type: 'svg',
        width: 280,
        margin: 2,
        color: { dark: '#000', light: '#fff' },
      });

      setQrSvg(svg);
    } catch (err) {
      setError('Failed to generate QR code');
    } finally {
      setIsLoading(false);
    }
  }, [deviceId, deviceName, generatePairingToken]);

  // Handle QR code scan
  const handleBarCodeScanned = useCallback(async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    await handlePairing(data);
  }, [scanned]);

  // Handle pairing
  const handlePairing = async (input: string) => {
    setIsLoading(true);
    setError('');

    try {
      // Parse the QR data
      let encodedData = input;
      if (input.includes('?sync=')) {
        const url = new URL(input);
        encodedData = url.searchParams.get('sync') || '';
      }

      if (!encodedData) {
        setError('Invalid QR code');
        setIsLoading(false);
        setScanned(false);
        return;
      }

      const decoded = atob(encodedData);
      const data = JSON.parse(decoded);

      // Check expiry (5 minutes)
      if (Date.now() - data.timestamp > 5 * 60 * 1000) {
        setError('QR code expired. Please generate a new one.');
        setIsLoading(false);
        setScanned(false);
        return;
      }

      if (data.deviceId === deviceId) {
        setError('Cannot pair with your own device');
        setIsLoading(false);
        setScanned(false);
        return;
      }

      // Ensure registered
      const registered = await ensureRegistered();
      if (!registered) {
        setError('Not connected to sync server');
        setIsLoading(false);
        setScanned(false);
        return;
      }

      // Complete pairing
      const result = await completePairing(data.pairingToken);

      if (result.success) {
        Alert.alert('Success', `Paired with ${data.deviceName || 'device'}!`, [
          { text: 'OK', onPress: () => {
            resetState();
            router.back();
          }},
        ]);
      } else {
        setError(result.error || 'Pairing failed');
        setScanned(false);
      }
    } catch (err) {
      setError('Invalid QR code format');
      setScanned(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle paste from clipboard
  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setScanUrl(text);
    }
  };

  // Unpair device
  const handleUnpair = (targetDeviceId: string) => {
    const device = pairedDevices.find(d => d.deviceId === targetDeviceId);
    Alert.alert(
      'Unpair Device?',
      'This will remove the device pairing.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unpair', style: 'destructive', onPress: () => unpairDevice(targetDeviceId) },
      ]
    );
  };

  const onlineCount = pairedDevices.filter(d => d.isOnline).length;

  // Menu view
  if (mode === 'menu') {
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
        <View style={[
          styles.statusCard,
          showFlash ? styles.statusCardFlash : isConnected ? styles.statusCardConnected : styles.statusCardDisconnected,
        ]}>
          <Ionicons
            name={showFlash ? 'wifi' : isConnected ? 'cloud-done' : 'cloud-offline'}
            size={20}
            color={showFlash ? COLORS.retroGreen : isConnected ? COLORS.retroGreen : COLORS.retroOrange}
          />
          <Text style={[
            styles.statusText,
            showFlash ? styles.statusTextFlash : isConnected ? styles.statusTextConnected : styles.statusTextDisconnected,
          ]}>
            {showFlash ? 'Synced!' : isConnected ? 'Connected' : 'Connecting...'}
          </Text>
        </View>

        {/* Your Device Info */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Your Device</Text>
          <Text style={styles.deviceName}>{deviceName}</Text>
          <View style={styles.deviceIdRow}>
            <Text style={styles.deviceId} numberOfLines={1}>{deviceId}</Text>
            <TouchableOpacity onPress={copyDeviceId} style={styles.copyButton}>
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
                  <View style={[
                    styles.onlineIndicator,
                    device.isOnline ? styles.onlineIndicatorOn : styles.onlineIndicatorOff,
                  ]} />
                </View>
                <TouchableOpacity onPress={() => handleUnpair(device.deviceId)} style={styles.deleteButton}>
                  <Ionicons name="trash" size={16} color={COLORS.retroMagenta} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleGenerateQR}
            style={[styles.actionButton, !isConnected && styles.actionButtonDisabled]}
            disabled={!isConnected}
          >
            <Ionicons name="qr-code" size={32} color={COLORS.background} />
            <Text style={styles.actionButtonText}>SHOW QR CODE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode('scan')}
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

  // Generate QR view
  if (mode === 'generate') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={resetState} style={styles.backButton}>
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
              <TouchableOpacity onPress={shareDeviceInfo} style={styles.shareButton}>
                <Ionicons name="share" size={16} color={COLORS.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={styles.deviceId}>{deviceId}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Scan view
  if (mode === 'scan') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={resetState} style={styles.backButton}>
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
                <TouchableOpacity
                  onPress={() => setScanMethod('camera')}
                  style={[styles.methodButton, scanMethod === 'camera' && styles.methodButtonSelected]}
                >
                  <Ionicons name="camera" size={20} color={scanMethod === 'camera' ? COLORS.background : COLORS.primary} />
                  <Text style={[
                    styles.methodButtonText,
                    scanMethod === 'camera' && styles.methodButtonTextSelected,
                  ]}>
                    CAMERA
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setScanMethod('manual')}
                  style={[styles.methodButton, scanMethod === 'manual' && styles.methodButtonSelected]}
                >
                  <Ionicons name="clipboard" size={20} color={scanMethod === 'manual' ? COLORS.background : COLORS.primary} />
                  <Text style={[
                    styles.methodButtonText,
                    scanMethod === 'manual' && styles.methodButtonTextSelected,
                  ]}>
                    PASTE URL
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Camera Scanner */}
              {scanMethod === 'camera' && (
                <View style={styles.scannerSection}>
                  {cameraPermission?.granted ? (
                    <View style={styles.cameraContainer}>
                      <CameraView
                        style={styles.camera}
                        facing="back"
                        barcodeScannerSettings={{
                          barcodeTypes: ['qr'],
                        }}
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                      />
                      <View style={styles.scanOverlay}>
                        <View style={styles.scanFrame} />
                      </View>
                      <Text style={styles.scanInstructions}>
                        Point camera at QR code
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.permissionContainer}>
                      <Text style={styles.permissionText}>
                        Camera permission is required to scan QR codes
                      </Text>
                      <TouchableOpacity onPress={requestCameraPermission} style={styles.permissionButton}>
                        <Text style={styles.permissionButtonText}>Grant Permission</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Manual Input */}
              {scanMethod === 'manual' && (
                <View style={styles.manualSection}>
                  <Text style={styles.manualLabel}>Paste URL from QR scan</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={scanUrl}
                      onChangeText={setScanUrl}
                      placeholder="Paste URL here (from camera app)"
                      placeholderTextColor={COLORS.mutedForeground}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity onPress={handlePaste} style={styles.pasteButton}>
                      <Ionicons name="clipboard" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.tipText}>
                    Tip: Use your phone's camera app to scan, then copy the URL and paste here
                  </Text>
                  <TouchableOpacity
                    onPress={() => handlePairing(scanUrl)}
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

  return null;
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
  infoTextCenter: {
    fontSize: 8,
    color: COLORS.retroCyan,
    textAlign: 'center',
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
  statusCardConnected: {
    backgroundColor: `${COLORS.retroGreen}20`,
    borderColor: COLORS.retroGreen,
  },
  statusCardDisconnected: {
    backgroundColor: `${COLORS.retroOrange}20`,
    borderColor: COLORS.retroOrange,
  },
  statusCardFlash: {
    backgroundColor: `${COLORS.retroCyan}20`,
    borderColor: COLORS.retroCyan,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusTextConnected: {
    color: COLORS.retroGreen,
  },
  statusTextDisconnected: {
    color: COLORS.retroOrange,
  },
  statusTextFlash: {
    color: COLORS.retroGreen,
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
  deviceIdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shareButton: {
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
  qrContainer: {
    alignItems: 'center',
    padding: 16,
  },
  qrCode: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
  },
  expiryText: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.retroMagenta,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
  scanContent: {
    padding: 16,
    gap: 16,
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
});
