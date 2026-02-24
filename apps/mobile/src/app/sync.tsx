// Sync / Pair devices screen
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { useSync } from '@/hooks/useSync';
import { useState, useCallback, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'qrcode';
import { SvgXml } from 'react-native-svg';

type SyncMode = 'menu' | 'generate' | 'scan';

export default function SyncScreen() {
  const [mode, setMode] = useState<SyncMode>('menu');
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [scanUrl, setScanUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState(false);

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

  // Flash animation on sync
  useEffect(() => {
    if (lastSyncFlash > 0) {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 800);
    }
  }, [lastSyncFlash]);

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
        color: { dark: '#ffea00', light: '#1a1a2e' },
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
          { text: 'OK', onPress: () => router.back() },
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
  const handleUnpair = (deviceId: string) => {
    Alert.alert(
      'Unpair Device?',
      'This will remove the device pairing.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unpair', style: 'destructive', onPress: () => unpairDevice(deviceId) },
      ]
    );
  };

  // Menu view
  if (mode === 'menu') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Connection Status */}
        <View style={[
          styles.statusCard,
          showFlash && styles.statusCardFlash,
          isConnected ? styles.statusCardConnected : styles.statusCardDisconnected,
        ]}>
          <Ionicons
            name={isConnected ? 'cloud-done' : 'cloud-offline'}
            size={24}
            color={isConnected ? '#05ffa1' : '#ff6b35'}
          />
          <Text style={[
            styles.statusText,
            isConnected ? styles.statusTextConnected : styles.statusTextDisconnected,
          ]}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </Text>
        </View>

        {/* Device Info */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Your Device</Text>
          <Text style={styles.deviceName}>{deviceName}</Text>
          <Text style={styles.deviceId}>{deviceId}</Text>
        </View>

        {/* Paired Devices */}
        {pairedDevices.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>
              Paired Devices ({pairedDevices.filter(d => d.isOnline).length}/{pairedDevices.length} online)
            </Text>
            {pairedDevices.map((device) => (
              <View key={device.deviceId} style={styles.pairedDevice}>
                <View style={styles.deviceInfo}>
                  <Ionicons name="phone-portrait" size={20} color="#888" />
                  <Text style={styles.pairedDeviceName}>{device.deviceName}</Text>
                  <View style={[
                    styles.onlineIndicator,
                    device.isOnline ? styles.onlineIndicatorOn : styles.onlineIndicatorOff,
                  ]} />
                </View>
                <Pressable onPress={() => handleUnpair(device.deviceId)}>
                  <Ionicons name="trash" size={20} color="#ff2a6d" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable
            onPress={handleGenerateQR}
            style={[styles.actionButton, !isConnected && styles.actionButtonDisabled]}
            disabled={!isConnected}
          >
            <Ionicons name="qr-code" size={32} color="#1a1a2e" />
            <Text style={styles.actionButtonText}>SHOW QR CODE</Text>
          </Pressable>

          <Pressable
            onPress={() => setMode('scan')}
            style={[styles.actionButton, styles.actionButtonSecondary, !isConnected && styles.actionButtonDisabled]}
            disabled={!isConnected}
          >
            <Ionicons name="scan" size={32} color="#ffea00" />
            <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>SCAN QR CODE</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // Generate QR view
  if (mode === 'generate') {
    return (
      <View style={styles.container}>
        <View style={styles.qrContainer}>
          <Text style={styles.instructions}>
            Show this QR code to another device to pair
          </Text>

          {isLoading ? (
            <ActivityIndicator size="large" color="#ffea00" />
          ) : qrSvg ? (
            <View style={styles.qrCode}>
              <SvgXml xml={qrSvg} width={280} height={280} />
            </View>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.expiryText}>QR code expires in 5 minutes</Text>
        </View>

        <Pressable onPress={() => setMode('menu')} style={styles.backButton}>
          <Text style={styles.backButtonText}>BACK</Text>
        </Pressable>
      </View>
    );
  }

  // Scan view
  if (mode === 'scan') {
    return (
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffea00" />
            <Text style={styles.loadingText}>Pairing...</Text>
          </View>
        ) : (
          <>
            {/* Camera Scanner */}
            {cameraPermission?.granted ? (
              <View style={styles.scannerContainer}>
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
                <Pressable onPress={requestCameraPermission} style={styles.permissionButton}>
                  <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </Pressable>
              </View>
            )}

            {/* Manual Input */}
            <View style={styles.manualInput}>
              <Text style={styles.manualLabel}>Or paste URL:</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={scanUrl}
                  onChangeText={setScanUrl}
                  placeholder="Paste QR code URL"
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable onPress={handlePaste} style={styles.pasteButton}>
                  <Ionicons name="clipboard" size={20} color="#ffea00" />
                </Pressable>
              </View>
              <Pressable
                onPress={() => handlePairing(scanUrl)}
                style={[styles.pairButton, !scanUrl && styles.pairButtonDisabled]}
                disabled={!scanUrl}
              >
                <Text style={styles.pairButtonText}>PAIR</Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable onPress={() => setMode('menu')} style={styles.backButton}>
              <Text style={styles.backButtonText}>BACK</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 24,
    gap: 16,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  statusCardConnected: {
    backgroundColor: '#05ffa120',
    borderWidth: 2,
    borderColor: '#05ffa1',
  },
  statusCardDisconnected: {
    backgroundColor: '#ff6b3520',
    borderWidth: 2,
    borderColor: '#ff6b35',
  },
  statusCardFlash: {
    backgroundColor: '#00f0ff30',
    borderColor: '#00f0ff',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusTextConnected: {
    color: '#05ffa1',
  },
  statusTextDisconnected: {
    color: '#ff6b35',
  },
  card: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#444',
  },
  cardLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  pairedDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a5e',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pairedDeviceName: {
    fontSize: 14,
    color: '#fff',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineIndicatorOn: {
    backgroundColor: '#05ffa1',
  },
  onlineIndicatorOff: {
    backgroundColor: '#666',
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: '#ffea00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    gap: 12,
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ffea00',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtonTextSecondary: {
    color: '#ffea00',
  },
  qrContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  instructions: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
  },
  qrCode: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  expiryText: {
    fontSize: 12,
    color: '#888',
    marginTop: 16,
  },
  errorText: {
    color: '#ff2a6d',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  backButton: {
    margin: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#ffea00',
    fontSize: 16,
  },
  scannerContainer: {
    height: 300,
    margin: 24,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
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
    borderColor: '#ffea00',
    backgroundColor: 'transparent',
  },
  scanInstructions: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 14,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  permissionContainer: {
    height: 300,
    margin: 24,
    borderRadius: 12,
    backgroundColor: '#2a2a4e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  permissionText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#ffea00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
  },
  manualInput: {
    margin: 24,
    gap: 12,
  },
  manualLabel: {
    color: '#888',
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a4e',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#444',
    padding: 12,
    color: '#fff',
    fontSize: 14,
  },
  pasteButton: {
    padding: 12,
    backgroundColor: '#3a3a5e',
    borderRadius: 8,
  },
  pairButton: {
    backgroundColor: '#ffea00',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  pairButtonDisabled: {
    opacity: 0.5,
  },
  pairButtonText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
