export interface ImageData {
  id: string;
  repository: string | null;
  tag: string | null;
  image_id: string;
  created: number;
  size: number;
  in_use: boolean;
}
