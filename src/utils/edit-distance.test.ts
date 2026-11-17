import { describe, expect, it } from 'vitest';
import { damerauLevenshteinDistance } from './edit-distance';

describe('damerauLevenshteinDistance', () => {
  it.each([
    ['', '', 0],
    ['ubuntu', 'ubuntu', 0],
    ['', 'abc', 3],
    ['abc', '', 3],
    ['ubunti', 'ubuntu', 1],
    ['ubuntuu', 'ubuntu', 1],
    ['ubunt', 'ubuntu', 1],
    ['kitten', 'sitting', 3],
    ['dockerhub', 'docker', 3],
  ])('counts single-character edits between %j and %j as %i', (a, b, edits) => {
    expect(damerauLevenshteinDistance(a, b)).toBe(edits);
  });

  it('counts swapping two neighbouring characters as one edit', () => {
    expect(damerauLevenshteinDistance('ghrc', 'ghcr')).toBe(1);
    expect(damerauLevenshteinDistance('ngnix', 'nginx')).toBe(1);
  });

  it('lets a swapped pair be edited further, unlike optimal string alignment', () => {
    expect(damerauLevenshteinDistance('ca', 'abc')).toBe(2);
  });

  it('gives the same distance in both directions', () => {
    for (const [a, b] of [
      ['postgres', 'postgers'],
      ['rabbitmq', 'rabitmq'],
      ['ca', 'abc'],
    ]) {
      expect(damerauLevenshteinDistance(a, b)).toBe(
        damerauLevenshteinDistance(b, a)
      );
    }
  });
});
