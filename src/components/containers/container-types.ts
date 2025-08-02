export interface Port {
  ip?: string;
  private_port: number;
  public_port?: number;
  port_type?: 'tcp' | 'udp' | 'sctp';
}

export interface ContainerData {
  id: string;
  names: string[];
  image: string;
  state:
    | 'running'
    | 'stopped'
    | 'paused'
    | 'restarting'
    | 'created'
    | 'exited'
    | 'removing'
    | 'dead';
  created: number;
  ports: Port[];
  size: string;
  labels: Record<string, string>;
}
