// Volume scope enum matching backend
export enum VolumeScope {
  Empty = '',
  Local = 'local',
  Global = 'global',
}

// Usage data interface matching backend
export interface UsageData {
  size: number;
  ref_count: number;
}

// Volume interface matching backend
export interface Volume {
  name: string;
  driver: string;
  mountpoint: string;
  created_at?: string;
  status?: Record<string, unknown>;
  labels: Record<string, string>;
  scope?: VolumeScope;
  options: Record<string, string>;
  usage_data?: UsageData;
}
