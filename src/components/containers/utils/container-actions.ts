import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

export interface ContainerActionOptions {
  onActionComplete?: () => void;
  onSelectionChange?: (selected: string[]) => void;
}

export class ContainerActionService {
  private static async executeAction(
    action: string, 
    params: { id?: string; ids?: string[] }, 
    options: ContainerActionOptions = {}
  ) {
    try {
      await invoke(action, params);
      
      const actionName = action.replace('_container', '').replace('unpause', 'resume');
      const containerText = Array.isArray(params.ids) 
        ? params.ids.length === 1 ? 'container' : 'containers'
        : 'container';
      
      const count = Array.isArray(params.ids) ? params.ids.length : 1;
      const countText = count === 1 ? '' : `${count} `;
      
      toast.success(`${actionName.charAt(0).toUpperCase() + actionName.slice(1)}ed ${countText}${containerText}`);
      
      // Clear selections for destructive actions
      if (action.includes('remove') || action.includes('delete')) {
        options.onSelectionChange?.([]);
      }
      
      // Add a small delay to ensure the backend operation completes before refreshing
      setTimeout(() => {
        options.onActionComplete?.();
      }, 500);
    } catch (error) {
      console.error(`Error ${action}ing container:`, error);
      const actionName = action.replace('_container', '').replace('unpause', 'resume');
      const count = Array.isArray(params.ids) ? params.ids.length : 1;
      const countText = count === 1 ? '' : `${count} `;
      const containerText = Array.isArray(params.ids) 
        ? params.ids.length === 1 ? 'container' : 'containers'
        : 'container';
      toast.error(`Failed to ${actionName} ${countText}${containerText}: ${error}`);
      
      // Refresh even on error to ensure UI is in sync
      setTimeout(() => {
        options.onActionComplete?.();
      }, 500);
    }
  }

  static async startContainer(containerId: string, options: ContainerActionOptions = {}) {
    await this.executeAction('start_container', { id: containerId }, options);
  }

  static async stopContainer(containerId: string, options: ContainerActionOptions = {}) {
    await this.executeAction('stop_container', { id: containerId }, options);
  }

  static async pauseContainer(containerId: string, options: ContainerActionOptions = {}) {
    await this.executeAction('pause_container', { id: containerId }, options);
  }

  static async resumeContainer(containerId: string, options: ContainerActionOptions = {}) {
    await this.executeAction('unpause_container', { id: containerId }, options);
  }

  static async restartContainer(containerId: string, options: ContainerActionOptions = {}) {
    await this.executeAction('restart_container', { id: containerId }, options);
  }

  static async deleteContainer(containerId: string, isRunning: boolean, options: ContainerActionOptions = {}) {
    const action = isRunning ? 'force_remove_container' : 'remove_container';
    await this.executeAction(action, { id: containerId }, options);
  }

  static async openTerminal(containerId: string) {
    try {
      await invoke('open_terminal', { id: containerId });
      toast.success('Terminal opened');
    } catch (error) {
      console.error('Error opening terminal:', error);
      toast.error(`Failed to open terminal: ${error}`);
    }
  }

  // Bulk actions
  static async bulkStartContainers(containerIds: string[], options: ContainerActionOptions = {}) {
    await this.executeAction('bulk_start_containers', { ids: containerIds }, options);
  }

  static async bulkStopContainers(containerIds: string[], options: ContainerActionOptions = {}) {
    await this.executeAction('bulk_stop_containers', { ids: containerIds }, options);
  }

  static async bulkPauseContainers(containerIds: string[], options: ContainerActionOptions = {}) {
    await this.executeAction('bulk_pause_containers', { ids: containerIds }, options);
  }

  static async bulkResumeContainers(containerIds: string[], options: ContainerActionOptions = {}) {
    await this.executeAction('bulk_unpause_containers', { ids: containerIds }, options);
  }

  static async bulkRestartContainers(containerIds: string[], options: ContainerActionOptions = {}) {
    await this.executeAction('bulk_restart_containers', { ids: containerIds }, options);
  }

  static async bulkDeleteContainers(containerIds: string[], hasRunning: boolean, options: ContainerActionOptions = {}) {
    const action = hasRunning ? 'bulk_force_remove_containers' : 'bulk_remove_containers';
    await this.executeAction(action, { ids: containerIds }, options);
  }

  static async pruneContainers(options: ContainerActionOptions = {}) {
    try {
      await invoke('prune_containers');
      toast.success('Pruned stopped containers');
      
      setTimeout(() => {
        options.onActionComplete?.();
      }, 500);
    } catch (error) {
      console.error('Error pruning containers:', error);
      toast.error(`Failed to prune containers: ${error}`);
      
      setTimeout(() => {
        options.onActionComplete?.();
      }, 500);
    }
  }
} 