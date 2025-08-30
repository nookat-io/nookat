import { DockerHubImage } from '../../../types/docker-images';
import { RegistrySelector } from '../common/registry-selector';
import { DockerHubSearch } from '../common/docker-hub-search';
import { TagSelector } from '../common/tag-selector';
import { ImageDetailsDisplay } from '../common/image-details-display';
import { RegistryState, PullFormData } from '../common/types';

interface PullImageTabProps {
  pullData: PullFormData;
  registryState: RegistryState;
  searchState: {
    searchQuery: string;
    searchResults: DockerHubImage[];
    isSearching: boolean;
    searchError: string | null;
    isSearchDropdownOpen: boolean;
    focusedSearchIndex: number;
    selectedImageDetails: DockerHubImage | null;
  };
  onRegistryChange: (value: string) => void;
  onCustomRegistryChange: (value: string) => void;
  onSearchChange: (query: string) => void;
  onImageSelect: (image: DockerHubImage) => void;
  onSearchKeyDown: (e: React.KeyboardEvent) => void;
  onSearchFocus: () => void;
  onTagChange: (tag: string) => void;
  onClearSelection: () => void;
  disabled?: boolean;
  searchContainerRef: React.RefObject<HTMLDivElement>;
  searchInputRef: React.RefObject<HTMLInputElement>;
}

export function PullImageTab({
  pullData,
  registryState,
  searchState,
  onRegistryChange,
  onCustomRegistryChange,
  onSearchChange,
  onImageSelect,
  onSearchKeyDown,
  onSearchFocus,
  onTagChange,
  onClearSelection,
  disabled = false,
  searchContainerRef,
  searchInputRef,
}: PullImageTabProps) {
  return (
    <div className="space-y-4">
      {/* Registry field moved to top */}
      <RegistrySelector
        registryState={registryState}
        onRegistryChange={onRegistryChange}
        onCustomRegistryChange={onCustomRegistryChange}
        disabled={disabled}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <DockerHubSearch
            searchQuery={searchState.searchQuery}
            searchResults={searchState.searchResults}
            isSearching={searchState.isSearching}
            searchError={searchState.searchError}
            isSearchDropdownOpen={searchState.isSearchDropdownOpen}
            focusedSearchIndex={searchState.focusedSearchIndex}
            onSearchChange={onSearchChange}
            onImageSelect={onImageSelect}
            onSearchKeyDown={onSearchKeyDown}
            onFocus={onSearchFocus}
            disabled={disabled}
            containerRef={searchContainerRef}
            inputRef={searchInputRef}
            hasSelectedImage={!!searchState.selectedImageDetails}
          />

          {/* Validation Status */}
          {pullData.imageName && (
            <div className="mt-2 p-2 bg-blue-100 border border-blue-300 rounded text-xs text-blue-800">
              ✓ Ready to pull: {pullData.registry}/{pullData.imageName}:
              {pullData.tag}
            </div>
          )}
        </div>

        <TagSelector
          tag={pullData.tag}
          onTagChange={onTagChange}
          showSuggestions={!!searchState.selectedImageDetails}
          disabled={disabled}
        />
      </div>

      {/* Selected Image Details Display */}
      {searchState.selectedImageDetails && (
        <ImageDetailsDisplay
          image={searchState.selectedImageDetails}
          pullData={pullData}
          onClear={onClearSelection}
        />
      )}
    </div>
  );
}
