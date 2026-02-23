'use client';

import { useState, useEffect } from 'react';
import { Kid } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { getAllAvatars, getCategories, getCategoryName, AvatarCategory, AvatarInfo, legacyEmojiToAvatar } from '@/lib/avatar';

const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = minutes / 60;
  return hours === 1 ? '1h' : `${hours}h`;
}

function findClosestDuration(minutes: number): number {
  if (DURATION_OPTIONS.includes(minutes)) {
    return minutes;
  }
  return DURATION_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr - minutes) < Math.abs(prev - minutes) ? curr : prev
  );
}

interface AddKidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; avatarEmoji: string; ticketLimit: number; ticketDuration: number }) => void;
  editKid?: Kid | null;
}

export function AddKidDialog({ open, onOpenChange, onSubmit, editKid }: AddKidDialogProps) {
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState('kid-1');
  const [selectedCategory, setSelectedCategory] = useState<AvatarCategory>('kid');
  const [ticketLimit, setTicketLimit] = useState(3);
  const [ticketDuration, setTicketDuration] = useState(30);

  const allAvatars = getAllAvatars();
  const categories = getCategories();
  const categoryAvatars = allAvatars.filter(a => a.category === selectedCategory);

  // Prefill form when dialog opens with editKid data
  useEffect(() => {
    if (open) {
      // Use rAF to defer state updates
      requestAnimationFrame(() => {
        if (editKid) {
          // Editing existing kid - prefill all values
          setName(editKid.name);
          setTicketLimit(editKid.ticketLimit);
          setTicketDuration(findClosestDuration(editKid.ticketDuration));
          
          // Handle avatar - check if it's a new avatar ID or legacy emoji
          const avatar = allAvatars.find(a => a.id === editKid.avatarEmoji);
          if (avatar) {
            setAvatarId(editKid.avatarEmoji);
            setSelectedCategory(avatar.category);
          } else {
            // Convert legacy emoji to new avatar ID
            const convertedId = legacyEmojiToAvatar(editKid.avatarEmoji);
            setAvatarId(convertedId);
            const convertedAvatar = allAvatars.find(a => a.id === convertedId);
            if (convertedAvatar) {
              setSelectedCategory(convertedAvatar.category);
            }
          }
        } else {
          // New kid - reset to defaults
          setName('');
          setAvatarId('kid-1');
          setSelectedCategory('kid');
          setTicketLimit(3);
          setTicketDuration(30);
        }
      });
    }
  }, [open, editKid, allAvatars]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onSubmit({
      name: name.trim(),
      avatarEmoji: avatarId,
      ticketLimit,
      ticketDuration,
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-4 border-border">
        <DialogHeader>
          <DialogTitle className="font-pixel text-xs uppercase text-primary">
            {editKid ? 'Edit Player' : 'Add New Player'}
          </DialogTitle>
          <DialogDescription className="font-pixel text-[8px] uppercase text-muted-foreground">
            {editKid ? 'Update player settings' : 'Create a player profile to track gaming time'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label className="font-pixel text-[10px] uppercase text-primary">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              className="border-4 border-border bg-background font-pixel text-sm text-foreground placeholder:text-muted-foreground"
              maxLength={20}
            />
          </div>

          {/* Avatar Categories */}
          <div className="space-y-2">
            <Label className="font-pixel text-[10px] uppercase text-primary">Category</Label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(category);
                    // Set first avatar of new category as selected
                    const firstAvatar = allAvatars.find(a => a.category === category);
                    if (firstAvatar) setAvatarId(firstAvatar.id);
                  }}
                  className={`px-2 py-2 text-[8px] font-pixel uppercase border-4 transition-all ${
                    selectedCategory === category
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary'
                  }`}
                >
                  {getCategoryName(category)}
                </button>
              ))}
            </div>
          </div>

          {/* Avatar Selection */}
          <div className="space-y-2">
            <Label className="font-pixel text-[10px] uppercase text-primary">Avatar</Label>
            <div className="grid grid-cols-5 gap-2">
              {categoryAvatars.map((avatar: AvatarInfo) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setAvatarId(avatar.id)}
                  className={`w-full aspect-square overflow-hidden border-4 transition-all ${
                    avatarId === avatar.id
                      ? 'border-primary bg-primary/20'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                  title={avatar.name}
                >
                  <img
                    src={avatar.path}
                    alt={avatar.name}
                    className="w-full h-full object-cover image-render-pixel"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Ticket Limit */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-pixel text-[10px] uppercase text-primary">Tickets per day</Label>
              <span className="font-pixel text-[10px] text-primary">{ticketLimit}</span>
            </div>
            <Slider
              value={[ticketLimit]}
              onValueChange={(v) => setTicketLimit(v[0])}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
          </div>

          {/* Ticket Duration */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-pixel text-[10px] uppercase text-primary">Minutes per ticket</Label>
              <span className="font-pixel text-[10px] text-primary">{formatDuration(ticketDuration)}</span>
            </div>
            <Slider
              value={[DURATION_OPTIONS.indexOf(ticketDuration)]}
              onValueChange={(v) => setTicketDuration(DURATION_OPTIONS[v[0]])}
              min={0}
              max={DURATION_OPTIONS.length - 1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between px-1">
              {DURATION_OPTIONS.map((d, i) => (
                <span key={i} className="font-pixel text-[6px] text-muted-foreground">
                  {formatDuration(d)}
                </span>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 font-pixel text-[10px] uppercase"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="arcade"
              className="flex-1 font-pixel text-[10px] uppercase"
              disabled={!name.trim()}
            >
              {editKid ? 'Save' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
