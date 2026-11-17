import { EngineState } from '../../../types/engine-state';
import { ContainerState } from '../container-types';
import {
  CreateContainerSpec,
  PORT_PROTOCOLS,
  PortProtocol,
  RestartPolicy,
} from './create-container-types';
import { PortTypeEnum } from '../container-types';
import { localImageReference } from './image-reference';
import { splitShellWords } from './shell-words';
import {
  isBlankKeyValue,
  isBlankMount,
  isBlankPort,
  KeyValueRow,
  MemoryUnit,
  PortRow,
  RowList,
  StepId,
  WIZARD_STEPS,
  WizardForm,
} from './wizard-state';

export interface PublishedPort {
  hostPort: number;
  protocol: PortProtocol;
  hostIp: string;
  container: string;
}

export interface WizardContext {
  localImages: string[];
  containerNames: string[];
  publishedPorts: PublishedPort[];
  networks: string[];
  volumes: string[];
}

export interface StepIssues {
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export type WizardIssues = Record<StepId, StepIssues>;

export const MIN_CPUS = 0.01;
export const MAX_CPUS = 1024;
export const MIN_MEMORY_MB = 6;
export const MAX_MEMORY_MB = 1024 * 1024;
const MAX_RETRY_COUNT = 4_294_967_295;
const NETWORKS_WITHOUT_PORTS = ['host', 'none'];

const DOCKER_OBJECT_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/;
const ENV_KEY = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
const WHOLE_NUMBER = /^\d+$/;
const DECIMAL_NUMBER = /^(\d+(\.\d*)?|\.\d+)$/;
const IPV4 =
  /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const ABSOLUTE_HOST_PATH = /^(\/|[A-Za-z]:[\\/]|\\\\)/;
const UNSPECIFIED_IPS = ['', '0.0.0.0', '::'];

const DOCKER_NAME_RULE =
  "at least two characters: letters, digits, '_', '.' or '-', starting with a letter or digit";

export const rowField = (list: RowList, id: number, field: string) =>
  `${list}.${id}.${field}`;

const isIpAddress = (value: string) => {
  if (IPV4.test(value)) {
    return true;
  }
  if (!value.includes(':')) {
    return false;
  }
  try {
    new URL(`http://[${value}]/`);
    return true;
  } catch {
    return false;
  }
};

const parsePort = (value: string): number | null => {
  const trimmed = value.trim();
  const port = Number(trimmed);
  return WHOLE_NUMBER.test(trimmed) && port >= 1 && port <= 65535 ? port : null;
};

const parseDecimal = (value: string): number | null =>
  DECIMAL_NUMBER.test(value.trim()) ? Number(value.trim()) : null;

const hostIpsOverlap = (a: string, b: string) =>
  UNSPECIFIED_IPS.includes(a.trim()) ||
  UNSPECIFIED_IPS.includes(b.trim()) ||
  a.trim() === b.trim();

function memoryInMb(memory: string, unit: MemoryUnit): number | null {
  const amount = parseDecimal(memory);
  if (amount === null) {
    return null;
  }
  return unit === 'GiB' ? Math.round(amount * 1024) : amount;
}

const filledPorts = (form: WizardForm) =>
  form.ports.filter(row => !isBlankPort(row));

const filledMounts = (form: WizardForm) =>
  form.mounts.filter(row => !isBlankMount(row));

const filledPairs = (rows: KeyValueRow[]) =>
  rows.filter(row => !isBlankKeyValue(row));

function imageIssues(form: WizardForm, context: WizardContext): StepIssues {
  const image = form.image.trim();
  const errors: Record<string, string> = {};
  if (!image) {
    errors.image = 'Choose an image to continue';
  } else if (!context.localImages.includes(image)) {
    errors.image = `${image} is not on this machine yet; pull it first`;
  }
  return { errors, warnings: {} };
}

function generalIssues(form: WizardForm, context: WizardContext): StepIssues {
  const errors: Record<string, string> = {};
  const name = form.name.trim();
  if (name && !DOCKER_OBJECT_NAME.test(name)) {
    errors.name = `Use ${DOCKER_NAME_RULE}`;
  } else if (name && context.containerNames.includes(name)) {
    errors.name = `A container named ${name} already exists`;
  }

  const command = splitShellWords(form.command);
  if ('error' in command) {
    errors.command = command.error;
  }

  const workingDir = form.workingDir.trim();
  if (workingDir && !workingDir.startsWith('/')) {
    errors.workingDir = 'Use an absolute path such as /app';
  }

  const maxRetries = form.maxRetries.trim();
  const retriesAreValid =
    WHOLE_NUMBER.test(maxRetries) && Number(maxRetries) <= MAX_RETRY_COUNT;
  if (form.restartPolicy === 'on-failure' && maxRetries && !retriesAreValid) {
    errors.maxRetries =
      'Enter a whole number of retries, or leave it empty for no limit';
  }

  if (form.autoRemove && form.restartPolicy !== 'no') {
    errors.autoRemove = 'Auto-remove only works with the "No" restart policy';
  }
  return { errors, warnings: {} };
}

function publishesTheSameHostPort(a: PortRow, b: PortRow) {
  const hostPort = parsePort(a.hostPort);
  return (
    hostPort !== null &&
    hostPort === parsePort(b.hostPort) &&
    a.protocol === b.protocol &&
    hostIpsOverlap(a.hostIp, b.hostIp)
  );
}

function portIssues(form: WizardForm, context: WizardContext): StepIssues {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  const ports = filledPorts(form);

  ports.forEach((row, index) => {
    const field = (name: string) => rowField('ports', row.id, name);
    const hostPort = parsePort(row.hostPort);

    if (parsePort(row.containerPort) === null) {
      errors[field('containerPort')] = 'Enter a port from 1 to 65535';
    }
    if (row.hostPort.trim() && hostPort === null) {
      errors[field('hostPort')] =
        'Enter a port from 1 to 65535, or leave it empty for a random port';
    } else if (
      ports.slice(0, index).some(other => publishesTheSameHostPort(other, row))
    ) {
      errors[field('hostPort')] =
        `Host port ${hostPort}/${row.protocol} is already used by another mapping`;
    }
    if (row.hostIp.trim() && !isIpAddress(row.hostIp.trim())) {
      errors[field('hostIp')] =
        'Enter an IP address such as 127.0.0.1, or leave it empty for all interfaces';
    }

    const publisher = context.publishedPorts.find(
      published =>
        published.hostPort === hostPort &&
        published.protocol === row.protocol &&
        hostIpsOverlap(published.hostIp, row.hostIp)
    );
    if (publisher && !errors[field('hostPort')]) {
      warnings[field('hostPort')] =
        `Running container ${publisher.container} already publishes host port ${hostPort}/${row.protocol}`;
    }
  });
  return { errors, warnings };
}

const sameContainerPath = (a: string, b: string) =>
  a.trim().replace(/\/+$/, '') === b.trim().replace(/\/+$/, '');

function storageIssues(form: WizardForm): StepIssues {
  const errors: Record<string, string> = {};
  const mounts = filledMounts(form);

  mounts.forEach((row, index) => {
    const field = (name: string) => rowField('mounts', row.id, name);
    const source = row.source.trim();
    const target = row.target.trim();

    if (row.kind === 'volume' && !DOCKER_OBJECT_NAME.test(source)) {
      errors[field('source')] = `Volume names use ${DOCKER_NAME_RULE}`;
    } else if (row.kind === 'bind' && source.startsWith('~')) {
      errors[field('source')] =
        'Enter an absolute host path; ~ is not expanded';
    } else if (row.kind === 'bind' && !ABSOLUTE_HOST_PATH.test(source)) {
      errors[field('source')] =
        'Enter an absolute host path such as /Users/me/project';
    }

    if (target === '/') {
      errors[field('target')] = 'The container path cannot be /';
    } else if (!target.startsWith('/')) {
      errors[field('target')] =
        'Enter an absolute container path such as /data';
    } else if (
      mounts
        .slice(0, index)
        .some(other => sameContainerPath(other.target, target))
    ) {
      errors[field('target')] =
        'Another mount already uses this container path';
    }
  });
  return { errors, warnings: {} };
}

function keyIssues(
  list: 'env' | 'labels',
  rows: KeyValueRow[],
  isValidKey: (key: string) => boolean,
  invalidMessage: string
): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  filledPairs(rows).forEach(row => {
    const key = row.key.trim();
    const field = rowField(list, row.id, 'key');
    if (!isValidKey(key)) {
      errors[field] = invalidMessage;
    } else if (seen.has(key)) {
      errors[field] = `${key} is already set above`;
    }
    seen.add(key);
  });
  return errors;
}

