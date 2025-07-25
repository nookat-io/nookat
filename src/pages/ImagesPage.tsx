import { useState } from 'react';
import { ImagesTable } from '../components/images/images-table';
import { ImageActions } from '../components/images/image-actions';
import { ImageFilters } from '../components/images/image-filters';
import { ImageDataProvider } from '../components/images/image-data-provider';

export default function ImagesPage() {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'used' | 'dangling'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="page-background min-h-screen">
      <div className="space-y-6 p-6 max-w-full">
        <div className="flex items-center justify-between">
          <div className="border border-border/50 rounded-2xl p-6 dark:bg-card/50 w-full flex flex-col items-start justify-start">
            <div className="flex items-start justify-between w-full">
              <div className="flex flex-col items-start justify-start">
                <h1 className="text-3xl font-bold bg-clip-text">
                  Images
                </h1>
                <p className="text-muted-foreground mt-2">
                  Manage your docker images
                </p>
              </div>
              <div className="flex items-start">
                <ImageActions 
                  selectedImages={selectedImages} 
                  onRefresh={handleRefresh}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="content-section">
          <ImageFilters filter={filter} onFilterChange={setFilter} />
        </div>
        
        <div className="content-section">
          <ImageDataProvider key={refreshKey}>
            {({ images, isLoading, error }) => (
              <ImagesTable 
                filter={filter}
                selectedImages={selectedImages}
                onSelectionChange={setSelectedImages}
                images={images}
                isLoading={isLoading}
                error={error}
              />
            )}
          </ImageDataProvider>
        </div>
      </div>
    </div>
  );
} 