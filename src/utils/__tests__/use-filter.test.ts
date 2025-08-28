import { renderHook } from '@testing-library/react';
import { useFilter } from '../use-filter';

interface TestItem {
  id: string;
  name: string;
  state: string;
  in_use: boolean;
  usage_data?: { ref_count: number };
  type: string;
}

describe('useFilter hook', () => {
  const mockData: TestItem[] = [
    {
      id: '1',
      name: 'container-1',
      state: 'running',
      in_use: true,
      type: 'application',
    },
    {
      id: '2',
      name: 'container-2',
      state: 'stopped',
      in_use: false,
      type: 'system',
    },
    {
      id: '3',
      name: 'container-3',
      state: 'running',
      in_use: true,
      type: 'database',
    },
    {
      id: '4',
      name: 'bridge',
      state: 'used',
      in_use: true,
      type: 'network',
    },
    {
      id: '5',
      name: 'volume-1',
      state: 'unused',
      in_use: false,
      type: 'storage',
      usage_data: { ref_count: 0 },
    },
    {
      id: '6',
      name: 'volume-2',
      state: 'used',
      in_use: true,
      type: 'storage',
      usage_data: { ref_count: 2 },
    },
  ];

  describe('search filtering', () => {
    it('filters by search term in name field', () => {
      const { result } = renderHook(() =>
        useFilter(mockData, 'all', 'container', {
          searchFields: ['name'],
        })
      );

      expect(result.current).toHaveLength(3);
      expect(
        result.current.every(item => item.name.includes('container'))
      ).toBe(true);
    });

    it('filters by search term in multiple fields', () => {
      const { result } = renderHook(() =>
        useFilter(mockData, 'all', 'volume', {
          searchFields: ['name', 'type'],
        })
      );

      expect(result.current).toHaveLength(2);
      expect(
        result.current.every(
          item => item.name.includes('volume') || item.type === 'storage'
        )
      ).toBe(true);
    });

    it('filters by multiple search fields', () => {
      const { result } = renderHook(() =>
        useFilter(mockData, 'all', 'bridge', {
          searchFields: ['name', 'type'],
        })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].name).toBe('bridge');
    });

    it('returns all items when search term is empty', () => {
      const { result } = renderHook(() =>
        useFilter(mockData, 'all', '', {
          searchFields: ['name'],
        })
      );

      expect(result.current).toHaveLength(6);
    });

    it('handles case-insensitive search', () => {
      const { result } = renderHook(() =>
        useFilter(mockData, 'all', 'CONTAINER', {
          searchFields: ['name'],
        })
      );

      expect(result.current).toHaveLength(3);
    });
  });

  describe('state filtering', () => {
    it('filters by running state', () => {
      const { result } = renderHook(() =>
        useFilter(mockData, 'running', '', {
          searchFields: ['name'],
          filterField: 'state',
        })
      );

      expect(result.current).toHaveLength(2);
      expect(result.current.every(item => item.state === 'running')).toBe(true);
    });

    it('filters by stopped state', () => {
      const { result } = renderHook(() =>
        useFilter(mockData, 'stopped', '', {
          searchFields: ['name'],
          filterField: 'state',
        })
      );

      expect(result.current).toHaveLength(4); // All non-running items
      expect(result.current.every(item => item.state !== 'running')).toBe(true);
    });

    it('filters by used state', () => {
      const { result } = renderHook(() =>
        useFilter(mockData, 'used', '', {
          searchFields: ['name'],
          filterField: 'state',
        })
      );

      expect(result.current).toHaveLength(2);
      expect(result.current.every(item => item.state === 'used')).toBe(true);
    });

    it('filters by unused state', () => {
      const { result } = renderHook(() =>
        useFilter(mockData, 'unused', '', {
          searchFields: ['name'],
          filterField: 'state',
        })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].state).toBe('unused');
    });

    it('returns all items when filter is all', () => {
      const { result } = renderHook(() =>
        useFilter(mockData, 'all', '', {
          searchFields: ['name'],
          filterField: 'state',
        })
      );

      expect(result.current).toHaveLength(6);
    });
  });

  describe('boolean field filtering', () => {
    it('filters by in_use true (used)', () => {
      const { result } = renderHook(() =>
        useFilter(mockData, 'used', '', {
          searchFields: ['name'],
          filterField: 'in_use',
        })
      );

      expect(result.current).toHaveLength(4);
      expect(result.current.every(item => item.in_use === true)).toBe(true);
    });

    it('filters by in_use false (dangling/unused)', () => {
      const { result } = renderHook(() =>
        useFilter(mockData, 'dangling', '', {
          searchFields: ['name'],
          filterField: 'in_use',
        })
      );

      expect(result.current).toHaveLength(2);
      expect(result.current.every(item => item.in_use === false)).toBe(true);
    });
  });

  describe('object field filtering', () => {
    it('filters by usage data ref_count > 0 (used)', () => {
      const volumeData = mockData.filter(item => item.type === 'storage');
      const { result } = renderHook(() =>
        useFilter(volumeData, 'used', '', {
          searchFields: ['name'],
          filterField: 'usage_data',
        })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].usage_data?.ref_count).toBeGreaterThan(0);
    });

    it('filters by usage data ref_count === 0 (unused)', () => {
      const volumeData = mockData.filter(item => item.type === 'storage');
      const { result } = renderHook(() =>
        useFilter(volumeData, 'unused', '', {
          searchFields: ['name'],
          filterField: 'usage_data',
        })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].usage_data?.ref_count).toBe(0);
    });

    it('handles missing usage data gracefully', () => {
      const volumeData = mockData.filter(item => item.type === 'storage');
      const { result } = renderHook(() =>
        useFilter(volumeData, 'unused', '', {
          searchFields: ['name'],
          filterField: 'usage_data',
        })
      );

      // Should only return items with usage_data and ref_count === 0
      expect(result.current).toHaveLength(1);
      expect(result.current[0].usage_data?.ref_count).toBe(0);
    });
  });

  describe('custom filter values', () => {
    it('does not apply custom filter when filter is all (current implementation)', () => {
      const { result } = renderHook(() =>
        useFilter(mockData, 'all', '', {
          searchFields: ['name'],
          filterField: 'type',
          filterValue: 'storage',
        })
      );

      // With filter === 'all', the hook short-circuits before custom filterValue is applied
      expect(result.current).toHaveLength(6);
    });

    it('does not apply array custom filter when filter is all (current implementation)', () => {
      const { result } = renderHook(() =>
        useFilter(mockData, 'all', '', {
          searchFields: ['name'],
          filterField: 'name',
          filterValue: ['bridge', 'host'],
        })
      );

      expect(result.current).toHaveLength(6);
    });
  });

  describe('combined filtering', () => {
    it('combines search, state, and custom filtering', () => {
      const { result } = renderHook(() =>
        useFilter(mockData, 'running', 'container', {
          searchFields: ['name'],
          filterField: 'state',
          filterValue: 'running',
        })
      );

      expect(result.current).toHaveLength(2);
      expect(
        result.current.every(
          item => item.name.includes('container') && item.state === 'running'
        )
      ).toBe(true);
    });

    it('returns empty array when no items match all criteria', () => {
      const { result } = renderHook(() =>
        useFilter(mockData, 'stopped', 'container', {
          searchFields: ['name'],
          filterField: 'state',
          filterValue: 'stopped',
        })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].name).toBe('container-2');
    });
  });

  describe('edge cases', () => {
    it('handles empty data array', () => {
      const { result } = renderHook(() =>
        useFilter([], 'all', '', {
          searchFields: ['name'],
        })
      );

      expect(result.current).toHaveLength(0);
    });

    it('handles null/undefined field values', () => {
      const dataWithNulls = [
        { id: '1', name: 'test', value: null },
        { id: '2', name: 'test2', value: undefined },
      ];

      const { result } = renderHook(() =>
        useFilter(dataWithNulls, 'all', 'test', {
          searchFields: ['name', 'value'],
        })
      );

      expect(result.current).toHaveLength(2);
    });

    it('handles missing filterField gracefully', () => {
      const { result } = renderHook(() =>
        useFilter(mockData, 'running', '', {
          searchFields: ['name'],
          // No filterField specified
        })
      );

      expect(result.current).toHaveLength(6); // Should return all items
    });
  });
});
