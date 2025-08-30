import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DockerHubImage } from '../../../types/docker-images';
import {
  PullFormData,
  BuildFormData,
  ProgressState,
  DockerHubSearchState,
  RegistryState,
  SelectionFeedbackState,
} from './types';
import {
  DEFAULT_PULL_DATA,
  DEFAULT_BUILD_DATA,
  DEFAULT_PROGRESS_STATE,
} from './utils';

export function useModalState() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pull' | 'build'>('pull');

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const changeTab = useCallback((tab: 'pull' | 'build') => {
    setActiveTab(tab);
  }, []);

  return {
    isOpen,
    activeTab,
    openModal,
    closeModal,
    changeTab,
  };
}

export function useFormData() {
  const [pullData, setPullData] = useState<PullFormData>(DEFAULT_PULL_DATA);
  const [buildData, setBuildData] = useState<BuildFormData>(DEFAULT_BUILD_DATA);

  const resetForms = useCallback(() => {
    setPullData(DEFAULT_PULL_DATA);
    setBuildData(DEFAULT_BUILD_DATA);
  }, []);

  const updatePullData = useCallback((updates: Partial<PullFormData>) => {
    setPullData(prev => ({ ...prev, ...updates }));
  }, []);

  const updateBuildData = useCallback((updates: Partial<BuildFormData>) => {
    setBuildData(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    pullData,
    buildData,
    resetForms,
    updatePullData,
    updateBuildData,
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

export function useDockerHubSearch() {
  const [searchState, setSearchState] = useState<DockerHubSearchState>({
    searchQuery: '',
    searchResults: [],
    isSearching: false,
    searchError: null,
    isSearchDropdownOpen: false,
    focusedSearchIndex: -1,
    selectedImageDetails: null,
  });

  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchDockerHub = useCallback(async (query: string) => {
    try {
      const result = await invoke('search_docker_hub', { query });
      return result;
    } catch (error) {
      console.error('Failed to search Docker Hub:', error);
      throw error;
    }
  }, []);

  const performSearch = useCallback(
    async (query: string) => {
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
    },
    [searchDockerHub]
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchState(prev => ({ ...prev, searchQuery: query }));

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

  const selectImage = useCallback((image: DockerHubImage) => {
    setSearchState(prev => ({
      ...prev,
      selectedImageDetails: image,
      searchResults: [],
      isSearchDropdownOpen: false,
      focusedSearchIndex: -1,
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      selectedImageDetails: null,
      searchQuery: '',
    }));
  }, []);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
        case 'Escape':
          setSearchState(prev => ({
            ...prev,
            isSearchDropdownOpen: false,
            focusedSearchIndex: -1,
          }));
          searchInputRef.current?.blur();
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

  // Handle click outside search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        // Add a small delay to ensure onClick events on dropdown items can execute
        setTimeout(() => {
          closeDropdown();
        }, 100);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [closeDropdown]);

  // Cleanup timeout on unmount
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

export function useSelectionFeedback() {
  const [feedback, setFeedback] = useState<SelectionFeedbackState>({
    message: '',
    isVisible: false,
  });

  const showFeedback = useCallback((message: string) => {
    setFeedback({ message, isVisible: true });
    setTimeout(() => {
      setFeedback(prev => ({ ...prev, isVisible: false }));
    }, 3000);
  }, []);

  const resetFeedback = useCallback(() => {
    setFeedback({ message: '', isVisible: false });
  }, []);

  return {
    feedback,
    showFeedback,
    resetFeedback,
  };
}
