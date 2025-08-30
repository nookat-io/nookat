import { formatBytes } from '../format';

describe('format utility functions', () => {
  describe('formatBytes', () => {
    it('formats zero bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('formats bytes correctly', () => {
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1.0 MB');
      expect(formatBytes(1572864)).toBe('1.5 MB');
      expect(formatBytes(1073741824)).toBe('1.0 GB');
      expect(formatBytes(1610612736)).toBe('1.5 GB');
    });

    it('formats large values correctly', () => {
      expect(formatBytes(1099511627776)).toBe('1.0 TB');
      expect(formatBytes(1649267441664)).toBe('1.5 TB');
    });

    it('handles edge cases correctly', () => {
      expect(formatBytes(1)).toBe('1.0 B');
      expect(formatBytes(1023)).toBe('1023.0 B');
      expect(formatBytes(1025)).toBe('1.0 KB');
    });

    it('handles negative numbers', () => {
      expect(formatBytes(-1)).toBe('Invalid size');
      expect(formatBytes(-1024)).toBe('Invalid size');
    });

    it('handles non-finite values', () => {
      expect(formatBytes(NaN)).toBe('Invalid size');
      expect(formatBytes(Infinity)).toBe('Invalid size');
      expect(formatBytes(-Infinity)).toBe('Invalid size');
    });

    it('handles very large numbers', () => {
      const veryLargeNumber = Math.pow(1024, 10); // 10 TB
      expect(formatBytes(veryLargeNumber)).toBe('1.0 TB'); // Should cap at TB
    });

    it('rounds to one decimal place', () => {
      expect(formatBytes(1024 + 512)).toBe('1.5 KB');
      expect(formatBytes(1024 + 256)).toBe('1.2 KB');
      expect(formatBytes(1024 + 768)).toBe('1.8 KB');
    });
  });
});
