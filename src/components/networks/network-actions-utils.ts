import { invoke } from '@tauri-apps/api/core';
import { errorMessage } from '../../utils/error-message';

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

export async function bulkRemoveNetworks(names: string[]): Promise<void> {
  try {
    await invoke('bulk_remove_networks', { names });
  } catch (error) {
    console.error('Error removing networks:', error);
    throw new Error(errorMessage(error, 'Failed to remove networks'), {
      cause: error,
    });
  }
}
