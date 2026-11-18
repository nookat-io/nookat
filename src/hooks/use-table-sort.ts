import { useState, useMemo } from 'react';
import { SortDirection } from '../components/ui/sortable-table-header';
import { Container } from '../components/containers/container-types';
import { formatContainerName } from '../components/containers/container-utils';

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
      const aValue = getSortValue(a, sortConfig.key!);
      const bValue = getSortValue(b, sortConfig.key!);

      if (aValue === null && bValue === null) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison: number;

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
    setSortConfig(current => nextSortConfig(current, key));
  };

  return {
    sortedData,
    sortConfig,
    handleSort,
  };
}

function nextSortConfig(current: SortConfig, key: string): SortConfig {
  const isSameColumn = current.key === key;
  if (isSameColumn && current.direction === 'asc') {
    return { key, direction: 'desc' };
  }
  if (isSameColumn && current.direction === 'desc') {
    return { key: null, direction: null };
  }
  return { key, direction: 'asc' };
}

function getSortValue(row: unknown, sortKey: string): unknown {
  if (sortKey === 'names') {
    return formatContainerName(row as Container);
  }
  if (sortKey === 'ports') {
    return (row as Container).ports?.length ?? 0;
  }
  return getValueAtDotPath(row, sortKey);
}

function getValueAtDotPath(obj: unknown, dotPath: string): unknown {
  let current: unknown = obj;

  for (const key of dotPath.split('.')) {
    if (typeof current === 'object' && current !== null && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return null;
    }
  }

  return current;
}
