export type ImagePullPhase =
  | 'pending'
  | 'downloading'
  | 'downloaded'
  | 'extracting'
  | 'complete'
  | 'already_exists';

export interface ImagePullLayer {
  id: string;
  phase: ImagePullPhase;
  size: number | null;
  downloaded: number;
  extracted: number;
}

export interface ImagePullProgress {
  layers: ImagePullLayer[];
}
