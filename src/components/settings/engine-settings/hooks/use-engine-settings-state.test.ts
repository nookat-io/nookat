import { act, renderHook, waitFor } from '@testing-library/react';
import { emit } from '@tauri-apps/api/event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngineStatus } from '../../../../types/engine-status';
import {
  BinaryInstallPlan,
  ColimaEngineStopProgressType,
  ColimaVm,
  ConnectedEngine,
} from '../types';
import { useEngineSettingsState } from './use-engine-settings-state';

const RUNNING: EngineStatus = { Running: 'Docker' };

const engine = vi.hoisted(() => ({ status: 'Unknown' as EngineStatus }));

vi.mock('../../../../hooks/use-engine-status', () => ({
  useEngineStatus: () => ({
    status: engine.status,
    refetch: async () => {},
    isChecking: false,
  }),
}));

beforeEach(() => {
  engine.status = RUNNING;
});

afterEach(() => {
  vi.useRealTimers();
});

const stoppedProfile = (cpus = 8): ColimaVm => ({
  profile: {
    name: 'default',
    status: 'Stopped',
    settings: {
      cpus,
      memory_gib: 8,
      disk_gib: 100,
      architecture: 'aarch64',
      vm_type: 'vz',
      rosetta: true,
      mount_inotify: false,
    },
    activates_docker_context: true,
  },
  host: {
    cpus: 12,
    memory_gib: 36,
    architecture: 'aarch64',
    supports_vz: true,
  },
  warnings: [],
  docker_context: null,
});

const PLAN: BinaryInstallPlan = {
  install_dir: '/Users/me/.nookat/engine',
  bin_dir: '/Users/me/.nookat/engine/bin',
  components: [{ name: 'Colima', version: '0.10.3' }],
  download_bytes: 15_656_320,
  installed_bytes: 15_656_320,
};

interface Backend {
  colimaSupported?: () => Promise<boolean>;
  homebrewAvailable?: boolean;
  colimaAvailable?: boolean;
  colimaVm?: () => Promise<ColimaVm>;
  installColima?: () => Promise<null>;
  startEngine?: () => Promise<null>;
  dockerInfo?: () => Promise<unknown>;
  connectedEngine?: () => Promise<ConnectedEngine | null>;
  switchDockerContext?: () => Promise<null>;
}

function mockBackend({
  colimaSupported = async () => true,
  homebrewAvailable = true,
  colimaAvailable = true,
  colimaVm = async () => stoppedProfile(),
  installColima = async () => null,
  startEngine = async () => null,
  dockerInfo = async () => ({ server_version: '28.0.0' }),
  connectedEngine = async () => null,
  switchDockerContext = async () => null,
}: Backend = {}) {
  const calls: string[] = [];
  const startRequests: unknown[] = [];
  const installRequests: unknown[] = [];
  mockIPC(
    (cmd, args) => {
      calls.push(cmd);
      switch (cmd) {
        case 'is_colima_supported':
          return colimaSupported();
        case 'check_homebrew_availability':
          return homebrewAvailable;
        case 'check_colima_availability':
          return colimaAvailable;
        case 'get_docker_info':
          return dockerInfo();
        case 'get_connected_engine':
          return connectedEngine();
        case 'install_colima_command':
          installRequests.push(args);
          return installColima();
        case 'get_binary_install_plan':
          return PLAN;
        case 'use_colima_docker_context_command':
          return switchDockerContext();
        case 'get_colima_vm':
          return colimaVm();
        case 'start_colima_vm_command':
          startRequests.push(args);
          return startEngine();
        case 'stop_colima_vm_command':
          return null;
        default:
          throw new Error(`Unexpected command ${cmd}`);
      }
    },
    { shouldMockEvents: true }
  );
  return {
    count: (cmd: string) => calls.filter(call => call === cmd).length,
    startRequests,
    installRequests,
  };
}

function renderEngineSettings() {
  const { result, rerender, unmount } = renderHook(() =>
    useEngineSettingsState()
  );
  return {
    state: () => result.current[0],
    actions: () => result.current[1],
    rerender,
    unmount,
  };
}

const engineLoads = (backend: ReturnType<typeof mockBackend>) => ({
  dockerInfo: backend.count('get_docker_info'),
  colimaVm: backend.count('get_colima_vm'),
});

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

function inOrder<T>(...answers: Array<() => Promise<T>>) {
  let next = 0;
  return () => answers[Math.min(next++, answers.length - 1)]();
}

function later<T>() {
  let answer: (value: T) => void = () => {};
  const promise = new Promise<T>(resolve => (answer = resolve));
  return { promise, answer };
}

