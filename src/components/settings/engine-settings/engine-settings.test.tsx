import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { describe, expect, it, vi } from 'vitest';
import { EngineSettings } from './engine-settings';

vi.mock('../../../hooks/use-engine-status', () => ({
  useEngineStatus: () => ({
    status: 'Unknown',
    refetch: async () => {},
    isChecking: false,
  }),
}));

const APPLE_SILICON = {
  cpus: 12,
  memory_gib: 36,
  architecture: 'aarch64',
  supports_vz: true,
};

const tunedProfile = (status: string) => ({
  name: 'default',
  status,
  settings: {
    cpus: 8,
    memory_gib: 8,
    disk_gib: 100,
    architecture: 'aarch64',
    vm_type: 'vz',
    rosetta: true,
    mount_inotify: false,
  },
});

interface Backend {
  profileStatus?: string;
  otherEngineAnswers?: boolean;
}

function mockBackend({
  profileStatus = 'Stopped',
  otherEngineAnswers = false,
}: Backend = {}) {
  const startRequests: unknown[] = [];
  mockIPC(
    (cmd, args) => {
      switch (cmd) {
        case 'is_colima_supported':
        case 'check_homebrew_availability':
        case 'check_colima_availability':
          return true;
        case 'get_docker_info':
          if (otherEngineAnswers) {
            return { server_version: '28.0.0', ncpu: 12 };
          }
          throw new Error('DockerInfo is not available');
        case 'get_colima_vm':
          return {
            profile: tunedProfile(profileStatus),
            host: APPLE_SILICON,
            warnings: [],
          };
        case 'start_colima_vm_command':
          startRequests.push(args);
          return null;
        default:
          throw new Error(`Unexpected command ${cmd}`);
      }
    },
    { shouldMockEvents: true }
  );
  return { startRequests };
}

describe('EngineSettings', () => {
  it('shows the resources of the stopped Colima profile instead of 2 CPUs and 2 GB', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockBackend();
    render(<EngineSettings />);

    await waitFor(() =>
      expect(screen.getByLabelText('CPU Cores')).toHaveValue(8)
    );
    expect(screen.getByLabelText('Memory (GB)')).toHaveValue(8);
    expect(screen.getByLabelText('Disk (GB)')).toHaveValue(100);
  });

  it('starts a tuned profile without sending resources, so Colima keeps them', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const { startRequests } = mockBackend();
    render(<EngineSettings />);
    await waitFor(() =>
      expect(screen.getByLabelText('CPU Cores')).toHaveValue(8)
    );

    await user.click(screen.getByRole('button', { name: 'Start Engine' }));

    expect(startRequests).toEqual([{ changes: {} }]);
  });

  it('sends only the resource the user changed in the form', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const { startRequests } = mockBackend();
    render(<EngineSettings />);
    const cpuCores = await screen.findByLabelText('CPU Cores');
    await waitFor(() => expect(cpuCores).toHaveValue(8));

    await user.clear(cpuCores);
    await user.type(cpuCores, '4');
    await user.click(screen.getByRole('button', { name: 'Start Engine' }));

    expect(startRequests).toEqual([{ changes: { cpus: 4 } }]);
  });

  it('offers to start Colima while another Docker engine answers, because that engine is not the Colima VM', async () => {
    mockBackend({ otherEngineAnswers: true });
    render(<EngineSettings />);

    expect(
      await screen.findByRole('button', { name: 'Start Engine' })
    ).toBeEnabled();
    expect(screen.getByLabelText('CPU Cores')).toHaveValue(8);
  });
});
