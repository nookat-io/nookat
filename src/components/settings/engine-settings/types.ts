// Engine Settings Types

export type InstallationMethod = 'homebrew' | 'binary';

export type InstallationStep =
  | 'idle'
  | 'installing'
  | 'starting-vm'
  | 'validating'
  | 'complete'
  | 'error';

export interface InstallationProgress {
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
