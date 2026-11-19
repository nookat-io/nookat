import { useState, useEffect, useCallback, useRef } from 'react';
import { DockerHubImage } from '../../../types/docker-images';
import { searchDockerHub, fetchImageTags } from '../../../lib/docker';
import {
  PullFormData,
  ProgressState,
  DockerHubSearchState,
  RegistryState,
  TagStatus,
} from './types';
import { DEFAULT_PULL_DATA, DEFAULT_PROGRESS_STATE, isValidTag } from './utils';
import { TagLookup } from './tag-lookup';

const SEARCH_DEBOUNCE_MS = 300;
const TAG_TYPING_DEBOUNCE_MS = 300;
const MAX_SEARCH_RESULTS = 10;

const officialFirstThenMostStarred = (a: DockerHubImage, b: DockerHubImage) =>
  Number(b.is_official) - Number(a.is_official) || b.star_count - a.star_count;

export function useModalState() {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    openModal,
    closeModal,
  };
}

export function useFormData() {
  const [pullData, setPullData] = useState<PullFormData>(DEFAULT_PULL_DATA);

  const resetForms = useCallback(() => {
    setPullData(DEFAULT_PULL_DATA);
  }, []);

  const updatePullData = useCallback((updates: Partial<PullFormData>) => {
    setPullData(prev => ({ ...prev, ...updates }));
  }, []);

  const chooseTagIfBlank = useCallback((imageName: string, tag: string) => {
    setPullData(prev =>
      prev.imageName === imageName && !prev.tag ? { ...prev, tag } : prev
    );
  }, []);

  return {
    pullData,
    resetForms,
    updatePullData,
    chooseTagIfBlank,
  };
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressState>(
    DEFAULT_PROGRESS_STATE
  );

  const resetProgress = useCallback(() => {
    setProgress(DEFAULT_PROGRESS_STATE);
  }, []);

  const setRunning = useCallback((message: string) => {
    setProgress({
      isRunning: true,
      progress: message,
      error: null,
      success: false,
    });
  }, []);

  const setSuccess = useCallback((message: string) => {
    setProgress({
      isRunning: false,
      progress: message,
      error: null,
      success: true,
    });
  }, []);

  const setError = useCallback((message: string) => {
    setProgress({
      isRunning: false,
      progress: '',
      error: message,
      success: false,
    });
  }, []);

  return {
    progress,
    resetProgress,
    setRunning,
    setSuccess,
    setError,
  };
}

export function useRegistryState() {
  const [registryState, setRegistryState] = useState<RegistryState>({
    selectedRegistry: 'docker.io',
    customRegistry: '',
    showCustomRegistry: false,
  });

  const updateRegistry = useCallback((value: string) => {
    if (value === 'custom') {
      setRegistryState(prev => ({
        ...prev,
        selectedRegistry: 'custom',
        showCustomRegistry: true,
      }));
    } else {
      setRegistryState(prev => ({
        ...prev,
        selectedRegistry: value,
        showCustomRegistry: false,
      }));
    }
  }, []);

  const updateCustomRegistry = useCallback((value: string) => {
    setRegistryState(prev => ({
      ...prev,
      customRegistry: value,
    }));
  }, []);

  const resetRegistry = useCallback(() => {
    setRegistryState({
      selectedRegistry: 'docker.io',
      customRegistry: '',
      showCustomRegistry: false,
    });
  }, []);

  return {
    registryState,
    updateRegistry,
    updateCustomRegistry,
    resetRegistry,
  };
}

