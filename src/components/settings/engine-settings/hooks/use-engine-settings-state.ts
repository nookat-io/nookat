import { useState, useEffect, useCallback, useRef } from 'react';
import { useEngineStatus } from '../../../../hooks/use-engine-status';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { DockerInfo } from '../../../../types/docker-info';
import { errorMessage } from '../../../../utils/error-message';
import {
  BinaryInstallPlan,
  InstallationMethod,
  InstallationOperation,
  InstallationStep,
  InstallationProgress,
  ColimaEngineStopProgressType,
  ChangeColimaVmSetting,
  ConnectedEngine,
  ColimaVm,
  ColimaVmSettings,
  ColimaVmSettingsChanges,
  EditableColimaVmSetting,
  EngineConnection,
  StopStep,
} from '../types';

const SUPPORT_UNKNOWN = null;
const ENGINE_VALIDATION_MS = 2000;
const STOP_RESULT_SHOWN_MS = 2000;

function withSettingChange<K extends EditableColimaVmSetting>(
  changes: ColimaVmSettingsChanges,
  setting: K,
  value: ColimaVmSettings[K],
  current: ColimaVmSettings | undefined
): ColimaVmSettingsChanges {
  const next = { ...changes, [setting]: value };
  if (current?.[setting] === value) {
    delete next[setting];
  }
  return next;
}

function connectionTo(engine: ConnectedEngine | null): EngineConnection {
  return engine ? { kind: 'connected', engine } : { kind: 'disconnected' };
}

export interface EngineSettingsState {
  colimaSupported: boolean | typeof SUPPORT_UNKNOWN;
  colimaSupportError: string | null;
  method: InstallationMethod;
  installationOperation: InstallationOperation;
  installationStep: InstallationStep;
  stopStep: StopStep;
  homebrewAvailable: boolean | null;
  colimaAvailable: boolean | null;
  colimaVm: ColimaVm | null;
  colimaVmError: string | null;
  changes: ColimaVmSettingsChanges;
  installationProgress: InstallationProgress;
  stopProgress: ColimaEngineStopProgressType;
  error: string | null;
  dockerInfo: DockerInfo | null;
  engineConnection: EngineConnection;
  showEngineConfig: boolean | null;
  binaryInstallPlan: BinaryInstallPlan | null;
  binaryInstallPlanError: string | null;
  startPromptOpen: boolean;
  isSwitchingDockerContext: boolean;
  dockerContextError: string | null;
}

export interface EngineSettingsActions {
  setMethod: (method: InstallationMethod) => void;
  setInstallationStep: (step: InstallationStep) => void;
  setStopStep: (step: StopStep) => void;
  changeSetting: ChangeColimaVmSetting;
  setError: (error: string | null) => void;
  setShowEngineConfig: (show: boolean) => void;
  handleInstall: () => Promise<void>;
  handleStartEngine: () => Promise<void>;
  handleRetry: () => void;
  fetchEngineDetails: () => Promise<void>;
  fetchColimaVm: () => Promise<void>;
  handleStopEngine: () => Promise<void>;
  checkColimaSupport: () => Promise<void>;
  dismissStartPrompt: () => void;
  startEngineFromPrompt: () => Promise<void>;
  switchDockerToColima: () => Promise<void>;
}