function environmentIssues(form: WizardForm): StepIssues {
  return {
    errors: {
      ...keyIssues(
        'env',
        form.env,
        key => ENV_KEY.test(key),
        "Names start with a letter or '_' and use only letters, digits, '_', '.' or '-'"
      ),
      ...keyIssues(
        'labels',
        form.labels,
        key => key !== '' && !/[=\s]/.test(key),
        "Keys cannot be empty or contain '=' or spaces"
      ),
    },
    warnings: {},
  };
}

function cpuError(form: WizardForm): string | null {
  if (!form.cpus.trim()) {
    return null;
  }
  const cpus = parseDecimal(form.cpus);
  if (cpus === null || cpus < MIN_CPUS || cpus > MAX_CPUS) {
    return 'Enter a number of CPUs from 0.01 to 1024, or leave it empty for no limit';
  }
  return null;
}

function memoryError(form: WizardForm): string | null {
  if (!form.memory.trim()) {
    return null;
  }
  const memory = memoryInMb(form.memory, form.memoryUnit);
  if (memory !== null && !Number.isInteger(memory)) {
    return 'Use a whole number of MiB';
  }
  if (memory === null || memory < MIN_MEMORY_MB || memory > MAX_MEMORY_MB) {
    return 'Enter a memory limit from 6 MiB to 1 TiB, or leave it empty for no limit';
  }
  return null;
}

