import { Image, ImagePruneScope, PrunedImage } from './image-types';

export const imageName = (image: Image) =>
  image.tag ? `${image.repository}:${image.tag}` : (image.repository ?? '');

const removedBy = (image: Image, scope: ImagePruneScope) =>
  !image.in_use && (scope === 'all_unused' || image.dangling);

const taggedFirstThenByName = (left: Image, right: Image) =>
  Number(left.dangling) - Number(right.dangling) ||
  imageName(left).localeCompare(imageName(right));

export const imagesToPrune = (images: Image[], scope: ImagePruneScope) =>
  images.filter(image => removedBy(image, scope)).sort(taggedFirstThenByName);

export const countImages = (images: Image[]) =>
  new Set(images.map(image => image.image_id)).size;

export const shortImageId = (id: string) =>
  id.replace(/^sha256:/, '').substring(0, 12);

export const prunedImageName = (image: PrunedImage) =>
  image.tags.length > 0 ? image.tags.join(', ') : shortImageId(image.id);

export const describeImageCount = (count: number) =>
  `${count} image${count === 1 ? '' : 's'}`;
