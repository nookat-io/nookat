import { RestartPolicy, RestartPolicyName } from './create-container-types';
import { MemoryUnit } from './wizard-state';

export const RESTART_POLICIES: { value: RestartPolicyName; label: string }[] = [
  { value: 'no', label: 'No' },
  { value: 'always', label: 'Always' },
  { value: 'unless-stopped', label: 'Unless stopped' },
  { value: 'on-failure', label: 'On failure' },
];

export const MEMORY_UNITS: MemoryUnit[] = ['MiB', 'GiB'];

export const DEFAULT_NETWORK_LABEL = 'Default bridge network';

const SPECIAL_NETWORK_LABELS: Record<string, string> = {
  host: "host (shares this machine's network)",
  none: 'none (no networking)',
};

export const networkLabel = (network: string) =>
  SPECIAL_NETWORK_LABELS[network] ?? network;

export function restartPolicyLabel(policy: RestartPolicy): string {
  const label =
    RESTART_POLICIES.find(option => option.value === policy.name)?.label ??
    policy.name;
  if (policy.name === 'on-failure' && policy.maximum_retry_count !== null) {
    return `${label}, up to ${policy.maximum_retry_count} retries`;
  }
  return label;
}
