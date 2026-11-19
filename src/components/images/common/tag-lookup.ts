import { fetchImageTag } from '../../../lib/docker';
import { DockerHubTag } from '../../../types/docker-images';

export type TagLookup = (
  imageName: string,
  tag: string
) => Promise<DockerHubTag | null>;

export function createTagLookup(fetchTag: TagLookup = fetchImageTag) {
  const lookups = new Map<string, Promise<DockerHubTag | null>>();

  const lookupTag: TagLookup = (imageName, tag) => {
    const key = `${imageName}:${tag}`;
    const known = lookups.get(key);
    if (known) {
      return known;
    }
    const lookup = fetchTag(imageName, tag);
    lookups.set(key, lookup);
    lookup.catch(() => lookups.delete(key));
    return lookup;
  };

  return lookupTag;
}
