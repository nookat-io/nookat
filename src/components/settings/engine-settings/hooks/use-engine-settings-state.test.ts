import { act, renderHook, waitFor } from '@testing-library/react';
import { emit } from '@tauri-apps/api/event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngineStatus } from '../../../../types/engine-status';
import { ColimaEngineStopProgressType } from '../types';
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

interface Backend {
  colimaSupported?: () => Promise<boolean>;
  homebrewAvailable?: boolean;
  colimaAvailable?: boolean;
  installColima?: () => Promise<null>;
  startEngine?: () => Promise<null>;
  dockerInfo?: () => Promise<unknown>;
}

function mockBackend({
  colimaSupported = async () => true,
  homebrewAvailable = true,
  colimaAvailable = true,
  installColima = async () => null,
  startEngine = async () => null,
  dockerInfo = async () => ({ server_version: '28.0.0' }),
}: Backend = {}) {
  const calls: string[] = [];
  mockIPC(
    cmd => {
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
        case 'install_colima_command':
          return installColima();
        case 'start_colima_vm_command':
          return startEngine();
        case 'stop_colima_vm_command':
          return null;
        default:
          throw new Error(`Unexpected command ${cmd}`);
      }
    },
    { shouldMockEvents: true }
  );
  return { count: (cmd: string) => calls.filter(call => call === cmd).length };
}

function renderEngineSettings() {
  const { result, rerender } = renderHook(() => useEngineSettingsState());
  return {
    state: () => result.current[0],
    actions: () => result.current[1],
    rerender,
  };
}

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

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
});
