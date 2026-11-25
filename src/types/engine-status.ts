export interface ColimaEngineInfo {
  colima_version: string;
  colima_checksum: string;
  colima_download_url: string;
  lima_version: string;
  lima_checksum: string;
  lima_download_url: string;
}

export type EngineInfo = { Colima: ColimaEngineInfo } | 'Docker';

export type EngineStatus =
  'Unknown' | { Installed: EngineInfo } | { Running: EngineInfo };

export type EngineContextValue = {
  status: EngineStatus;
  refetch: () => Promise<void>;
  isChecking: boolean;
};
