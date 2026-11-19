import { act, render, screen, waitFor, within } from '@testing-library/react';
import { emit } from '@tauri-apps/api/event';
import userEvent from '@testing-library/user-event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { describe, expect, it, vi } from 'vitest';
import { EngineSettings } from './engine-settings';
import { ConnectedEngine } from './types';

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

const tunedProfile = (status: string, activatesDockerContext: boolean) => ({
  name: 'default',
  status,
  activates_docker_context: activatesDockerContext,
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

const ORBSTACK_CONTEXT = {
  name: 'orbstack',
  host: 'unix:///Users/me/.orbstack/run/docker.sock',
  uses_colima: false,
};

const ORBSTACK_ENGINE: ConnectedEngine = {
  name: 'OrbStack',
  endpoint: 'unix:///Users/me/.orbstack/run/docker.sock',
  is_managed_colima: false,
};

const NOOKAT_COLIMA_ENGINE: ConnectedEngine = {
  name: 'Colima',
  endpoint: 'unix:///Users/me/.colima/default/docker.sock',
  is_managed_colima: true,
};

const BINARY_INSTALL_PLAN = {
  install_dir: '/Users/me/.nookat/engine',
  bin_dir: '/Users/me/.nookat/engine/bin',
  components: [
    { name: 'Colima', version: '0.10.3' },
    { name: 'Lima', version: '2.2.1' },
    { name: 'Docker CLI', version: '29.10.0' },
  ],
  download_bytes: 64_315_959,
  installed_bytes: 130_450_970,
};

interface Backend {
  colimaSupported?: boolean;
  connectedEngine?: {
    beforeSwitch: ConnectedEngine | null;
    afterSwitch?: ConnectedEngine;
  };
  identificationError?: { current: string | null };
  profileStatus?: string;
  activatesDockerContext?: boolean;
  otherEngineAnswers?: boolean;
  homebrewAvailable?: boolean;
  colimaInstalled?: boolean;
  dockerContext?: typeof ORBSTACK_CONTEXT | null;
  operatingSystem?: { beforeSwitch: string; afterSwitch: string };
}

function mockBackend({
  colimaSupported = true,
  connectedEngine = { beforeSwitch: null },
  identificationError,
  profileStatus = 'Stopped',
  activatesDockerContext = true,
  otherEngineAnswers = false,
  homebrewAvailable = true,
  colimaInstalled = true,
  dockerContext = null,
  operatingSystem,
}: Backend = {}) {
  const startRequests: unknown[] = [];
  const installRequests: unknown[] = [];
  const contextSwitches: unknown[] = [];
  mockIPC(
    (cmd, args) => {
      switch (cmd) {
        case 'is_colima_supported':
          return colimaSupported;
        case 'get_connected_engine':
          if (identificationError?.current) {
            return Promise.reject(identificationError.current);
          }
          return contextSwitches.length > 0 && connectedEngine.afterSwitch
            ? connectedEngine.afterSwitch
            : connectedEngine.beforeSwitch;
        case 'check_homebrew_availability':
          return homebrewAvailable;
        case 'check_colima_availability':
          return colimaInstalled;
        case 'get_binary_install_plan':
          return BINARY_INSTALL_PLAN;
        case 'install_colima_command':
          installRequests.push(args);
          return null;
        case 'use_colima_docker_context_command':
          contextSwitches.push(args);
          return null;
        case 'get_docker_info':
          if (operatingSystem) {
            return {
              operating_system:
                contextSwitches.length === 0
                  ? operatingSystem.beforeSwitch
                  : operatingSystem.afterSwitch,
            };
          }
          if (otherEngineAnswers) {
            return { server_version: '28.0.0', ncpu: 12 };
          }
          throw new Error('DockerInfo is not available');
        case 'get_colima_vm':
          return {
            profile: tunedProfile(profileStatus, activatesDockerContext),
            host: APPLE_SILICON,
            warnings: [],
            docker_context: dockerContext,
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
  return { startRequests, installRequests, contextSwitches };
}

const engineSection = (name: string | RegExp) =>
  screen.findByRole('button', { name });

describe('EngineSettings', () => {
  it('names the engine Nookat is connected to and folds Colima under it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const { startRequests } = mockBackend({
      connectedEngine: { beforeSwitch: ORBSTACK_ENGINE },
      otherEngineAnswers: true,
    });
    render(<EngineSettings />);

    expect(
      await screen.findByText('unix:///Users/me/.orbstack/run/docker.sock')
    ).toBeInTheDocument();
    expect(screen.getByText(/^Nookat is connected to/)).toHaveTextContent(
      'Nookat is connected to OrbStack at unix:///Users/me/.orbstack/run/docker.sock'
    );
    const section = await engineSection('Use Colima instead of OrbStack');
    expect(section).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(
        screen.getByRole('heading', { name: 'Use Colima instead of OrbStack' })
      ).getByRole('button')
    ).toBe(section);
    expect(
      screen.queryByRole('button', { name: 'Start Engine' })
    ).not.toBeInTheDocument();

    await user.click(section);

    expect(section).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Colima is a second engine')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Nookat uses OrbStack. Colima runs its own Linux VM next to it, with its own CPU, memory and disk.'
      )
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        'Colima is installed but not running. Starting it switches Nookat and docker commands in your terminal from OrbStack to Colima.'
      )
    ).toBeInTheDocument();
    expect(startRequests).toEqual([]);
  });

  it('says that starting Colima leaves Nookat on OrbStack when its profile does not switch the Docker context', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    mockBackend({
      connectedEngine: { beforeSwitch: ORBSTACK_ENGINE },
      activatesDockerContext: false,
    });
    render(<EngineSettings />);

    await user.click(await engineSection('Use Colima instead of OrbStack'));

    expect(
      await screen.findByText(
        'Colima is installed but not running. This Colima profile does not switch the Docker context when it starts, so Nookat and docker commands in your terminal stay on OrbStack until you switch them to Colima.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/Starting it switches/)).not.toBeInTheDocument();
  });

  it('says when it cannot tell which engine Nookat uses, and finds it on retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const identificationError = {
      current: 'Failed to get Docker info: connection reset' as string | null,
    };
    mockBackend({
      connectedEngine: { beforeSwitch: ORBSTACK_ENGINE },
      identificationError,
      otherEngineAnswers: true,
    });
    render(<EngineSettings />);

    expect(
      await screen.findByText(
        'Nookat could not tell which engine it is connected to: Failed to get Docker info: connection reset'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Nookat is not connected to an engine')
    ).not.toBeInTheDocument();
    expect(await engineSection('Engine Configuration')).toBeInTheDocument();

    identificationError.current = null;
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(
      await engineSection('Use Colima instead of OrbStack')
    ).toBeInTheDocument();
    expect(screen.getByText(/^Nookat is connected to/)).toHaveTextContent(
      'Nookat is connected to OrbStack at unix:///Users/me/.orbstack/run/docker.sock'
    );
    expect(
      screen.queryByRole('button', { name: 'Retry' })
    ).not.toBeInTheDocument();
  });

  it('keeps Colima management open when Nookat is connected to its own Colima', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockBackend({
      connectedEngine: { beforeSwitch: NOOKAT_COLIMA_ENGINE },
      profileStatus: 'Running',
    });
    render(<EngineSettings />);

    expect(await engineSection('Engine Configuration')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByText(/^Nookat is connected to/)).toHaveTextContent(
      'Nookat is connected to Colima at unix:///Users/me/.colima/default/docker.sock'
    );
    expect(
      screen.queryByText('Colima is a second engine')
    ).not.toBeInTheDocument();
  });

  it('says so when Nookat is not connected to any engine and offers Colima', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockBackend();
    render(<EngineSettings />);

    expect(
      await screen.findByText('Nookat is not connected to an engine')
    ).toBeInTheDocument();
    expect(await engineSection('Engine Configuration')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(
      await screen.findByText(
        'Colima is installed but the engine is not running. Start the engine to begin using Docker.'
      )
    ).toBeInTheDocument();
  });

  it('does not offer Colima instead of the engine on a platform without Colima', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockBackend({
      colimaSupported: false,
      connectedEngine: {
        beforeSwitch: {
          name: 'Docker Engine',
          endpoint: 'unix:///var/run/docker.sock',
          is_managed_colima: false,
        },
      },
      otherEngineAnswers: true,
    });
    render(<EngineSettings />);

    expect(await engineSection('Engine Configuration')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(
      screen.getByText('Engine management is available on macOS only')
    ).toBeInTheDocument();
    expect(screen.queryByText(/Use Colima instead/)).not.toBeInTheDocument();
  });

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

  it('installs the engine binaries on a Mac without Homebrew and offers to start the engine afterwards', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const { installRequests, startRequests } = mockBackend({
      homebrewAvailable: false,
      colimaInstalled: false,
      profileStatus: 'Missing',
    });
    render(<EngineSettings />);
    const install = await screen.findByRole('button', {
      name: 'Install Colima',
    });
    await waitFor(() => expect(install).toBeEnabled());

    await user.click(install);
    expect(installRequests).toEqual([{ method: 'Binary' }]);
    await act(() => emit('installation-complete'));

    const prompt = await screen.findByRole('dialog');
    expect(within(prompt).getByText('Start the engine?')).toBeInTheDocument();
    await user.click(
      within(prompt).getByRole('button', { name: 'Start Engine' })
    );

    expect(startRequests).toEqual([{ changes: {} }]);
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });

  it('warns that Nookat and terminal docker commands use OrbStack while Colima runs, and switches both to Colima', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const { contextSwitches } = mockBackend({
      connectedEngine: { beforeSwitch: ORBSTACK_ENGINE },
      profileStatus: 'Running',
      dockerContext: ORBSTACK_CONTEXT,
    });
    render(<EngineSettings />);
    await user.click(await engineSection('Use Colima instead of OrbStack'));

    expect(
      await screen.findByText(
        'Nookat and docker commands in your terminal use OrbStack'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'The current Docker context is "orbstack" (unix:///Users/me/.orbstack/run/docker.sock). Switch it to Colima to use this VM.'
      )
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Switch to Colima' }));

    expect(contextSwitches).toHaveLength(1);
  });

  it('names only the engine Nookat uses when the terminal context points somewhere else', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const { contextSwitches } = mockBackend({
      connectedEngine: {
        beforeSwitch: {
          ...ORBSTACK_ENGINE,
          endpoint: 'unix:///var/run/docker.sock',
        },
      },
      profileStatus: 'Running',
      dockerContext: {
        name: 'desktop-linux',
        host: 'unix:///Users/me/.docker/run/docker.sock',
        uses_colima: false,
      },
    });
    render(<EngineSettings />);
    await user.click(await engineSection('Use Colima instead of OrbStack'));

    expect(
      await screen.findByText('Nookat uses OrbStack, not Colima')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'The current Docker context is "desktop-linux" (unix:///Users/me/.docker/run/docker.sock). Switch it to Colima to use this VM.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/docker commands in your terminal use OrbStack/)
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Switch to Colima' }));

    expect(contextSwitches).toHaveLength(1);
  });

  it('warns that terminal docker commands reach another engine while Nookat uses Colima', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const { contextSwitches } = mockBackend({
      connectedEngine: { beforeSwitch: NOOKAT_COLIMA_ENGINE },
      profileStatus: 'Running',
      dockerContext: ORBSTACK_CONTEXT,
    });
    render(<EngineSettings />);

    expect(
      await screen.findByText(
        'docker commands in your terminal use another engine'
      )
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Use Colima for docker commands' })
    );

    expect(contextSwitches).toHaveLength(1);
  });

  it('shows the Colima engine in Engine Status once docker commands switch to it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    mockBackend({
      connectedEngine: {
        beforeSwitch: ORBSTACK_ENGINE,
        afterSwitch: NOOKAT_COLIMA_ENGINE,
      },
      profileStatus: 'Running',
      dockerContext: ORBSTACK_CONTEXT,
      operatingSystem: {
        beforeSwitch: 'OrbStack',
        afterSwitch: 'Ubuntu 24.04.3 LTS',
      },
    });
    render(<EngineSettings />);

    expect(
      await screen.findByText('OrbStack', { selector: 'div' })
    ).toBeInTheDocument();
    await user.click(await engineSection('Use Colima instead of OrbStack'));
    await user.click(
      await screen.findByRole('button', { name: 'Switch to Colima' })
    );

    expect(await screen.findByText('Ubuntu 24.04.3 LTS')).toBeInTheDocument();
    expect(screen.getByText(/^Nookat is connected to/)).toHaveTextContent(
      'Nookat is connected to Colima at unix:///Users/me/.colima/default/docker.sock'
    );
    expect(await engineSection('Engine Configuration')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('confirms when terminal docker commands already reach Colima', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockBackend({
      profileStatus: 'Running',
      dockerContext: {
        name: 'colima',
        host: 'unix:///Users/me/.colima/default/docker.sock',
        uses_colima: true,
      },
    });
    render(<EngineSettings />);

    expect(
      await screen.findByText(/docker commands in your terminal use Colima/)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Use Colima for docker commands' })
    ).not.toBeInTheDocument();
  });
});
