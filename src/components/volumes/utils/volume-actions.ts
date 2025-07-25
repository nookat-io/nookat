import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

export interface VolumeActionOptions {
  onActionComplete?: () => void;
  onSelectionChange?: (selected: string[]) => void;
}

export class VolumeActionService {
  private static async executeAction(
    action: string,
    params: { name?: string; names?: string[] },
    options: VolumeActionOptions = {}
  ) {
    try {
      await invoke(action, params);

      const actionName = action.replace('_volume', '').replace('bulk_', '');
      const volumeText = Array.isArray(params.names)
        ? params.names.length === 1
          ? 'volume'
          : 'volumes'
        : 'volume';

      const count = Array.isArray(params.names) ? params.names.length : 1;
      const countText = count === 1 ? '' : `${count} `;

      toast.success(
        `${actionName.charAt(0).toUpperCase() + actionName.slice(1)}ed ${countText}${volumeText}`
      );

      // Clear selections for destructive actions
      if (action.includes('remove') || action.includes('delete')) {
        options.onSelectionChange?.([]);
      }

      // Add a small delay to ensure the backend operation completes before refreshing
      setTimeout(() => {
        options.onActionComplete?.();
      }, 500);
    } catch (error) {
      console.error(`Error ${action}ing volume:`, error);
      const actionName = action.replace('_volume', '').replace('bulk_', '');
      const count = Array.isArray(params.names) ? params.names.length : 1;
      const countText = count === 1 ? '' : `${count} `;
      const volumeText = Array.isArray(params.names)
        ? params.names.length === 1
          ? 'volume'
          : 'volumes'
        : 'volume';
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(
        `Failed to ${actionName} ${countText}${volumeText}: ${errorMessage}`
      );

      // Refresh even on error to ensure UI is in sync
      setTimeout(() => {
        options.onActionComplete?.();
      }, 500);
    }
  }

  static async removeVolume(
    volumeName: string,
    options: VolumeActionOptions = {}
  ) {
    await this.executeAction('remove_volume', { name: volumeName }, options);
  }

  static async bulkRemoveVolumes(
    volumeNames: string[],
    options: VolumeActionOptions = {}
  ) {
    await this.executeAction(
      'bulk_remove_volumes',
      { names: volumeNames },
      options
    );
  }

  static async inspectVolume(volumeName: string) {
    try {
      const result = await invoke('inspect_volume', { name: volumeName });
      toast.success('Volume details retrieved');
      return result;
    } catch (error) {
      console.error('Error inspecting volume:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(`Failed to inspect volume: ${errorMessage}`);
      throw error;
    }
  }

  static async pruneVolumes(options: VolumeActionOptions = {}) {
    try {
      await invoke('prune_volumes');
      toast.success('Pruned unused volumes');

      setTimeout(() => {
        options.onActionComplete?.();
      }, 500);
    } catch (error) {
      console.error('Error pruning volumes:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(`Failed to prune volumes: ${errorMessage}`);

      setTimeout(() => {
        options.onActionComplete?.();
      }, 500);
    }
  }
}
