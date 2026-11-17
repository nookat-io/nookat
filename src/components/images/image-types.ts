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

export interface PruneResult {
  images_deleted: string[];
  space_reclaimed: number;
}
