import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

type ContainerAction =
  | 'start'
  | 'stop'
  | 'pause'
  | 'resume'
  | 'restart'
  | 'remove';

const PAST_TENSE: Record<ContainerAction, string> = {
  start: 'Started',
  stop: 'Stopped',
  pause: 'Paused',
  resume: 'Resumed',
  restart: 'Restarted',
  remove: 'Removed',
};

type ContainerTarget = { id: string } | { ids: string[] };

function describeTarget(target: ContainerTarget): string {
  if ('id' in target || target.ids.length === 1) {
    return 'container';
  }
  return `${target.ids.length} containers`;
}

async function runContainerAction(
  action: ContainerAction,
  command: string,
  target: ContainerTarget
): Promise<boolean> {
  const containers = describeTarget(target);
  try {
    await invoke(command, target);
    toast.success(`${PAST_TENSE[action]} ${containers}`);
    return true;
  } catch (error) {
    console.error(`Failed to ${action} ${containers}:`, error);
    toast.error(`Failed to ${action} ${containers}: ${error}`);
    return false;
  }
}

export class ContainerActionService {
  static startContainer(id: string) {
    return runContainerAction('start', 'start_container', { id });
  }

  static stopContainer(id: string) {
    return runContainerAction('stop', 'stop_container', { id });
  }

  static pauseContainer(id: string) {
    return runContainerAction('pause', 'pause_container', { id });
  }

  static resumeContainer(id: string) {
    return runContainerAction('resume', 'unpause_container', { id });
  }

  static restartContainer(id: string) {
    return runContainerAction('restart', 'restart_container', { id });
  }

  static deleteContainer(id: string, isRunning: boolean) {
    const command = isRunning ? 'force_remove_container' : 'remove_container';
    return runContainerAction('remove', command, { id });
  }

  static bulkStartContainers(ids: string[]) {
    return runContainerAction('start', 'bulk_start_containers', { ids });
  }

  static bulkStopContainers(ids: string[]) {
    return runContainerAction('stop', 'bulk_stop_containers', { ids });
  }

  static bulkPauseContainers(ids: string[]) {
    return runContainerAction('pause', 'bulk_pause_containers', { ids });
  }

  static bulkResumeContainers(ids: string[]) {
    return runContainerAction('resume', 'bulk_unpause_containers', { ids });
  }

  static bulkRestartContainers(ids: string[]) {
    return runContainerAction('restart', 'bulk_restart_containers', { ids });
  }

  static bulkDeleteContainers(ids: string[], hasRunning: boolean) {
    const command = hasRunning
      ? 'bulk_force_remove_containers'
      : 'bulk_remove_containers';
    return runContainerAction('remove', command, { ids });
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

  static async pruneContainers() {
    try {
      await invoke('prune_containers');
      toast.success('Pruned stopped containers');
    } catch (error) {
      console.error('Error pruning containers:', error);
      toast.error(`Failed to prune containers: ${error}`);
    }
  }
}
