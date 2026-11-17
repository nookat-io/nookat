import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { VolumePruneResult } from './volume-types';
import { formatBytes } from '../../utils/format';
import { errorMessage } from '../../utils/error-message';

const volumeNoun = (count: number) => (count === 1 ? 'volume' : 'volumes');

const describeVolumes = (count: number) =>
  count === 1 ? 'volume' : `${count} volumes`;

async function deleteVolumes(
  command: string,
  target: { name: string } | { names: string[] }
): Promise<boolean> {
  const volumes = describeVolumes('names' in target ? target.names.length : 1);
  try {
    await invoke(command, target);
    toast.success(`Deleted ${volumes}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete ${volumes}:`, error);
    toast.error(`Failed to delete ${volumes}: ${errorMessage(error)}`);
    return false;
  }
}

export class VolumeActionService {
  static removeVolume(name: string) {
    return deleteVolumes('remove_volume', { name });
  }

  static bulkRemoveVolumes(names: string[]) {
    return deleteVolumes('bulk_remove_volumes', { names });
  }

  static async inspectVolume(volumeName: string) {
    try {
      const result = await invoke('inspect_volume', { name: volumeName });
      toast.success('Volume details retrieved');
      return result;
    } catch (error) {
      console.error('Error inspecting volume:', error);
      toast.error(`Failed to inspect volume: ${errorMessage(error)}`);
      throw error;
    }
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
