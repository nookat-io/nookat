import { FilterConfig } from '../../utils/use-filter';
import { Volume } from './volume-types';

export type VolumeFilter = 'all' | 'used' | 'unused';

const isInUse = (volume: Volume) => (volume.usage_data?.ref_count ?? 0) > 0;

export const volumeFilter: FilterConfig<Volume, VolumeFilter> = {
  searchFields: ['name', 'driver'],
  matches: {
    used: isInUse,
    unused: volume => !isInUse(volume),
  },
};
