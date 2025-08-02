import { ImageData } from '../components/images/image-types';
import { ImageHeader } from '../components/images/image-header';
import { ImageControls } from '../components/images/image-controls';
import { ImagesTable } from '../components/images/images-table';
import { usePageState } from '../hooks/use-page-state';
import { useDataProvider } from '../hooks/use-data-provider';
import { useFilter } from '../utils/use-filter';
import { PageLayout } from '../components/layout/page-layout';

export default function ImagesPage() {
  const {
    selected,
    setSelected,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  } = usePageState<'all' | 'used' | 'dangling'>('all');

  const {
    data: images,
    isLoading,
    error,
    refresh,
  } = useDataProvider<ImageData>('list_images');

  const filteredImages = useFilter(images, filter, searchTerm, {
    searchFields: ['repository', 'tag'],
    filterField: 'in_use',
  });

  return (
    <PageLayout
      header={
        <ImageHeader
          selectedImages={selected}
          images={images}
          onActionComplete={refresh}
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
          onActionComplete={refresh}
          isLoading={isLoading}
          error={error}
          onRetry={refresh}
        />
      }
    />
  );
}
