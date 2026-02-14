'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  QrCode,
  Camera,
  Smartphone,
  Trash2,
  RefreshCw,
  Users,
  Check,
  X,
  Wifi,
  Keyboard,
  ArrowRightLeft,
  Copy,
  Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { useAppStore } from '@/lib/store';
import { useSync } from '@/hooks/useSync';

interface SyncManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SyncManager({ open, onOpenChange }: SyncManagerProps) {
  const [mode, setMode] = useState<'menu' | 'generate' | 'scan'>('menu');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [scanInput, setScanInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [scanMethod, setScanMethod] = useState<'camera' | 'manual'>('manual');
  const [copied, setCopied] = useState(false);
  const [qrData, setQrData] = useState<{ deviceId: string; deviceName: string; pairingToken: string; timestamp: number } | null>(null);
  const [showSyncFlash, setShowSyncFlash] = useState(false);
  const initializedRef = useRef(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const initialPairedCountRef = useRef<number>(0);

  const {
    deviceId,
    deviceName,
    pairedDevices,
    lastSyncFlash,
  } = useAppStore();

  const { completePairing, requestFullSync, generatePairingToken, unpairDevice, isConnected, isRegistered, ensureRegistered } = useSync();

  // Track sync flash animation
  useEffect(() => {
    if (lastSyncFlash > 0) {
      // Defer setState to avoid cascading renders
      const rafId = requestAnimationFrame(() => {
        setShowSyncFlash(true);
      });
      const timer = setTimeout(() => setShowSyncFlash(false), 800);
      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timer);
      };
    }
  }, [lastSyncFlash]);

  // Reset state helper
  const resetState = useCallback(() => {
    setMode('menu');
    setQrDataUrl('');
    setScanInput('');
    setStatus('idle');
    setErrorMessage('');
    setScanMethod('manual');
    setCopied(false);
    setQrData(null);
    initialPairedCountRef.current = 0;
    // Stop scanner if running
    if (scannerRef.current && isScanningRef.current) {
      scannerRef.current.stop().catch(() => {});
      isScanningRef.current = false;
    }
  }, []);

