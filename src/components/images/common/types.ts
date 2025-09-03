import { DockerHubImage } from '../../../types/docker-images';

export interface PullFormData {
  imageName: string;
  tag: string;
  registry: string;
}

export interface ProgressState {
  isRunning: boolean;
  progress: string;
  error: string | null;
  success: boolean;
}

export interface ErrorWithMessage {
  message: string;
}

export interface DockerHubSearchState {
  searchQuery: string;
  searchResults: DockerHubImage[];
  isSearching: boolean;
  searchError: string | null;
  isSearchDropdownOpen: boolean;
  focusedSearchIndex: number;
  selectedImageDetails: DockerHubImage | null;
}

export interface RegistryState {
  selectedRegistry: string;
  customRegistry: string;
  showCustomRegistry: boolean;
}

export interface SelectionFeedbackState {
  message: string;
  isVisible: boolean;
}
