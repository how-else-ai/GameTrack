'use client';

import { Kid } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  Edit,
  Trash2,
  RotateCcw,
  Ticket,
  Clock,
  Pause,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getAvatarUrl } from '@/lib/avatar';
import { useKidTimer } from '@/lib/timer';

interface KidCardProps {
  kid: Kid;
  onSelect: (kid: Kid) => void;
  onEdit: (kid: Kid) => void;
  onDelete: (id: string) => void;
  onResetTickets: (id: string) => void;
}

export function KidCard({ kid, onSelect, onEdit, onDelete, onResetTickets }: KidCardProps) {
  const availableTickets = kid.tickets.filter(t => t.status === 'available').length;
  const usedTickets = kid.tickets.filter(t => t.status === 'used').length;
  const hasActiveSession = kid.activeSession !== null;

  // Use the global timer hook for live countdown
  const { remainingTime, isWarning, isPaused } = useKidTimer(kid.id);

  const totalTime = kid.ticketDuration * 60;
  const progress = hasActiveSession && remainingTime !== null 
    ? ((totalTime - remainingTime) / totalTime) * 100 
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      layout
    >
      <Card className="overflow-hidden border-4 border-border shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] hover:shadow-[6px_6px_0_0_rgba(0,0,0,0.5)] transition-all bg-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <button
              onClick={() => onSelect(kid)}
              className="shrink-0 w-14 h-14 overflow-hidden border-4 border-border hover:border-primary transition-all bg-background"
            >
              <img
                src={getAvatarUrl(kid.avatarEmoji)}
                alt={kid.name}
                className="w-full h-full object-cover image-render-pixel"
              />
            </button>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-pixel text-xs text-primary truncate uppercase">{kid.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Ticket className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="font-pixel text-[8px] text-muted-foreground">
                  {availableTickets} / {kid.ticketLimit} left
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(kid);
                }}
                className="border-2 border-transparent hover:border-primary"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(kid.id);
                }}
                className="border-2 border-transparent hover:border-destructive"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          {/* Active Session Progress - Live Countdown */}
          {hasActiveSession && remainingTime !== null && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isPaused ? (
                    <Pause className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <Clock className={`h-3 w-3 ${isWarning ? 'text-destructive animate-pulse' : 'text-primary animate-pulse'}`} />
                  )}
                  <span className={`font-pixel text-[8px] uppercase ${
                    isPaused ? 'text-muted-foreground' : isWarning ? 'text-destructive' : 'text-primary'
                  }`}>
                    {isPaused ? 'Paused' : 'Playing'}
                  </span>
                </div>
                <span className={`font-pixel text-sm ${
                  isWarning && !isPaused ? 'text-destructive animate-pulse' : 'text-primary'
                }`}>
                  {formatTime(remainingTime)}
                </span>
              </div>
              <Progress value={progress} className={`h-2 ${isWarning && !isPaused ? 'bg-destructive/20' : ''}`} />
            </div>
          )}

          {/* Tickets Display */}
          {!hasActiveSession && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex gap-1 flex-wrap">
                {kid.tickets.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className={`w-5 h-5 border-2 flex items-center justify-center ${
                      ticket.status === 'available'
                        ? 'bg-[var(--retro-green)]/20 border-[var(--retro-green)]'
                        : ticket.status === 'in-use'
                        ? 'bg-primary/20 border-primary animate-pulse'
                        : 'bg-muted border-muted-foreground/30'
                    }`}
                    title={`Ticket ${index + 1}: ${ticket.status}`}
                  >
                    {ticket.status === 'available' && (
                      <span className="font-pixel text-[6px] text-[var(--retro-green)]">✓</span>
                    )}
                  </div>
                ))}
              </div>
              {usedTickets > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResetTickets(kid.id);
                  }}
                  className="ml-auto border-2 border-transparent hover:border-primary"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}

          {/* Play Button */}
          {!hasActiveSession && availableTickets > 0 && (
            <Button
              variant="arcade"
              className="w-full mt-3 font-pixel text-[10px]"
              onClick={() => onSelect(kid)}
            >
              <Play className="mr-2 h-4 w-4 flex-shrink-0" />
              Play
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
