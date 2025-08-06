export enum EngineState {
  NotInstalled = 'NotInstalled',
  NotRunning = 'NotRunning',
  Malfunctioning = 'Malfunctioning',
  Healthy = 'Healthy',
}

export interface EngineStatus {
  state: EngineState;
  version?: string;
  error?: string;
}
