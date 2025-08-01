import { useState } from 'react';

export type FilterType =
  | 'all'
  | 'running'
  | 'stopped'
  | 'used'
  | 'dangling'
  | 'unused';

export interface PageState<T extends FilterType = FilterType> {
  selected: string[];
  setSelected: (selected: string[]) => void;
  filter: T;
  setFilter: (filter: T) => void;
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
}

export function usePageState<T extends FilterType = FilterType>(
  defaultFilter: T = 'all' as T
): PageState<T> {
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState<T>(defaultFilter);
  const [searchTerm, setSearchTerm] = useState('');

  return {
    selected,
    setSelected,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  };
}
