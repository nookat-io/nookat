import { useState, useCallback, useEffect } from 'react';
import { check, Update, DownloadEvent } from '@tauri-apps/plugin-updater';
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
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updateInstance, setUpdateInstance] = useState<Update | null>(null);

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    setIsChecking(true);
    setError(null);

    try {
      const update = await check();
      console.log('update', update);

      if (update) {
        setUpdateAvailable(true);
        setUpdateInstance(update);
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
        setUpdateInstance(null);
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
    if (!currentUpdate || !updateInstance) {
      toast.error('No update available to install');
      return;
    }

    setIsDownloading(true);
    setError(null);

    try {
      // Handle download progress
      const handleDownloadEvent = (event: DownloadEvent) => {
        switch (event.event) {
          case 'Started':
            setIsDownloading(true);
            setProgress({
              downloaded: 0,
              total: event.data.contentLength || 0,
              percentage: 0,
            });
            toast.info('Update download started...');
            break;
          case 'Progress':
            if (progress) {
              const newDownloaded =
                progress.downloaded + event.data.chunkLength;
              const newPercentage =
                progress.total > 0
                  ? Math.round((newDownloaded / progress.total) * 100)
                  : 0;
              setProgress({
                downloaded: newDownloaded,
                total: progress.total,
                percentage: newPercentage,
              });
            }
            break;
          case 'Finished':
            setIsDownloading(false);
            setProgress(null);
            toast.success('Download completed! Installing update...');
            break;
        }
      };

      // Start the download and install process
      await updateInstance.downloadAndInstall(handleDownloadEvent);

      // If we reach here, the update was successful
      setIsInstalling(false);
      toast.success(
        'Update installed successfully! The app will restart shortly.'
      );
    } catch (err) {
      console.log('error', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to install update';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsDownloading(false);
      setIsInstalling(false);
      setProgress(null);
    }
  }, [currentUpdate, updateInstance, progress]);

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