export function useEngineSettingsState(): [
  EngineSettingsState,
  EngineSettingsActions,
] {
  const [colimaSupported, setColimaSupported] =
    useState<EngineSettingsState['colimaSupported']>(SUPPORT_UNKNOWN);
  const [colimaSupportError, setColimaSupportError] = useState<string | null>(
    null
  );
  const [method, setMethod] = useState<InstallationMethod>('homebrew');
  const [installationOperation, setInstallationOperation] =
    useState<InstallationOperation>('install');
  const [installationStep, setInstallationStep] =
    useState<InstallationStep>('idle');
  const [stopStep, setStopStep] = useState<StopStep>('idle');
  const [homebrewAvailable, setHomebrewAvailable] = useState<boolean | null>(
    null
  );
  const [colimaAvailable, setColimaAvailable] = useState<boolean | null>(null);
  const [colimaVm, setColimaVm] = useState<ColimaVm | null>(null);
  const [colimaVmError, setColimaVmError] = useState<string | null>(null);
  const [changes, setChanges] = useState<ColimaVmSettingsChanges>({});
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
  const [engineConnection, setEngineConnection] = useState<EngineConnection>({
    kind: 'checking',
  });
  const latestEngineDetailsRequest = useRef(0);
  const [showEngineConfig, setShowEngineConfig] = useState<boolean | null>(
    null
  );
  const { status: engineStatus } = useEngineStatus();
  const engineAnswers =
    typeof engineStatus === 'object' && 'Running' in engineStatus;
  const [binaryInstallPlan, setBinaryInstallPlan] =
    useState<BinaryInstallPlan | null>(null);
  const [binaryInstallPlanError, setBinaryInstallPlanError] = useState<
    string | null
  >(null);
  const [startPromptOpen, setStartPromptOpen] = useState(false);
  const [isSwitchingDockerContext, setIsSwitchingDockerContext] =
    useState(false);
  const [dockerContextError, setDockerContextError] = useState<string | null>(
    null
  );

  const probeColimaSupport = useCallback(
    () =>
      invoke<boolean>('is_colima_supported').then(setColimaSupported, err => {
        console.error('Error checking Colima platform support:', err);
        setColimaSupported(SUPPORT_UNKNOWN);
        setColimaSupportError(errorMessage(err));
      }),
    []
  );

  useEffect(() => {
    probeColimaSupport();
  }, [probeColimaSupport]);

  const checkColimaSupport = async () => {
    setColimaSupportError(null);
    await probeColimaSupport();
  };

  const fetchEngineDetails = useCallback(() => {
    const request = ++latestEngineDetailsRequest.current;
    const unlessSuperseded =
      <T>(apply: (value: T) => void) =>
      (value: T) => {
        if (request === latestEngineDetailsRequest.current) {
          apply(value);
        }
      };

    return Promise.all([
      invoke<DockerInfo>('get_docker_info').then(
        unlessSuperseded(setDockerInfo),
        unlessSuperseded(err => {
          console.error('Error fetching Docker info:', err);
          setDockerInfo(null);
        })
      ),
      invoke<ConnectedEngine | null>('get_connected_engine').then(
        unlessSuperseded(engine => setEngineConnection(connectionTo(engine))),
        unlessSuperseded(err => {
          console.error('Error describing the connected engine:', err);
          setEngineConnection({
            kind: 'unidentified',
            error: errorMessage(err),
          });
        })
      ),
    ]).then(() => undefined);
  }, []);

  const fetchColimaVm = useCallback(
    () =>
      invoke<ColimaVm>('get_colima_vm').then(
        vm => {
          setColimaVm(vm);
          setColimaVmError(null);
        },
        err => {
          console.error('Error reading the Colima profile:', err);
          setColimaVmError(errorMessage(err));
        }
      ),
    []
  );

  const refreshColimaVmAfterStart = useCallback(
    () => fetchColimaVm().then(() => setChanges({})),
    [fetchColimaVm]
  );

  useEffect(() => {
    if (colimaAvailable) {
      fetchColimaVm();
    }
  }, [colimaAvailable, fetchColimaVm]);

  useEffect(() => {
    if (colimaAvailable !== false) {
      return;
    }
    invoke<BinaryInstallPlan>('get_binary_install_plan').then(
      plan => {
        setBinaryInstallPlan(plan);
        setBinaryInstallPlanError(null);
      },
      err => {
        console.error('Error describing the binary installation:', err);
        setBinaryInstallPlanError(errorMessage(err));
      }
    );
  }, [colimaAvailable]);

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

  useEffect(() => {
    fetchEngineDetails();
  }, [engineAnswers, fetchEngineDetails]);

  useEffect(() => {
    const unlisten = listen('engine-connected', () => fetchEngineDetails());
    return () => {
      unlisten.then(stop => stop());
    };
  }, [fetchEngineDetails]);

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
          setStartPromptOpen(true);
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

  useEffect(() => {
    if (installationStep !== 'validating') {
      return;
    }

    const engineReady = setTimeout(() => {
      setInstallationStep('complete');
      fetchEngineDetails().catch(() => {});
      refreshColimaVmAfterStart();
      setInstallationProgress(prev => ({
        ...prev,
        step: 'Engine Ready!',
        message: 'Colima engine is ready to use',
        percentage: 100,
        logs: [...prev.logs, '[INFO] Engine started successfully'],
      }));
    }, ENGINE_VALIDATION_MS);

    return () => clearTimeout(engineReady);
  }, [installationStep, fetchEngineDetails, refreshColimaVmAfterStart]);

  useEffect(() => {
    if (stopStep !== 'stopping-vm') {
      return;
    }

    const unlistenPromises = [
      listen<ColimaEngineStopProgressType>('vm-stop-progress', event =>
        setStopProgress(event.payload)
      ),
      listen<ColimaEngineStopProgressType | null>('vm-stop-complete', event => {
        setStopStep('complete');
        const progressReportedByBackend = event.payload;
        setStopProgress(
          prev => progressReportedByBackend ?? { ...prev, percentage: 100 }
        );
      }),
      listen<string>('vm-stop-error', event => {
        setError(event.payload);
        setStopStep('error');
      }),
    ];

    return () => {
      unlistenPromises.forEach(unlisten => {
        unlisten.then(cleanup => cleanup());
      });
    };
  }, [stopStep]);

  useEffect(() => {
    if (stopStep !== 'complete') {
      return;
    }

    const backToIdle = setTimeout(() => {
      fetchEngineDetails().catch(() => {});
      fetchColimaVm();
      setStopStep('idle');
    }, STOP_RESULT_SHOWN_MS);

    return () => clearTimeout(backToIdle);
  }, [stopStep, fetchEngineDetails, fetchColimaVm]);

  const handleInstall = async () => {
    setInstallationOperation('install');
    setInstallationStep('installing');
    setError(null);
    setInstallationProgress({
      step: 'Starting installation...',
      message: 'Preparing to install Colima',
      percentage: null,
      logs: ['[INFO] Starting Colima installation...'],
    });

    try {
      const methodEnum = method === 'homebrew' ? 'Homebrew' : 'Binary';
      await invoke('install_colima_command', { method: methodEnum });
    } catch (error) {
      console.error('Installation failed:', error);
      setError(errorMessage(error));
      setInstallationStep('error');
    }
  };

  const handleStartEngine = async () => {
    setInstallationOperation('start');
    setInstallationStep('starting-vm');
    setError(null);
    setInstallationProgress({
      step: 'Starting Engine...',
      message: 'Initializing Colima virtual machine',
      percentage: null,
      logs: ['[INFO] Starting Colima engine...'],
    });

    try {
      await invoke('start_colima_vm_command', { changes });
    } catch (error) {
      console.error('Engine startup failed:', error);
      setError(errorMessage(error));
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
      setError(errorMessage(error));
      setStopStep('error');
    }
  };

  const dismissStartPrompt = () => setStartPromptOpen(false);

  const startEngineFromPrompt = () => {
    setStartPromptOpen(false);
    return handleStartEngine();
  };

  const switchDockerToColima = () => {
    setIsSwitchingDockerContext(true);
    setDockerContextError(null);
    return invoke('use_colima_docker_context_command')
      .then(
        async () => {
          await Promise.all([fetchColimaVm(), fetchEngineDetails()]);
        },
        err => {
          console.error('Error switching the Docker context to Colima:', err);
          setDockerContextError(errorMessage(err));
        }
      )
      .finally(() => setIsSwitchingDockerContext(false));
  };

  const changeSetting: ChangeColimaVmSetting = (setting, value) => {
    setChanges(previous =>
      withSettingChange(previous, setting, value, colimaVm?.profile.settings)
    );
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
    colimaSupported,
    colimaSupportError,
    method,
    installationOperation,
    installationStep,
    stopStep,
    homebrewAvailable,
    colimaAvailable,
    colimaVm,
    colimaVmError,
    changes,
    installationProgress,
    stopProgress,
    error,
    dockerInfo,
    engineConnection,
    showEngineConfig,
    binaryInstallPlan,
    binaryInstallPlanError,
    startPromptOpen,
    isSwitchingDockerContext,
    dockerContextError,
  };

  const actions: EngineSettingsActions = {
    setMethod,
    setInstallationStep,
    setStopStep,
    changeSetting,
    setError,
    setShowEngineConfig,
    handleInstall,
    handleStartEngine,
    handleRetry,
    fetchEngineDetails,
    fetchColimaVm,
    handleStopEngine,
    checkColimaSupport,
    dismissStartPrompt,
    startEngineFromPrompt,
    switchDockerToColima,
  };

  return [state, actions];
}
