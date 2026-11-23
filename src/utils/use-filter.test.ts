import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { containerFilterPhrases } from '../components/containers/container-filter';
import { FilterConfig, noMatchesTitle, useFilter } from './use-filter';

interface Item {
  id: string;
  name: string | null;
  image: string;
  running: boolean;
}

type ItemFilter = 'all' | 'running' | 'stopped';

const items: Item[] = [
  { id: 'web', name: 'nginx-web', image: 'nginx:1.27', running: true },
  { id: 'worker', name: 'nginx-worker', image: 'nginx:1.27', running: false },
  { id: 'db', name: 'postgres', image: 'postgres:18', running: true },
  { id: 'anon', name: null, image: 'busybox', running: false },
];

const config: FilterConfig<Item, ItemFilter> = {
  searchFields: ['name', 'image'],
  matches: {
    running: item => item.running,
    stopped: item => !item.running,
  },
};

function filterIds(filter: ItemFilter, searchTerm = '') {
  const { result } = renderHook(() =>
    useFilter(items, filter, searchTerm, config)
  );
  return result.current.map(item => item.id);
}

describe('useFilter', () => {
  it('returns everything for the all filter and an empty search', () => {
    expect(filterIds('all')).toEqual(['web', 'worker', 'db', 'anon']);
  });

  it('keeps the items that the selected filter matches', () => {
    expect(filterIds('running')).toEqual(['web', 'db']);
    expect(filterIds('stopped')).toEqual(['worker', 'anon']);
  });

  it('matches the search against any search field, ignoring case', () => {
    expect(filterIds('all', 'NGINX')).toEqual(['web', 'worker']);
    expect(filterIds('all', ':18')).toEqual(['db']);
  });

  it('skips empty fields instead of matching their string form', () => {
    expect(filterIds('all', 'null')).toEqual([]);
    expect(filterIds('all', 'busy')).toEqual(['anon']);
  });

  it('keeps only the items that match both the search and the filter', () => {
    expect(filterIds('running', 'nginx')).toEqual(['web']);
  });
});

describe('noMatchesTitle', () => {
  it('names the filter and the search that hide every item', () => {
    expect(noMatchesTitle(containerFilterPhrases, 'running', '')).toBe(
      'No running containers'
    );
    expect(noMatchesTitle(containerFilterPhrases, 'running', 'web')).toBe(
      'No running containers match "web"'
    );
    expect(noMatchesTitle(containerFilterPhrases, 'all', 'web')).toBe(
      'No containers match "web"'
    );
  });
});
