import {
  IpBlock,
  IpFamily,
  blockContainsAddress,
  blockContainsBlock,
  formatIpBlock,
  hasHostBits,
  parseIpAddress,
  parseIpBlock,
  withoutHostBits,
} from '../../utils/ip-block';
import {
  IpAddressing,
  NetworkCreateOptions,
  NetworkDriver,
} from './network-types';

export interface AddressingFields {
  enabled: boolean;
  subnet: string;
  gateway: string;
  ipRange: string;
}

export interface LabelFields {
  id: number;
  key: string;
  value: string;
}

export interface NetworkCreateForm {
  name: string;
  driver: NetworkDriver;
  parentInterface: string;
  internal: boolean;
  attachable: boolean;
  ipv4: AddressingFields;
  ipv6: AddressingFields;
  labels: LabelFields[];
}

export type AddressingField = 'subnet' | 'gateway' | 'ipRange';

export type NetworkCreateField =
  | 'name'
  | 'parentInterface'
  | 'addressFamilies'
  | `${IpFamily}.${AddressingField}`
  | `label.${number}`;

export type NetworkCreateErrors = Partial<Record<NetworkCreateField, string>>;

const NO_ADDRESSING = { subnet: '', gateway: '', ipRange: '' };

export const NEW_NETWORK_FORM: NetworkCreateForm = {
  name: '',
  driver: 'bridge',
  parentInterface: '',
  internal: false,
  attachable: false,
  ipv4: { enabled: true, ...NO_ADDRESSING },
  ipv6: { enabled: false, ...NO_ADDRESSING },
  labels: [],
};

const MAX_NETWORK_NAME_LENGTH = 128;
const RESERVED_NETWORK_NAMES = [
  'bridge',
  'host',
  'none',
  'default',
  'container',
];
const DOCKER_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
const MAX_INTERFACE_NAME_LENGTH = 15;
const INTERFACE_NAME_FORBIDDEN = /[\s/:]/;

const FAMILY_LABEL: Record<IpFamily, string> = { ipv4: 'IPv4', ipv6: 'IPv6' };
const EXAMPLE_BLOCK: Record<IpFamily, string> = {
  ipv4: '172.20.0.0/16',
  ipv6: 'fd00:1::/64',
};
const EXAMPLE_ADDRESS: Record<IpFamily, string> = {
  ipv4: '172.20.0.1',
  ipv6: 'fd00:1::1',
};

export const driverAttachesToParentInterface = (driver: NetworkDriver) =>
  driver === 'macvlan' || driver === 'ipvlan';

function nameError(name: string, existingNames: readonly string[]) {
  if (!name) {
    return 'Network name is required';
  }
  if (name.length > MAX_NETWORK_NAME_LENGTH) {
    return `Network name must be at most ${MAX_NETWORK_NAME_LENGTH} characters`;
  }
  if (!DOCKER_NAME.test(name)) {
    return "Network name must start with a letter or digit and use only letters, digits, '_', '.' and '-'";
  }
  if (RESERVED_NETWORK_NAMES.includes(name.toLowerCase())) {
    return `"${name}" is reserved by Docker`;
  }
  if (existingNames.includes(name)) {
    return `A network named "${name}" already exists`;
  }
  return undefined;
}

const isInterfaceName = (name: string) =>
  name.length <= MAX_INTERFACE_NAME_LENGTH &&
  name !== '.' &&
  name !== '..' &&
  !INTERFACE_NAME_FORBIDDEN.test(name);

type BlockCheck = { block: IpBlock } | { error: string };

function checkBlock(text: string, family: IpFamily, field: string): BlockCheck {
  const label = FAMILY_LABEL[family];
  const block = parseIpBlock(text);
  if (!block || block.address.family !== family) {
    return {
      error: `${label} ${field} must be an ${label} CIDR block, like ${EXAMPLE_BLOCK[family]}`,
    };
  }
  if (hasHostBits(block)) {
    return {
      error: `${label} ${field} has host bits set; use ${formatIpBlock(withoutHostBits(block))}`,
    };
  }
  return { block };
}

