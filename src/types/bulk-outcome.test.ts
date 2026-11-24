import { describe, expect, it } from 'vitest';
import { describeFailures } from './bulk-outcome';

describe('describeFailures', () => {
  it('names the items behind each reason in the order they first failed', () => {
    const failed = [
      { id: 'a', error: 'x' },
      { id: 'b', error: 'y' },
      { id: 'c', error: 'x' },
    ];

    expect(describeFailures(failed, id => id.toUpperCase())).toBe(
      'A, C: x; B: y'
    );
  });
});
