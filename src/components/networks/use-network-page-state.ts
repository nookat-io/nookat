import { useState } from 'react';

export interface NetworkFilter {
  driver?: string;
  scope?: string;
  internal?: boolean;
}

export function useNetworkPageState() {
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  const [filter, setFilter] = useState<NetworkFilter>({});
  const [searchTerm, setSearchTerm] = useState('');

  return {
    selectedNetworks,
    setSelectedNetworks,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  };
}
