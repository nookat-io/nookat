import { useState } from 'react';

export function useImagePageState() {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'used' | 'dangling'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  return {
    selectedImages,
    setSelectedImages,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  };
}
