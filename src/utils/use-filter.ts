import { useMemo } from 'react';

export interface FilterConfig<T, F extends string> {
  searchFields: (keyof T)[];
  matches: Record<Exclude<F, 'all'>, (item: T) => boolean>;
}

export function useFilter<T, F extends string>(
  data: T[],
  filter: F,
  searchTerm: string,
  config: FilterConfig<T, F>
): T[] {
  return useMemo(() => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (item: T) =>
      term === '' ||
      config.searchFields.some(field => {
        const value = item[field];
        return value != null && String(value).toLowerCase().includes(term);
      });
    const matchesFilter =
      filter === 'all'
        ? () => true
        : config.matches[filter as Exclude<F, 'all'>];

    return data.filter(item => matchesSearch(item) && matchesFilter(item));
  }, [data, filter, searchTerm, config]);
}
