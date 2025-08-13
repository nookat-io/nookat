export enum EngineState {
  Loading = 'Loading',
  NotInstalled = 'NotInstalled',
  NotRunning = 'NotRunning',
  Malfunctioning = 'Malfunctioning',
  Healthy = 'Healthy',
}

export interface EngineStatus {
  name: string;
  state: EngineState;
  version?: string;
  error?: string;
}

export type EngineContextValue = EngineStatus & {
  refetch: () => Promise<void>;
};
