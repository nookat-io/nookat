import { useState } from 'react';

export function useVolumePageState() {
  const [selectedVolumes, setSelectedVolumes] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'used' | 'unused'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  return {
    selectedVolumes,
    setSelectedVolumes,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  };
}
