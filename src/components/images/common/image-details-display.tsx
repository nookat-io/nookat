import { Crown, Zap, Star, Download } from 'lucide-react';
import { DockerHubImage } from '../../../types/docker-images';
import { formatNumber } from './utils';

interface ImageDetailsDisplayProps {
  image: DockerHubImage;
  pullData: {
    registry: string;
    imageName: string;
    tag: string;
  };
  onClear: () => void;
}

export function ImageDetailsDisplay({
  image,
  pullData,
  onClear,
}: ImageDetailsDisplayProps) {
  return (
    <div className="mt-4 p-4 border border-gray-200 rounded-md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-gray-900">
            Selected Image Details
          </h4>
          {image.is_official && (
            <div className="flex items-center gap-1">
              <Crown className="h-3 w-3 text-yellow-500" />
              <span className="text-xs text-yellow-700">Official</span>
            </div>
          )}
          {image.is_automated && (
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-blue-700">Automated</span>
            </div>
          )}
        </div>

        <button
          onClick={onClear}
          className="text-gray-500 hover:text-gray-700 text-sm font-medium"
        >
          Clear
        </button>
      </div>

      <div className="space-y-3">
        {/* Full Image Name Preview */}
        <div className="p-2 bg-gray-100 rounded border border-gray-300">
          <p className="text-xs text-gray-800 font-mono">
            {pullData.registry}/{pullData.imageName}:{pullData.tag}
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500" />
              <span className="text-gray-700">
                {formatNumber(image.star_count)} stars
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Download className="h-3 w-3 text-blue-500" />
              <span className="text-gray-700">
                {formatNumber(image.pull_count)} pulls
              </span>
            </div>
          </div>

          {image.description && (
            <p className="text-gray-700 text-xs leading-relaxed">
              {image.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
