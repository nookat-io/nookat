import {
  ImageDataProvider,
  ImageFilterLogic,
  ImageHeader,
  ImageControls,
  ImagesTable,
  useImagePageState,
} from '../components/images';

export default function ImagesPage() {
  const {
    selectedImages,
    setSelectedImages,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  } = useImagePageState();

  return (
    <ImageDataProvider>
      {({ images, isLoading, error, refreshImages }) => (
        <div className="page-background min-h-screen flex flex-col">
          {/* Sticky header section */}
          <div className="sticky top-0 z-10 bg-background border-b">
            <div className="space-y-6 p-6 max-w-full">
              <ImageHeader 
                selectedImages={selectedImages} 
                onActionComplete={refreshImages}
              />
              
              <ImageControls
                filter={filter}
                onFilterChange={setFilter}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </div>
          </div>

          {/* Scrollable table section */}
          <div className="flex-1 overflow-hidden">
            <ImageFilterLogic
              images={images}
              filter={filter}
              searchTerm={searchTerm}
            >
              {(filteredImages) => (
                <div className="p-6 max-w-full h-full overflow-auto">
                  <ImagesTable
                    filter={filter}
                    selectedImages={selectedImages}
                    onSelectionChange={setSelectedImages}
                    images={filteredImages}
                    isLoading={isLoading}
                    error={error}
                  />
                </div>
              )}
            </ImageFilterLogic>
          </div>
        </div>
      )}
    </ImageDataProvider>
  );
} 