const ORBSTACK: ConnectedEngine = {
  name: 'OrbStack',
  endpoint: 'unix:///Users/me/.orbstack/run/docker.sock',
  is_managed_colima: false,
};

const NOOKAT_COLIMA: ConnectedEngine = {
  name: 'Colima',
  endpoint: 'unix:///Users/me/.colima/default/docker.sock',
  is_managed_colima: true,
};

describe('useEngineSettingsState', () => {
  it('asks once on mount whether this build manages Colima', async () => {
    const backend = mockBackend();
    const { state } = renderEngineSettings();

    await waitFor(() => expect(state().colimaSupported).toBe(true));

    expect(state().colimaSupportError).toBeNull();
    expect(backend.count('is_colima_supported')).toBe(1);
  });

  it('does not ask again when the availability checks rerun, because platform support never changes', async () => {
    const backend = mockBackend();
    const { state, actions } = renderEngineSettings();
    await waitFor(() => expect(state().dockerInfo).not.toBeNull());

    act(() => actions().setMethod('binary'));

    await waitFor(() =>
      expect(backend.count('check_homebrew_availability')).toBe(2)
    );
    expect(backend.count('is_colima_supported')).toBe(1);
  });

  it('keeps support unknown, not unsupported, when the probe fails, so the install and start controls stay reachable on macOS', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockBackend({
      colimaSupported: async () => {
        throw new Error('probe failed');
      },
    });
    const { state } = renderEngineSettings();

    await waitFor(() =>
      expect(state().colimaSupportError).toBe('probe failed')
    );

    expect(state().colimaSupported).toBeNull();
  });

  it('clears the previous error while a retry asks again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let finishRetry!: (supported: boolean) => void;
    const answers = [
      () => Promise.reject(new Error('probe failed')),
      () => new Promise<boolean>(resolve => (finishRetry = resolve)),
    ];
    const backend = mockBackend({ colimaSupported: () => answers.shift()!() });
    const { state, actions } = renderEngineSettings();
    await waitFor(() =>
      expect(state().colimaSupportError).toBe('probe failed')
    );

    act(() => {
      actions().checkColimaSupport();
    });

    expect(state().colimaSupportError).toBeNull();
    expect(state().colimaSupported).toBeNull();
    await waitFor(() => expect(backend.count('is_colima_supported')).toBe(2));
    await act(async () => finishRetry(true));
    expect(state().colimaSupported).toBe(true);
  });

  it('reads engine info even without Colima, since the engine may be Docker Desktop or a Linux daemon', async () => {
    mockBackend({ homebrewAvailable: false, colimaAvailable: false });
    const { state } = renderEngineSettings();

    await waitFor(() =>
      expect(state().dockerInfo).toEqual({ server_version: '28.0.0' })
    );
    expect(state().colimaAvailable).toBe(false);
    expect(state().method).toBe('binary');
  });

  it('reloads the engine info when the engine stops answering and again when it is back', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let engineAnswers = true;
    mockBackend({
      dockerInfo: async () => {
        if (!engineAnswers) throw new Error('Docker is not running');
        return { operating_system: 'Ubuntu 24.04.4 LTS' };
      },
    });
    const { state, rerender } = renderEngineSettings();
    await waitFor(() => expect(state().dockerInfo).not.toBeNull());

    engineAnswers = false;
    engine.status = 'Unknown';
    rerender();
    await waitFor(() => expect(state().dockerInfo).toBeNull());

    engineAnswers = true;
    engine.status = { Running: 'Docker' };
    rerender();
    await waitFor(() =>
      expect(state().dockerInfo).toEqual({
        operating_system: 'Ubuntu 24.04.4 LTS',
      })
    );
  });

  it('reloads the engine info when Nookat connects to another engine that is already running', async () => {
    let operatingSystem = 'Ubuntu 24.04.4 LTS';
    mockBackend({
      dockerInfo: async () => ({ operating_system: operatingSystem }),
    });
    const { state } = renderEngineSettings();
    await waitFor(() =>
      expect(state().dockerInfo).toEqual({
        operating_system: 'Ubuntu 24.04.4 LTS',
      })
    );

    operatingSystem = 'OrbStack';
    await act(() => emit('engine-connected'));

    await waitFor(() =>
      expect(state().dockerInfo).toEqual({ operating_system: 'OrbStack' })
    );
  });

  it('keeps the engine the newest refresh found when an earlier refresh answers last', async () => {
    const orbStackInfo = later<unknown>();
    const orbStack = later<ConnectedEngine | null>();
    const backend = mockBackend({
      dockerInfo: inOrder(
        () => orbStackInfo.promise,
        async () => ({ operating_system: 'Ubuntu 24.04.3 LTS' })
      ),
      connectedEngine: inOrder(
        () => orbStack.promise,
        async () => NOOKAT_COLIMA
      ),
    });
    const { state, actions } = renderEngineSettings();
    await waitFor(() => expect(backend.count('get_connected_engine')).toBe(1));

    await act(() => actions().fetchEngineDetails());
    await act(async () => {
      orbStackInfo.answer({ operating_system: 'OrbStack' });
      orbStack.answer(ORBSTACK);
      await flushPromises();
    });

    expect(state().engineConnection).toEqual({
      kind: 'connected',
      engine: NOOKAT_COLIMA,
    });
    expect(state().dockerInfo).toEqual({
      operating_system: 'Ubuntu 24.04.3 LTS',
    });
  });

  it('keeps a failed engine lookup apart from a confirmed disconnection', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockBackend({
      connectedEngine: () =>
        Promise.reject('Failed to get Docker info: connection reset'),
    });
    const { state } = renderEngineSettings();

    await waitFor(() =>
      expect(state().engineConnection).toEqual({
        kind: 'unidentified',
        error: 'Failed to get Docker info: connection reset',
      })
    );
  });

  it('does not reload the engine info on every status poll while the engine keeps running', async () => {
    const backend = mockBackend();
    const { state, rerender } = renderEngineSettings();
    await waitFor(() => expect(state().dockerInfo).not.toBeNull());
    const loadsAfterMount = backend.count('get_docker_info');

    engine.status = { Running: 'Docker' };
    rerender();
    await flushPromises();

    expect(backend.count('get_docker_info')).toBe(loadsAfterMount);
  });

  it('keeps the stop message the backend reports instead of claiming a stop it did not do', async () => {
    mockBackend();
    const { state, actions } = renderEngineSettings();
    await waitFor(() => expect(state().dockerInfo).not.toBeNull());
    const alreadyStopped: ColimaEngineStopProgressType = {
      step: 'Engine already stopped',
      message: 'Colima was not running',
      percentage: 100,
      logs: ['[INFO] Colima is not running'],
    };

    await act(() => actions().handleStopEngine());
    await act(flushPromises);
    await act(() => emit('vm-stop-complete', alreadyStopped));

    expect(state().stopStep).toBe('complete');
    expect(state().stopProgress).toEqual(alreadyStopped);
  });

  it('shows each stop step the backend reports while the engine stops', async () => {
    mockBackend();
    const { state, actions } = renderEngineSettings();
    await waitFor(() => expect(state().dockerInfo).not.toBeNull());
    const stoppingVm: ColimaEngineStopProgressType = {
      step: 'Stopping Colima VM...',
      message: 'Shutting down the virtual machine',
      percentage: 50,
      logs: ['[INFO] colima stop'],
    };

    await act(() => actions().handleStopEngine());
    await act(flushPromises);
    await act(() => emit('vm-stop-progress', stoppingVm));

    expect(state().stopStep).toBe('stopping-vm');
    expect(state().stopProgress).toEqual(stoppingVm);
  });

  it('reports the reason when the engine fails to stop', async () => {
    mockBackend();
    const { state, actions } = renderEngineSettings();
    await waitFor(() => expect(state().dockerInfo).not.toBeNull());

    await act(() => actions().handleStopEngine());
    await act(flushPromises);
    await act(() => emit('vm-stop-error', 'colima stop: exit status 1'));

    expect(state().stopStep).toBe('error');
    expect(state().error).toBe('colima stop: exit status 1');
  });

  it('remembers that the engine start failed, not the installation, so the failure is titled after the start', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockBackend({
      startEngine: () => Promise.reject('colima start: exit status 1'),
    });
    const { state, actions } = renderEngineSettings();
    await waitFor(() => expect(state().dockerInfo).not.toBeNull());

    await act(() => actions().handleStartEngine());

    expect(state().installationOperation).toBe('start');
    expect(state().installationStep).toBe('error');
    expect(state().error).toBe('colima start: exit status 1');
  });

  it('remembers that the installation failed when the install command rejects', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockBackend({
      colimaAvailable: false,
      installColima: () => Promise.reject('brew install colima: exit status 1'),
    });
    const { state, actions } = renderEngineSettings();
    await waitFor(() => expect(state().dockerInfo).not.toBeNull());

    await act(() => actions().handleInstall());

    expect(state().installationOperation).toBe('install');
    expect(state().installationStep).toBe('error');
    expect(state().error).toBe('brew install colima: exit status 1');
  });

  it('reads the Colima profile once Colima is available, so the form shows its real values', async () => {
    mockBackend();
    const { state } = renderEngineSettings();

    await waitFor(() => expect(state().colimaVm).toEqual(stoppedProfile()));
    expect(state().changes).toEqual({});
  });

  it('does not read a Colima profile while Colima is not installed', async () => {
    const backend = mockBackend({ colimaAvailable: false });
    const { state } = renderEngineSettings();

    await waitFor(() => expect(state().colimaAvailable).toBe(false));
    await act(flushPromises);

    expect(backend.count('get_colima_vm')).toBe(0);
  });

  it('explains why the Colima profile could not be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockBackend({
      colimaVm: () => Promise.reject('colima list: exit status 1'),
    });
    const { state } = renderEngineSettings();

    await waitFor(() =>
      expect(state().colimaVmError).toBe('colima list: exit status 1')
    );
    expect(state().colimaVm).toBeNull();
  });

  it('starts the engine with only the settings the user changed', async () => {
    const backend = mockBackend();
    const { state, actions } = renderEngineSettings();
    await waitFor(() => expect(state().colimaVm).not.toBeNull());

    act(() => actions().changeSetting('cpus', 4));
    act(() => actions().changeSetting('mount_inotify', true));
    await act(() => actions().handleStartEngine());

    expect(backend.startRequests).toEqual([
      { changes: { cpus: 4, mount_inotify: true } },
    ]);
  });

  it('starts an untouched profile without changes, so a tuned profile is never downgraded', async () => {
    const backend = mockBackend();
    const { state, actions } = renderEngineSettings();
    await waitFor(() => expect(state().colimaVm).not.toBeNull());

    await act(() => actions().handleStartEngine());

    expect(backend.startRequests).toEqual([{ changes: {} }]);
  });

  it('forgets a change once the user sets the profile value again', async () => {
    mockBackend();
    const { state, actions } = renderEngineSettings();
    await waitFor(() => expect(state().colimaVm).not.toBeNull());

    act(() => actions().changeSetting('cpus', 4));
    act(() => actions().changeSetting('cpus', 8));

    expect(state().changes).toEqual({});
  });

  it('reads the profile again after the engine starts and drops the changes it applied', async () => {
    const answers = [stoppedProfile(8), stoppedProfile(4)];
    const backend = mockBackend({ colimaVm: async () => answers.shift()! });
    const { state, actions } = renderEngineSettings();
    await waitFor(() => expect(state().colimaVm).not.toBeNull());
    act(() => actions().changeSetting('cpus', 4));
    await act(() => actions().handleStartEngine());
    await act(flushPromises);

    vi.useFakeTimers();
    await act(() => emit('vm-startup-complete'));
    await act(() => vi.advanceTimersByTimeAsync(2000));
    vi.useRealTimers();

    await waitFor(() =>
      expect(state().colimaVm?.profile.settings.cpus).toBe(4)
    );
    expect(state().changes).toEqual({});
    expect(backend.count('get_colima_vm')).toBe(2);
  });

  it('shows the engine as ready two seconds after it started, with fresh engine info', async () => {
    const backend = mockBackend();
    const { state, actions } = renderEngineSettings();
    await waitFor(() => expect(state().colimaVm).not.toBeNull());
    await act(() => actions().handleStartEngine());
    await act(flushPromises);
    vi.useFakeTimers();
    await act(() => emit('vm-startup-complete'));
    const loadsWhileValidating = engineLoads(backend);

    await act(() => vi.advanceTimersByTimeAsync(1999));
    expect(state().installationStep).toBe('validating');
    await act(() => vi.advanceTimersByTimeAsync(1));

    expect(state().installationStep).toBe('complete');
    expect(state().installationProgress.percentage).toBe(100);
    expect(engineLoads(backend)).toEqual({
      dockerInfo: loadsWhileValidating.dockerInfo + 1,
      colimaVm: loadsWhileValidating.colimaVm + 1,
    });
  });

  it('goes back to idle two seconds after a stop, with fresh engine info', async () => {
    const backend = mockBackend();
    const { state, actions } = renderEngineSettings();
    await waitFor(() => expect(state().colimaVm).not.toBeNull());
    await act(() => actions().handleStopEngine());
    await act(flushPromises);
    vi.useFakeTimers();
    await act(() => emit('vm-stop-complete', null));
    const loadsAfterStop = engineLoads(backend);

    await act(() => vi.advanceTimersByTimeAsync(1999));
    expect(state().stopStep).toBe('complete');
    await act(() => vi.advanceTimersByTimeAsync(1));

    expect(state().stopStep).toBe('idle');
    expect(engineLoads(backend)).toEqual({
      dockerInfo: loadsAfterStop.dockerInfo + 1,
      colimaVm: loadsAfterStop.colimaVm + 1,
    });
  });

  it('leaves the engine alone once Settings close while a start is being validated', async () => {
    const backend = mockBackend();
    const { state, actions, unmount } = renderEngineSettings();
    await waitFor(() => expect(state().colimaVm).not.toBeNull());
    await act(() => actions().handleStartEngine());
    await act(flushPromises);
    vi.useFakeTimers();
    await act(() => emit('vm-startup-complete'));
    const loadsWhileOpen = engineLoads(backend);

    unmount();
    await vi.advanceTimersByTimeAsync(2000);

    expect(engineLoads(backend)).toEqual(loadsWhileOpen);
  });

  it('leaves the engine alone once Settings close right after a stop', async () => {
    const backend = mockBackend();
    const { state, actions, unmount } = renderEngineSettings();
    await waitFor(() => expect(state().colimaVm).not.toBeNull());
    await act(() => actions().handleStopEngine());
    await act(flushPromises);
    vi.useFakeTimers();
    await act(() => emit('vm-stop-complete', null));
    const loadsWhileOpen = engineLoads(backend);

    unmount();
    await vi.advanceTimersByTimeAsync(2000);

    expect(engineLoads(backend)).toEqual(loadsWhileOpen);
  });

  it('describes the binary installation while Colima is not installed', async () => {
    mockBackend({ homebrewAvailable: false, colimaAvailable: false });
    const { state } = renderEngineSettings();

    await waitFor(() => expect(state().binaryInstallPlan).toEqual(PLAN));
    expect(state().method).toBe('binary');
  });

  it('does not describe the binary installation once Colima is installed', async () => {
    const backend = mockBackend();
    const { state } = renderEngineSettings();

    await waitFor(() => expect(state().colimaVm).not.toBeNull());

    expect(backend.count('get_binary_install_plan')).toBe(0);
  });

  it('installs with the binary method', async () => {
    const backend = mockBackend({
      homebrewAvailable: false,
      colimaAvailable: false,
    });
    const { state, actions } = renderEngineSettings();
    await waitFor(() => expect(state().binaryInstallPlan).not.toBeNull());

    await act(() => actions().handleInstall());

    expect(backend.installRequests).toEqual([{ method: 'Binary' }]);
  });

  it('offers to start the engine once the installation completes', async () => {
    const backend = mockBackend({
      homebrewAvailable: false,
      colimaAvailable: false,
    });
    const { state, actions } = renderEngineSettings();
    await waitFor(() => expect(state().binaryInstallPlan).not.toBeNull());
    await act(() => actions().handleInstall());
    await act(flushPromises);

    await act(() => emit('installation-complete'));

    expect(state().startPromptOpen).toBe(true);
    expect(state().colimaAvailable).toBe(true);

    await act(() => actions().startEngineFromPrompt());

    expect(state().startPromptOpen).toBe(false);
    expect(backend.startRequests).toEqual([{ changes: {} }]);
  });

  it('closes the start prompt without starting when the user declines', async () => {
    const backend = mockBackend({ colimaAvailable: false });
    const { state, actions } = renderEngineSettings();
    await waitFor(() => expect(state().binaryInstallPlan).not.toBeNull());
    await act(() => actions().handleInstall());
    await act(flushPromises);
    await act(() => emit('installation-complete'));

    act(() => actions().dismissStartPrompt());

    expect(state().startPromptOpen).toBe(false);
    expect(backend.startRequests).toEqual([]);
  });

  it('switches docker to Colima and reads the context again', async () => {
    const backend = mockBackend();
    const { state, actions } = renderEngineSettings();
    await waitFor(() => expect(state().colimaVm).not.toBeNull());

    await act(() => actions().switchDockerToColima());

    expect(backend.count('use_colima_docker_context_command')).toBe(1);
    expect(backend.count('get_colima_vm')).toBe(2);
    expect(state().isSwitchingDockerContext).toBe(false);
    expect(state().dockerContextError).toBeNull();
  });

  it('explains why docker could not be switched to Colima', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockBackend({
      switchDockerContext: () =>
        Promise.reject('context "colima" does not exist'),
    });
    const { state, actions } = renderEngineSettings();
    await waitFor(() => expect(state().colimaVm).not.toBeNull());

    await act(() => actions().switchDockerToColima());

    expect(state().dockerContextError).toBe('context "colima" does not exist');
    expect(state().isSwitchingDockerContext).toBe(false);
  });
});
