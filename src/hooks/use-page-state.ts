import { useCallback, useState } from 'react';

export type FilterType =
  | 'all'
  | 'running'
  | 'stopped'
  | 'used'
  | 'dangling'
  | 'unused'
  | 'system'
  | 'others';

export interface PageState<T extends FilterType = FilterType> {
  selected: string[];
  setSelected: (selected: string[]) => void;
  filter: T;
  setFilter: (filter: T) => void;
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
  showAll: () => void;
}

export function usePageState<T extends FilterType = FilterType>(
  defaultFilter: T = 'all' as T
): PageState<T> {
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState<T>(defaultFilter);
  const [searchTerm, setSearchTerm] = useState('');

  const showAll = useCallback(() => {
    setFilter(defaultFilter);
    setSearchTerm('');
  }, [defaultFilter]);

  return {
    showAll,
    selected,
    setSelected,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  };
}
