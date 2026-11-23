export interface IpamConfig {
  subnet?: string;
  gateway?: string;
}

export interface Ipam {
  driver?: string;
  config?: IpamConfig[];
}

export interface Network {
  id: string;
  name: string;
  driver: string;
  scope: string;
  created?: string;
  subnet?: string;
  gateway?: string;
  in_use: boolean;
  internal: boolean;
  ipam: Ipam;
  labels?: Record<string, string>;
}

export type NetworkDriver = 'bridge' | 'macvlan' | 'ipvlan';

export interface IpAddressing {
  enabled: boolean;
  subnet?: string;
  gateway?: string;
  ip_range?: string;
}

export interface NetworkLabel {
  key: string;
  value: string;
}

export interface NetworkCreateOptions {
  name: string;
  driver: NetworkDriver;
  parent_interface?: string;
  internal: boolean;
  attachable: boolean;
  ipv4: IpAddressing;
  ipv6: IpAddressing;
  labels: NetworkLabel[];
}

const SYSTEM_NETWORK_NAMES = ['bridge', 'host', 'none'];

export const isSystemNetwork = (network: Pick<Network, 'name'>) =>
  SYSTEM_NETWORK_NAMES.includes(network.name);
