import { useMemo } from 'react';
import { FilterType } from '../hooks/use-page-state';

export interface FilterConfig<T> {
  searchFields: (keyof T)[];
  filterField?: keyof T;
  filterValue?: unknown;
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

        // Handle string fields (like 'state' for containers, 'name' for networks)
        if (typeof itemValue === 'string') {
          if (filter === 'running') return itemValue === 'running';
          if (filter === 'stopped') return itemValue !== 'running';
          if (filter === 'used') return itemValue === 'used';
          if (filter === 'dangling') return itemValue === 'dangling';
          if (filter === 'unused') return itemValue === 'unused';
          if (filter === 'system') {
            const lowerName = itemValue.toLowerCase();
            return (
              lowerName === 'bridge' ||
              lowerName === 'host' ||
              lowerName === 'none'
            );
          }
          if (filter === 'others') {
            const lowerName = itemValue.toLowerCase();
            return (
              lowerName !== 'bridge' &&
              lowerName !== 'host' &&
              lowerName !== 'none'
            );
          }
        }

        // Handle object fields (like 'usage_data' for volumes)
        if (typeof itemValue === 'object' && itemValue !== null) {
          const usageData = itemValue as { ref_count?: number };
          if (filter === 'used') return (usageData.ref_count ?? 0) > 0;
          if (filter === 'unused') return (usageData.ref_count ?? 0) === 0;
        }
      }

      // Handle custom filter values
      if (config.filterValue !== undefined) {
        if (config.filterField) {
          const itemValue = item[config.filterField];

          // Handle array-based filtering (for system networks)
          if (Array.isArray(config.filterValue)) {
            if (typeof itemValue === 'string') {
              const lowerValue = itemValue.toLowerCase();
              return config.filterValue.some(
                (val: string) => val.toLowerCase() === lowerValue
              );
            }
          }

          // Handle single value filtering
          return itemValue === config.filterValue;
        }
      }

      return true;
    });
  }, [data, filter, searchTerm, config]);
}
