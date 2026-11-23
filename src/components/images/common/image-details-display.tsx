import { Crown, Zap, Star, Download } from 'lucide-react';
import { DockerHubImage, DockerHubTag } from '../../../types/docker-images';
import { checkImageReference } from '../../../lib/image-source';
import { formatBytes } from '../../../utils/format';
import { formatNumber, normalizePullData, pullReference } from './utils';
import { PullFormData, TagStatus } from './types';
import { ImageSourceNote } from '../../common/image-source-warnings';

const PLATFORMS_SHOWN = 3;

interface ImageDetailsDisplayProps {
  image: DockerHubImage;
  pullData: PullFormData;
  tagStatus: TagStatus;
  onClear: () => void;
}

function platformSummary(platforms: string[]) {
  const hidden = platforms.length - PLATFORMS_SHOWN;
  if (hidden <= 1) {
    return platforms.join(', ');
  }
  const shown = platforms.slice(0, PLATFORMS_SHOWN).join(', ');
  return `${shown} +${hidden} more`;
}

function TagFacts({ tag }: { tag: DockerHubTag }) {
  const facts = [
    tag.size === null ? null : `${formatBytes(tag.size)} compressed`,
    tag.last_pushed
      ? `pushed ${new Date(tag.last_pushed).toLocaleDateString()}`
      : null,
  ].filter(fact => fact !== null);

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">
        Tag {tag.name}
      </p>
      {facts.length > 0 && (
        <p className="text-muted-foreground">{facts.join(' · ')}</p>
      )}
      {tag.platforms.length > 0 && (
        <p
          className="text-muted-foreground text-xs"
          title={tag.platforms.join('\n')}
        >
          {platformSummary(tag.platforms)}
        </p>
      )}
    </div>
  );
}

export function ImageDetailsDisplay({
  image,
  pullData,
  tagStatus,
  onClear,
}: ImageDetailsDisplayProps) {
  const { registry, imageName, tag } = normalizePullData(pullData);
  const reference = tag
    ? `${registry}/${imageName}:${tag}`
    : `${registry}/${imageName}`;

  return (
    <div className="mt-4 p-4 bg-card text-card-foreground border border-border rounded-md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">Selected Image Details</h4>
          {image.is_official && (
            <div className="flex items-center gap-1">
              <Crown className="h-3 w-3 text-yellow-500" />
              <span className="text-xs text-yellow-700 dark:text-yellow-400">
                Official
              </span>
            </div>
          )}
          {image.is_automated && (
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-blue-700 dark:text-blue-400">
                Automated
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onClear}
          className="text-muted-foreground hover:text-foreground text-sm font-medium"
        >
          Clear
        </button>
      </div>

      <div className="space-y-3">
        <div className="p-2 bg-muted rounded border border-border">
          <p className="text-xs font-mono">{reference}</p>
        </div>

        <ImageSourceNote check={checkImageReference(pullReference(pullData))} />

        <div className="space-y-3 text-sm">
          {tagStatus.kind === 'found' && <TagFacts tag={tagStatus.details} />}

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Repository {image.name}
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500" />
                <span className="text-muted-foreground">
                  {formatNumber(image.star_count)} stars
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Download className="h-3 w-3 text-blue-500" />
                <span className="text-muted-foreground">
                  {formatNumber(image.pull_count)} pulls
                </span>
              </div>
            </div>
            {image.description && (
              <p className="text-muted-foreground text-xs leading-relaxed">
                {image.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
