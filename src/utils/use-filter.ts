import { useMemo } from 'react';
import { FilterType } from '../hooks/use-page-state';

export interface FilterConfig<T> {
  searchFields: (keyof T)[];
  filterField?: keyof T;
  filterValue?: string;
}

export function useFilter<T>(
  data: T[],
  filter: FilterType,
  searchTerm: string,
  config: FilterConfig<T>
): T[] {
  return useMemo(() => {
    return data.filter(item => {
      // Search filtering
      const matchesSearch =
        searchTerm === '' ||
        config.searchFields.some(field => {
          const value = item[field];
          if (value == null) return false;

          const stringValue = String(value).toLowerCase();
          return stringValue.includes(searchTerm.toLowerCase());
        });

      if (!matchesSearch) return false;

      // State filtering
      if (filter === 'all') return true;

      if (config.filterField) {
        const itemValue = item[config.filterField];

        // Handle boolean fields (like 'in_use' for images)
        if (typeof itemValue === 'boolean') {
          if (filter === 'used') return itemValue === true;
          if (filter === 'dangling') return itemValue === false;
          if (filter === 'unused') return itemValue === false;
        }

        // Handle string fields (like 'state' for containers)
        if (typeof itemValue === 'string') {
          if (filter === 'running') return itemValue === 'running';
          if (filter === 'stopped') return itemValue !== 'running';
          if (filter === 'used') return itemValue === 'used';
          if (filter === 'dangling') return itemValue === 'dangling';
          if (filter === 'unused') return itemValue === 'unused';
        }

        // Handle object fields (like 'usage_data' for volumes)
        if (typeof itemValue === 'object' && itemValue !== null) {
          const usageData = itemValue as { ref_count?: number };
          if (filter === 'used') return (usageData.ref_count ?? 0) > 0;
          if (filter === 'unused') return (usageData.ref_count ?? 0) === 0;
        }
      }

      return true;
    });
  }, [data, filter, searchTerm, config]);
}
