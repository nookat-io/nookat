import { createContext } from 'react';

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

export type UpdaterContextType = {
  isChecking: boolean;
  isDownloading: boolean;
  isInstalling: boolean;
  updateAvailable: boolean;
  currentUpdate: UpdateInfo | null;
  progress: UpdateProgress | null;
  error: string | null;
  checkForUpdates: () => void;
  downloadAndInstall: () => Promise<void>;
  hasUpdate: boolean;
  isBusy: boolean;
};

export const UpdaterContext = createContext<UpdaterContextType | undefined>(
  undefined
);
