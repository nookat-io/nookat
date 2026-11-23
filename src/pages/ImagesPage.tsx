import { ImageHeader } from '../components/images/image-header';
import { ImageControls } from '../components/images/image-controls';
import { ImagesTable } from '../components/images/images-table';
import { usePageState } from '../hooks/use-page-state';
import { useEngineState } from '../hooks/use-engine-state';
import { useFilter } from '../utils/use-filter';
import { PageLayout } from '../components/layout/page-layout';
import { usePageAnalytics } from '../hooks/use-analytics';
import { useEffect, useMemo, useCallback } from 'react';
import {
  ImageFilter,
  imageFilter,
  imageFilterPhrases,
} from '../components/images/image-filter';
import { Layers } from 'lucide-react';
import { ListEmptyState, UiName } from '../components/common/list-empty-state';

export default function ImagesPage() {
  usePageAnalytics('images');

  const {
    selected,
    setSelected,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    showAll,
  } = usePageState<ImageFilter>('all');

  const { engineState, isLoading, error, removeImage } = useEngineState();

  const images = useMemo(
    () => (engineState ? Object.values(engineState.images) : []),
    [engineState]
  );

  useEffect(() => {
    const existingImageIds = new Set(images.map(img => img.id));
    const existingSelectedIds = selected.filter(id => existingImageIds.has(id));
    if (existingSelectedIds.length !== selected.length) {
      setSelected(existingSelectedIds);
    }
  }, [images, selected, setSelected]);

  const filteredImages = useFilter(images, filter, searchTerm, imageFilter);

  const handleImagesDeleted = useCallback(
    (imageIds: string[]) => imageIds.forEach(removeImage),
    [removeImage]
  );

  return (
    <>
      <PageLayout
        header={
          <ImageHeader
            selectedImages={selected}
            images={images}
            onImagesDeleted={handleImagesDeleted}
            onSelectionChange={setSelected}
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
          <div className="space-y-6">
            <ImagesTable
              selectedImages={selected}
              onSelectionChange={setSelected}
              images={filteredImages}
              allImages={images}
              onImagesDeleted={handleImagesDeleted}
              isLoading={isLoading}
              error={error}
              onRetry={() => window.location.reload()}
              emptyState={
                <ListEmptyState
                  hasItems={images.length > 0}
                  icon={Layers}
                  nothingExistsTitle="No images yet"
                  nothingExistsDescription={
                    <>
                      Pull one with <UiName>Pull Image</UiName>. Images you pull
                      or build from a terminal show up here too.
                    </>
                  }
                  filterPhrases={imageFilterPhrases}
                  filter={filter}
                  searchTerm={searchTerm}
                  showAllLabel="Show all images"
                  onShowAll={showAll}
                />
              }
            />
          </div>
        }
      />
    </>
  );
}
