import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EngineProvider } from '../../../lib/engine-provider';
import { EngineState } from '../../../types/engine-state';
import { Image } from '../../images/image-types';
import { ContainerState, PortTypeEnum } from '../container-types';
import { CreateContainerDialog } from './create-container-dialog';

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}));
vi.mock('sonner', () => ({ toast }));

type Handler = (args: Record<string, unknown>) => unknown;

const image = (id: string, repository: string, tag: string): Image => ({
  id,
  repository,
  tag,
  image_id: id,
  created: 1_700_000_000,
  size: 50 * 1024 * 1024,
  in_use: false,
  dangling: false,
});

const network = (name: string) => ({
  id: name,
  name,
  driver: 'bridge',
  scope: 'local',
  containers: 0,
  internal: false,
  ipam: {},
});

const snapshot: EngineState = {
  containers: {
    c1: {
      id: 'c1',
      names: ['/proxy'],
      state: ContainerState.Running,
      ports: [
        {
          ip: '0.0.0.0',
          private_port: 80,
          public_port: 8080,
          port_type: PortTypeEnum.Tcp,
        },
      ],
    },
  },
  images: {
    a: image('a', 'nginx', '1.27'),
    b: image('b', 'redis', '7'),
  },
  volumes: {
    pgdata: {
      name: 'pgdata',
      driver: 'local',
      mountpoint: '/var/lib/docker/volumes/pgdata/_data',
      labels: {},
      options: {},
    },
  },
  networks: {
    bridge: network('bridge'),
    backend: network('backend'),
    host: network('host'),
    none: network('none'),
  },
  engine_status: { Running: 'Docker' },
  version: 1,
  last_updated: '2026-01-01T00:00:00Z',
};

function renderWizard(handlers: Record<string, Handler> = {}) {
  const calls: { cmd: string; args: Record<string, unknown> }[] = [];
  mockIPC(
    (cmd, args) => {
      const payload = (args ?? {}) as Record<string, unknown>;
      switch (cmd) {
        case 'engine_status':
          return { Running: 'Docker' };
        case 'get_docker_info':
          return {};
        case 'start_engine_state_monitoring':
          return null;
        case 'get_engine_state':
          return snapshot;
      }
      const handler = handlers[cmd];
      if (!handler) {
        throw new Error(`Unexpected command ${cmd}`);
      }
      calls.push({ cmd, args: payload });
      return handler(payload);
    },
    { shouldMockEvents: true }
  );
  const user = userEvent.setup();
  render(
    <EngineProvider>
      <CreateContainerDialog />
    </EngineProvider>
  );
  return { user, calls };
}

const created = () => ({
  id: 'f00dcafe1234567890',
  started: true,
  warnings: [],
});

async function openWizard(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Create Container' }));
  return screen.findByRole('dialog', { name: 'Create Container' });
}

async function chooseImage(
  user: ReturnType<typeof userEvent.setup>,
  reference: string
) {
  await user.click(
    await screen.findByRole('button', { name: new RegExp(reference) })
  );
}

const nextButton = () => screen.getByRole('button', { name: /^Next/ });

