import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

export interface VolumeActionOptions {
  onActionComplete?: () => void;
  onSelectionChange?: (selected: string[]) => void;
}

export class VolumeActionService {
  private static getActionDisplayName(action: string): string {
    const actionMap: Record<string, string> = {
      remove_volume: 'Deleted',
      bulk_remove_volumes: 'Deleted',
      inspect_volume: 'Inspected',
      prune_volumes: 'Pruned',
    };

    return actionMap[action] || 'processed';
  }

  private static getVolumeText(count: number): string {
    return count === 1 ? 'volume' : 'volumes';
  }

  private static getCountText(count: number): string {
    return count === 1 ? '' : `${count} `;
  }

  private static async executeAction(
    action: string,
    params: { name?: string; names?: string[] },
    options: VolumeActionOptions = {}
  ) {
    try {
      await invoke(action, params);

      const count = Array.isArray(params.names) ? params.names.length : 1;
      const actionDisplayName = this.getActionDisplayName(action);
      const countText = this.getCountText(count);
      const volumeText = this.getVolumeText(count);

      const successMessage = `${actionDisplayName} ${countText}${volumeText}`;
      toast.success(successMessage);

      // Clear selections for destructive actions
      if (action.includes('remove') || action.includes('delete')) {
        options.onSelectionChange?.([]);
      }

      // Add a small delay to ensure the backend operation completes before refreshing
      setTimeout(() => {
        options.onActionComplete?.();
      }, 500);
    } catch (error) {
      console.error(`Error executing ${action}:`, error);

      const count = Array.isArray(params.names) ? params.names.length : 1;
      const actionDisplayName = this.getActionDisplayName(action);
      const countText = this.getCountText(count);
      const volumeText = this.getVolumeText(count);

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const failureMessage = `Failed to ${actionDisplayName} ${countText}${volumeText}: ${errorMessage}`;
      toast.error(failureMessage);

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
