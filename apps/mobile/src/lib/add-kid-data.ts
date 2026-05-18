// Shared data for the Add Kid form
import { ImageSourcePropType } from 'react-native';

export type AvatarCategory = 'alien' | 'kid' | 'adult' | 'animal';

export interface AvatarInfo {
  id: string;
  name: string;
  category: AvatarCategory;
  image: ImageSourcePropType;
}

export const AVATARS: AvatarInfo[] = [
  { id: 'alien-1', name: 'Zorg', category: 'alien', image: require('@assets/alien-1.png') },
  { id: 'alien-2', name: 'Blip', category: 'alien', image: require('@assets/alien-2.png') },
  { id: 'alien-3', name: 'Gloop', category: 'alien', image: require('@assets/alien-3.png') },
  { id: 'alien-4', name: 'Nova', category: 'alien', image: require('@assets/alien-4.png') },
  { id: 'alien-5', name: 'Zyx', category: 'alien', image: require('@assets/alien-5.png') },
  { id: 'kid-1', name: 'Spike', category: 'kid', image: require('@assets/kid-1.png') },
  { id: 'kid-2', name: 'Pip', category: 'kid', image: require('@assets/kid-2.png') },
  { id: 'kid-3', name: 'Ace', category: 'kid', image: require('@assets/kid-3.png') },
  { id: 'kid-4', name: 'Sunny', category: 'kid', image: require('@assets/kid-4.png') },
  { id: 'kid-5', name: 'Dot', category: 'kid', image: require('@assets/kid-5.png') },
  { id: 'adult-1', name: 'Dash', category: 'adult', image: require('@assets/adult-1.png') },
  { id: 'adult-2', name: 'Spark', category: 'adult', image: require('@assets/adult-2.png') },
  { id: 'adult-3', name: 'Beard', category: 'adult', image: require('@assets/adult-3.png') },
  { id: 'adult-4', name: 'Blaze', category: 'adult', image: require('@assets/adult-4.png') },
  { id: 'adult-5', name: 'Tank', category: 'adult', image: require('@assets/adult-5.png') },
  { id: 'animal-1', name: 'Whiskers', category: 'animal', image: require('@assets/animal-1.png') },
  { id: 'animal-2', name: 'Rover', category: 'animal', image: require('@assets/animal-2.png') },
  { id: 'animal-3', name: 'Hop', category: 'animal', image: require('@assets/animal-3.png') },
  { id: 'animal-4', name: 'Hoot', category: 'animal', image: require('@assets/animal-4.png') },
  { id: 'animal-5', name: 'Ember', category: 'animal', image: require('@assets/animal-5.png') },
];

export const CATEGORIES: AvatarCategory[] = ['alien', 'kid', 'adult', 'animal'];

export const CATEGORY_NAMES: Record<AvatarCategory, string> = {
  alien: 'ALIENS',
  kid: 'KIDS',
  adult: 'ADULTS',
  animal: 'ANIMALS',
};

export const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return hours === 1 ? '1h' : `${hours}h`;
}

export function findClosestDuration(minutes: number): number {
  if (DURATION_OPTIONS.includes(minutes)) return minutes;
  return DURATION_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr - minutes) < Math.abs(prev - minutes) ? curr : prev,
  );
}