export function useDockerHubSearch(
  onImageSelected: (image: DockerHubImage) => void
) {
  const [searchState, setSearchState] = useState<DockerHubSearchState>({
    searchQuery: '',
    searchResults: [],
    isSearching: false,
    searchError: null,
    isSearchDropdownOpen: false,
    focusedSearchIndex: -1,
    selectedImageDetails: null,
  });

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchState(prev => ({
        ...prev,
        searchResults: [],
        isSearchDropdownOpen: false,
      }));
      return;
    }

    setSearchState(prev => ({
      ...prev,
      isSearching: true,
      searchError: null,
    }));

    try {
      const result = await searchDockerHub(query);
      const images = result.results || [];

      const sortedImages = images
        .sort(officialFirstThenMostStarred)
        .slice(0, MAX_SEARCH_RESULTS);

      setSearchState(prev => ({
        ...prev,
        searchResults: sortedImages,
        isSearchDropdownOpen: true,
        isSearching: false,
      }));
    } catch (error) {
      console.error('Search error:', error);
      setSearchState(prev => ({
        ...prev,
        searchError: 'Failed to search Docker Hub. Please try again.',
        searchResults: [],
        isSearching: false,
      }));
    }
  }, []);

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchState(prev => ({ ...prev, searchQuery: query }));

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query);
      }, SEARCH_DEBOUNCE_MS);
    },
    [performSearch]
  );

  const selectImage = useCallback(
    (image: DockerHubImage) => {
      setSearchState(prev => ({
        ...prev,
        selectedImageDetails: image,
        searchQuery: image.name,
        searchResults: [],
        isSearchDropdownOpen: false,
        focusedSearchIndex: -1,
      }));
      onImageSelected(image);
    },
    [onImageSelected]
  );

  const clearSelection = useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      selectedImageDetails: null,
      searchQuery: '',
    }));
  }, []);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && searchState.isSearchDropdownOpen) {
        setSearchState(prev => ({
          ...prev,
          isSearchDropdownOpen: false,
          focusedSearchIndex: -1,
        }));
        searchInputRef.current?.blur();
        return;
      }
      if (
        !searchState.isSearchDropdownOpen ||
        searchState.searchResults.length === 0
      )
        return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSearchState(prev => ({
            ...prev,
            focusedSearchIndex:
              prev.focusedSearchIndex < prev.searchResults.length - 1
                ? prev.focusedSearchIndex + 1
                : prev.focusedSearchIndex,
          }));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSearchState(prev => ({
            ...prev,
            focusedSearchIndex:
              prev.focusedSearchIndex > 0 ? prev.focusedSearchIndex - 1 : -1,
          }));
          break;
        case 'Enter':
          e.preventDefault();
          if (
            searchState.focusedSearchIndex >= 0 &&
            searchState.focusedSearchIndex < searchState.searchResults.length
          ) {
            selectImage(
              searchState.searchResults[searchState.focusedSearchIndex]
            );
          }
          break;
      }
    },
    [
      searchState.isSearchDropdownOpen,
      searchState.searchResults,
      searchState.focusedSearchIndex,
      selectImage,
    ]
  );

  const closeDropdown = useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      isSearchDropdownOpen: false,
      focusedSearchIndex: -1,
    }));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [closeDropdown]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const resetSearch = useCallback(() => {
    setSearchState({
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      searchError: null,
      isSearchDropdownOpen: false,
      focusedSearchIndex: -1,
      selectedImageDetails: null,
    });
  }, []);

  return {
    searchState,
    searchContainerRef,
    searchInputRef,
    handleSearchChange,
    selectImage,
    clearSelection,
    handleSearchKeyDown,
    resetSearch,
  };
}

interface SettledTagSuggestions {
  imageName: string;
  nameFilter: string;
  tags: string[];
  error: string | null;
}

export function useTagSuggestions(
  imageName: string | null,
  nameFilter: string
) {
  const [settled, setSettled] = useState<SettledTagSuggestions | null>(null);

  useEffect(() => {
    if (!imageName) {
      return;
    }
    let isCurrent = true;
    const timer = setTimeout(
      () => {
        fetchImageTags(imageName, nameFilter).then(
          tags => {
            if (isCurrent) {
              setSettled({ imageName, nameFilter, tags, error: null });
            }
          },
          () => {
            if (isCurrent) {
              setSettled({
                imageName,
                nameFilter,
                tags: [],
                error: 'Failed to fetch available tags',
              });
            }
          }
        );
      },
      nameFilter ? TAG_TYPING_DEBOUNCE_MS : 0
    );
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [imageName, nameFilter]);

  const forThisImage = settled?.imageName === imageName ? settled : null;
  return {
    tagSuggestions: forThisImage?.tags ?? [],
    tagError: forThisImage?.error ?? null,
    isLoadingTags:
      !!imageName &&
      (forThisImage === null || forThisImage.nameFilter !== nameFilter),
  };
}

interface SettledTagStatus {
  reference: string;
  status: TagStatus;
}

export function useTagStatus(
  lookupTag: TagLookup,
  imageName: string,
  tag: string,
  checksDockerHub: boolean
): TagStatus {
  const isCheckable =
    checksDockerHub && !!imageName && !!tag && isValidTag(tag);
  const reference = isCheckable ? `${imageName}:${tag}` : null;
  const [settled, setSettled] = useState<SettledTagStatus | null>(null);

  useEffect(() => {
    if (!reference) {
      return;
    }
    let isCurrent = true;
    const timer = setTimeout(() => {
      lookupTag(imageName, tag).then(
        details => {
          if (isCurrent) {
            setSettled({
              reference,
              status: details
                ? { kind: 'found', details }
                : { kind: 'missing' },
            });
          }
        },
        () => {
          if (isCurrent) {
            setSettled({ reference, status: { kind: 'unknown' } });
          }
        }
      );
    }, TAG_TYPING_DEBOUNCE_MS);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [reference, lookupTag, imageName, tag]);

  if (!checksDockerHub || !imageName || !tag) {
    return { kind: 'unchecked' };
  }
  if (!isValidTag(tag)) {
    return { kind: 'invalid' };
  }
  if (settled?.reference !== reference) {
    return { kind: 'checking' };
  }
  return settled.status;
}
