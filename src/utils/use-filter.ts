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

      if (config.filterField && config.filterValue) {
        const itemValue = item[config.filterField];
        if (filter === 'running') return itemValue === 'running';
        if (filter === 'stopped') return itemValue !== 'running';
        if (filter === 'used') return itemValue === 'used';
        if (filter === 'dangling') return itemValue === 'dangling';
        if (filter === 'unused') return itemValue === 'unused';
      }

      return true;
    });
  }, [data, filter, searchTerm, config]);
}
