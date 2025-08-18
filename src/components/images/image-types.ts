// Image interface matching backend
export interface Image {
  id: string;
  repository?: string | null;
  tag?: string | null;
  image_id: string;
  created: number;
  size: number;
  in_use: boolean;
}

// Prune result interface matching backend
export interface PruneResult {
  images_deleted: string[];
  space_reclaimed: number;
}
