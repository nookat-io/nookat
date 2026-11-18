import {
  CreateContainerSpec,
  PortMapping,
  RestartPolicy,
  StorageMount,
} from './create-container-types';
import { shellQuote } from './shell-words';

const NEEDS_CSV_QUOTES = /[",\r\n]/;

function restartValue(policy: RestartPolicy): string {
  if (policy.name === 'on-failure' && policy.maximum_retry_count !== null) {
    return `on-failure:${policy.maximum_retry_count}`;
  }
  return policy.name;
}

export function hostAddress(ip: string): string {
  return ip.includes(':') ? `[${ip}]` : ip;
}

function portMapping(port: PortMapping): string {
  if (port.host_ip) {
    const hostPort = port.host_port ?? '';
    return `${hostAddress(port.host_ip)}:${hostPort}:${port.container_port}`;
  }
  if (port.host_port !== null) {
    return `${port.host_port}:${port.container_port}`;
  }
  return String(port.container_port);
}

function publishValue(port: PortMapping): string {
  const mapping = portMapping(port);
  return port.protocol === 'tcp' ? mapping : `${mapping}/${port.protocol}`;
}

function csvField(field: string): string {
  return NEEDS_CSV_QUOTES.test(field)
    ? `"${field.replace(/"/g, '""')}"`
    : field;
}

function mountValue(mount: StorageMount): string {
  const fields = [
    `type=${mount.kind}`,
    `source=${mount.source}`,
    `target=${mount.target}`,
    ...(mount.read_only ? ['readonly'] : []),
  ];
  return fields.map(csvField).join(',');
}

export function dockerRunArguments(
  spec: CreateContainerSpec,
  start: boolean
): string[] {
  const args = start ? ['docker', 'run', '-d'] : ['docker', 'create'];

  if (spec.name) {
    args.push('--name', spec.name);
  }
  if (spec.auto_remove) {
    args.push('--rm');
  }
  if (spec.restart_policy.name !== 'no') {
    args.push('--restart', restartValue(spec.restart_policy));
  }
  spec.ports.forEach(port => args.push('-p', publishValue(port)));
  spec.mounts.forEach(mount => args.push('--mount', mountValue(mount)));
  spec.env.forEach(({ key, value }) => args.push('-e', `${key}=${value}`));
  spec.labels.forEach(({ key, value }) =>
    args.push('--label', `${key}=${value}`)
  );
  if (spec.network) {
    args.push('--network', spec.network);
  }
  if (spec.cpus !== null) {
    args.push('--cpus', String(spec.cpus));
  }
  if (spec.memory_mb !== null) {
    args.push('--memory', `${spec.memory_mb}m`);
  }
  if (spec.working_dir) {
    args.push('-w', spec.working_dir);
  }
  if (spec.entrypoint) {
    args.push('--entrypoint', spec.entrypoint);
  }
  args.push(spec.image, ...(spec.command ?? []));

  return args;
}

export function dockerRunCommand(
  spec: CreateContainerSpec,
  start: boolean
): string {
  return dockerRunArguments(spec, start).map(shellQuote).join(' ');
}
