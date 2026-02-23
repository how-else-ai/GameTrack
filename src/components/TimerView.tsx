'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Kid } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  Pause,
  Square,
  ArrowLeft,
  Bell,
  BellOff,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { getAvatarUrl } from '@/lib/avatar';
import { timerManager, useTimer } from '@/lib/timer';
import { notificationService } from '@/lib/notifications';

interface TimerViewProps {
  kid: Kid;
  onBack: () => void;
}

export function TimerView({ kid, onBack }: TimerViewProps) {
  const { startSession, pauseSession, resumeSession, endSession } = useAppStore();
  
  // Use the global timer hook
  const { remainingTime, isWarning, isPaused } = useTimer(kid.id);
  
  const inUseTicket = kid.tickets.find(t => t.status === 'in-use');
  const availableTickets = kid.tickets.filter(t => t.status === 'available');
  
  const hasActiveSession = kid.activeSession !== null;
  
  // Alarm reference to prevent multiple plays
  const alarmPlayedRef = useRef(false);
  // Warning notification reference
  const warningNotifiedRef = useRef(false);
  // Notification permission state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const totalTime = kid.ticketDuration * 60;
  const progress = hasActiveSession && remainingTime !== null 
    ? ((totalTime - remainingTime) / totalTime) * 100 
    : 0;

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Play alarm sound
  const playAlarm = useCallback(() => {
    try {
      // Create a simple beep using Web Audio API
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      // Play 3 beeps
      const playBeep = (startTime: number, frequency: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.3);
      };
      
      const now = audioContext.currentTime;
      playBeep(now, 880);
      playBeep(now + 0.4, 880);
      playBeep(now + 0.8, 1100);
      
      setTimeout(() => audioContext.close(), 1500);
    } catch (e) {
      console.error('Failed to play alarm:', e);
    }
  }, []);

  // Check notification permission on mount
  useEffect(() => {
    const checkPermission = () => {
      const permission = notificationService.getPermission();
      setNotificationsEnabled(permission === 'granted');
    };
    checkPermission();
  }, []);

  // Handle timer expiration and notifications
  useEffect(() => {
    // Timer expired - play alarm and send notification
    if (remainingTime === 0 && !alarmPlayedRef.current) {
      alarmPlayedRef.current = true;
      playAlarm();
      // Send push notification when timer expires
      notificationService.notifyTimerExpired(kid.name);
    }
    
    // Warning at 1 minute - send notification (only once per session)
    if (isWarning && !warningNotifiedRef.current && !isPaused && hasActiveSession) {
      warningNotifiedRef.current = true;
      notificationService.notifyTimerWarning(kid.name);
    }
    
    // Reset alarm flag when session changes
    if (!hasActiveSession) {
      alarmPlayedRef.current = false;
      warningNotifiedRef.current = false;
    }
  }, [remainingTime, hasActiveSession, playAlarm, isWarning, isPaused, kid.name]);

  // Request notification permission
  const handleToggleNotifications = useCallback(async () => {
    if (notificationsEnabled) {
      // Permission already granted, nothing to do
      return;
    }
    
    const permission = await notificationService.requestPermission();
    setNotificationsEnabled(permission === 'granted');
  }, [notificationsEnabled]);

  // Start timer
  const handleStart = useCallback((ticketId: string) => {
    timerManager.clearExpiredNotification(kid.id);
    startSession(kid.id, ticketId);
    alarmPlayedRef.current = false;
    warningNotifiedRef.current = false;
  }, [kid.id, startSession]);

  // Pause timer
  const handlePause = useCallback(() => {
    if (hasActiveSession && !isPaused) {
      pauseSession(kid.id);
    }
  }, [hasActiveSession, isPaused, kid.id, pauseSession]);

  // Resume timer
  const handleResume = useCallback(() => {
    if (hasActiveSession && isPaused) {
      resumeSession(kid.id);
    }
  }, [hasActiveSession, isPaused, kid.id, resumeSession]);

  // End timer
  const handleEnd = useCallback(() => {
    endSession(kid.id);
    alarmPlayedRef.current = false;
  }, [kid.id, endSession]);

  return (
    <div className="min-h-screen bg-background flex flex-col no-select scanlines relative">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b-4 border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="border-2 border-transparent hover:border-primary">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 overflow-hidden border-2 border-border bg-background">
              <img
                src={getAvatarUrl(kid.avatarEmoji)}
                alt={kid.name}
                className="w-full h-full object-cover image-render-pixel"
              />
            </div>
            <div>
              <h1 className="font-pixel text-[10px] text-primary uppercase">{kid.name}</h1>
              <p className="text-[8px] font-pixel text-muted-foreground uppercase">
                {kid.ticketDuration} min per ticket
              </p>
            </div>
          </div>
          {/* Notification Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleNotifications}
            className={`ml-auto border-2 ${
              notificationsEnabled 
                ? 'border-[var(--retro-cyan)] text-[var(--retro-cyan)]' 
                : 'border-transparent hover:border-primary'
            }`}
            title={notificationsEnabled ? 'Notifications enabled' : 'Enable notifications'}
          >
            {notificationsEnabled ? (
              <Bell className="h-5 w-5" />
            ) : (
              <BellOff className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-8 flex flex-col items-center justify-center">
        {/* Timer Display */}
        {hasActiveSession ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full space-y-8"
          >
            {/* Large Timer */}
            <div className="text-center">
              <div className="relative inline-block">
                <span
                  className={`font-pixel text-5xl ${
                    isWarning ? 'text-destructive animate-pulse' : 'text-primary'
                  }`}
                >
                  {formatTime(remainingTime ?? 0)}
                </span>
              </div>
              {isPaused && (
                <p className="font-pixel text-[10px] text-muted-foreground uppercase mt-2">
                  Paused
                </p>
              )}
            </div>

            {/* Progress Bar */}
            <Progress value={progress} className={`h-4 ${isWarning ? 'bg-destructive/20' : ''}`} />

            {/* Controls */}
            <div className="flex gap-4 justify-center">
              {isPaused ? (
                <Button variant="arcade" size="lg" onClick={handleResume} className="font-pixel text-[10px]">
                  <Play className="mr-2 h-5 w-5" />
                  Resume
                </Button>
              ) : (
                <Button variant="outline" size="lg" onClick={handlePause} className="border-4 border-border font-pixel text-[10px]">
                  <Pause className="mr-2 h-5 w-5" />
                  Pause
                </Button>
              )}
              <Button variant="destructive" size="lg" onClick={handleEnd} className="font-pixel text-[10px]">
                <Square className="mr-2 h-5 w-5" />
                End
              </Button>
            </div>

            {/* Warning */}
            {isWarning && !isPaused && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-pixel text-[10px] text-destructive text-center uppercase animate-pulse"
              >
                1 minute remaining!
              </motion.p>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full space-y-6"
          >
            {/* Avatar */}
            <div className="flex justify-center">
              <div className="w-24 h-24 overflow-hidden border-4 border-border bg-background">
                <img
                  src={getAvatarUrl(kid.avatarEmoji)}
                  alt={kid.name}
                  className="w-full h-full object-cover image-render-pixel"
                />
              </div>
            </div>

            {/* Tickets Available */}
            <div className="text-center">
              <p className="font-pixel text-xs text-muted-foreground uppercase">Tickets Available</p>
              <p className="font-pixel text-4xl text-primary mt-2">{availableTickets.length}</p>
            </div>

            {/* Start Buttons */}
            {availableTickets.length > 0 ? (
              <div className="space-y-3">
                <p className="font-pixel text-[8px] text-center text-muted-foreground uppercase">
                  Tap to start a {kid.ticketDuration} minute session
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {availableTickets.slice(0, 6).map((ticket, index) => (
                    <Button
                      key={ticket.id}
                      variant="arcade"
                      onClick={() => handleStart(ticket.id)}
                      className="h-16 font-pixel text-[10px]"
                    >
                      <Play className="mr-1 h-4 w-4" />
                      <span>{index + 1}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p className="font-pixel text-[10px] text-destructive uppercase">
                  No tickets remaining for today
                </p>
                <p className="font-pixel text-[8px] text-muted-foreground uppercase">
                  Come back tomorrow for new tickets!
                </p>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Back Button */}
      <footer className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t-4 border-border safe-area-bottom">
        <div className="max-w-md mx-auto px-4 py-3">
          <Button variant="outline" className="w-full border-4 border-border font-pixel text-[10px]" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </footer>
    </div>
  );
}