  // Auto-close dialog when new device pairs (while showing QR)
  useEffect(() => {
    if (mode === 'generate' && open) {
      // Store initial count when entering generate mode
      if (initialPairedCountRef.current === 0) {
        initialPairedCountRef.current = pairedDevices.length;
      }
      // Check if new device paired
      if (pairedDevices.length > initialPairedCountRef.current) {
        // New device connected - auto close after brief delay
        const timer = setTimeout(() => {
          onOpenChange(false);
          resetState();
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [pairedDevices.length, mode, open, onOpenChange, resetState]);

  // Copy device ID to clipboard
  const copyDeviceId = useCallback(async () => {
    if (!deviceId) return;
    try {
      await navigator.clipboard.writeText(deviceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [deviceId]);

  // Share device info
  const shareDeviceInfo = useCallback(async () => {
    if (!deviceId || !qrData) return;
    const shareText = `Game Time Tracker - Pair with me!\nDevice: ${deviceName}\nID: ${deviceId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Game Time Tracker Pairing',
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  }, [deviceId, deviceName, qrData]);

  // Generate QR Code with pairing token
  const generateQR = useCallback(async () => {
    if (!deviceId) return;

    try {
      setStatus('loading');

      const pairingToken = await generatePairingToken();
      
      if (!pairingToken) {
        throw new Error('Failed to generate pairing token - make sure you are connected');
      }

      // Create QR data with pairing token and device info
      const connectionData = {
        deviceId,
        deviceName,
        pairingToken,
        timestamp: Date.now(),
      };

      setQrData(connectionData);

      const encodedData = btoa(JSON.stringify(connectionData));
      const qrUrl = `${window.location.origin}?sync=${encodedData}`;

      const dataUrl = await QRCode.toDataURL(qrUrl, {
        width: 280,
        margin: 2,
        color: { dark: '#000', light: '#fff' },
      });

      setQrDataUrl(dataUrl);
      setStatus('idle');
    } catch (error) {
      console.error('Failed to generate QR:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate QR code');
    }
  }, [deviceId, deviceName, generatePairingToken]);

  // Parse sync URL from QR code
  const parseSyncUrl = useCallback((urlOrToken: string) => {
    try {
      let encodedData = urlOrToken;

      if (urlOrToken.includes('?sync=')) {
        const url = new URL(urlOrToken);
        encodedData = url.searchParams.get('sync') || '';
      }

      if (!encodedData) return null;

      const decoded = atob(encodedData);
      const data = JSON.parse(decoded);

      // Check if QR code is expired (5 minutes)
      if (Date.now() - data.timestamp > 5 * 60 * 1000) {
        return { ...data, expired: true };
      }

      return data;
    } catch (error) {
      console.error('Failed to parse sync URL:', error);
      return null;
    }
  }, []);

  // Connect via token
  const connectViaToken = useCallback(async (input: string) => {
    const connectionData = parseSyncUrl(input);

    if (!connectionData) {
      setStatus('error');
      setErrorMessage('Invalid QR code format');
      return;
    }

    if (connectionData.expired) {
      setStatus('error');
      setErrorMessage('QR code expired (valid for 5 minutes). Please generate a new one.');
      return;
    }

    if (connectionData.deviceId === deviceId) {
      setStatus('error');
      setErrorMessage('Cannot pair with your own device');
      return;
    }

    if (!connectionData.pairingToken) {
      setStatus('error');
      setErrorMessage('Invalid QR code - missing pairing token');
      return;
    }

    try {
      setStatus('loading');

      // Check if already paired
      const alreadyPaired = pairedDevices.find(d => d.deviceId === connectionData.deviceId);
      if (alreadyPaired) {
        setStatus('success');
        setTimeout(() => {
          onOpenChange(false);
          resetState();
        }, 1500);
        return;
      }

      // Wait for registration if needed
      console.log('[SYNC] Ensuring registration before pairing...');
      const registered = await ensureRegistered();
      if (!registered) {
        setStatus('error');
        setErrorMessage('Cannot connect to sync server. Please check your internet connection.');
        return;
      }

      console.log('[SYNC] Registered, attempting to complete pairing...');
      const result = await completePairing(connectionData.pairingToken);

      if (result.success) {
        setTimeout(() => {
          requestFullSync();
        }, 500);

        setStatus('success');
        setTimeout(() => {
          onOpenChange(false);
          resetState();
        }, 2000);
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Pairing failed. Please try again.');
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      setStatus('error');
      setErrorMessage('Connection failed - please try again');
    }
  }, [deviceId, pairedDevices, completePairing, requestFullSync, onOpenChange, resetState, parseSyncUrl, ensureRegistered]);

  // Start camera scanner
  const startScanner = useCallback(async () => {
    if (scannerRef.current && isScanningRef.current) return;

    try {
      const scannerId = 'qr-scanner-container';
      scannerRef.current = new Html5Qrcode(scannerId);
      
      // Calculate square scanner size based on container
      const container = document.getElementById(scannerId);
      const size = container ? Math.min(container.offsetWidth, 280) : 250;
      
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: function(viewfinderWidth, viewfinderHeight) {
            // Always return square dimensions
            const minDimension = Math.min(viewfinderWidth, viewfinderHeight);
            const boxSize = Math.floor(minDimension * 0.8);
            return { width: boxSize, height: boxSize };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Stop scanner on success
          if (scannerRef.current && isScanningRef.current) {
            scannerRef.current.stop().catch(() => {});
            isScanningRef.current = false;
          }
          connectViaToken(decodedText);
        },
        (errorMessage) => {
          // Log scan errors for debugging (but don't show to user)
          console.log('[QR] Scan attempt:', errorMessage);
        }
      );
      isScanningRef.current = true;
    } catch (error) {
      console.error('Failed to start scanner:', error);
      // Fall back to manual mode
      setScanMethod('manual');
      setErrorMessage('Camera not available. Use manual entry or your phone\'s camera app.');
      setStatus('error');
    }
  }, [connectViaToken]);

  // Stop scanner
  const stopScanner = useCallback(async () => {
    if (scannerRef.current && isScanningRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (error) {
        console.error('Failed to stop scanner:', error);
      }
      isScanningRef.current = false;
    }
  }, []);

  // Remove synced device
  const removeDevice = useCallback(async (targetDeviceId: string) => {
    await unpairDevice(targetDeviceId);
  }, [unpairDevice]);

  // Handle sync URL parameter
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const url = new URL(window.location.href);
    const syncParam = url.searchParams.get('sync');
    if (syncParam) {
      window.history.replaceState({}, '', window.location.pathname);
      // Open sync dialog and try to connect
      setTimeout(() => {
        setMode('scan');
        setScanInput(syncParam);
        setScanMethod('manual');
        // Wait for sync to initialize (registration takes a moment)
        setTimeout(() => {
          connectViaToken(syncParam);
        }, 1500);
      }, 100);
    }
  }, [connectViaToken]);

  // Generate QR when mode changes
  useEffect(() => {
    if (mode === 'generate') {
      const timer = setTimeout(() => {
        generateQR();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [mode, generateQR]);

  // Start/stop scanner when scan method changes
  useEffect(() => {
    if (mode === 'scan' && scanMethod === 'camera' && status === 'idle') {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startScanner();
      }, 100);
      return () => clearTimeout(timer);
    } else if (scanMethod !== 'camera' || status !== 'idle') {
      stopScanner();
    }
  }, [mode, scanMethod, status, startScanner, stopScanner]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanningRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleClose = (v: boolean) => {
    if (!v) {
      stopScanner();
      resetState();
    }
    onOpenChange(v);
  };

  const onlineCount = pairedDevices.filter(d => d.isOnline).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            PAIR DEVICES
          </DialogTitle>
          <DialogDescription className="font-pixel text-[8px] uppercase">
            Pair devices to enable direct data sync between them.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {mode === 'menu' && (
            <motion.div key="menu" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              {/* How it works */}
              <Card className="bg-[var(--retro-cyan)]/10 border-[var(--retro-cyan)]">
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    <ArrowRightLeft className="h-4 w-4 text-[var(--retro-cyan)] shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-pixel text-[8px] text-[var(--retro-cyan)] uppercase mb-1">How Sync Works</p>
                      <p className="font-pixel text-[8px] text-muted-foreground uppercase">
                        1. Device A: Show QR<br/>
                        2. Device B: Scan QR<br/>
                        3. Both stay on this screen
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Connection Status */}
              <div className={`flex items-center gap-2 p-3 border-2 transition-all ${
                showSyncFlash 
                  ? 'sync-heartbeat'
                  : isConnected 
                    ? 'bg-[var(--retro-green)]/10 border-[var(--retro-green)]' 
                    : 'bg-[var(--retro-orange)]/10 border-[var(--retro-orange)]'
              }`}>
                {showSyncFlash ? (
                  <>
                    <Wifi className="h-4 w-4" />
                    <span className="font-pixel text-[10px] uppercase">Synced!</span>
                  </>
                ) : isConnected ? (
                  <>
                    <Wifi className="h-4 w-4 text-[var(--retro-green)]" />
                    <span className="font-pixel text-[10px] text-[var(--retro-green)] uppercase">Connected</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 text-[var(--retro-orange)] animate-spin" />
                    <span className="font-pixel text-[10px] text-[var(--retro-orange)] uppercase">Connecting...</span>
                  </>
                )}
              </div>

              {/* Your Device Info */}
              <div className="bg-muted p-3 border-2 border-border space-y-2">
                <p className="font-pixel text-[8px] uppercase text-muted-foreground">Your Device:</p>
                <p className="font-pixel text-[10px] text-primary uppercase">{deviceName}</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[8px] break-all flex-1 select-all">{deviceId}</p>
                  <Button variant="ghost" size="sm" onClick={copyDeviceId} className="shrink-0 p-1 h-auto">
                    {copied ? <Check className="h-3 w-3 text-[var(--retro-green)]" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              {/* Paired Devices */}
              {pairedDevices.length > 0 && (
                <div className="space-y-2">
                  <Label className="font-pixel text-[10px] text-muted-foreground uppercase">
                    Paired ({onlineCount}/{pairedDevices.length} online)
                  </Label>
                  {pairedDevices.map((device) => (
                    <Card key={device.deviceId} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs">{device.deviceName}</span>
                          <div className={`w-2 h-2 ${device.isOnline ? 'bg-[var(--retro-green)]' : 'bg-muted-foreground'}`} />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeDevice(device.deviceId)} className="border-2 border-transparent hover:border-destructive">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => setMode('generate')} disabled={!isConnected}>
                  <QrCode className="h-6 w-6" />
                  <span className="font-pixel text-[10px]">SHOW QR</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => setMode('scan')} disabled={!isConnected}>
                  <Camera className="h-6 w-6" />
                  <span className="font-pixel text-[10px]">SCAN QR</span>
                </Button>
              </div>
            </motion.div>
          )}

          {mode === 'generate' && (
            <motion.div key="generate" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* Instructions */}
              <Card className="bg-[var(--retro-cyan)]/10 border-[var(--retro-cyan)]">
                <CardContent className="p-3">
                  <p className="font-pixel text-[8px] text-[var(--retro-cyan)] text-center uppercase">
                    1. Keep this screen open<br/>
                    2. On other device: tap SCAN QR<br/>
                    3. Point camera at this QR code
                  </p>
                </CardContent>
              </Card>

              {/* QR Code */}
              <div className="flex justify-center">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Pairing QR Code" className="border-4 border-border bg-white p-2" />
                ) : (
                  <div className="w-64 h-64 bg-muted animate-pulse flex items-center justify-center border-4 border-border">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              {status === 'loading' && (
                <p className="font-pixel text-[10px] text-center text-muted-foreground uppercase">
                  <RefreshCw className="h-4 w-4 inline animate-spin mr-2" />
                  Generating QR...
                </p>
              )}

              {status === 'error' && (
                <p className="font-pixel text-[10px] text-center text-destructive uppercase">
                  {errorMessage}
                </p>
              )}

              {/* Device Info */}
              <div className="bg-muted p-3 border-2 border-border space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-pixel text-[8px] uppercase text-muted-foreground">Your Device ID:</p>
                  <Button variant="ghost" size="sm" onClick={shareDeviceInfo} className="p-1 h-auto">
                    <Share2 className="h-3 w-3" />
                  </Button>
                </div>
                <p className="font-mono text-[8px] break-all select-all">{deviceId}</p>
                <p className="font-pixel text-[8px] text-muted-foreground uppercase">
                  QR expires in 5 minutes
                </p>
              </div>

              <Button variant="outline" className="w-full" onClick={resetState}>
                BACK
              </Button>
            </motion.div>
          )}

          {mode === 'scan' && (
            <motion.div key="scan" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* Instructions */}
              <Card className="bg-[var(--retro-cyan)]/10 border-[var(--retro-cyan)]">
                <CardContent className="p-3">
                  <p className="font-pixel text-[8px] text-[var(--retro-cyan)] text-center uppercase">
                    Scan QR from other device OR paste URL from camera app
                  </p>
                </CardContent>
              </Card>

              {status === 'loading' && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                  <p className="font-pixel text-[10px] uppercase">Pairing...</p>
                </div>
              )}

              {status === 'success' && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="h-14 w-14 bg-[var(--retro-green)]/20 border-4 border-[var(--retro-green)] flex items-center justify-center">
                    <Check className="h-7 w-7 text-[var(--retro-green)]" />
                  </div>
                  <p className="font-pixel text-[10px] text-[var(--retro-green)] uppercase">Paired!</p>
                  <p className="text-xs text-muted-foreground text-center">
                    Data will now sync directly between devices.
                  </p>
                </div>
              )}

              {status === 'error' && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="h-14 w-14 bg-destructive/20 border-4 border-destructive flex items-center justify-center">
                    <X className="h-7 w-7 text-destructive" />
                  </div>
                  <p className="font-pixel text-[10px] text-destructive uppercase text-center">{errorMessage}</p>
                  <Button variant="outline" onClick={() => setStatus('idle')}>
                    TRY AGAIN
                  </Button>
                </div>
              )}

              {status === 'idle' && (
                <>
                  <div className="flex gap-2">
                    <Button variant={scanMethod === 'camera' ? 'default' : 'outline'} className="flex-1" onClick={() => setScanMethod('camera')}>
                      <Camera className="h-4 w-4 mr-2" />
                      <span className="font-pixel text-[10px]">CAMERA</span>
                    </Button>
                    <Button variant={scanMethod === 'manual' ? 'default' : 'outline'} className="flex-1" onClick={() => setScanMethod('manual')}>
                      <Keyboard className="h-4 w-4 mr-2" />
                      <span className="font-pixel text-[10px]">PASTE URL</span>
                    </Button>
                  </div>

                  {scanMethod === 'manual' && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="font-pixel text-[10px] uppercase">Paste URL from QR scan</Label>
                        <Input
                          placeholder="Paste URL here (from camera app)"
                          value={scanInput}
                          onChange={(e) => setScanInput(e.target.value)}
                          className="border-4 font-mono text-xs"
                        />
                      </div>
                      <p className="font-pixel text-[8px] text-muted-foreground uppercase">
                        Tip: Use your phone&apos;s camera app to scan, then copy the URL and paste here
                      </p>
                      <Button variant="arcade" className="w-full" onClick={() => connectViaToken(scanInput)} disabled={!scanInput.trim()}>
                        PAIR DEVICE
                      </Button>
                    </div>
                  )}

                  {scanMethod === 'camera' && (
                    <div className="space-y-3">
                      <div className="relative bg-black border-4 border-border overflow-hidden mx-auto" style={{ width: '280px', height: '280px' }}>
                        <div id="qr-scanner-container" className="w-full h-full" />
                      </div>
                      <p className="font-pixel text-[8px] text-center text-muted-foreground uppercase">
                        Point camera at QR code on other device
                      </p>
                      <p className="font-pixel text-[8px] text-center text-[var(--retro-orange)] uppercase">
                        If camera doesn&apos;t work, use PASTE URL instead
                      </p>
                    </div>
                  )}

                  <Button variant="outline" className="w-full" onClick={resetState}>
                    BACK
                  </Button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
