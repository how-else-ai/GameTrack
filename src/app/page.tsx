'use client';

import { useState, useEffect, useCallback } from 'react';
import { KidCard } from '@/components/KidCard';
import { AddKidDialog } from '@/components/AddKidDialog';
import { TimerView } from '@/components/TimerView';
import { SyncManager } from '@/components/SyncManager';
import { Kid } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Users, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useSync } from '@/hooks/useSync';
import { preloadAvatars } from '@/lib/avatar';
import { timerManager } from '@/lib/timer';

export default function Home() {
  const {
    deviceId,
    kids,
    pairedDevices,
    initializeDevice,
    addKid,
    updateKid,
    deleteKid,
    resetTickets,
    lastSyncFlash,
  } = useAppStore();

  const { isConnected, syncStatus, requestFullSync } = useSync();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [editingKid, setEditingKid] = useState<Kid | null>(null);
  const [deleteKidId, setDeleteKidId] = useState<string | null>(null);
  const [activeKid, setActiveKid] = useState<Kid | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSyncFlash, setShowSyncFlash] = useState(false);

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

  // Initialize device ID
  useEffect(() => {
    initializeDevice();
    // Start the global timer manager
    timerManager.start();
    // Small delay to ensure store is hydrated from localStorage
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, [initializeDevice]);

  // Preload avatars immediately when app starts
  useEffect(() => {
    preloadAvatars();
  }, []);

  // Check and reset tickets for new day
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    kids.forEach((kid) => {
      const needsReset = kid.tickets.some(t => t.lastResetDate < today);
      if (needsReset) {
        resetTickets(kid.id);
      }
    });
  }, [kids, resetTickets]);

  // Handle add or update kid
  const handleSubmitKid = useCallback((data: {
    name: string;
    avatarEmoji: string;
    ticketLimit: number;
    ticketDuration: number;
  }) => {
    if (editingKid) {
      updateKid(editingKid.id, data);
    } else {
      addKid(data);
    }
    setEditingKid(null);
  }, [editingKid, updateKid, addKid]);

  // Handle delete kid
  const handleDeleteKid = useCallback((kidId: string) => {
    deleteKid(kidId);
    setDeleteKidId(null);
  }, [deleteKid]);

  // Handle reset tickets
  const handleResetTickets = useCallback((kidId: string) => {
    resetTickets(kidId);
  }, [resetTickets]);

  // Handle manual sync request
  const handleSyncRequest = useCallback(() => {
    if (syncStatus === 'syncing' || !isConnected || pairedDevices.length === 0) return;
    requestFullSync();
  }, [syncStatus, isConnected, pairedDevices.length, requestFullSync]);

  // Get current kid data (in case it was updated)
  const currentKid = activeKid ? kids.find(k => k.id === activeKid.id) : null;

  // If viewing a specific kid's timer
  if (currentKid) {
    return (
      <TimerView
        kid={currentKid}
        onBack={() => {
          setActiveKid(null);
        }}
      />
    );
  }

  const onlineDevices = pairedDevices.filter(d => d.isOnline).length;

  return (
    <div className="min-h-screen bg-background flex flex-col no-select relative">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b-4 border-border">
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-shrink-0">
            <img
              src="/logo.png"
              alt="Game Time Tracker"
              className="w-10 h-10"
            />
            <div className="min-w-0">
              <h1 className="font-pixel text-[10px] text-primary uppercase tracking-wider">Game Time</h1>
              <p className="text-[8px] font-pixel text-muted-foreground uppercase">Tracker</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Sync status indicator - clickable to pull sync */}
            {pairedDevices.length > 0 && (
              <button
                onClick={handleSyncRequest}
                disabled={syncStatus === 'syncing' || !isConnected}
                className={`flex items-center gap-1.5 text-[8px] font-pixel px-2 py-1.5 border-2 transition-all ${
                  showSyncFlash
                    ? 'sync-heartbeat'
                    : syncStatus === 'syncing' 
                    ? 'border-[var(--retro-cyan)] bg-[var(--retro-cyan)]/10 text-[var(--retro-cyan)]' 
                    : isConnected 
                      ? 'border-border bg-muted text-muted-foreground hover:border-primary hover:text-primary cursor-pointer' 
                      : 'border-border bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                }`}
                title={syncStatus === 'syncing' ? 'Syncing...' : isConnected ? 'Tap to sync now' : 'Not connected'}
              >
                {showSyncFlash ? (
                  <Wifi className="w-3 h-3" />
                ) : syncStatus === 'syncing' ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : isConnected ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <WifiOff className="w-3 h-3" />
                )}
                <span className="text-[8px]">{onlineDevices}/{pairedDevices.length}</span>
              </button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSyncDialog(true)}
              title="Pair devices to sync data"
              className="border-2 border-transparent hover:border-[var(--retro-cyan)]"
            >
              <Users className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-4 py-6 max-w-full sm:max-w-md sm:mx-auto">
        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="font-pixel text-[10px] text-muted-foreground">LOADING...</p>
          </div>
        ) : (
          <>
            {/* Empty State */}
            {kids.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <h2 className="font-pixel text-xs text-primary uppercase mb-2">NO PLAYERS</h2>
                <p className="font-pixel text-[10px] text-muted-foreground mb-8 max-w-xs uppercase">
                  Add your first kid to start tracking their gaming time with tickets
                </p>
                <Button
                  size="lg"
                  variant="arcade"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4 flex-shrink-0" />
                  ADD PLAYER
                </Button>
              </motion.div>
            ) : (
              <>
                {/* Kids List */}
                <div className="space-y-4">
                  <AnimatePresence>
                    {kids.map((kid) => (
                      <KidCard
                        key={kid.id}
                        kid={kid}
                        onSelect={setActiveKid}
                        onEdit={(k) => {
                          setEditingKid(k);
                          setShowAddDialog(true);
                        }}
                        onDelete={(id) => setDeleteKidId(id)}
                        onResetTickets={handleResetTickets}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Footer with Add Button */}
      {kids.length > 0 && (
        <footer className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t-4 border-border safe-area-bottom z-10">
          <div className="w-full px-4 py-3">
            <Button
              variant="arcade"
              className="w-full"
              size="lg"
              onClick={() => {
                setEditingKid(null);
                setShowAddDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4 flex-shrink-0" />
              ADD PLAYER
            </Button>
          </div>
        </footer>
      )}

      {/* Add/Edit Kid Dialog */}
      <AddKidDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleSubmitKid}
        editKid={editingKid}
      />

      {/* Sync Dialog */}
      <SyncManager
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteKidId} onOpenChange={() => setDeleteKidId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>DELETE PLAYER?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {kids.find(k => k.id === deleteKidId)?.name || 'this kid'} and all their ticket history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>CANCEL</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteKidId && handleDeleteKid(deleteKidId)}
            >
              DELETE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
