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
  activates_docker_context: boolean;
}

export type ColimaPerformanceWarning =
  | { kind: 'FewCpus'; cpus: number }
  | { kind: 'RosettaOff' };

export interface ConnectedEngine {
  name: string;
  endpoint: string;
  is_managed_colima: boolean;
}

export type EngineConnection =
  | { kind: 'checking' }
  | { kind: 'connected'; engine: ConnectedEngine }
  | { kind: 'disconnected' }
  | { kind: 'unidentified'; error: string };

export interface DockerCliContext {
  name: string;
  host: string | null;
  uses_colima: boolean;
}

export interface ColimaVm {
  profile: ColimaProfile;
  host: ColimaHost;
  warnings: ColimaPerformanceWarning[];
  docker_context: DockerCliContext | null;
}

export interface BinaryComponent {
  name: string;
  version: string;
}

export interface BinaryInstallPlan {
  install_dir: string;
  bin_dir: string;
  components: BinaryComponent[];
  download_bytes: number;
  installed_bytes: number;
}

export interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}
