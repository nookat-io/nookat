import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { errorMessage } from '../../utils/error-message';
import { BulkOutcome, describeFailures } from '../../types/bulk-outcome';
import { Container } from './container-types';
import { formatContainerName } from './container-utils';

type ContainerAction =
  'start' | 'stop' | 'pause' | 'resume' | 'restart' | 'remove';

const PAST_TENSE: Record<ContainerAction, string> = {
  start: 'Started',
  stop: 'Stopped',
  pause: 'Paused',
  resume: 'Resumed',
  restart: 'Restarted',
  remove: 'Removed',
};

const describeContainers = (count: number) =>
  count === 1 ? 'container' : `${count} containers`;

const describeFailedContainers = (failed: number, requested: number) =>
  failed === requested
    ? describeContainers(failed)
    : `${failed} of ${requested} containers`;

async function runContainerAction(
  action: ContainerAction,
  command: string,
  target: { id: string }
): Promise<boolean> {
  try {
    await invoke(command, target);
    toast.success(`${PAST_TENSE[action]} container`);
    return true;
  } catch (error) {
    console.error(`Failed to ${action} container:`, error);
    toast.error(`Failed to ${action} container: ${errorMessage(error)}`);
    return false;
  }
}

const shortId = (id: string) => id.slice(0, 12);

const containerLabeler = (containers: Container[]) => {
  const names = new Map(
    containers.map(container => [container.id, formatContainerName(container)])
  );
  return (id: string) => names.get(id) || shortId(id);
};

async function runBulkContainerAction(
  action: ContainerAction,
  command: string,
  containers: Container[]
): Promise<string[]> {
  const ids = containers.map(container => container.id);
  let outcome: BulkOutcome;
  try {
    outcome = await invoke<BulkOutcome>(command, { ids });
  } catch (error) {
    const containers = describeContainers(ids.length);
    console.error(`Failed to ${action} ${containers}:`, error);
    toast.error(`Failed to ${action} ${containers}: ${errorMessage(error)}`);
    return [];
  }

  const { succeeded, failed } = outcome;
  if (failed.length === 0) {
    toast.success(`${PAST_TENSE[action]} ${describeContainers(ids.length)}`);
  } else {
    const failedContainers = describeFailedContainers(
      failed.length,
      ids.length
    );
    console.error(`Failed to ${action} ${failedContainers}:`, failed);
    toast.error(
      `Failed to ${action} ${failedContainers}: ${describeFailures(failed, containerLabeler(containers))}`
    );
  }
  return succeeded;
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

  static bulkStartContainers(containers: Container[]) {
    return runBulkContainerAction('start', 'bulk_start_containers', containers);
  }

  static bulkStopContainers(containers: Container[]) {
    return runBulkContainerAction('stop', 'bulk_stop_containers', containers);
  }

  static bulkPauseContainers(containers: Container[]) {
    return runBulkContainerAction('pause', 'bulk_pause_containers', containers);
  }

  static bulkResumeContainers(containers: Container[]) {
    return runBulkContainerAction(
      'resume',
      'bulk_unpause_containers',
      containers
    );
  }

  static bulkRestartContainers(containers: Container[]) {
    return runBulkContainerAction(
      'restart',
      'bulk_restart_containers',
      containers
    );
  }

  static bulkDeleteContainers(containers: Container[], hasRunning: boolean) {
    const command = hasRunning
      ? 'bulk_force_remove_containers'
      : 'bulk_remove_containers';
    return runBulkContainerAction('remove', command, containers);
  }

  static async openTerminal(containerId: string) {
    try {
      await invoke('open_terminal', { id: containerId });
      toast.success('Terminal opened');
    } catch (error) {
      console.error('Error opening terminal:', error);
      toast.error(`Failed to open terminal: ${errorMessage(error)}`);
    }
  }

  static async pruneContainers() {
    try {
      await invoke('prune_containers');
      toast.success('Pruned stopped containers');
    } catch (error) {
      console.error('Error pruning containers:', error);
      toast.error(`Failed to prune containers: ${errorMessage(error)}`);
    }
  }
}
