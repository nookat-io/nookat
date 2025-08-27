import { Container } from '../components/containers/container-types';
import { Image } from '../components/images/image-types';
import { Network } from '../components/networks/network-types';
import { Volume } from '../components/volumes/volume-types';
import { EngineStatus } from './engine-status';
import { DockerInfo } from './docker-info';

// PruneResult type matching backend
export interface PruneResult {
  deleted: string[];
  space_reclaimed: number;
}

// EngineState interface matching backend exactly
export interface EngineState {
  // Core collections
  containers: Record<string, Container>;
  images: Record<string, Image>;
  volumes: Record<string, Volume>;
  networks: Record<string, Network>;

  // Engine state information
  engine_status: EngineStatus;
  docker_info: DockerInfo | null;

  // Metadata
  version: number;
  last_updated: string; // ISO string from DateTime<Utc>
}
