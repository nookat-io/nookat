import { invoke } from '@tauri-apps/api/core';
import { useEffect } from 'react';
import { toast } from 'sonner';

const UNREADABLE_CONFIG_TOAST_ID = 'unreadable-config';

function warnAboutUnreadableConfig(backup: string) {
  toast.warning(
    `Nookat could not read its settings file and started with the default settings. The old file was kept as ${backup}.`,
    {
      id: UNREADABLE_CONFIG_TOAST_ID,
      duration: Infinity,
      closeButton: true,
    }
  );
}

export function useUnreadableConfigNotice(settingsLoaded: boolean) {
  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }

    invoke<string | null>('get_unreadable_config_backup')
      .then(backup => {
        if (backup) {
          warnAboutUnreadableConfig(backup);
        }
      })
      .catch(error => {
        console.error(
          'Failed to check for an unreadable settings file:',
          error
        );
      });
  }, [settingsLoaded]);
}
