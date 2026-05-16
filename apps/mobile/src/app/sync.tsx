// Sync / Pair devices screen — thin orchestrator
import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { useSync } from '@/hooks/useSync';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'qrcode';
import SyncMenuView from '@/app/sync/SyncMenuView';
import SyncGenerateView from '@/app/sync/SyncGenerateView';
import SyncScanView from '@/app/sync/SyncScanView';

type SyncMode = 'menu' | 'generate' | 'scan';

export default function SyncScreen() {
  const [mode, setMode] = useState<SyncMode>('menu');
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [scanUrl, setScanUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState(false);
  const [scanMethod, setScanMethod] = useState<'camera' | 'manual'>('manual');
  const [showFlash, setShowFlash] = useState(false);
  const [copied, setCopied] = useState(false);
  const insets = useSafeAreaInsets();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const deviceId = useAppStore((s) => s.deviceId);
  const deviceName = useAppStore((s) => s.deviceName);
  const pairedDevices = useAppStore((s) => s.pairedDevices);
  const lastSyncFlash = useAppStore((s) => s.lastSyncFlash);

  const { isConnected, generatePairingToken, completePairing, unpairDevice, ensureRegistered } = useSync();

  // Flash on sync
  useEffect(() => {
    if (lastSyncFlash > 0) {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 800);
    }
  }, [lastSyncFlash]);

  // Reset all state
  const resetState = useCallback(() => {
    setMode('menu');
    setQrSvg(null);
    setScanUrl('');
    setIsLoading(false);
    setError('');
    setScanned(false);
    setScanMethod('manual');
  }, []);

  const clipboardCopy = useCallback(async (text: string, msg?: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (msg) Alert.alert('Copied', msg);
    } catch (e) {
      console.error('Clipboard error:', e);
    }
  }, []);

  const copyDeviceId = useCallback(() => {
    if (deviceId) clipboardCopy(deviceId);
  }, [deviceId, clipboardCopy]);

  const shareDeviceInfo = useCallback(() => {
    if (!deviceId) return;
    const shareText = `Game Time Tracker - Pair with me!\nDevice: ${deviceName}\nID: ${deviceId}`;
    clipboardCopy(shareText, 'Device info copied to clipboard');
  }, [deviceId, deviceName, clipboardCopy]);

  // Generate QR
  const handleGenerateQR = useCallback(async () => {
    setMode('generate');
    setIsLoading(true);
    setError('');
    try {
      const token = await generatePairingToken();
      if (!token) { setError('Failed to generate pairing token'); return; }
      const qrData = { deviceId, deviceName, pairingToken: token, timestamp: Date.now() };
      const qrUrl = `https://gametimetracker.app?sync=${btoa(JSON.stringify(qrData))}`;
      const svg = await QRCode.toString(qrUrl, { type: 'svg', width: 280, margin: 2, color: { dark: '#000', light: '#fff' } });
      setQrSvg(svg);
    } catch {
      setError('Failed to generate QR code');
    } finally {
      setIsLoading(false);
    }
  }, [deviceId, deviceName, generatePairingToken]);

  // Handle pairing (shared by scan + camera)
  const handlePairing = useCallback(async (input: string) => {
    setIsLoading(true);
    setError('');
    try {
      let encodedData = input;
      if (input.includes('?sync=')) {
        encodedData = new URL(input).searchParams.get('sync') || '';
      }
      if (!encodedData) { setError('Invalid QR code'); setScanned(false); return; }

      const decoded = atob(encodedData);
      const data = JSON.parse(decoded);
      if (Date.now() - data.timestamp > 5 * 60 * 1000) { setError('QR code expired. Please generate a new one.'); setScanned(false); return; }
      if (data.deviceId === deviceId) { setError('Cannot pair with your own device'); setScanned(false); return; }

      const registered = await ensureRegistered();
      if (!registered) { setError('Not connected to sync server'); setScanned(false); return; }

      const result = await completePairing(data.pairingToken);
      if (result.success) {
        Alert.alert('Success', `Paired with ${data.deviceName || 'device'}!`, [{ text: 'OK', onPress: () => { resetState(); router.back(); } }]);
      } else {
        setError(result.error || 'Pairing failed');
        setScanned(false);
      }
    } catch {
      setError('Invalid QR code format');
      setScanned(false);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId, ensureRegistered, completePairing, resetState]);

  const handleBarCodeScanned = useCallback(({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    handlePairing(data);
  }, [scanned, handlePairing]);

  const handleUnpair = useCallback((targetId: string) => {
    Alert.alert('Unpair Device?', 'This will remove the device pairing.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unpair', style: 'destructive', onPress: () => unpairDevice(targetId) },
    ]);
  }, [unpairDevice]);

  const handlePaste = useCallback(async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setScanUrl(text);
  }, []);

  const onlineCount = pairedDevices.filter((d) => d.isOnline).length;

  // Data-driven mode rendering
  const views = {
    menu: () => (
      <SyncMenuView
        isConnected={isConnected}
        showFlash={showFlash}
        deviceName={deviceName}
        deviceId={deviceId}
        copied={copied}
        pairedDevices={pairedDevices}
        onlineCount={onlineCount}
        onCopyDeviceId={copyDeviceId}
        onGenerateQR={handleGenerateQR}
        onScan={() => setMode('scan')}
        onUnpair={handleUnpair}
        insets={insets}
      />
    ),
    generate: () => (
      <SyncGenerateView
        isLoading={isLoading}
        qrSvg={qrSvg}
        error={error}
        deviceId={deviceId}
        insets={insets}
        onBack={resetState}
        onShare={shareDeviceInfo}
      />
    ),
    scan: () => (
      <SyncScanView
        isLoading={isLoading}
        scanMethod={scanMethod}
        scanUrl={scanUrl}
        error={error}
        cameraPermission={cameraPermission}
        scanned={scanned}
        insets={insets}
        onBack={resetState}
        onSetScanMethod={setScanMethod}
        onBarCodeScanned={handleBarCodeScanned}
        onRequestCameraPermission={requestCameraPermission}
        onSetScanUrl={setScanUrl}
        onPaste={handlePaste}
        onPair={() => handlePairing(scanUrl)}
      />
    ),
  };

  return views[mode]?.() ?? null;
}
