import React from 'react';
import { ImageData } from './image-data-provider';

interface ImageFilterLogicProps {
  images: ImageData[];
  filter: 'all' | 'used' | 'dangling';
  searchTerm: string;
  children: (filteredImages: ImageData[]) => React.ReactNode;
}

export function ImageFilterLogic({ 
  images, 
  filter, 
  searchTerm, 
  children 
}: ImageFilterLogicProps) {
  const filteredImages = images.filter(image => {
    const imageName = image.repository && image.tag 
      ? `${image.repository}:${image.tag}` 
      : image.id;
    
    const matchesSearch = imageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         image.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'used') return matchesSearch && image.in_use;
    if (filter === 'dangling') return matchesSearch && !image.in_use;
    return matchesSearch;
  });

  return <>{children(filteredImages)}</>;
} 