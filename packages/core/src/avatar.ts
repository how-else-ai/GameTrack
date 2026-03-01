// Avatar system constants and utilities

export const AVATAR_CATEGORIES = {
  aliens: ['alien-1', 'alien-2', 'alien-3', 'alien-4', 'alien-5'],
  kids: ['kid-1', 'kid-2', 'kid-3', 'kid-4', 'kid-5'],
  adults: ['adult-1', 'adult-2', 'adult-3', 'adult-4', 'adult-5'],
  animals: ['animal-1', 'animal-2', 'animal-3', 'animal-4', 'animal-5'],
} as const;

export const ALL_AVATARS = [
  ...AVATAR_CATEGORIES.aliens,
  ...AVATAR_CATEGORIES.kids,
  ...AVATAR_CATEGORIES.adults,
  ...AVATAR_CATEGORIES.animals,
];

export const AVATAR_NAMES: Record<string, string> = {
  // Aliens
  'alien-1': 'Zorg',
  'alien-2': 'Blip',
  'alien-3': 'Gloop',
  'alien-4': 'Nova',
  'alien-5': 'Zyx',
  // Kids
  'kid-1': 'Spike',
  'kid-2': 'Pip',
  'kid-3': 'Ace',
  'kid-4': 'Sunny',
  'kid-5': 'Dot',
  // Adults
  'adult-1': 'Dash',
  'adult-2': 'Spark',
  'adult-3': 'Beard',
  'adult-4': 'Blaze',
  'adult-5': 'Tank',
  // Animals
  'animal-1': 'Whiskers',
  'animal-2': 'Rover',
  'animal-3': 'Hop',
  'animal-4': 'Hoot',
  'animal-5': 'Ember',
};

export function getAvatarName(avatarId: string): string {
  return AVATAR_NAMES[avatarId] || 'Unknown';
}

export function getRandomAvatar(): string {
  return ALL_AVATARS[Math.floor(Math.random() * ALL_AVATARS.length)];
}

export function getAvatarCategory(avatarId: string): string | null {
  for (const [category, avatars] of Object.entries(AVATAR_CATEGORIES)) {
    if ((avatars as readonly string[]).includes(avatarId)) {
      return category;
    }
  }
  return null;
}
