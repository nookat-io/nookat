import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { DockerInfo } from '../../../../types/docker-info';
import {
  InstallationMethod,
  InstallationStep,
  InstallationProgress,
  ColimaConfig,
} from '../types';

export interface EngineSettingsState {
  // Installation state
  method: InstallationMethod;
  step: InstallationStep;
  homebrewAvailable: boolean | null;
  colimaAvailable: boolean | null;
  config: ColimaConfig;
  progress: InstallationProgress;
  error: string | null;
  dockerInfo: DockerInfo | null;

  // UI state
  showEngineConfig: boolean;
}

export interface EngineSettingsActions {
  setMethod: (method: InstallationMethod) => void;
  setStep: (step: InstallationStep) => void;
  setConfig: (config: ColimaConfig) => void;
  setError: (error: string | null) => void;
  setShowEngineConfig: (show: boolean) => void;
  handleInstall: () => Promise<void>;
  handleStartEngine: () => Promise<void>;
  handleRetry: () => void;
  fetchDockerInfo: () => Promise<void>;
}

export function useEngineSettingsState(): [
  EngineSettingsState,
  EngineSettingsActions,
] {
  // Installation state
  const [method, setMethod] = useState<InstallationMethod>('homebrew');
  const [step, setStep] = useState<InstallationStep>('idle');
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
  const [progress, setProgress] = useState<InstallationProgress>({
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
    if (step === 'installing' || step === 'starting-vm') {
      const unlistenPromises: Promise<() => void>[] = [];

      if (step === 'installing') {
        const unlistenInstall = listen('installation-progress', event => {
          const progressData = event.payload as InstallationProgress;
          setProgress(progressData);
        });
        unlistenPromises.push(unlistenInstall);

        const unlistenComplete = listen('installation-complete', async () => {
          setStep('complete');
          setColimaAvailable(true);
          setProgress({
            step: 'Installation Complete!',
            message:
              'Colima has been successfully installed. You can now start the engine.',
            percentage: 100,
            logs: [
              ...progress.logs,
              '[INFO] Colima installation completed successfully',
            ],
          });
        });
        unlistenPromises.push(unlistenComplete);

        const unlistenError = listen('installation-error', event => {
          const errorMsg = event.payload as string;
          setError(errorMsg);
          setStep('error');
        });
        unlistenPromises.push(unlistenError);
      }

      if (step === 'starting-vm') {
        const unlistenVMProgress = listen('vm-startup-progress', event => {
          const progressData = event.payload as InstallationProgress;
          setProgress(progressData);
        });
        unlistenPromises.push(unlistenVMProgress);

        const unlistenVMComplete = listen('vm-startup-complete', () => {
          setStep('validating');
          setProgress(prev => ({
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
            setStep('complete');
            setProgress(prev => ({
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
          setStep('error');
        });
        unlistenPromises.push(unlistenVMError);
      }

      return () => {
        unlistenPromises.forEach(unlisten => {
          unlisten.then(cleanup => cleanup());
        });
      };
    }
  }, [step, config]);

  // Handlers
  const handleInstall = async () => {
    setStep('installing');
    setError(null);
    setProgress({
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
      setStep('error');
    }
  };

  const handleStartEngine = async () => {
    setStep('starting-vm');
    setError(null);
    setProgress({
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
      setStep('error');
    }
  };

  const handleRetry = () => {
    setStep('idle');
    setError(null);
    setProgress({
      step: '',
      message: '',
      percentage: 0,
      logs: [],
    });
  };

  const state: EngineSettingsState = {
    method,
    step,
    homebrewAvailable,
    colimaAvailable,
    config,
    progress,
    error,
    dockerInfo,
    showEngineConfig,
  };

  const actions: EngineSettingsActions = {
    setMethod,
    setStep,
    setConfig,
    setError,
    setShowEngineConfig,
    handleInstall,
    handleStartEngine,
    handleRetry,
    fetchDockerInfo,
  };

  return [state, actions];
}
