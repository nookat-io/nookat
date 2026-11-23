import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import { invoke } from '@tauri-apps/api/core';
import { check, Update, DownloadEvent } from '@tauri-apps/plugin-updater';
import { toast } from 'sonner';
import { useConfig } from '../hooks/use-config';
import { AppConfig } from '../types/config';
import { errorMessage } from '../utils/error-message';
import {
  UpdateInfo,
  UpdateProgress,
  UpdaterContext,
} from '../contexts/updater-context';

const AUTOMATIC_CHECK_RETRY_MS = 60 * 60 * 1000;
const AUTOMATIC_CHECK_INTERVAL_MS = 24 * AUTOMATIC_CHECK_RETRY_MS;

type CheckOutcomesToAnnounce = 'every-outcome' | 'available-update-only';

function isAutomaticCheckDue(
  config: AppConfig | null,
  lastAutomaticAttemptAt: number | null,
  now: number
) {
  if (!config?.startup.check_for_updates) {
    return false;
  }
  if (
    lastAutomaticAttemptAt !== null &&
    now - lastAutomaticAttemptAt < AUTOMATIC_CHECK_RETRY_MS
  ) {
    return false;
  }
  const lastSuccessfulCheck = config.startup.last_update_check;
  return (
    !lastSuccessfulCheck ||
    now - Date.parse(lastSuccessfulCheck) >= AUTOMATIC_CHECK_INTERVAL_MS
  );
}

async function restartToRunInstalledUpdate() {
  toast.success('Update installed, restarting Nookat');
  try {
    await invoke('restart_app');
  } catch (err) {
    console.error('Failed to restart after the update:', err);
    toast.error(
      `Update installed, but Nookat could not restart: ${errorMessage(err)}. Restart it to finish updating.`
    );
  }
}

export function UpdaterProvider({ children }: { children: React.ReactNode }) {
  const { config, updateLastUpdateCheck } = useConfig();
  const [isChecking, startCheck] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentUpdate, setCurrentUpdate] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updateInstance, setUpdateInstance] = useState<Update | null>(null);
  const lastAutomaticAttemptAt = useRef<number | null>(null);
  const announcedVersions = useRef(new Set<string>());

  const recordLastCheck = useCallback(async () => {
    try {
      await updateLastUpdateCheck();
    } catch (err) {
      console.warn('Failed to update last check timestamp:', err);
    }
  }, [updateLastUpdateCheck]);

  const announceUpdate = useCallback(
    (version: string, announce: CheckOutcomesToAnnounce) => {
      const alreadyAnnounced = announcedVersions.current.has(version);
      announcedVersions.current.add(version);
      if (announce === 'every-outcome' || !alreadyAnnounced) {
        toast.success(`Update available: v${version}`);
      }
    },
    []
  );

  const runCheck = useCallback(
    (announce: CheckOutcomesToAnnounce) =>
      startCheck(async () => {
        try {
          const update = await check();
          startCheck(() => {
            setError(null);
            setUpdateAvailable(update !== null);
            setUpdateInstance(update);
            setCurrentUpdate(
              update && {
                version: update.version,
                date: update.date,
                body: update.body,
                pubDate: undefined,
              }
            );
          });

          if (update) {
            announceUpdate(update.version, announce);
          } else if (announce === 'every-outcome') {
            toast.info('No updates available');
          }

          await recordLastCheck();
        } catch (err) {
          console.error('Failed to check for updates:', err);
          const message = errorMessage(err, 'Failed to check for updates');
          startCheck(() => setError(message));
          if (announce === 'every-outcome') {
            toast.error(message);
          }
        }
      }),
    [announceUpdate, recordLastCheck]
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

      await restartToRunInstalledUpdate();
    } catch (err) {
      console.error('Failed to install update:', err);
      const message = errorMessage(err, 'Failed to install update');
      setError(message);
      toast.error(message);
      setIsDownloading(false);
      setIsInstalling(false);
      setProgress(null);
    }
  }, [currentUpdate, updateInstance]);

  useEffect(() => {
    const checkIfDue = () => {
      const now = Date.now();
      if (!isAutomaticCheckDue(config, lastAutomaticAttemptAt.current, now)) {
        return;
      }
      lastAutomaticAttemptAt.current = now;
      runCheck('available-update-only');
    };

    checkIfDue();
    const interval = setInterval(checkIfDue, AUTOMATIC_CHECK_RETRY_MS);
    return () => clearInterval(interval);
  }, [config, runCheck]);

  return (
    <UpdaterContext.Provider
      value={{
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
      }}
    >
      {children}
    </UpdaterContext.Provider>
  );
}
