import { describe, expect, it } from 'vitest';
import { Container, ContainerState, PortTypeEnum } from '../container-types';
import { EngineState } from '../../../types/engine-state';
import {
  initialWizardState,
  WizardAction,
  wizardReducer,
  WizardForm,
} from './wizard-state';
import {
  invalidSteps,
  toCreateContainerSpec,
  validateWizard,
  wizardContext,
  WizardContext,
} from './wizard-validation';

const context: WizardContext = {
  localImages: ['nginx:1.27', 'redis:7'],
  containerNames: ['web'],
  publishedPorts: [
    { hostPort: 8080, protocol: 'tcp', hostIp: '0.0.0.0', container: 'proxy' },
  ],
  networks: ['backend', 'bridge', 'host', 'none'],
  volumes: ['pgdata'],
};

const form = (...actions: WizardAction[]): WizardForm =>
  actions.reduce(wizardReducer, initialWizardState()).form;

const withImage: WizardAction = {
  type: 'set',
  field: 'image',
  value: 'nginx:1.27',
};

const errorsOf = (
  wizardForm: WizardForm,
  step: keyof ReturnType<typeof validateWizard>
) => validateWizard(wizardForm, context)[step].errors;

describe('validateWizard', () => {
  it('needs a local image before anything else', () => {
    expect(errorsOf(form(), 'image')).toEqual({
      image: 'Choose an image to continue',
    });
    expect(
      errorsOf(
        form({ type: 'set', field: 'image', value: 'postgres:18' }),
        'image'
      )
    ).toEqual({
      image: 'postgres:18 is not on this machine yet; pull it first',
    });
    expect(errorsOf(form(withImage), 'image')).toEqual({});
  });

  it('accepts a freshly pulled image before the engine lists it', () => {
    const state = [
      { type: 'imagePulled', reference: 'postgres:18' } as const,
    ].reduce(wizardReducer, initialWizardState());

    expect(
      validateWizard(state.form, { ...context, localImages: ['postgres:18'] })
        .image.errors
    ).toEqual({});
  });

  it('checks the general settings', () => {
    const errors = errorsOf(
      form(
        withImage,
        { type: 'set', field: 'name', value: 'a' },
        { type: 'set', field: 'command', value: 'sh -c "echo' },
        { type: 'set', field: 'workingDir', value: 'app' },
        { type: 'set', field: 'restartPolicy', value: 'on-failure' },
        { type: 'set', field: 'maxRetries', value: '-1' },
        { type: 'set', field: 'autoRemove', value: true }
      ),
      'general'
    );

    expect(errors).toEqual({
      name: "Use at least two characters: letters, digits, '_', '.' or '-', starting with a letter or digit",
      command: 'Close the " quote',
      workingDir: 'Use an absolute path such as /app',
      maxRetries:
        'Enter a whole number of retries, or leave it empty for no limit',
      autoRemove: 'Auto-remove only works with the "No" restart policy',
    });
  });

  it('refuses a name another container already has', () => {
    expect(
      errorsOf(
        form(withImage, { type: 'set', field: 'name', value: 'web' }),
        'general'
      )
    ).toEqual({ name: 'A container named web already exists' });
  });

  it('checks each port mapping and ignores rows left blank', () => {
    const issues = validateWizard(
      form(
        withImage,
        { type: 'addRow', list: 'ports' },
        { type: 'addRow', list: 'ports' },
        {
          type: 'updateRow',
          list: 'ports',
          id: 2,
          patch: { containerPort: '70000', hostPort: '0', hostIp: 'localhost' },
        },
        { type: 'addRow', list: 'ports' },
        {
          type: 'updateRow',
          list: 'ports',
          id: 3,
          patch: { containerPort: '80', hostPort: '9090' },
        },
        { type: 'addRow', list: 'ports' },
        {
          type: 'updateRow',
          list: 'ports',
          id: 4,
          patch: { containerPort: '81', hostPort: '9090', hostIp: '127.0.0.1' },
        }
      ),
      context
    );

    expect(issues.ports.errors).toEqual({
      'ports.2.containerPort': 'Enter a port from 1 to 65535',
      'ports.2.hostPort':
        'Enter a port from 1 to 65535, or leave it empty for a random port',
      'ports.2.hostIp':
        'Enter an IP address such as 127.0.0.1, or leave it empty for all interfaces',
      'ports.4.hostPort':
        'Host port 9090/tcp is already used by another mapping',
    });
  });

  it('warns about a host port a running container already publishes', () => {
    const issues = validateWizard(
      form(
        withImage,
        { type: 'addRow', list: 'ports' },
        {
          type: 'updateRow',
          list: 'ports',
          id: 1,
          patch: { containerPort: '80', hostPort: '8080' },
        },
        { type: 'addRow', list: 'ports' },
        {
          type: 'updateRow',
          list: 'ports',
          id: 2,
          patch: { containerPort: '80', hostPort: '8080', protocol: 'udp' },
        }
      ),
      context
    );

    expect(issues.ports.errors).toEqual({});
    expect(issues.ports.warnings).toEqual({
      'ports.1.hostPort':
        'Running container proxy already publishes host port 8080/tcp',
    });
  });

  it('checks volume names, host paths and container paths', () => {
    const errors = errorsOf(
      form(
        withImage,
        { type: 'addRow', list: 'mounts' },
        {
          type: 'updateRow',
          list: 'mounts',
          id: 1,
          patch: { source: 'x', target: 'data' },
        },
        { type: 'addRow', list: 'mounts', fields: { kind: 'bind' } },
        {
          type: 'updateRow',
          list: 'mounts',
          id: 2,
          patch: { source: '~/site', target: '/' },
        },
        { type: 'addRow', list: 'mounts', fields: { kind: 'bind' } },
        {
          type: 'updateRow',
          list: 'mounts',
          id: 3,
          patch: { source: '/srv/site', target: '/www' },
        },
        { type: 'addRow', list: 'mounts' },
        {
          type: 'updateRow',
          list: 'mounts',
          id: 4,
          patch: { source: 'pgdata', target: '/www/' },
        },
        { type: 'addRow', list: 'mounts' }
      ),
      'storage'
    );

    expect(errors).toEqual({
      'mounts.1.source':
        "Volume names use at least two characters: letters, digits, '_', '.' or '-', starting with a letter or digit",
      'mounts.1.target': 'Enter an absolute container path such as /data',
      'mounts.2.source': 'Enter an absolute host path; ~ is not expanded',
      'mounts.2.target': 'The container path cannot be /',
      'mounts.4.target': 'Another mount already uses this container path',
    });
  });

  it('accepts Windows host paths for bind mounts', () => {
    expect(
      errorsOf(
        form(
          withImage,
          { type: 'addRow', list: 'mounts', fields: { kind: 'bind' } },
          {
            type: 'updateRow',
            list: 'mounts',
            id: 1,
            patch: { source: 'C:\\Users\\me\\site', target: '/site' },
          }
        ),
        'storage'
      )
    ).toEqual({});
  });

  it('checks environment variable names and label keys, once each', () => {
    const errors = errorsOf(
      form(
        withImage,
        { type: 'addRow', list: 'env' },
        { type: 'updateRow', list: 'env', id: 1, patch: { key: 'MODE' } },
        { type: 'addRow', list: 'env' },
        { type: 'updateRow', list: 'env', id: 2, patch: { key: '1ST' } },
        { type: 'addRow', list: 'env' },
        {
          type: 'updateRow',
          list: 'env',
          id: 3,
          patch: { key: ' MODE ', value: 'again' },
        },
        { type: 'addRow', list: 'env' },
        { type: 'updateRow', list: 'env', id: 4, patch: { value: 'orphan' } },
        { type: 'addRow', list: 'labels' },
        { type: 'updateRow', list: 'labels', id: 5, patch: { key: 'a=b' } }
      ),
      'environment'
    );

    expect(errors).toEqual({
      'env.2.key':
        "Names start with a letter or '_' and use only letters, digits, '_', '.' or '-'",
      'env.3.key': 'MODE is already set above',
      'env.4.key':
        "Names start with a letter or '_' and use only letters, digits, '_', '.' or '-'",
      'labels.5.key': "Keys cannot be empty or contain '=' or spaces",
    });
  });

  it('checks resource limits and ports on networks that cannot publish them', () => {
    const errors = errorsOf(
      form(
        withImage,
        { type: 'addRow', list: 'ports' },
        {
          type: 'updateRow',
          list: 'ports',
          id: 1,
          patch: { containerPort: '80' },
        },
        { type: 'set', field: 'network', value: 'host' },
        { type: 'set', field: 'cpus', value: '0' },
        { type: 'set', field: 'memory', value: '1.5' }
      ),
      'network'
    );

    expect(errors).toEqual({
      network:
        'Port mappings cannot be used with the host network; remove them in the Ports step',
      cpus: 'Enter a number of CPUs from 0.01 to 1024, or leave it empty for no limit',
      memory: 'Use a whole number of MiB',
    });
  });

  it('bounds the memory limit after converting GiB to MiB', () => {
    const memory = (value: string, unit: 'MiB' | 'GiB') =>
      errorsOf(
        form(
          withImage,
          { type: 'set', field: 'memory', value },
          { type: 'set', field: 'memoryUnit', value: unit }
        ),
        'network'
      );

    expect(memory('5', 'MiB')).toEqual({
      memory:
        'Enter a memory limit from 6 MiB to 1 TiB, or leave it empty for no limit',
    });
    expect(memory('1.5', 'GiB')).toEqual({});
    expect(memory('1025', 'GiB')).toEqual({
      memory:
        'Enter a memory limit from 6 MiB to 1 TiB, or leave it empty for no limit',
    });
  });

  it('lists the steps that still have errors in wizard order', () => {
    const issues = validateWizard(
      form({ type: 'set', field: 'cpus', value: 'lots' }),
      context
    );

    expect(invalidSteps(issues)).toEqual(['image', 'network']);
  });
});

