import { FilterConfig } from '../../utils/use-filter';
import { Image } from './image-types';

export type ImageFilter = 'all' | 'used' | 'dangling';

export const imageFilterPhrases: Record<ImageFilter, string> = {
  all: 'images',
  used: 'images in use',
  dangling: 'dangling images',
};

export const imageFilter: FilterConfig<Image, ImageFilter> = {
  searchFields: ['repository', 'tag'],
  matches: {
    used: image => image.in_use,
    dangling: image => image.dangling,
  },
};
