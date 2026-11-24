export interface Image {
  id: string;
  repository?: string | null;
  tag?: string | null;
  image_id: string;
  created: number;
  size: number;
  in_use: boolean;
  dangling: boolean;
}

export type ImagePruneScope = 'dangling' | 'all_unused';

export interface PrunedImage {
  id: string;
  tags: string[];
}

export interface PruneResult {
  images_deleted: PrunedImage[];
  space_reclaimed: number;
}
