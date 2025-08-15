// Colima engine info matching backend
export interface ColimaEngineInfo {
  colima_version: string;
  colima_checksum: string;
  colima_download_url: string;
  lima_version: string;
  lima_checksum: string;
  lima_download_url: string;
}

// Engine info enum matching backend exactly
export type EngineInfo = { Colima: ColimaEngineInfo } | 'Docker';

// Engine status enum matching backend exactly
export type EngineStatus =
  | 'Unknown'
  | { Installed: EngineInfo }
  | { Running: EngineInfo };

// Context value for React context - now uses backend types directly
export type EngineContextValue = {
  status: EngineStatus;
  refetch: () => Promise<void>;
  isChecking: boolean;
};
