import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FilterType } from '../hooks/use-page-state';
import { FilterConfig, useFilter } from './use-filter';

function filter<T extends { id: string }>(
  data: T[],
  filterType: FilterType,
  searchTerm: string,
  config: FilterConfig<T>
) {
  const { result } = renderHook(() =>
    useFilter(data, filterType, searchTerm, config)
  );
  return result.current.map(item => item.id);
}

describe('useFilter', () => {
  describe('search', () => {
    const data = [
      { id: 'web', name: 'nginx-web', image: 'nginx:1.27' },
      { id: 'db', name: 'postgres', image: 'postgres:18' },
      { id: 'anon', name: null, image: 'busybox' },
    ];
    const config: FilterConfig<(typeof data)[number]> = {
      searchFields: ['name', 'image'],
    };

    it('returns everything for an empty search', () => {
      expect(filter(data, 'all', '', config)).toEqual(['web', 'db', 'anon']);
    });

    it('matches any search field, ignoring case', () => {
      expect(filter(data, 'all', 'NGINX', config)).toEqual(['web']);
      expect(filter(data, 'all', ':18', config)).toEqual(['db']);
    });

    it('skips empty fields instead of matching their string form', () => {
      expect(filter(data, 'all', 'null', config)).toEqual([]);
      expect(filter(data, 'all', 'busy', config)).toEqual(['anon']);
    });

    it('applies the search before the state filter', () => {
      const containers = [
        { id: 'a', name: 'api', state: 'running' },
        { id: 'b', name: 'api-worker', state: 'exited' },
        { id: 'c', name: 'db', state: 'running' },
      ];

      expect(
        filter(containers, 'running', 'api', {
          searchFields: ['name'],
          filterField: 'state',
        })
      ).toEqual(['a']);
    });
  });

  it('splits containers into running and stopped by state', () => {
    const containers = [
      { id: 'up', state: 'running' },
      { id: 'exited', state: 'exited' },
      { id: 'paused', state: 'paused' },
    ];
    const config: FilterConfig<(typeof containers)[number]> = {
      searchFields: [],
      filterField: 'state',
    };

    expect(filter(containers, 'running', '', config)).toEqual(['up']);
    expect(filter(containers, 'stopped', '', config)).toEqual([
      'exited',
      'paused',
    ]);
  });

  it('splits images into used and unused by the in_use flag', () => {
    const images = [
      { id: 'used', in_use: true },
      { id: 'unused', in_use: false },
    ];
    const config: FilterConfig<(typeof images)[number]> = {
      searchFields: [],
      filterField: 'in_use',
    };

    expect(filter(images, 'used', '', config)).toEqual(['used']);
    expect(filter(images, 'unused', '', config)).toEqual(['unused']);
  });

  it('splits networks into system and user-created by name', () => {
    const networks = [
      { id: 'bridge', name: 'bridge' },
      { id: 'host', name: 'HOST' },
      { id: 'none', name: 'none' },
      { id: 'app', name: 'app_default' },
    ];
    const config: FilterConfig<(typeof networks)[number]> = {
      searchFields: [],
      filterField: 'name',
    };

    expect(filter(networks, 'system', '', config)).toEqual([
      'bridge',
      'host',
      'none',
    ]);
    expect(filter(networks, 'others', '', config)).toEqual(['app']);
  });

  it('splits volumes into used and unused by reference count', () => {
    const volumes = [
      { id: 'mounted', usage_data: { ref_count: 2 } },
      { id: 'orphan', usage_data: { ref_count: 0 } },
      { id: 'unknown', usage_data: {} },
    ];
    const config: FilterConfig<(typeof volumes)[number]> = {
      searchFields: [],
      filterField: 'usage_data',
    };

    expect(filter(volumes, 'used', '', config)).toEqual(['mounted']);
    expect(filter(volumes, 'unused', '', config)).toEqual([
      'orphan',
      'unknown',
    ]);
  });
});