function addressingErrors(
  fields: AddressingFields,
  family: IpFamily
): NetworkCreateErrors {
  if (!fields.enabled) {
    return {};
  }
  const label = FAMILY_LABEL[family];
  const subnetText = fields.subnet.trim();
  const gatewayText = fields.gateway.trim();
  const ipRangeText = fields.ipRange.trim();
  const errors: NetworkCreateErrors = {};

  const subnet = subnetText ? checkBlock(subnetText, family, 'subnet') : null;
  if (subnet && 'error' in subnet) {
    errors[`${family}.subnet`] = subnet.error;
  }
  const subnetBlock = subnet && 'block' in subnet ? subnet.block : null;

  if (gatewayText) {
    const gateway = parseIpAddress(gatewayText);
    if (!subnet) {
      errors[`${family}.gateway`] = `${label} gateway needs a subnet`;
    } else if (!gateway || gateway.family !== family) {
      errors[`${family}.gateway`] =
        `${label} gateway must be an ${label} address, like ${EXAMPLE_ADDRESS[family]}`;
    } else if (subnetBlock && !blockContainsAddress(subnetBlock, gateway)) {
      errors[`${family}.gateway`] =
        `${label} gateway must be inside ${formatIpBlock(subnetBlock)}`;
    }
  }

  if (ipRangeText) {
    const ipRange = checkBlock(ipRangeText, family, 'IP range');
    if (!subnet) {
      errors[`${family}.ipRange`] = `${label} IP range needs a subnet`;
    } else if ('error' in ipRange) {
      errors[`${family}.ipRange`] = ipRange.error;
    } else if (subnetBlock && !blockContainsBlock(subnetBlock, ipRange.block)) {
      errors[`${family}.ipRange`] =
        `${label} IP range must be inside ${formatIpBlock(subnetBlock)}`;
    }
  }

  return errors;
}

const isBlankLabel = ({ key, value }: LabelFields) =>
  !key.trim() && !value.trim();

function labelErrors(labels: LabelFields[]): NetworkCreateErrors {
  const errors: NetworkCreateErrors = {};
  const seenKeys = new Set<string>();
  for (const label of labels.filter(label => !isBlankLabel(label))) {
    const key = label.key.trim();
    if (!key) {
      errors[`label.${label.id}`] = 'Label key is required';
    } else if (seenKeys.has(key)) {
      errors[`label.${label.id}`] = `Label key "${key}" is used more than once`;
    }
    seenKeys.add(key);
  }
  return errors;
}

export function validateNetworkCreateForm(
  form: NetworkCreateForm,
  existingNames: readonly string[]
): NetworkCreateErrors {
  const errors: NetworkCreateErrors = {
    ...addressingErrors(form.ipv4, 'ipv4'),
    ...addressingErrors(form.ipv6, 'ipv6'),
    ...labelErrors(form.labels),
  };

  const name = nameError(form.name.trim(), existingNames);
  if (name) {
    errors.name = name;
  }

  const parentInterface = form.parentInterface.trim();
  if (
    driverAttachesToParentInterface(form.driver) &&
    parentInterface &&
    !isInterfaceName(parentInterface)
  ) {
    errors.parentInterface = `Parent interface must be a Linux interface name: up to ${MAX_INTERFACE_NAME_LENGTH} characters, no spaces, '/' or ':'`;
  }

  if (!form.ipv4.enabled && !form.ipv6.enabled) {
    errors.addressFamilies = 'Enable IPv4, IPv6 or both';
  }

  return errors;
}

export const hasErrors = (errors: NetworkCreateErrors) =>
  Object.keys(errors).length > 0;

const presentOrUndefined = (text: string) => text.trim() || undefined;

function toIpAddressing(fields: AddressingFields): IpAddressing {
  if (!fields.enabled) {
    return { enabled: false };
  }
  return {
    enabled: true,
    subnet: presentOrUndefined(fields.subnet),
    gateway: presentOrUndefined(fields.gateway),
    ip_range: presentOrUndefined(fields.ipRange),
  };
}

export function toNetworkCreateOptions(
  form: NetworkCreateForm
): NetworkCreateOptions {
  return {
    name: form.name.trim(),
    driver: form.driver,
    parent_interface: driverAttachesToParentInterface(form.driver)
      ? presentOrUndefined(form.parentInterface)
      : undefined,
    internal: form.internal,
    attachable: form.attachable,
    ipv4: toIpAddressing(form.ipv4),
    ipv6: toIpAddressing(form.ipv6),
    labels: form.labels
      .filter(label => !isBlankLabel(label))
      .map(({ key, value }) => ({ key: key.trim(), value })),
  };
}
