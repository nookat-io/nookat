import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Image,
  Calendar,
  HardDrive,
  Hash,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  LocalDockerImage,
  DockerImageSelectorProps,
} from '../../types/docker-images';
import { listDockerImages, checkDockerAccess } from '../../lib/docker';

export function DockerImageSelector({
  onImageSelect,
  disabled = false,
  className = '',
}: DockerImageSelectorProps) {
  const [images, setImages] = useState<LocalDockerImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<LocalDockerImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [selectedImage, setSelectedImage] = useState<LocalDockerImage | null>(
    null
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load Docker images
  const loadImages = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check Docker access first
      const hasAccess = await checkDockerAccess();
      if (!hasAccess) {
        throw new Error(
          'Docker daemon is not accessible. Please ensure Docker is running.'
        );
      }

      const dockerImages = await listDockerImages();
      setImages(dockerImages);
      setFilteredImages(dockerImages);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load Docker images';
      setError(errorMessage);
      setImages([]);
      setFilteredImages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Filter images based on search query
  const filterImages = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setFilteredImages(images);
        return;
      }

      const filtered = images.filter(
        image =>
          image.repository.toLowerCase().includes(query.toLowerCase()) ||
          image.tag.toLowerCase().includes(query.toLowerCase()) ||
          image.id.toLowerCase().includes(query.toLowerCase()) ||
          image.fullName.toLowerCase().includes(query.toLowerCase())
      );

      setFilteredImages(filtered);
    },
    [images]
  );

  // Handle search input changes
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      filterImages(query);
    },
    [filterImages]
  );

  // Handle image selection
  const handleImageSelect = useCallback(
    (image: LocalDockerImage) => {
      setSelectedImage(image);
      onImageSelect(image);
      setIsOpen(false);
      setFocusedIndex(-1);
      inputRef.current?.blur();
    },
    [onImageSelect]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || filteredImages.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev =>
            prev < filteredImages.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < filteredImages.length) {
            handleImageSelect(filteredImages[focusedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setFocusedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, filteredImages, focusedIndex, handleImageSelect]
  );

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load images on mount
  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // Update filtered images when images change
  useEffect(() => {
    filterImages(searchQuery);
  }, [images, searchQuery, filterImages]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Image className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (filteredImages.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder="Search local Docker images..."
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2 border border-input bg-background text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Selected image display */}
      {selectedImage && (
        <div className="mt-2 p-3 bg-muted/50 rounded-md border">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {selectedImage.fullName}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                ID: {selectedImage.id.substring(0, 12)}... | Size:{' '}
                {selectedImage.size}
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedImage(null);
                onImageSelect(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-72 overflow-y-auto">
          {error ? (
            <div className="p-3 text-sm text-destructive">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
              <button
                onClick={loadImages}
                className="mt-2 flex items-center gap-2 text-xs text-primary hover:underline"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              {searchQuery
                ? 'No images match your search'
                : 'No Docker images found'}
            </div>
          ) : (
            filteredImages.map((image, index) => (
              <div
                key={image.id}
                className={`w-full justify-start p-3 h-auto text-left hover:bg-muted/50 cursor-pointer ${
                  index === focusedIndex ? 'bg-muted/50' : ''
                }`}
                onClick={() => handleImageSelect(image)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate mb-1">
                      {image.fullName}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        <span className="truncate">
                          {image.id.substring(0, 12)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        <span>{image.size}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className="truncate">
                          {new Date(image.created).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Image className="h-3 w-3" />
                        <span className="truncate">{image.repository}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
