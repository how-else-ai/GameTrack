import { describe, it, expect } from 'vitest';
import {
  generateDeviceId,
  generateKidId,
  generateTicketId,
  generateEventId,
} from '../device';

describe('device', () => {
  describe('generateDeviceId', () => {
    it('should generate a unique device ID', () => {
      const id1 = generateDeviceId();
      const id2 = generateDeviceId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^device-/);
    });

    it('should include timestamp and random parts', () => {
      const id = generateDeviceId();
      const parts = id.split('-');

      // Format: device-{timestamp}-{random}
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('device');
    });

    it('should generate valid IDs that can be used as identifiers', () => {
      const id = generateDeviceId();
      
      // Should be a non-empty string
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      
      // Should not contain special characters that might cause issues
      expect(id).not.toMatch(/[\s<>:"/\\|?*]/);
    });
  });

  describe('generateKidId', () => {
    it('should generate a kid ID with correct format', () => {
      const id = generateKidId();
      expect(id).toMatch(/^kid-/);
    });

    it('should include timestamp', () => {
      const id = generateKidId();
      expect(id).toMatch(/^kid-\d+$/);
    });

    it('should generate IDs that can be differentiated over time', async () => {
      const id1 = generateKidId();
      // Wait 1ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
      const id2 = generateKidId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('generateTicketId', () => {
    it('should generate a unique ticket ID with index', () => {
      const id1 = generateTicketId(0);
      const id2 = generateTicketId(1);

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^ticket-/);
    });

    it('should include index in the ID', () => {
      const id = generateTicketId(5);
      expect(id).toMatch(/^ticket-\d+-5$/);
    });
  });

  describe('generateEventId', () => {
    it('should generate a unique event ID', () => {
      const id1 = generateEventId();
      const id2 = generateEventId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^event-/);
    });

    it('should include timestamp and random parts', () => {
      const id = generateEventId();
      const parts = id.split('-');

      // Format: event-{timestamp}-{random}
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('event');
    });
  });
});
