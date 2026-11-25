import { FilterConfig } from '../../utils/use-filter';
import { Volume } from './volume-types';

export type VolumeFilter = 'all' | 'used' | 'unused';

export const volumeFilterPhrases: Record<VolumeFilter, string> = {
  all: 'volumes',
  used: 'volumes in use',
  unused: 'unused volumes',
};

const isInUse = (volume: Volume) => volume.in_use;

export const volumeFilter: FilterConfig<Volume, VolumeFilter> = {
  searchFields: ['name', 'driver'],
  matches: {
    used: isInUse,
    unused: volume => !isInUse(volume),
  },
};
