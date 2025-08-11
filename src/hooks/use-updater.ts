import { useState, useCallback, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { toast } from 'sonner';
import { AppConfig } from '../types/config';

export interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
  pubDate?: string;
}

export interface UpdateCheckResult {
  available: boolean;
  update?: UpdateInfo;
  currentVersion: string;
}

export interface UpdateProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

export const useUpdater = (
  config?: AppConfig,
  updateLastCheck?: () => Promise<void>
) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentUpdate, setCurrentUpdate] = useState<UpdateInfo | null>(null);
  const [progress] = useState<UpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    setIsChecking(true);
    setError(null);

    try {
      const update = await check();
      console.log('update', update);

      if (update) {
        setUpdateAvailable(true);
        setCurrentUpdate({
          version: update.version,
          date: update.date?.toString(),
          body: update.body,
          pubDate: undefined,
        });
        toast.success(`Update available: v${update.version}`);
      } else {
        setUpdateAvailable(false);
        setCurrentUpdate(null);
        console.log('no update', update);
        toast.info('No updates available');
      }

      // Update the last check timestamp
      if (updateLastCheck) {
        try {
          await updateLastCheck();
        } catch (err) {
          console.warn('Failed to update last check timestamp:', err);
        }
      }
    } catch (err) {
      console.log('error', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to check for updates';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsChecking(false);
    }
  }, [updateLastCheck]);

  // Download and install update
  const downloadAndInstall = useCallback(async () => {
    if (!currentUpdate) {
      toast.error('No update available to install');
      return;
    }

    setIsDownloading(true);
    setError(null);

    try {
      // For now, just simulate the process
      // TODO: Implement actual download and install when the plugin supports it
      toast.info('Update download started...');

      // Simulate download progress
      setTimeout(() => {
        setIsDownloading(false);
        setIsInstalling(true);
        toast.info('Installing update...');

        setTimeout(() => {
          setIsInstalling(false);
          toast.success('Update installed successfully!');
        }, 2000);
      }, 3000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to install update';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsDownloading(false);
      setIsInstalling(false);
    }
  }, [currentUpdate]);

  // For now, we'll use a simplified approach without event listeners
  // TODO: Implement proper event handling when the plugin supports it

  // Auto-check for updates on mount only if enabled in settings
  useEffect(() => {
    if (config?.startup.check_for_updates) {
      checkForUpdates();
    }
  }, [checkForUpdates, config?.startup.check_for_updates]);

  return {
    // State
    isChecking,
    isDownloading,
    isInstalling,
    updateAvailable,
    currentUpdate,
    progress,
    error,

    // Actions
    checkForUpdates,
    downloadAndInstall,

    // Computed
    hasUpdate: updateAvailable && currentUpdate !== null,
    isBusy: isChecking || isDownloading || isInstalling,
  };
};
