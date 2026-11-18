export {
  checkImageReference,
  checkRegistry,
  needsConfirmation,
  type ImageSourceCheck,
  type LookalikeCheck,
  type RegistryCheck,
} from './check-image-source';
export {
  DOCKER_HUB,
  OFFICIAL_NAMESPACE,
  parseImageReference,
  parseRegistryHost,
  type ImageReference,
} from './image-reference';
export {
  KNOWN_REGISTRIES,
  OFFICIAL_IMAGES,
  POPULAR_OFFICIAL_IMAGES,
  type KnownRegistry,
} from './known-sources';
