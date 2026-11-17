export type InstallationMethod = 'homebrew' | 'binary';

export type InstallationStep =
  | 'idle'
  | 'installing'
  | 'starting-vm'
  | 'validating'
  | 'complete'
  | 'error';

export type InstallationOperation = 'install' | 'start';

export type EngineOperation = InstallationOperation | 'stop';

export type StopStep = 'idle' | 'stopping-vm' | 'complete' | 'error';

export interface InstallationProgress {
  step: string;
  message: string;
  percentage: number;
  logs: string[];
}

export interface ColimaEngineStopProgressType {
  step: string;
  message: string;
  percentage: number;
  logs: string[];
}

export interface ColimaConfig {
  cpu: number;
  memory: number;
  disk: number;
  architecture: string;
}

export interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}