function networkError(form: WizardForm): string | null {
  const publishesPorts = filledPorts(form).length > 0;
  if (NETWORKS_WITHOUT_PORTS.includes(form.network) && publishesPorts) {
    return `Port mappings cannot be used with the ${form.network} network; remove them in the Ports step`;
  }
  return null;
}

function networkIssues(form: WizardForm): StepIssues {
  const errors = Object.entries({
    network: networkError(form),
    cpus: cpuError(form),
    memory: memoryError(form),
  }).filter((entry): entry is [string, string] => entry[1] !== null);
  return { errors: Object.fromEntries(errors), warnings: {} };
}

export function validateWizard(
  form: WizardForm,
  context: WizardContext
): WizardIssues {
  return {
    image: imageIssues(form, context),
    general: generalIssues(form, context),
    ports: portIssues(form, context),
    storage: storageIssues(form),
    environment: environmentIssues(form),
    network: networkIssues(form),
    review: { errors: {}, warnings: {} },
  };
}

export const hasErrors = (issues: StepIssues) =>
  Object.keys(issues.errors).length > 0;

export const invalidSteps = (issues: WizardIssues): StepId[] =>
  WIZARD_STEPS.map(step => step.id).filter(step => hasErrors(issues[step]));

const optional = (value: string) => value.trim() || null;

function restartPolicy(form: WizardForm): RestartPolicy {
  if (form.restartPolicy === 'on-failure') {
    const retries = form.maxRetries.trim();
    return {
      name: 'on-failure',
      maximum_retry_count: retries ? Number(retries) : null,
    };
  }
  return { name: form.restartPolicy };
}

function commandWords(command: string): string[] | null {
  const parsed = splitShellWords(command);
  return 'words' in parsed && parsed.words.length > 0 ? parsed.words : null;
}

export function toCreateContainerSpec(form: WizardForm): CreateContainerSpec {
  return {
    image: form.image.trim(),
    name: optional(form.name),
    command: commandWords(form.command),
    entrypoint: optional(form.entrypoint),
    working_dir: optional(form.workingDir),
    restart_policy: restartPolicy(form),
    auto_remove: form.autoRemove,
    ports: filledPorts(form).map(row => ({
      container_port: Number(row.containerPort.trim()),
      protocol: row.protocol,
      host_port: parsePort(row.hostPort),
      host_ip: optional(row.hostIp),
    })),
    mounts: filledMounts(form).map(row => ({
      kind: row.kind,
      source: row.source.trim(),
      target: row.target.trim(),
      read_only: row.readOnly,
    })),
    env: filledPairs(form.env).map(row => ({
      key: row.key.trim(),
      value: row.value,
    })),
    labels: filledPairs(form.labels).map(row => ({
      key: row.key.trim(),
      value: row.value,
    })),
    network: optional(form.network),
    cpus: form.cpus.trim() ? parseDecimal(form.cpus) : null,
    memory_mb: form.memory.trim()
      ? memoryInMb(form.memory, form.memoryUnit)
      : null,
  };
}

const protocolOf = (portType: PortTypeEnum | undefined): PortProtocol =>
  PORT_PROTOCOLS.find(protocol => protocol === portType) ?? 'tcp';

const containerName = (names: string[] | undefined, id: string) =>
  (names?.[0] ?? id).replace(/^\//, '');

export function wizardContext(
  engineState: EngineState | null,
  pulledImages: string[]
): WizardContext {
  const containers = Object.values(engineState?.containers ?? {});
  const localImages = Object.values(engineState?.images ?? {})
    .map(localImageReference)
    .filter((reference): reference is string => reference !== null);

  return {
    localImages: [...new Set([...localImages, ...pulledImages])].sort(),
    containerNames: containers.map(container =>
      containerName(container.names, container.id)
    ),
    publishedPorts: containers
      .filter(container => container.state === ContainerState.Running)
      .flatMap(container =>
        (container.ports ?? []).flatMap(port =>
          port.public_port
            ? [
                {
                  hostPort: port.public_port,
                  protocol: protocolOf(port.port_type),
                  hostIp: port.ip ?? '',
                  container: containerName(container.names, container.id),
                },
              ]
            : []
        )
      ),
    networks: Object.values(engineState?.networks ?? {})
      .map(network => network.name)
      .sort(),
    volumes: Object.values(engineState?.volumes ?? {})
      .map(volume => volume.name)
      .sort(),
  };
}
