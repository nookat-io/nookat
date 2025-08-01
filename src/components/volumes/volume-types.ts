export interface VolumeData {
  name: string;
  driver: string;
  mountpoint: string;
  created_at?: string;
  status?: Record<string, Record<string, string>>;
  labels: Record<string, string>;
  scope?: 'EMPTY' | 'LOCAL' | 'GLOBAL';
  options: Record<string, string>;
  usage_data?: {
    size: number;
    ref_count: number;
  };
}
