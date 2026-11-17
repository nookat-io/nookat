import { describe, expect, it } from 'vitest';
import { imageFilter } from './image-filter';
import { Image } from './image-types';

function image(id: string, { inUse = false, dangling = false } = {}): Image {
  return {
    id,
    image_id: id,
    repository: dangling ? `<untagged>@${id}` : id,
    tag: dangling ? null : 'latest',
    created: 0,
    size: 0,
    in_use: inUse,
    dangling,
  };
}

const images = [
  image('nginx', { inUse: true }),
  image('postgres'),
  image('old-build', { dangling: true }),
  image('untagged-in-use', { dangling: true, inUse: true }),
];

const idsMatching = (filter: 'used' | 'dangling') =>
  images.filter(imageFilter.matches[filter]).map(image => image.id);

describe('imageFilter', () => {
  it('keeps the images a container uses for the used filter', () => {
    expect(idsMatching('used')).toEqual(['nginx', 'untagged-in-use']);
  });

  it('keeps only untagged images for the dangling filter, used or not', () => {
    expect(idsMatching('dangling')).toEqual(['old-build', 'untagged-in-use']);
  });
});
