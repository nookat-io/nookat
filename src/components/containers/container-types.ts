export enum PortTypeEnum {
  Empty = '',
  Tcp = 'tcp',
  Udp = 'udp',
  Sctp = 'sctp',
}

export interface Port {
  ip?: string;
  private_port: number;
  public_port?: number;
  port_type?: PortTypeEnum;
}

export enum ContainerState {
  Empty = '',
  Created = 'created',
  Running = 'running',
  Paused = 'paused',
  Restarting = 'restarting',
  Exited = 'exited',
  Removing = 'removing',
  Dead = 'dead',
  Stopping = 'stopping',
}

export enum MountPointType {
  Empty = '',
  Bind = 'bind',
  Volume = 'volume',
  Image = 'image',
  Tmpfs = 'tmpfs',
  Npipe = 'npipe',
  Cluster = 'cluster',
}

export interface MountPoint {
  mount_type?: MountPointType;
  name?: string;
  source?: string;
  destination?: string;
  driver?: string;
  mode?: string;
  rw?: boolean;
  propagation?: string;
}

export interface ContainerHostConfig {
  network_mode?: string;
  annotations?: Record<string, string>;
}

export interface EndpointIpamConfig {
  ipv4_address?: string;
  ipv6_address?: string;
  link_local_ips?: string[];
}

export interface EndpointSettings {
  ipam_config?: EndpointIpamConfig;
  ipv4_address?: string;
  ipv6_address?: string;
  link_local_ips?: string[];
  aliases?: string[];
  network_id?: string;
  endpoint_id?: string;
  gateway?: string;
  ip_address?: string;
  ip_prefix_len?: number;
  ipv6_gateway?: string;
  global_ipv6_address?: string;
  global_ipv6_prefix_len?: number;
  mac_address?: string;
  driver_opts?: Record<string, string>;
}

export interface ContainerNetworkSettings {
  networks?: Record<string, EndpointSettings>;
}

export interface Container {
  id: string;
  names?: string[];
  image?: string;
  image_id?: string;
  command?: string;
  created?: number;
  ports?: Port[];
  size_rw?: number;
  size_root_fs?: number;
  labels?: Record<string, string>;
  state?: ContainerState;
  status?: string;
  host_config?: ContainerHostConfig;
  network_settings?: ContainerNetworkSettings;
  mounts?: MountPoint[];
}
