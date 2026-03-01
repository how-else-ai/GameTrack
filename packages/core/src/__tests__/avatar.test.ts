import { describe, it, expect } from 'vitest';
import {
  AVATAR_CATEGORIES,
  ALL_AVATARS,
  AVATAR_NAMES,
  getAvatarName,
  getRandomAvatar,
  getAvatarCategory,
} from '../avatar';

describe('avatar', () => {
  describe('AVATAR_CATEGORIES', () => {
    it('should have 4 categories', () => {
      expect(Object.keys(AVATAR_CATEGORIES)).toHaveLength(4);
      expect(AVATAR_CATEGORIES).toHaveProperty('aliens');
      expect(AVATAR_CATEGORIES).toHaveProperty('kids');
      expect(AVATAR_CATEGORIES).toHaveProperty('adults');
      expect(AVATAR_CATEGORIES).toHaveProperty('animals');
    });

    it('should have 5 avatars per category', () => {
      expect(AVATAR_CATEGORIES.aliens).toHaveLength(5);
      expect(AVATAR_CATEGORIES.kids).toHaveLength(5);
      expect(AVATAR_CATEGORIES.adults).toHaveLength(5);
      expect(AVATAR_CATEGORIES.animals).toHaveLength(5);
    });
  });

  describe('ALL_AVATARS', () => {
    it('should contain all 20 avatars', () => {
      expect(ALL_AVATARS).toHaveLength(20);
    });

    it('should include avatars from all categories', () => {
      expect(ALL_AVATARS).toContain('alien-1');
      expect(ALL_AVATARS).toContain('kid-1');
      expect(ALL_AVATARS).toContain('adult-1');
      expect(ALL_AVATARS).toContain('animal-1');
    });
  });

  describe('AVATAR_NAMES', () => {
    it('should have names for all avatars', () => {
      expect(Object.keys(AVATAR_NAMES)).toHaveLength(20);
    });

    it('should return correct names for known avatars', () => {
      expect(AVATAR_NAMES['alien-1']).toBe('Zorg');
      expect(AVATAR_NAMES['kid-1']).toBe('Spike');
      expect(AVATAR_NAMES['adult-1']).toBe('Dash');
      expect(AVATAR_NAMES['animal-1']).toBe('Whiskers');
    });
  });

  describe('getAvatarName', () => {
    it('should return correct name for valid avatar', () => {
      expect(getAvatarName('alien-1')).toBe('Zorg');
      expect(getAvatarName('kid-2')).toBe('Pip');
    });

    it('should return "Unknown" for invalid avatar', () => {
      expect(getAvatarName('invalid-avatar')).toBe('Unknown');
      expect(getAvatarName('')).toBe('Unknown');
    });
  });

  describe('getRandomAvatar', () => {
    it('should return a valid avatar', () => {
      const avatar = getRandomAvatar();
      expect(ALL_AVATARS).toContain(avatar);
    });

    it('should return different avatars on multiple calls (probabilistic)', () => {
      const avatars = new Set<string>();
      for (let i = 0; i < 100; i++) {
        avatars.add(getRandomAvatar());
      }
      // With 100 calls and 20 avatars, we should get at least 10 unique ones
      expect(avatars.size).toBeGreaterThan(10);
    });
  });

  describe('getAvatarCategory', () => {
    it('should return correct category for aliens', () => {
      expect(getAvatarCategory('alien-1')).toBe('aliens');
      expect(getAvatarCategory('alien-5')).toBe('aliens');
    });

    it('should return correct category for kids', () => {
      expect(getAvatarCategory('kid-1')).toBe('kids');
      expect(getAvatarCategory('kid-5')).toBe('kids');
    });

    it('should return correct category for adults', () => {
      expect(getAvatarCategory('adult-1')).toBe('adults');
      expect(getAvatarCategory('adult-5')).toBe('adults');
    });

    it('should return correct category for animals', () => {
      expect(getAvatarCategory('animal-1')).toBe('animals');
      expect(getAvatarCategory('animal-5')).toBe('animals');
    });

    it('should return null for invalid avatar', () => {
      expect(getAvatarCategory('invalid')).toBeNull();
      expect(getAvatarCategory('')).toBeNull();
    });
  });
});
