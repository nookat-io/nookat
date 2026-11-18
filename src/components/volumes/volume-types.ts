export enum VolumeScope {
  Empty = '',
  Local = 'local',
  Global = 'global',
}

export interface UsageData {
  size: number;
  ref_count: number;
}

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

export interface VolumePruneResult {
  volumes_deleted: string[];
  space_reclaimed: number;
}
