import { describe, expect, it } from 'vitest';
import { formatBytes } from './format';

describe('formatBytes', () => {
  it('formats zero without a fraction', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('uses binary units, so 1000 bytes stay in bytes', () => {
    expect(formatBytes(1000)).toBe('1000 B');
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('rounds to one decimal and drops a trailing zero', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1.5 * 1024 ** 2)).toBe('1.5 MB');
    expect(formatBytes(2 * 1024 ** 3)).toBe('2 GB');
    expect(formatBytes(1024 ** 3 + 1)).toBe('1 GB');
  });

  it('keeps terabytes as the largest unit', () => {
    expect(formatBytes(3 * 1024 ** 4)).toBe('3 TB');
    expect(formatBytes(1024 ** 5)).toBe('1024 TB');
  });

  it('rejects negative and non-finite sizes, such as the -1 Docker reports for an unknown size', () => {
    expect(formatBytes(-1)).toBe('Invalid size');
    expect(formatBytes(Number.NaN)).toBe('Invalid size');
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('Invalid size');
  });
});
