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

export type ColimaArchitecture = 'aarch64' | 'x86_64';

export type ColimaVmType = 'vz' | 'qemu' | 'krunkit' | 'other';

export type ColimaProfileStatus =
  | 'Missing'
  | 'Running'
  | 'Stopped'
  | 'Broken'
  | 'Unknown';

export interface ColimaVmSettings {
  cpus: number;
  memory_gib: number;
  disk_gib: number;
  architecture: ColimaArchitecture;
  vm_type: ColimaVmType;
  rosetta: boolean;
  mount_inotify: boolean;
}

export type EditableColimaVmSetting =
  | 'cpus'
  | 'memory_gib'
  | 'disk_gib'
  | 'architecture'
  | 'mount_inotify';

export type ColimaVmSettingsChanges = Partial<
  Pick<ColimaVmSettings, EditableColimaVmSetting>
>;

export type ChangeColimaVmSetting = <K extends EditableColimaVmSetting>(
  setting: K,
  value: ColimaVmSettings[K]
) => void;

export interface ColimaHost {
  cpus: number;
  memory_gib: number;
  architecture: ColimaArchitecture;
  supports_vz: boolean;
}

export interface ColimaProfile {
  name: string;
  status: ColimaProfileStatus;
  settings: ColimaVmSettings;
}

export type ColimaPerformanceWarning =
  | { kind: 'FewCpus'; cpus: number }
  | { kind: 'RosettaOff' };

export interface ColimaVm {
  profile: ColimaProfile;
  host: ColimaHost;
  warnings: ColimaPerformanceWarning[];
}

export interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}
