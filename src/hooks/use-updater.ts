import { useState, useCallback, useEffect, useTransition } from 'react';
import { check, Update, DownloadEvent } from '@tauri-apps/plugin-updater';
import { toast } from 'sonner';
import { AppConfig } from '../types/config';

export interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
  pubDate?: string;
}

export interface UpdateProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

type CheckOutcomesToAnnounce = 'every-outcome' | 'available-update-only';

export const useUpdater = (
  config?: AppConfig,
  updateLastCheck?: () => Promise<void>
) => {
  const [isChecking, startCheck] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentUpdate, setCurrentUpdate] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updateInstance, setUpdateInstance] = useState<Update | null>(null);

  const checksAutomatically = config?.startup.check_for_updates ?? false;

  const recordLastCheck = useCallback(async () => {
    try {
      await updateLastCheck?.();
    } catch (err) {
      console.warn('Failed to update last check timestamp:', err);
    }
  }, [updateLastCheck]);

  const runCheck = useCallback(
    (announce: CheckOutcomesToAnnounce) =>
      startCheck(async () => {
        try {
          const update = await check();
          setError(null);

          if (update) {
            setUpdateAvailable(true);
            setUpdateInstance(update);
            setCurrentUpdate({
              version: update.version,
              date: update.date,
              body: update.body,
              pubDate: undefined,
            });
            toast.success(`Update available: v${update.version}`);
          } else {
            setUpdateAvailable(false);
            setCurrentUpdate(null);
            setUpdateInstance(null);
            if (announce === 'every-outcome') {
              toast.info('No updates available');
            }
          }

          await recordLastCheck();
        } catch (err) {
          console.error('Failed to check for updates:', err);
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to check for updates';
          setError(errorMessage);
          if (announce === 'every-outcome') {
            toast.error(errorMessage);
          }
        }
      }),
    [recordLastCheck]
  );

  const checkForUpdates = useCallback(
    () => runCheck('every-outcome'),
    [runCheck]
  );

  const downloadAndInstall = useCallback(async () => {
    if (!currentUpdate || !updateInstance) {
      toast.error('No update available to install');
      return;
    }

    setIsDownloading(true);
    setError(null);

    try {
      const handleDownloadEvent = (event: DownloadEvent) => {
        switch (event.event) {
          case 'Started':
            setIsDownloading(true);
            setProgress(prev => ({
              ...prev,
              downloaded: 0,
              total: event.data.contentLength ?? prev?.total ?? 0,
              percentage: 0,
            }));
            toast.info('Update download started...');
            break;
          case 'Progress':
            setProgress(prev => {
              if (!prev) return prev;
              const newDownloaded =
                (prev.downloaded ?? 0) + event.data.chunkLength;
              const newPercentage =
                prev.total && prev.total > 0
                  ? Math.round((newDownloaded / prev.total) * 100)
                  : 0;
              return {
                ...prev,
                downloaded: newDownloaded,
                percentage: newPercentage,
              };
            });
            break;
          case 'Finished':
            setIsDownloading(false);
            setProgress(null);
            setIsInstalling(true);
            toast.success('Download completed! Installing update...');
            break;
        }
      };

      await updateInstance.downloadAndInstall(handleDownloadEvent);

      setIsInstalling(false);
      setUpdateAvailable(false);
      setCurrentUpdate(null);
      setUpdateInstance(null);

      toast.success(
        'Update installed successfully! Please, restart the app to apply the changes.'
      );
    } catch (err) {
      console.error('Failed to install update:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to install update';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsDownloading(false);
      setIsInstalling(false);
      setProgress(null);
    }
  }, [currentUpdate, updateInstance]);

  useEffect(() => {
    if (checksAutomatically) {
      runCheck('available-update-only');
    }
  }, [runCheck, checksAutomatically]);

  return {
    isChecking,
    isDownloading,
    isInstalling,
    updateAvailable,
    currentUpdate,
    progress,
    error,

    checkForUpdates,
    downloadAndInstall,

    hasUpdate: updateAvailable && currentUpdate !== null,
    isBusy: isChecking || isDownloading || isInstalling,
  };
};
