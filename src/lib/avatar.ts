// Avatar utilities - 80s Retro Style Pixel Art

export type AvatarCategory = 'alien' | 'kid' | 'adult' | 'animal';

export interface AvatarInfo {
  id: string;
  name: string;
  category: AvatarCategory;
  path: string;
}

// All avatars organized by category
export const AVATARS: AvatarInfo[] = [
  // Aliens - 5 unique designs
  { id: 'alien-1', name: 'Zorg', category: 'alien', path: '/avatars/alien-1.png' },
  { id: 'alien-2', name: 'Blip', category: 'alien', path: '/avatars/alien-2.png' },
  { id: 'alien-3', name: 'Gloop', category: 'alien', path: '/avatars/alien-3.png' },
  { id: 'alien-4', name: 'Nova', category: 'alien', path: '/avatars/alien-4.png' },
  { id: 'alien-5', name: 'Zyx', category: 'alien', path: '/avatars/alien-5.png' },
  
  // Kids - 5 unique designs
  { id: 'kid-1', name: 'Spike', category: 'kid', path: '/avatars/kid-1.png' },
  { id: 'kid-2', name: 'Pip', category: 'kid', path: '/avatars/kid-2.png' },
  { id: 'kid-3', name: 'Ace', category: 'kid', path: '/avatars/kid-3.png' },
  { id: 'kid-4', name: 'Sunny', category: 'kid', path: '/avatars/kid-4.png' },
  { id: 'kid-5', name: 'Dot', category: 'kid', path: '/avatars/kid-5.png' },
  
  // Adults - 5 unique designs
  { id: 'adult-1', name: 'Dash', category: 'adult', path: '/avatars/adult-1.png' },
  { id: 'adult-2', name: 'Spark', category: 'adult', path: '/avatars/adult-2.png' },
  { id: 'adult-3', name: 'Beard', category: 'adult', path: '/avatars/adult-3.png' },
  { id: 'adult-4', name: 'Blaze', category: 'adult', path: '/avatars/adult-4.png' },
  { id: 'adult-5', name: 'Tank', category: 'adult', path: '/avatars/adult-5.png' },
  
  // Animals - 5 unique designs
  { id: 'animal-1', name: 'Whiskers', category: 'animal', path: '/avatars/animal-1.png' },
  { id: 'animal-2', name: 'Rover', category: 'animal', path: '/avatars/animal-2.png' },
  { id: 'animal-3', name: 'Hop', category: 'animal', path: '/avatars/animal-3.png' },
  { id: 'animal-4', name: 'Hoot', category: 'animal', path: '/avatars/animal-4.png' },
  { id: 'animal-5', name: 'Ember', category: 'animal', path: '/avatars/animal-5.png' },
];

// Get avatar path by ID
export function getAvatarUrl(avatarId: string): string {
  const avatar = AVATARS.find(a => a.id === avatarId);
  return avatar?.path || '/avatars/kid-1.png';
}

// Get all avatars
export function getAllAvatars(): AvatarInfo[] {
  return AVATARS;
}

// Get avatars by category
export function getAvatarsByCategory(category: AvatarCategory): AvatarInfo[] {
  return AVATARS.filter(a => a.category === category);
}

// Get all categories
export function getCategories(): AvatarCategory[] {
  return ['alien', 'kid', 'adult', 'animal'];
}

// Get category display name
export function getCategoryName(category: AvatarCategory): string {
  const names: Record<AvatarCategory, string> = {
    alien: 'ALIENS',
    kid: 'KIDS',
    adult: 'ADULTS',
    animal: 'ANIMALS',
  };
  return names[category];
}

// Preload all avatar images
export function preloadAvatars(): void {
  for (const avatar of AVATARS) {
    const img = new Image();
    img.src = avatar.path;
  }
}

// Legacy emoji support for backward compatibility
const LEGACY_EMOJI_MAP: Record<string, string> = {
  '🎮': 'kid-1',
  '🕹️': 'kid-2',
  '🎯': 'kid-3',
  '🎪': 'kid-4',
  '🎨': 'kid-5',
  '🎭': 'adult-1',
  '🚀': 'alien-1',
  '🦸': 'adult-2',
  '🧙': 'alien-2',
  '🧛': 'alien-3',
  '🧜': 'animal-1',
  '🧚': 'animal-2',
  '🦹': 'adult-3',
  '🥷': 'adult-4',
  '👽': 'alien-4',
  '🤖': 'alien-5',
  '🐱': 'animal-3',
  '🐶': 'animal-4',
  '🦊': 'animal-5',
  '🦁': 'animal-1',
  '🐸': 'animal-2',
  '🦄': 'alien-3',
  '🐲': 'animal-5',
};

// Convert legacy emoji to new avatar ID
export function legacyEmojiToAvatar(emoji: string): string {
  return LEGACY_EMOJI_MAP[emoji] || 'kid-1';
}
