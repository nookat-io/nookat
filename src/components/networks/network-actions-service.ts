import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { errorMessage } from '../../utils/error-message';
import { BulkOutcome, distinctReasons } from '../../types/bulk-outcome';
import { NetworkCreateOptions } from './network-types';

export async function createNetwork(
  options: NetworkCreateOptions
): Promise<void> {
  try {
    await invoke('create_network', { options });
  } catch (error) {
    console.error('Error creating network:', error);
    throw new Error(errorMessage(error, 'Failed to create network'), {
      cause: error,
    });
  }
}

export async function removeNetwork(name: string): Promise<void> {
  try {
    await invoke('remove_network', { name });
  } catch (error) {
    console.error('Error removing network:', error);
    throw new Error(errorMessage(error, 'Failed to remove network'), {
      cause: error,
    });
  }
}

const describeNetworks = (count: number) =>
  count === 1 ? 'network' : `${count} networks`;

const describeFailedNetworks = (failed: number, requested: number) =>
  failed === requested
    ? describeNetworks(failed)
    : `${failed} of ${requested} networks`;

export async function bulkRemoveNetworks(names: string[]): Promise<string[]> {
  let outcome: BulkOutcome;
  try {
    outcome = await invoke<BulkOutcome>('bulk_remove_networks', { names });
  } catch (error) {
    const networks = describeNetworks(names.length);
    console.error(`Failed to delete ${networks}:`, error);
    toast.error(`Failed to delete ${networks}: ${errorMessage(error)}`);
    return [];
  }

  const { succeeded, failed } = outcome;
  if (failed.length === 0) {
    toast.success(`Deleted ${describeNetworks(names.length)}`);
  } else {
    const failedNetworks = describeFailedNetworks(failed.length, names.length);
    console.error(`Failed to delete ${failedNetworks}:`, failed);
    toast.error(
      `Failed to delete ${failedNetworks}: ${distinctReasons(failed)}`
    );
  }
  return succeeded;
}
