export enum VolumeScope {
  Empty = '',
  Local = 'local',
  Global = 'global',
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
  in_use: boolean;
}

export type VolumeSizes = Record<string, number>;

export interface VolumePruneResult {
  volumes_deleted: string[];
  space_reclaimed: number;
}
