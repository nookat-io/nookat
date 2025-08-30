export interface DockerHubImage {
  name: string;
  description: string;
  star_count: number;
  pull_count: number;
  is_official: boolean;
  is_automated: boolean;
}

export interface LocalDockerImage {
  id: string;
  repository: string;
  tag: string;
  digest: string;
  size: string;
  created: string;
  fullName: string;
}

export interface DockerImageSearchResult {
  results: DockerHubImage[];
}

export interface DockerImageAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export interface DockerImageSelectorProps {
  onImageSelect: (image: LocalDockerImage | null) => void;
  disabled?: boolean;
  className?: string;
}