async function pickOption(
  user: ReturnType<typeof userEvent.setup>,
  combobox: string,
  option: string
) {
  await user.click(screen.getByRole('combobox', { name: combobox }));
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('CreateContainerDialog', () => {
  beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.releasePointerCapture = () => {};
    Element.prototype.scrollIntoView = () => {};
  });

  beforeEach(() => {
    toast.success.mockClear();
    toast.error.mockClear();
    toast.warning.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('keeps Next disabled until a local image is chosen', async () => {
    const { user } = renderWizard();
    await openWizard(user);

    expect(nextButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'General' })).toBeDisabled();

    await chooseImage(user, 'nginx:1.27');

    expect(
      screen.getByRole('button', { name: /nginx:1.27/, pressed: true })
    ).toBeInTheDocument();
    expect(nextButton()).toBeEnabled();
  });

  it('blocks moving on while a step has an error and says why', async () => {
    const { user } = renderWizard();
    await openWizard(user);
    await chooseImage(user, 'nginx:1.27');
    await user.click(nextButton());

    await user.type(screen.getByLabelText('Name'), 'proxy');

    expect(
      screen.getByText('A container named proxy already exists')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(nextButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled();

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'nookat-e2e-web');

    expect(nextButton()).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Review' }));
    expect(screen.getByRole('heading', { name: 'Review' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(
      screen.getByRole('heading', { name: 'Network and resources' })
    ).toBeInTheDocument();
  });

  it('sends exactly what was configured and confirms the new container', async () => {
    const { user, calls } = renderWizard({ create_container: created });
    const dialog = await openWizard(user);

    await chooseImage(user, 'nginx:1.27');
    await user.click(nextButton());

    await user.type(screen.getByLabelText('Name'), 'nookat-e2e-web');
    await user.type(screen.getByLabelText('Command'), 'sh -c "echo hi"');
    await pickOption(user, 'Restart policy', 'Unless stopped');
    await user.click(nextButton());

    await user.click(screen.getByRole('button', { name: 'Add port' }));
    await user.type(screen.getByLabelText('Container port 1'), '80');
    await user.type(screen.getByLabelText('Host port 1'), '8081');
    await user.type(screen.getByLabelText('Host IP 1'), '127.0.0.1');
    await user.click(nextButton());

    await user.click(screen.getByRole('button', { name: 'Add volume' }));
    await user.type(screen.getByLabelText('Volume 1'), 'nookat-e2e-data');
    await user.type(screen.getByLabelText('Container path 1'), '/data');
    expect(
      screen.getByText('New volume. Docker creates it with the container.')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add bind mount' }));
    await user.type(screen.getByLabelText('Host path 2'), '/Users/me/site');
    await user.type(screen.getByLabelText('Container path 2'), '/site');
    await user.click(
      within(screen.getByRole('group', { name: 'Mount 2' })).getByRole(
        'checkbox',
        { name: 'Read-only' }
      )
    );
    await user.click(nextButton());

    await user.click(screen.getByRole('button', { name: 'Paste .env' }));
    await user.type(
      screen.getByLabelText('Pasted .env content'),
      "MODE=dev{enter}export TOKEN='a b'"
    );
    await user.click(screen.getByRole('button', { name: 'Import variables' }));
    await user.click(screen.getByRole('button', { name: 'Add label' }));
    await user.type(screen.getByLabelText('Label 1 key'), 'io.nookat.e2e');
    await user.type(screen.getByLabelText('Label 1 value'), 'wizard');
    await user.click(nextButton());

    await pickOption(user, 'Network', 'backend');
    await user.type(screen.getByLabelText('CPU limit'), '0.5');
    await user.type(screen.getByLabelText('Memory limit'), '256');
    await user.click(nextButton());

    await user.click(screen.getByRole('button', { name: 'Create and start' }));

    expect(calls).toEqual([
      {
        cmd: 'create_container',
        args: {
          start: true,
          spec: {
            image: 'nginx:1.27',
            name: 'nookat-e2e-web',
            command: ['sh', '-c', 'echo hi'],
            entrypoint: null,
            working_dir: null,
            restart_policy: { name: 'unless-stopped' },
            auto_remove: false,
            ports: [
              {
                container_port: 80,
                protocol: 'tcp',
                host_port: 8081,
                host_ip: '127.0.0.1',
              },
            ],
            mounts: [
              {
                kind: 'volume',
                source: 'nookat-e2e-data',
                target: '/data',
                read_only: false,
              },
              {
                kind: 'bind',
                source: '/Users/me/site',
                target: '/site',
                read_only: true,
              },
            ],
            env: [
              { key: 'MODE', value: 'dev' },
              { key: 'TOKEN', value: 'a b' },
            ],
            labels: [{ key: 'io.nookat.e2e', value: 'wizard' }],
            network: 'backend',
            cpus: 0.5,
            memory_mb: 256,
          },
        },
      },
    ]);
    expect(toast.success).toHaveBeenCalledWith(
      'Created and started container nookat-e2e-web'
    );
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  });

  it('shows the equivalent docker command and copies it', async () => {
    const { user } = renderWizard();
    await openWizard(user);
    await chooseImage(user, 'redis:7');
    await user.click(nextButton());
    await user.type(screen.getByLabelText('Name'), 'nookat-e2e-cache');
    await user.click(screen.getByRole('button', { name: 'Ports' }));
    await user.click(screen.getByRole('button', { name: 'Add port' }));
    await user.type(screen.getByLabelText('Container port 1'), '6379');
    await user.click(screen.getByRole('button', { name: 'Environment' }));
    await user.click(screen.getByRole('button', { name: 'Add variable' }));
    await user.type(screen.getByLabelText('Variable 1 name'), 'GREETING');
    await user.type(screen.getByLabelText('Variable 1 value'), "it's me");
    await user.click(screen.getByRole('button', { name: 'Review' }));

    const command = screen.getByLabelText('Equivalent docker command');
    expect(command).toHaveTextContent(
      `docker run -d --name nookat-e2e-cache -p 6379 -e 'GREETING=it'\\''s me' redis:7`
    );

    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await navigator.clipboard.readText()).toBe(command.textContent);
    expect(toast.success).toHaveBeenCalledWith('Copied the docker command');

    await user.click(
      screen.getByRole('switch', {
        name: 'Start the container after creating it',
      })
    );
    expect(command).toHaveTextContent(
      /^docker create --name nookat-e2e-cache /
    );
    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
  });

  it('keeps the wizard open with the reason Docker gives when it refuses the container', async () => {
    const reason =
      'Conflict. The container name "/nookat-e2e-web" is already in use';
    const { user } = renderWizard({
      create_container: () =>
        Promise.reject({ kind: 'not_created', message: reason }),
    });
    const dialog = await openWizard(user);
    await chooseImage(user, 'nginx:1.27');
    await user.click(screen.getByRole('button', { name: 'Review' }));

    await user.click(screen.getByRole('button', { name: 'Create and start' }));

    expect(toast.error).toHaveBeenCalledWith(
      `Failed to create container: ${reason}`
    );
    expect(within(dialog).getByRole('alert')).toHaveTextContent(reason);
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create and start' })
    ).toBeEnabled();
  });

  it('explains a container that was created but could not start', async () => {
    const { user } = renderWizard({
      create_container: () =>
        Promise.reject({
          kind: 'not_started',
          message: 'Bind for 0.0.0.0:8081 failed: port is already allocated',
          removed: true,
        }),
    });
    await openWizard(user);
    await chooseImage(user, 'nginx:1.27');
    await user.click(screen.getByRole('button', { name: 'Review' }));

    await user.click(screen.getByRole('button', { name: 'Create and start' }));

    expect(toast.error).toHaveBeenCalledWith(
      'The container was created but could not start: Bind for 0.0.0.0:8081 failed: port is already allocated. Nookat removed it again, so you can adjust the settings and try again.'
    );
  });

  it('pulls an image that is not local through the pull command and selects it', async () => {
    const { user, calls } = renderWizard({ pull_image: () => null });
    await openWizard(user);

    await user.type(
      screen.getByRole('textbox', { name: 'Image' }),
      'busybox:1.37'
    );
    expect(nextButton()).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Pull busybox:1.37' }));

    expect(calls).toEqual([
      {
        cmd: 'pull_image',
        args: { imageName: 'busybox', tag: '1.37', registry: 'docker.io' },
      },
    ]);
    expect(toast.success).toHaveBeenCalledWith('Pulled busybox:1.37');
    expect(
      screen.getByRole('button', { name: /busybox:1.37/, pressed: true })
    ).toBeInTheDocument();
    expect(nextButton()).toBeEnabled();
  });

  it('reports a failed pull and keeps the image unselected', async () => {
    const { user } = renderWizard({
      pull_image: () =>
        Promise.reject('Failed to pull image busybox:9: manifest unknown'),
    });
    await openWizard(user);

    await user.type(
      screen.getByRole('textbox', { name: 'Image' }),
      'busybox:9'
    );
    await user.click(screen.getByRole('button', { name: 'Pull busybox:9' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to pull busybox:9: Failed to pull image busybox:9: manifest unknown'
    );
    expect(screen.getByText('No image selected yet')).toBeInTheDocument();
    expect(nextButton()).toBeDisabled();
  });

  it('warns about a host port a running container already publishes, without blocking', async () => {
    const { user } = renderWizard();
    await openWizard(user);
    await chooseImage(user, 'nginx:1.27');
    await user.click(screen.getByRole('button', { name: 'Ports' }));
    await user.click(screen.getByRole('button', { name: 'Add port' }));
    await user.type(screen.getByLabelText('Container port 1'), '80');
    await user.type(screen.getByLabelText('Host port 1'), '8080');

    expect(
      screen.getByText(
        'Running container proxy already publishes host port 8080/tcp'
      )
    ).toBeInTheDocument();
    expect(nextButton()).toBeEnabled();
  });
});
