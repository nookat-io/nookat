import { act, renderHook, waitFor } from '@testing-library/react';
import { emit } from '@tauri-apps/api/event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { describe, expect, it, vi } from 'vitest';
import { ColimaEngineStopProgressType } from '../types';
import { useEngineSettingsState } from './use-engine-settings-state';

interface Backend {
  colimaSupported?: () => Promise<boolean>;
  homebrewAvailable?: boolean;
  colimaAvailable?: boolean;
}

function mockBackend({
  colimaSupported = async () => true,
  homebrewAvailable = true,
  colimaAvailable = true,
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
          return { server_version: '28.0.0' };
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
  const { result } = renderHook(() => useEngineSettingsState());
  return {
    state: () => result.current[0],
    actions: () => result.current[1],
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
});
