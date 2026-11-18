import { Crown, Zap, Star, Download } from 'lucide-react';
import { DockerHubImage } from '../../../types/docker-images';
import { checkImageReference } from '../../../lib/image-source';
import { formatNumber, pullReference } from './utils';
import { PullFormData } from './types';
import { ImageSourceNote } from '../../common/image-source-warnings';

interface ImageDetailsDisplayProps {
  image: DockerHubImage;
  pullData: PullFormData;
  onClear: () => void;
}

export function ImageDetailsDisplay({
  image,
  pullData,
  onClear,
}: ImageDetailsDisplayProps) {
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
          <p className="text-xs font-mono">
            {pullData.registry}/{pullData.imageName}:{pullData.tag}
          </p>
        </div>

        <ImageSourceNote check={checkImageReference(pullReference(pullData))} />

        <div className="space-y-2 text-sm">
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
  );
}
