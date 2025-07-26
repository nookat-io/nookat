import { invoke } from '@tauri-apps/api/core';

export async function removeNetwork(name: string): Promise<void> {
  try {
    await invoke('remove_network', { name });
  } catch (error) {
    console.error('Error removing network:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to remove network';
    throw new Error(errorMessage);
  }
}

export async function bulkRemoveNetworks(names: string[]): Promise<void> {
  try {
    await invoke('bulk_remove_networks', { names });
  } catch (error) {
    console.error('Error removing networks:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to remove networks';
    throw new Error(errorMessage);
  }
}
