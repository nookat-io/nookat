import { describe, expect, it } from 'vitest';
import { ImagePullLayer } from '../../../types/image-pull';
import { advancePull, describePull, summarizePull } from './pull-summary';

const MB = 1024 * 1024;

const layer = (overrides: Partial<ImagePullLayer>): ImagePullLayer => ({
  id: 'layer',
  phase: 'pending',
  size: null,
  downloaded: 0,
  extracted: 0,
  ...overrides,
});

const describeLayers = (layers: ImagePullLayer[]) => {
  const summary = summarizePull({ layers });
  return { percentage: summary.percentage, text: describePull(summary) };
};

describe('summarizePull', () => {
  it('has nothing to say before the engine announces the layers', () => {
    expect(describeLayers([])).toEqual({ percentage: null, text: null });
  });

  it('has no percentage before any layer knows its size', () => {
    expect(
      describeLayers([layer({ phase: 'pending' }), layer({ phase: 'pending' })])
    ).toEqual({
      percentage: null,
      text: '0 of 2 layers ready',
    });
  });

  it('counts a layer still waiting for its size as an average layer, without naming a total', () => {
    expect(
      describeLayers([
        layer({ phase: 'downloading', size: 100 * MB, downloaded: 30 * MB }),
        layer({ phase: 'pending' }),
      ])
    ).toEqual({
      percentage: 12,
      text: '30 MB downloaded · 0 of 2 layers ready',
    });
  });

  it('weighs downloading over extracting once every size is known', () => {
    expect(
      describeLayers([
        layer({
          phase: 'extracting',
          size: 100 * MB,
          downloaded: 100 * MB,
          extracted: 50 * MB,
        }),
        layer({ phase: 'downloading', size: 20 * MB, downloaded: 10 * MB }),
      ])
    ).toEqual({
      percentage: 81,
      text: '110 MB of 120 MB downloaded · 0 of 2 layers ready',
    });
  });

  it('leaves layers the engine already has out of the download', () => {
    expect(
      describeLayers([
        layer({ phase: 'already_exists' }),
        layer({
          phase: 'complete',
          size: 4 * MB,
          downloaded: 4 * MB,
          extracted: 4 * MB,
        }),
        layer({ phase: 'downloading', size: 4 * MB, downloaded: 2 * MB }),
      ])
    ).toEqual({
      percentage: 70,
      text: '6 MB of 8 MB downloaded · 2 of 3 layers ready',
    });
  });

  it('is done when every layer is ready, even with nothing to download', () => {
    expect(
      describeLayers([
        layer({ phase: 'already_exists' }),
        layer({ phase: 'already_exists' }),
      ])
    ).toEqual({ percentage: 100, text: '2 of 2 layers ready' });
  });

  it('stays below 100 percent until the engine reports every layer ready', () => {
    expect(
      describeLayers([
        layer({
          phase: 'extracting',
          size: 10 * MB,
          downloaded: 10 * MB,
          extracted: 10 * MB,
        }),
      ]).percentage
    ).toBe(99);
  });

  it('never counts more bytes than a layer has', () => {
    expect(
      describeLayers([
        layer({ phase: 'downloading', size: 10 * MB, downloaded: 12 * MB }),
      ])
    ).toEqual({
      percentage: 80,
      text: '10 MB of 10 MB downloaded · 0 of 1 layers ready',
    });
  });
});

describe('advancePull', () => {
  it('holds the percentage when a layer turns out larger than estimated', () => {
    const smallFirst = advancePull(null, {
      layers: [
        layer({ phase: 'downloading', size: 10 * MB, downloaded: 10 * MB }),
        layer({ phase: 'pending' }),
      ],
    });
    expect(smallFirst.percentage).toBe(40);

    const largeSecond = advancePull(smallFirst, {
      layers: [
        layer({ phase: 'downloaded', size: 10 * MB, downloaded: 10 * MB }),
        layer({ phase: 'downloading', size: 90 * MB, downloaded: 5 * MB }),
      ],
    });

    expect(largeSecond.percentage).toBe(40);
    expect(describePull(largeSecond)).toBe(
      '15 MB of 100 MB downloaded · 0 of 2 layers ready'
    );
  });
});
