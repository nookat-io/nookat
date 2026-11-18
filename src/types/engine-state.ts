import { Container } from '../components/containers/container-types';
import { Image } from '../components/images/image-types';
import { Network } from '../components/networks/network-types';
import { Volume } from '../components/volumes/volume-types';
import { EngineStatus } from './engine-status';
import { IsoDateString } from './iso-date-string';

export type SnapshotSequenceNumber = number;

export interface EngineState {
  containers: Record<string, Container>;
  images: Record<string, Image>;
  volumes: Record<string, Volume>;
  networks: Record<string, Network>;
  engine_status: EngineStatus;
  version: SnapshotSequenceNumber;
  last_updated: IsoDateString;
}
