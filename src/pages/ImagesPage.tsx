import { ImageHeader } from '../components/images/image-header';
import { ImageControls } from '../components/images/image-controls';
import { ImagesTable } from '../components/images/images-table';
import { usePageState } from '../hooks/use-page-state';
import { useEngineState } from '../hooks/use-engine-state';
import { useFilter } from '../utils/use-filter';
import { PageLayout } from '../components/layout/page-layout';
import { usePageAnalytics } from '../hooks/use-analytics';
import { Image } from '../components/images/image-types';

export default function ImagesPage() {
  usePageAnalytics('images');

  const {
    selected,
    setSelected,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  } = usePageState<'all' | 'used' | 'dangling'>('all');

  const { engineState, isLoading, error } = useEngineState();

  // Convert images from Record to array for compatibility
  const images = engineState ? Object.values(engineState.images) : [];

  const filteredImages = useFilter<Image>(images, filter, searchTerm, {
    searchFields: ['repository', 'tag'],
    filterField: 'in_use',
  });

  return (
    <PageLayout
      header={
        <ImageHeader
          selectedImages={selected}
          images={images}
          onActionComplete={() => {}} // No longer needed with WebSocket updates
        />
      }
      controls={
        <ImageControls
          filter={filter}
          onFilterChange={setFilter}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      }
      table={
        <ImagesTable
          selectedImages={selected}
          onSelectionChange={setSelected}
          images={filteredImages}
          onActionComplete={() => {}} // No longer needed with WebSocket updates
          isLoading={isLoading}
          error={error}
          onRetry={() => window.location.reload()}
        />
      }
    />
  );
}
