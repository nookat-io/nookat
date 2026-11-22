import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { VolumePruneResult } from './volume-types';
import { formatBytes } from '../../utils/format';
import { errorMessage } from '../../utils/error-message';
import { BulkOutcome, distinctReasons } from '../../types/bulk-outcome';

const volumeNoun = (count: number) => (count === 1 ? 'volume' : 'volumes');

const describeVolumes = (count: number) =>
  count === 1 ? 'volume' : `${count} volumes`;

const describeFailedVolumes = (failed: number, requested: number) =>
  failed === requested
    ? describeVolumes(failed)
    : `${failed} of ${requested} volumes`;

export class VolumeActionService {
  static async removeVolume(name: string): Promise<boolean> {
    try {
      await invoke('remove_volume', { name });
      toast.success('Deleted volume');
      return true;
    } catch (error) {
      console.error('Failed to delete volume:', error);
      toast.error(`Failed to delete volume: ${errorMessage(error)}`);
      return false;
    }
  }

  static async bulkRemoveVolumes(names: string[]): Promise<string[]> {
    let outcome: BulkOutcome;
    try {
      outcome = await invoke<BulkOutcome>('bulk_remove_volumes', { names });
    } catch (error) {
      const volumes = describeVolumes(names.length);
      console.error(`Failed to delete ${volumes}:`, error);
      toast.error(`Failed to delete ${volumes}: ${errorMessage(error)}`);
      return [];
    }

    const { succeeded, failed } = outcome;
    if (failed.length === 0) {
      toast.success(`Deleted ${describeVolumes(names.length)}`);
    } else {
      const failedVolumes = describeFailedVolumes(failed.length, names.length);
      console.error(`Failed to delete ${failedVolumes}:`, failed);
      toast.error(
        `Failed to delete ${failedVolumes}: ${distinctReasons(failed)}`
      );
    }
    return succeeded;
  }

  static async pruneVolumes() {
    try {
      const { volumes_deleted, space_reclaimed } =
        await invoke<VolumePruneResult>('prune_volumes');
      const count = volumes_deleted.length;

      if (count === 0) {
        toast.success('No unused anonymous volumes to remove');
      } else {
        toast.success(
          `Removed ${count} ${volumeNoun(count)}, reclaimed ${formatBytes(
            space_reclaimed
          )}`
        );
      }
    } catch (error) {
      console.error('Error pruning volumes:', error);
      toast.error(`Failed to prune volumes: ${errorMessage(error)}`);
    }
  }
}
