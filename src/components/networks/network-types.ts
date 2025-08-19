// IPAM config interface matching backend
export interface IpamConfig {
  subnet?: string;
  gateway?: string;
}

// IPAM interface matching backend
export interface Ipam {
  driver?: string;
  config?: IpamConfig[];
}

// Network interface matching backend
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
