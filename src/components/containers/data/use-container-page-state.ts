import { useState } from 'react';

export function useContainerPageState() {
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'running' | 'stopped'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  return {
    selectedContainers,
    setSelectedContainers,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  };
} 