describe('toCreateContainerSpec', () => {
  it('sends only what the user set, trimmed, with blank rows left out', () => {
    const spec = toCreateContainerSpec(
      form(
        withImage,
        { type: 'set', field: 'name', value: ' web-2 ' },
        { type: 'set', field: 'command', value: `sh -c "echo hi"` },
        { type: 'set', field: 'entrypoint', value: ' /docker-entrypoint.sh ' },
        { type: 'set', field: 'workingDir', value: '/srv' },
        { type: 'set', field: 'restartPolicy', value: 'on-failure' },
        { type: 'set', field: 'maxRetries', value: '3' },
        { type: 'addRow', list: 'ports' },
        {
          type: 'updateRow',
          list: 'ports',
          id: 1,
          patch: { containerPort: '80', hostPort: '8081', hostIp: '127.0.0.1' },
        },
        { type: 'addRow', list: 'ports' },
        { type: 'addRow', list: 'mounts' },
        {
          type: 'updateRow',
          list: 'mounts',
          id: 3,
          patch: { source: 'pgdata', target: '/data', readOnly: true },
        },
        { type: 'addRow', list: 'env' },
        {
          type: 'updateRow',
          list: 'env',
          id: 4,
          patch: { key: 'GREETING', value: ' hello ' },
        },
        { type: 'addRow', list: 'labels' },
        { type: 'set', field: 'network', value: 'backend' },
        { type: 'set', field: 'cpus', value: '0.5' },
        { type: 'set', field: 'memory', value: '2' },
        { type: 'set', field: 'memoryUnit', value: 'GiB' }
      )
    );

    expect(spec).toEqual({
      image: 'nginx:1.27',
      name: 'web-2',
      command: ['sh', '-c', 'echo hi'],
      entrypoint: '/docker-entrypoint.sh',
      working_dir: '/srv',
      restart_policy: { name: 'on-failure', maximum_retry_count: 3 },
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
        { kind: 'volume', source: 'pgdata', target: '/data', read_only: true },
      ],
      env: [{ key: 'GREETING', value: ' hello ' }],
      labels: [],
      network: 'backend',
      cpus: 0.5,
      memory_mb: 2048,
    });
  });

  it('leaves everything optional unset for an image-only container', () => {
    expect(toCreateContainerSpec(form(withImage))).toEqual({
      image: 'nginx:1.27',
      name: null,
      command: null,
      entrypoint: null,
      working_dir: null,
      restart_policy: { name: 'no' },
      auto_remove: false,
      ports: [],
      mounts: [],
      env: [],
      labels: [],
      network: null,
      cpus: null,
      memory_mb: null,
    });
  });
});

