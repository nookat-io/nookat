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
  containers: number;
  internal: boolean;
  ipam: Ipam;
  labels?: Record<string, string>;
}

const SYSTEM_NETWORK_NAMES = ['bridge', 'host', 'none'];

export const isSystemNetwork = (network: Pick<Network, 'name'>) =>
  SYSTEM_NETWORK_NAMES.includes(network.name);
