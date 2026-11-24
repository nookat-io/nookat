import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { ImagePruneScope, PruneResult } from './image-types';
import { errorMessage } from '../../utils/error-message';

const describeImages = (count: number) =>
  count === 1 ? 'image' : `${count} images`;

const describeFailedImages = (failed: number, requested: number) =>
  failed === requested
    ? describeImages(failed)
    : `${failed} of ${requested} images`;

export class ImageActionService {
  static async deleteImages(imageIds: string[]): Promise<string[]> {
    const results = await Promise.allSettled(
      imageIds.map(imageId => invoke('delete_image', { imageId }))
    );

    const deletedIds = imageIds.filter(
      (_, index) => results[index].status === 'fulfilled'
    );
    const reasons = results.flatMap(result =>
      result.status === 'rejected' ? [errorMessage(result.reason)] : []
    );

    if (reasons.length === 0) {
      toast.success(`Deleted ${describeImages(deletedIds.length)}`);
    } else {
      const failedImages = describeFailedImages(
        reasons.length,
        imageIds.length
      );
      console.error(`Failed to delete ${failedImages}:`, reasons);
      toast.error(
        `Failed to delete ${failedImages}: ${[...new Set(reasons)].join('; ')}`
      );
    }

    return deletedIds;
  }

  static async pruneImages(
    scope: ImagePruneScope
  ): Promise<PruneResult | null> {
    try {
      return await invoke<PruneResult>('prune_images', { scope });
    } catch (error) {
      console.error('Error pruning images:', error);
      toast.error(`Failed to prune images: ${errorMessage(error)}`);
      return null;
    }
  }
}