describe('wizardContext', () => {
  const container = (overrides: Partial<Container>): Container => ({
    id: 'c1',
    names: ['/proxy'],
    state: ContainerState.Running,
    ports: [],
    ...overrides,
  });

  it('collects what the wizard checks against from the engine state', () => {
    const engineState: EngineState = {
      containers: {
        c1: container({
          ports: [
            {
              ip: '0.0.0.0',
              private_port: 80,
              public_port: 8080,
              port_type: PortTypeEnum.Tcp,
            },
            { private_port: 9000, port_type: PortTypeEnum.Tcp },
          ],
        }),
        c2: container({
          id: 'c2',
          names: ['/stopped'],
          state: ContainerState.Exited,
          ports: [{ private_port: 81, public_port: 8081 }],
        }),
      },
      images: {
        a: {
          id: 'a',
          repository: 'redis',
          tag: '7',
          image_id: 'a',
          created: 0,
          size: 0,
          in_use: false,
          dangling: false,
        },
        b: {
          id: 'b',
          repository: '<untagged>@b',
          tag: null,
          image_id: 'b',
          created: 0,
          size: 0,
          in_use: false,
          dangling: true,
        },
      },
      volumes: {
        pgdata: {
          name: 'pgdata',
          driver: 'local',
          mountpoint: '/var/lib/docker/volumes/pgdata',
          labels: {},
          options: {},
          in_use: false,
        },
      },
      networks: {
        n1: {
          id: 'n1',
          name: 'backend',
          driver: 'bridge',
          scope: 'local',
          in_use: false,
          internal: false,
          ipam: {},
        },
      },
      engine_status: { Running: 'Docker' },
      version: 1,
      last_updated: '2026-01-01T00:00:00Z',
    };

    expect(wizardContext(engineState, ['nginx:1.27'])).toEqual({
      localImages: ['nginx:1.27', 'redis:7'],
      containerNames: ['proxy', 'stopped'],
      publishedPorts: [
        {
          hostPort: 8080,
          protocol: 'tcp',
          hostIp: '0.0.0.0',
          container: 'proxy',
        },
      ],
      networks: ['backend'],
      volumes: ['pgdata'],
    });
  });

  it('is empty before the first engine snapshot arrives', () => {
    expect(wizardContext(null, [])).toEqual({
      localImages: [],
      containerNames: [],
      publishedPorts: [],
      networks: [],
      volumes: [],
    });
  });
});
