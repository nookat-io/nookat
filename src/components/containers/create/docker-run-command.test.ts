import { describe, expect, it } from 'vitest';
import { CreateContainerSpec } from './create-container-types';
import { dockerRunCommand } from './docker-run-command';
import { splitShellWords } from './shell-words';

const spec = (
  overrides: Partial<CreateContainerSpec>
): CreateContainerSpec => ({
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
  ...overrides,
});

describe('dockerRunCommand', () => {
  it('runs the image detached when the container starts after creating', () => {
    expect(dockerRunCommand(spec({}), true)).toBe('docker run -d nginx:1.27');
  });

  it('only creates the container when it does not start', () => {
    expect(dockerRunCommand(spec({}), false)).toBe('docker create nginx:1.27');
  });

  it('writes every setting as the matching docker flag', () => {
    const command = dockerRunCommand(
      spec({
        name: 'web',
        restart_policy: { name: 'on-failure', maximum_retry_count: 3 },
        ports: [
          {
            container_port: 80,
            protocol: 'tcp',
            host_port: 8080,
            host_ip: null,
          },
          {
            container_port: 53,
            protocol: 'udp',
            host_port: null,
            host_ip: '127.0.0.1',
          },
          {
            container_port: 443,
            protocol: 'tcp',
            host_port: 8443,
            host_ip: '::1',
          },
          {
            container_port: 9000,
            protocol: 'tcp',
            host_port: null,
            host_ip: null,
          },
        ],
        mounts: [
          {
            kind: 'volume',
            source: 'pgdata',
            target: '/var/lib/data',
            read_only: false,
          },
          {
            kind: 'bind',
            source: '/Users/me/my site',
            target: '/usr/share/nginx/html',
            read_only: true,
          },
        ],
        env: [
          { key: 'MODE', value: 'dev' },
          { key: 'GREETING', value: "it's here" },
        ],
        labels: [{ key: 'com.example.team', value: 'web' }],
        network: 'backend',
        cpus: 1.5,
        memory_mb: 512,
        working_dir: '/srv',
        entrypoint: '/bin/sh',
        command: ['-c', 'echo $HOME'],
      }),
      true
    );

    expect(command).toBe(
      [
        'docker run -d',
        '--name web',
        '--restart on-failure:3',
        '-p 8080:80',
        '-p 127.0.0.1::53/udp',
        "-p '[::1]:8443:443'",
        '-p 9000',
        '--mount type=volume,source=pgdata,target=/var/lib/data',
        "--mount 'type=bind,source=/Users/me/my site,target=/usr/share/nginx/html,readonly'",
        '-e MODE=dev',
        `-e 'GREETING=it'\\''s here'`,
        '--label com.example.team=web',
        '--network backend',
        '--cpus 1.5',
        '--memory 512m',
        '-w /srv',
        '--entrypoint /bin/sh',
        'nginx:1.27',
        "-c 'echo $HOME'",
      ].join(' ')
    );
  });

  it('adds --rm and plain restart policies by name', () => {
    expect(dockerRunCommand(spec({ auto_remove: true }), true)).toBe(
      'docker run -d --rm nginx:1.27'
    );
    expect(
      dockerRunCommand(
        spec({ restart_policy: { name: 'unless-stopped' } }),
        true
      )
    ).toBe('docker run -d --restart unless-stopped nginx:1.27');
    expect(
      dockerRunCommand(
        spec({
          restart_policy: { name: 'on-failure', maximum_retry_count: null },
        }),
        true
      )
    ).toBe('docker run -d --restart on-failure nginx:1.27');
  });

  it('quotes mount fields that contain a comma or a double quote the way docker reads them', () => {
    const command = dockerRunCommand(
      spec({
        mounts: [
          {
            kind: 'bind',
            source: '/srv/a,b "c"',
            target: '/data',
            read_only: false,
          },
        ],
      }),
      true
    );

    expect(splitShellWords(command)).toEqual({
      words: [
        'docker',
        'run',
        '-d',
        '--mount',
        'type=bind,"source=/srv/a,b ""c""",target=/data',
        'nginx:1.27',
      ],
    });
  });

  it('keeps an empty environment value as an explicit assignment', () => {
    expect(
      dockerRunCommand(spec({ env: [{ key: 'EMPTY', value: '' }] }), true)
    ).toBe('docker run -d -e EMPTY= nginx:1.27');
  });
});
