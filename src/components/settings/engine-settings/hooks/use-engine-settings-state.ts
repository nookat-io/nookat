import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { DockerInfo } from '../../../../types/docker-info';
import {
  InstallationMethod,
  InstallationStep,
  InstallationProgress,
  ColimaEngineStopProgressType,
  ColimaConfig,
  StopStep,
} from '../types';

export interface EngineSettingsState {
  // Installation state
  method: InstallationMethod;
  installationStep: InstallationStep;
  stopStep: StopStep;
  homebrewAvailable: boolean | null;
  colimaAvailable: boolean | null;
  config: ColimaConfig;
  installationProgress: InstallationProgress;
  stopProgress: ColimaEngineStopProgressType;
  error: string | null;
  dockerInfo: DockerInfo | null;

  // UI state
  showEngineConfig: boolean;
}

export interface EngineSettingsActions {
  setMethod: (method: InstallationMethod) => void;
  setInstallationStep: (step: InstallationStep) => void;
  setStopStep: (step: StopStep) => void;
  setConfig: (config: ColimaConfig) => void;
  setError: (error: string | null) => void;
  setShowEngineConfig: (show: boolean) => void;
  handleInstall: () => Promise<void>;
  handleStartEngine: () => Promise<void>;
  handleRetry: () => void;
  fetchDockerInfo: () => Promise<void>;
  handleStopEngine: () => Promise<void>;
}

