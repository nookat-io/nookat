'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Download,
  Hammer,
  CheckCircle,
  AlertCircle,
  Search,
  Star,
  Crown,
  Zap,
  Loader2,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { DockerHubImage } from '../../types/docker-images';

interface PullBuildImageModalProps {
  onSuccess?: () => void;
}

type ActionType = 'pull' | 'build';

interface PullFormData {
  imageName: string;
  tag: string;
  registry: string;
}

interface BuildFormData {
  dockerfilePath: string;
  buildContext: string;
  imageName: string;
  tag: string;
  buildArgs: string;
  noCache: boolean;
  pull: boolean;
}

interface ProgressState {
  isRunning: boolean;
  progress: string;
  error: string | null;
  success: boolean;
}

// Type for error objects that might have a message property
interface ErrorWithMessage {
  message: string;
}

// Type guard to check if an object has a message property
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

export function PullBuildImageModal({ onSuccess }: PullBuildImageModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActionType>('pull');
  const [progress, setProgress] = useState<ProgressState>({
    isRunning: false,
    progress: '',
    error: null,
    success: false,
  });

  // Form data for pull operation
  const [pullData, setPullData] = useState<PullFormData>({
    imageName: '',
    tag: 'latest',
    registry: 'docker.io',
  });

  // Selection feedback state
  const [selectionFeedback, setSelectionFeedback] = useState<string>('');

  // Registry selection state
  const [selectedRegistry, setSelectedRegistry] = useState<string>('docker.io');
  const [customRegistry, setCustomRegistry] = useState<string>('');
  const [showCustomRegistry, setShowCustomRegistry] = useState(false);

  // Form data for build operation
  const [buildData, setBuildData] = useState<BuildFormData>({
    dockerfilePath: '',
    buildContext: '',
    imageName: '',
    tag: 'latest',
    buildArgs: '',
    noCache: false,
    pull: false,
  });

  // Docker Hub search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DockerHubImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [focusedSearchIndex, setFocusedSearchIndex] = useState(-1);
  const [selectedImageDetails, setSelectedImageDetails] =
    useState<DockerHubImage | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const resetProgress = () => {
    setProgress({
      isRunning: false,
      progress: '',
      error: null,
      success: false,
    });
  };

  const resetForm = () => {
    setPullData({ imageName: '', tag: 'latest', registry: 'docker.io' });
    setSelectedRegistry('docker.io');
    setCustomRegistry('');
    setShowCustomRegistry(false);
    setBuildData({
      dockerfilePath: '',
      buildContext: '',
      imageName: '',
      tag: 'latest',
      buildArgs: '',
      noCache: false,
      pull: false,
    });
    setSearchQuery('');
    setSelectedImageDetails(null);
    setSearchResults([]);
    setIsSearchDropdownOpen(false);
    setFocusedSearchIndex(-1);
    setSelectionFeedback('');
  };

  // Docker Hub search functions
  const searchDockerHub = async (query: string) => {
    try {
      const result = await invoke('search_docker_hub', { query });
      return result;
    } catch (error) {
      console.error('Failed to search Docker Hub:', error);
      throw error;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearchDropdownOpen(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const result = (await searchDockerHub(query)) as {
        results: DockerHubImage[];
      };

      const images = result.results || [];

      // Sort: Official images first, then by star count (descending)
      const sortedImages = images
        .sort((a: DockerHubImage, b: DockerHubImage) => {
          if (a.is_official && !b.is_official) return -1;
          if (!a.is_official && b.is_official) return 1;
          return b.star_count - a.star_count;
        })
        .slice(0, 10); // Limit to 10 results

      setSearchResults(sortedImages);
      setIsSearchDropdownOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Failed to search Docker Hub. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set new timeout for search
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    },
    [performSearch]
  );

  const handleImageSelect = useCallback(
    (image: DockerHubImage) => {
      const imageName = image.is_official
        ? `library/${image.name}`
        : image.name;

      // Update pull form data immediately
      const newPullData = {
        ...pullData,
        imageName,
        // Set default tag based on image type
        tag: 'latest',
        // Auto-suggest registry based on image type
        registry: image.is_official ? 'docker.io' : 'docker.io',
      };
      setPullData(newPullData);

      // Store selected image details for display
      setSelectedImageDetails(image);

      // Update search query to show the selected image name
      setSearchQuery(imageName);

      // Show selection feedback
      setSelectionFeedback(`Selected: ${imageName}`);
      setTimeout(() => setSelectionFeedback(''), 3000);

      // Also update the input value directly for immediate feedback
      if (searchInputRef.current) {
        searchInputRef.current.value = imageName;
      }

      // Clear search results and close dropdown
      setSearchResults([]);
      setIsSearchDropdownOpen(false);
      setFocusedSearchIndex(-1);
      searchInputRef.current?.blur();
    },
    [pullData]
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isSearchDropdownOpen || searchResults.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedSearchIndex(prev =>
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedSearchIndex(prev => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (
            focusedSearchIndex >= 0 &&
            focusedSearchIndex < searchResults.length
          ) {
            handleImageSelect(searchResults[focusedSearchIndex]);
          }
          break;
        case 'Escape':
          setIsSearchDropdownOpen(false);
          setFocusedSearchIndex(-1);
          searchInputRef.current?.blur();
          break;
      }
    },
    [isSearchDropdownOpen, searchResults, focusedSearchIndex, handleImageSelect]
  );

  // Handle click outside search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        // Add a small delay to ensure onClick events on dropdown items can execute
        setTimeout(() => {
          setIsSearchDropdownOpen(false);
          setFocusedSearchIndex(-1);
        }, 100);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Sync search query with form data when form data is updated programmatically
  useEffect(() => {
    if (pullData.imageName && !searchQuery) {
      setSearchQuery(pullData.imageName);
    }
  }, [pullData.imageName, searchQuery]);

  // Sync form data when selected image details change
  useEffect(() => {
    if (selectedImageDetails) {
      const imageName = selectedImageDetails.is_official
        ? `library/${selectedImageDetails.name}`
        : selectedImageDetails.name;
      setPullData(prev => ({
        ...prev,
        imageName,
        tag: 'latest',
        registry: 'docker.io',
      }));
      setSearchQuery(imageName);
    }
  }, [selectedImageDetails]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleRegistryChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomRegistry(true);
      setSelectedRegistry('custom');
      setPullData(prev => ({ ...prev, registry: customRegistry || '' }));
    } else {
      setShowCustomRegistry(false);
      setSelectedRegistry(value);
      setPullData(prev => ({ ...prev, registry: value }));
    }
  };

  const handleCustomRegistryChange = (value: string) => {
    setCustomRegistry(value);
    setPullData(prev => ({ ...prev, registry: value }));
  };

  const handlePull = async () => {
    if (!pullData.imageName.trim()) {
      setProgress(prev => ({ ...prev, error: 'Image name is required' }));
      return;
    }

    // Validate image name format
    const imageName = pullData.imageName.trim();
    if (imageName.includes(' ') || imageName.includes('\t')) {
      setProgress(prev => ({
        ...prev,
        error: 'Image name cannot contain spaces or tabs',
      }));
      return;
    }

    // Validate registry format
    const registry = pullData.registry.trim();
    if (registry.includes(' ') || registry.includes('\t')) {
      setProgress(prev => ({
        ...prev,
        error: 'Registry cannot contain spaces or tabs',
      }));
      return;
    }

    setProgress({
      isRunning: true,
      progress: 'Pulling image...',
      error: null,
      success: false,
    });

    try {
      const fullImageName =
        pullData.tag === 'latest'
          ? pullData.imageName
          : `${pullData.imageName}:${pullData.tag}`;

      await invoke('pull_image', {
        imageName: fullImageName,
        registry: pullData.registry,
      });

      setProgress({
        isRunning: false,
        progress: 'Image pulled successfully!',
        error: null,
        success: true,
      });

      // Reset form and close modal after success
      setTimeout(() => {
        setIsOpen(false);
        resetProgress();
        setPullData({ imageName: '', tag: 'latest', registry: 'docker.io' });
        onSuccess?.();
      }, 2000);
    } catch (error) {
      console.error('Pull image error:', error);

      // Extract more detailed error information
      let errorMessage = 'Failed to pull image';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (isErrorWithMessage(error)) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'toString' in error) {
        errorMessage = String(error);
      }

      setProgress({
        isRunning: false,
        progress: '',
        error: errorMessage,
        success: false,
      });
    }
  };

  const handleBuild = async () => {
    if (!buildData.dockerfilePath.trim() || !buildData.imageName.trim()) {
      setProgress(prev => ({
        ...prev,
        error: 'Dockerfile path and image name are required',
      }));
      return;
    }

    setProgress({
      isRunning: true,
      progress: 'Building image...',
      error: null,
      success: false,
    });

    try {
      const fullImageName =
        buildData.tag === 'latest'
          ? buildData.imageName
          : `${buildData.imageName}:${buildData.tag}`;

      // Parse build args from string to key-value pairs
      const buildArgs: Record<string, string> = {};
      if (buildData.buildArgs.trim()) {
        buildData.buildArgs.split('\n').forEach(line => {
          const [key, value] = line.split('=');
          if (key && value) {
            buildArgs[key.trim()] = value.trim();
          }
        });
      }

      await invoke('build_image', {
        dockerfilePath: buildData.dockerfilePath,
        buildContext: buildData.buildContext || '.',
        imageName: fullImageName,
        buildArgs,
        options: {
          noCache: buildData.noCache,
          pull: buildData.pull,
        },
      });

      setProgress({
        isRunning: false,
        progress: 'Image built successfully!',
        error: null,
        success: true,
      });

      // Reset form and close modal after success
      setTimeout(() => {
        setIsOpen(false);
        resetProgress();
        setBuildData({
          dockerfilePath: '',
          buildContext: '',
          imageName: '',
          tag: 'latest',
          buildArgs: '',
          noCache: false,
          pull: false,
        });
        onSuccess?.();
      }, 2000);
    } catch (error) {
      console.error('Build image error:', error);

      // Extract more detailed error information
      let errorMessage = 'Failed to build image';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (isErrorWithMessage(error)) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'toString' in error) {
        errorMessage = String(error);
      }

      setProgress({
        isRunning: false,
        progress: '',
        error: errorMessage,
        success: false,
      });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !progress.isRunning) {
      setIsOpen(false);
      resetProgress();
      resetForm();
    } else if (open) {
      // Ensure form is reset when opening
      resetForm();
      resetProgress();
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as ActionType);
    resetProgress();
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          onClick={() => {
            setIsOpen(true);
            resetForm();
            resetProgress();
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Pull/Build Image
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pull or Build Image</DialogTitle>
          <DialogDescription>
            Pull an image from a registry or build an image from a Dockerfile
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pull">Pull from Registry</TabsTrigger>
            <TabsTrigger value="build">Build from Dockerfile</TabsTrigger>
          </TabsList>

          <TabsContent value="pull" className="space-y-4">
            <div className="space-y-4">
              {/* Registry field moved to top */}
              <div className="space-y-2">
                <Label htmlFor="pull-registry">Registry</Label>
                <Select
                  value={selectedRegistry}
                  onValueChange={handleRegistryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select registry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="docker.io">docker.io</SelectItem>
                    <SelectItem value="custom">Add new registry</SelectItem>
                  </SelectContent>
                </Select>

                {/* Custom registry input */}
                {showCustomRegistry && (
                  <Input
                    placeholder="Enter custom registry (e.g., gcr.io, ecr.aws.com)"
                    value={customRegistry}
                    onChange={e => handleCustomRegistryChange(e.target.value)}
                    disabled={progress.isRunning}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pull-image-name">Image Name</Label>
                  <div ref={searchContainerRef} className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      id="pull-image-name"
                      placeholder="Search Docker Hub images..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                      onFocus={() => {
                        if (searchResults.length > 0) {
                          setIsSearchDropdownOpen(true);
                        }
                      }}
                      disabled={progress.isRunning}
                      className={`pl-10 ${selectedImageDetails ? 'border-green-500 bg-green-50' : ''}`}
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {/* Selection Feedback */}
                  {selectionFeedback && (
                    <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded text-xs text-green-800">
                      {selectionFeedback}
                    </div>
                  )}

                  {/* Validation Status */}
                  {pullData.imageName && (
                    <div className="mt-2 p-2 bg-blue-100 border border-blue-300 rounded text-xs text-blue-800">
                      ✓ Ready to pull: {pullData.registry}/{pullData.imageName}:
                      {pullData.tag}
                    </div>
                  )}

                  {/* Search Dropdown */}
                  {isSearchDropdownOpen && (
                    <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-72 overflow-y-auto left-0 top-full">
                      {searchError ? (
                        <div className="p-3 text-sm text-red-600">
                          {searchError}
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 text-center">
                          No images found
                        </div>
                      ) : (
                        <>
                          {searchResults.map((image, index) => (
                            <div
                              key={image.name}
                              className={`w-full justify-start p-3 h-auto text-left hover:bg-gray-100 cursor-pointer transition-colors ${
                                index === focusedSearchIndex
                                  ? 'bg-gray-100'
                                  : ''
                              }`}
                              onClick={event => {
                                event.preventDefault();
                                event.stopPropagation();
                                // Add visual feedback
                                const element =
                                  event.currentTarget as HTMLElement;
                                if (element) {
                                  element.style.backgroundColor = '#fef3c7'; // yellow-200
                                  setTimeout(() => {
                                    element.style.backgroundColor = '';
                                  }, 200);
                                }
                                handleImageSelect(image);
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm truncate">
                                      {image.name}
                                    </span>
                                    {image.is_official && (
                                      <div className="relative group">
                                        <Crown className="h-3 w-3 text-yellow-500" />
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                          Official
                                        </div>
                                      </div>
                                    )}
                                    {image.is_automated && (
                                      <div className="relative group">
                                        <Zap className="h-3 w-3 text-blue-500" />
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                          Automated
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {image.description && (
                                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                                      {image.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3" />
                                      <span>
                                        {formatNumber(image.star_count)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Download className="h-3 w-3" />
                                      <span>
                                        {formatNumber(image.pull_count)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}

                  {/* Selected Image Details Display */}
                  {selectedImageDetails && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-sm font-medium text-blue-900">
                              Selected Image Details
                            </h4>
                            {selectedImageDetails.is_official && (
                              <div className="flex items-center gap-1">
                                <Crown className="h-3 w-3 text-yellow-500" />
                                <span className="text-xs text-yellow-700">
                                  Official
                                </span>
                              </div>
                            )}
                            {selectedImageDetails.is_automated && (
                              <div className="flex items-center gap-1">
                                <Zap className="h-3 w-3 text-blue-500" />
                                <span className="text-xs text-blue-700">
                                  Automated
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Full Image Name Preview */}
                          <div className="mb-3 p-2 bg-blue-100 rounded border border-blue-300">
                            <p className="text-xs text-blue-800 font-mono">
                              <span className="text-blue-600">Will pull:</span>{' '}
                              {pullData.registry}/{pullData.imageName}:
                              {pullData.tag}
                            </p>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500" />
                                <span className="text-blue-700">
                                  {formatNumber(
                                    selectedImageDetails.star_count
                                  )}{' '}
                                  stars
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Download className="h-3 w-3 text-blue-500" />
                                <span className="text-blue-700">
                                  {formatNumber(
                                    selectedImageDetails.pull_count
                                  )}{' '}
                                  pulls
                                </span>
                              </div>
                            </div>

                            {selectedImageDetails.description && (
                              <p className="text-blue-700 text-xs leading-relaxed">
                                {selectedImageDetails.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedImageDetails(null);
                            setPullData(prev => ({
                              ...prev,
                              imageName: '',
                              tag: 'latest',
                            }));
                            setSearchQuery('');
                          }}
                          className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pull-tag">Tag</Label>
                  <div className="space-y-2">
                    <Input
                      id="pull-tag"
                      placeholder="latest"
                      value={pullData.tag}
                      onChange={e =>
                        setPullData(prev => ({ ...prev, tag: e.target.value }))
                      }
                      disabled={progress.isRunning}
                    />

                    {/* Tag Suggestions */}
                    {selectedImageDetails && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-muted-foreground">
                          Common tags:
                        </span>
                        {['latest', 'stable', 'alpine', 'slim'].map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setPullData(prev => ({ ...prev, tag }))
                            }
                            className={`px-2 py-1 text-xs rounded border transition-colors ${
                              pullData.tag === tag
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-muted-foreground border-border hover:bg-muted'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="build" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="build-dockerfile">Dockerfile Path</Label>
                  <Input
                    id="build-dockerfile"
                    placeholder="e.g., ./Dockerfile"
                    value={buildData.dockerfilePath}
                    onChange={e =>
                      setBuildData(prev => ({
                        ...prev,
                        dockerfilePath: e.target.value,
                      }))
                    }
                    disabled={progress.isRunning}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="build-context">Build Context</Label>
                  <Input
                    id="build-context"
                    placeholder="e.g., ."
                    value={buildData.buildContext}
                    onChange={e =>
                      setBuildData(prev => ({
                        ...prev,
                        buildContext: e.target.value,
                      }))
                    }
                    disabled={progress.isRunning}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="build-image-name">Image Name</Label>
                  <Input
                    id="build-image-name"
                    placeholder="e.g., myapp"
                    value={buildData.imageName}
                    onChange={e =>
                      setBuildData(prev => ({
                        ...prev,
                        imageName: e.target.value,
                      }))
                    }
                    disabled={progress.isRunning}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="build-tag">Tag</Label>
                  <Input
                    id="build-tag"
                    placeholder="latest"
                    value={buildData.tag}
                    onChange={e =>
                      setBuildData(prev => ({ ...prev, tag: e.target.value }))
                    }
                    disabled={progress.isRunning}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="build-args">
                  Build Arguments (key=value, one per line)
                </Label>
                <Textarea
                  id="build-args"
                  placeholder="VERSION=1.0.0&#10;ENVIRONMENT=production"
                  value={buildData.buildArgs}
                  onChange={e =>
                    setBuildData(prev => ({
                      ...prev,
                      buildArgs: e.target.value,
                    }))
                  }
                  disabled={progress.isRunning}
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="no-cache"
                    checked={buildData.noCache}
                    onCheckedChange={checked =>
                      setBuildData(prev => ({ ...prev, noCache: checked }))
                    }
                    disabled={progress.isRunning}
                  />
                  <Label htmlFor="no-cache">No Cache</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="pull"
                    checked={buildData.pull}
                    onCheckedChange={checked =>
                      setBuildData(prev => ({ ...prev, pull: checked }))
                    }
                    disabled={progress.isRunning}
                  />
                  <Label htmlFor="pull">Pull Base Images</Label>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Progress and Status Display */}
        {(progress.progress || progress.error || progress.success) && (
          <div className="mt-4 p-4 rounded-lg border">
            <div className="flex items-center space-x-2">
              {progress.isRunning && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              )}
              {progress.success && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {progress.error && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span
                className={
                  progress.error
                    ? 'text-red-600'
                    : progress.success
                      ? 'text-green-600'
                      : ''
                }
              >
                {progress.progress || (progress.error ? 'Error occurred' : '')}
              </span>
            </div>
            {progress.error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-700 mt-1">
                      {progress.error}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={progress.isRunning}
          >
            Cancel
          </Button>
          <Button
            onClick={activeTab === 'pull' ? handlePull : handleBuild}
            disabled={
              progress.isRunning ||
              (activeTab === 'pull' && !pullData.imageName)
            }
            className="min-w-[100px]"
          >
            {progress.isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {activeTab === 'pull' ? 'Pulling...' : 'Building...'}
              </>
            ) : (
              <>
                {activeTab === 'pull' ? (
                  <Download className="mr-2 h-4 w-4" />
                ) : (
                  <Hammer className="mr-2 h-4 w-4" />
                )}
                {activeTab === 'pull'
                  ? `Pull ${pullData.imageName || 'Image'}`
                  : 'Build Image'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
