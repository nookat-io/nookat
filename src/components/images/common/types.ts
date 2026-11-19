import { DockerHubImage, DockerHubTag } from '../../../types/docker-images';

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
  cancelled: boolean;
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

export type TagStatus =
  | { kind: 'unchecked' }
  | { kind: 'invalid' }
  | { kind: 'checking' }
  | { kind: 'found'; details: DockerHubTag }
  | { kind: 'missing' }
  | { kind: 'unknown' };

export interface TagMessage {
  tone: 'muted' | 'error';
  text: string;
}

export interface PullData {
  isRunning: boolean;
  progress: string;
  error: string | null;
  success: boolean;
}