export function useEngineSettingsState(): [
  EngineSettingsState,
  EngineSettingsActions,
] {
  // Installation state
  const [method, setMethod] = useState<InstallationMethod>('homebrew');
  const [installationStep, setInstallationStep] =
    useState<InstallationStep>('idle');
  const [stopStep, setStopStep] = useState<StopStep>('idle');
  const [homebrewAvailable, setHomebrewAvailable] = useState<boolean | null>(
    null
  );
  const [colimaAvailable, setColimaAvailable] = useState<boolean | null>(null);
  const [config, setConfig] = useState<ColimaConfig>({
    cpu: 2,
    memory: 2,
    disk: 100,
    architecture: 'host',
  });
  const [installationProgress, setInstallationProgress] =
    useState<InstallationProgress>({
      step: '',
      message: '',
      percentage: 0,
      logs: [],
    });
  const [stopProgress, setStopProgress] =
    useState<ColimaEngineStopProgressType>({
      step: '',
      message: '',
      percentage: 0,
      logs: [],
    });
  const [error, setError] = useState<string | null>(null);
  const [dockerInfo, setDockerInfo] = useState<DockerInfo | null>(null);

  // UI state
  const [showEngineConfig, setShowEngineConfig] = useState(true);

  // Check availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const isHomebrewAvailable = await invoke<boolean>(
          'check_homebrew_availability'
        );
        setHomebrewAvailable(isHomebrewAvailable);

        const isColimaAvailable = await invoke<boolean>(
          'check_colima_availability'
        );
        setColimaAvailable(isColimaAvailable);

        if (!isHomebrewAvailable && method === 'homebrew') {
          setMethod('binary');
        }

        if (isColimaAvailable) {
          fetchDockerInfo();
        }
      } catch (error) {
        console.error('Error checking availability:', error);
        setHomebrewAvailable(false);
        setColimaAvailable(false);
        if (method === 'homebrew') {
          setMethod('binary');
        }
      }
    };

    checkAvailability();
  }, [method]);

  // Fetch Docker info
  const fetchDockerInfo = async () => {
    try {
      const info = await invoke<DockerInfo>('get_docker_info');
      setDockerInfo(info);
    } catch (err) {
      console.error('Error fetching Docker info:', err);
      setDockerInfo(null);
    }
  };

  // Event listeners for installation progress
  useEffect(() => {
    if (
      installationStep === 'installing' ||
      installationStep === 'starting-vm'
    ) {
      const unlistenPromises: Promise<() => void>[] = [];

      if (installationStep === 'installing') {
        const unlistenInstall = listen('installation-progress', event => {
          const progressData = event.payload as InstallationProgress;
          setInstallationProgress(progressData);
        });
        unlistenPromises.push(unlistenInstall);

        const unlistenComplete = listen('installation-complete', async () => {
          setInstallationStep('complete');
          setColimaAvailable(true);
          setInstallationProgress(prev => ({
            step: 'Installation Complete!',
            message:
              'Colima has been successfully installed. You can now start the engine.',
            percentage: 100,
            logs: [
              ...prev.logs,
              '[INFO] Colima installation completed successfully',
            ],
          }));
        });
        unlistenPromises.push(unlistenComplete);

        const unlistenError = listen('installation-error', event => {
          const errorMsg = event.payload as string;
          setError(errorMsg);
          setInstallationStep('error');
        });
        unlistenPromises.push(unlistenError);
      }

      if (installationStep === 'starting-vm') {
        const unlistenVMProgress = listen('vm-startup-progress', event => {
          const progressData = event.payload as InstallationProgress;
          setInstallationProgress(progressData);
        });
        unlistenPromises.push(unlistenVMProgress);

        const unlistenVMComplete = listen('vm-startup-complete', () => {
          setInstallationStep('validating');
          setInstallationProgress(prev => ({
            ...prev,
            step: 'Validating engine...',
            message: 'Testing Docker connectivity and engine status',
            percentage: 95,
            logs: [
              ...prev.logs,
              '[INFO] Engine startup completed successfully',
            ],
          }));

          setTimeout(() => {
            setInstallationStep('complete');
            fetchDockerInfo().catch(() => {});
            setInstallationProgress(prev => ({
              ...prev,
              step: 'Engine Ready!',
              message: 'Colima engine is ready to use',
              percentage: 100,
              logs: [...prev.logs, '[INFO] Engine started successfully'],
            }));
          }, 2000);
        });
        unlistenPromises.push(unlistenVMComplete);

        const unlistenVMError = listen('vm-startup-error', event => {
          const errorMsg = event.payload as string;
          setError(errorMsg);
          setInstallationStep('error');
        });
        unlistenPromises.push(unlistenVMError);
      }

      return () => {
        unlistenPromises.forEach(unlisten => {
          unlisten.then(cleanup => cleanup());
        });
      };
    }
  }, [installationStep]);

  // Event listeners for stop progress
  useEffect(() => {
    if (stopStep === 'stopping-vm' || stopStep === 'stopping') {
      const unlistenPromises: Promise<() => void>[] = [];

      if (stopStep === 'stopping-vm') {
        const unlistenStopProgress = listen('vm-stop-progress', event => {
          const progressData = event.payload as ColimaEngineStopProgressType;
          setStopProgress(progressData);
        });
        unlistenPromises.push(unlistenStopProgress);

        const unlistenStopComplete = listen('vm-stop-complete', async event => {
          setStopStep('complete');
          // The event carries the terminal progress, so the final state does
          // not depend on the last 'vm-stop-progress' arriving first. The
          // backend reports what it actually did (stopped the VM, or found it
          // already stopped), so keep its message instead of claiming a stop
          // that may not have happened.
          const finalProgress =
            event.payload as ColimaEngineStopProgressType | null;
          setStopProgress(prev => finalProgress ?? { ...prev, percentage: 100 });
          // Refresh Docker info after stopping
          setTimeout(() => {
            fetchDockerInfo().catch(() => {});
            setStopStep('idle');
          }, 2000);
        });
        unlistenPromises.push(unlistenStopComplete);

        const unlistenStopError = listen('vm-stop-error', event => {
          const errorMsg = event.payload as string;
          setError(errorMsg);
          setStopStep('error');
        });
        unlistenPromises.push(unlistenStopError);
      }

      if (stopStep === 'stopping') {
        const unlistenStopProgress = listen('engine-stop-progress', event => {
          const progressData = event.payload as ColimaEngineStopProgressType;
          setStopProgress(progressData);
        });
        unlistenPromises.push(unlistenStopProgress);
      }

      return () => {
        unlistenPromises.forEach(unlisten => {
          unlisten.then(cleanup => cleanup());
        });
      };
    }
  }, [stopStep]);

  // Handlers
  const handleInstall = async () => {
    setInstallationStep('installing');
    setError(null);
    setInstallationProgress({
      step: 'Starting installation...',
      message: 'Preparing to install Colima',
      percentage: 0,
      logs: ['[INFO] Starting Colima installation...'],
    });

    try {
      const methodEnum = method === 'homebrew' ? 'Homebrew' : 'Binary';
      await invoke('install_colima_command', { method: methodEnum });
    } catch (error) {
      console.error('Installation failed:', error);
      setError(error instanceof Error ? error.message : String(error));
      setInstallationStep('error');
    }
  };

  const handleStartEngine = async () => {
    setInstallationStep('starting-vm');
    setError(null);
    setInstallationProgress({
      step: 'Starting Engine...',
      message: 'Initializing Colima virtual machine',
      percentage: 0,
      logs: ['[INFO] Starting Colima engine...'],
    });

    try {
      await invoke('start_colima_vm_command', { config });
    } catch (error) {
      console.error('Engine startup failed:', error);
      setError(error instanceof Error ? error.message : String(error));
      setInstallationStep('error');
    }
  };

  const handleStopEngine = async () => {
    setStopStep('stopping-vm');
    setError(null);
    setStopProgress({
      step: 'Stopping Engine...',
      message: 'Stopping Colima virtual machine',
      percentage: 0,
      logs: ['[INFO] Stopping Colima engine...'],
    });

    try {
      await invoke('stop_colima_vm_command');
    } catch (error) {
      console.error('Engine stop failed:', error);
      setError(error instanceof Error ? error.message : String(error));
      setStopStep('error');
    }
  };

  const handleRetry = () => {
    setInstallationStep('idle');
    setStopStep('idle');
    setError(null);
    setInstallationProgress({
      step: '',
      message: '',
      percentage: 0,
      logs: [],
    });
    setStopProgress({
      step: '',
      message: '',
      percentage: 0,
      logs: [],
    });
  };

  const state: EngineSettingsState = {
    method,
    installationStep,
    stopStep,
    homebrewAvailable,
    colimaAvailable,
    config,
    installationProgress,
    stopProgress,
    error,
    dockerInfo,
    showEngineConfig,
  };

  const actions: EngineSettingsActions = {
    setMethod,
    setInstallationStep,
    setStopStep,
    setConfig,
    setError,
    setShowEngineConfig,
    handleInstall,
    handleStartEngine,
    handleRetry,
    fetchDockerInfo,
    handleStopEngine,
  };

  return [state, actions];
}
