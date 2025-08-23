import { useState, useMemo } from 'react';
import { SortDirection } from '../components/ui/sortable-table-header';

export interface SortConfig {
  key: string | null;
  direction: SortDirection;
}

export function useTableSort<T>(
  data: T[],
  defaultSortKey?: string,
  defaultDirection: SortDirection = 'asc'
) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: defaultSortKey || null,
    direction: defaultDirection,
  });

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key!);
      const bValue = getNestedValue(b, sortConfig.key!);

      if (aValue === null && bValue === null) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison = 0;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        comparison = Number(aValue) - Number(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortConfig.direction === 'desc' ? -comparison : comparison;
    });
  }, [data, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        // Cycle through: asc -> desc -> null (no sort)
        if (prev.direction === 'asc') {
          return { key, direction: 'desc' };
        } else if (prev.direction === 'desc') {
          return { key: null, direction: null };
        }
      }
      // Set new sort key with ascending direction
      return { key, direction: 'asc' };
    });
  };

  return {
    sortedData,
    sortConfig,
    handleSort,
  };
}

// Helper function to get nested object values by dot notation
function getNestedValue(obj: unknown, path: string): unknown {
  // Handle special container fields
  if (path === 'names') {
    const names = (obj as { names?: string[] })?.names;
    return names && names.length > 0 ? names[0].replace(/^\//, '') : '';
  }
  if (path === 'ports') {
    const ports = (obj as { ports?: unknown[] })?.ports;
    return ports && ports.length > 0 ? ports.length : 0;
  }

  // Handle dot notation paths
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (
      current &&
      typeof current === 'object' &&
      current !== null &&
      key in current
    ) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return null;
    }
  }

  return current;
}
