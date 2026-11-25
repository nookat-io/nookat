export type PortProtocol = 'tcp' | 'udp' | 'sctp';

export const PORT_PROTOCOLS: PortProtocol[] = ['tcp', 'udp', 'sctp'];

export type RestartPolicyName =
  'no' | 'always' | 'unless-stopped' | 'on-failure';

export type RestartPolicy =
  | { name: 'no' }
  | { name: 'always' }
  | { name: 'unless-stopped' }
  | { name: 'on-failure'; maximum_retry_count: number | null };

export type StorageMountKind = 'volume' | 'bind';

export interface PortMapping {
  container_port: number;
  protocol: PortProtocol;
  host_port: number | null;
  host_ip: string | null;
}

export interface StorageMount {
  kind: StorageMountKind;
  source: string;
  target: string;
  read_only: boolean;
}

export interface KeyValue {
  key: string;
  value: string;
}

export interface CreateContainerSpec {
  image: string;
  name: string | null;
  command: string[] | null;
  entrypoint: string | null;
  working_dir: string | null;
  restart_policy: RestartPolicy;
  auto_remove: boolean;
  ports: PortMapping[];
  mounts: StorageMount[];
  env: KeyValue[];
  labels: KeyValue[];
  network: string | null;
  cpus: number | null;
  memory_mb: number | null;
}

export interface CreatedContainer {
  id: string;
  started: boolean;
  warnings: string[];
}

export type CreateContainerError =
  | { kind: 'not_created'; message: string }
  | { kind: 'not_started'; message: string; removed: boolean };
