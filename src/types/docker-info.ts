interface DockerInfoComponent {
  name: string;
  version: string;
  details?: Record<string, unknown>;
}

interface DockerInfoPlatform {
  name: string;
}

interface DockerInfoPlugins {
  volume?: string[];
  network?: string[];
  authorization?: string[];
  log?: string[];
}

export interface DockerInfo {
  // Core SystemInfo fields
  id?: string;
  containers?: number;
  containers_running?: number;
  containers_paused?: number;
  containers_stopped?: number;
  images?: number;
  driver?: string;
  docker_root_dir?: string;
  plugins?: DockerInfoPlugins;
  memory_limit?: boolean;
  swap_limit?: boolean;
  kernel_memory_tcp?: boolean;
  cpu_cfs_period?: boolean;
  cpu_cfs_quota?: boolean;
  cpu_shares?: boolean;
  cpu_set?: boolean;
  pids_limit?: boolean;
  oom_kill_disable?: boolean;
  ipv4_forwarding?: boolean;
  bridge_nf_iptables?: boolean;
  bridge_nf_ip6tables?: boolean;
  debug?: boolean;
  nfd?: number;
  n_goroutines?: number;
  system_time?: string;
  logging_driver?: string;
  cgroup_driver?: string;
  cgroup_version?: string;
  kernel_version?: string;
  operating_system?: string;
  os_type?: string;
  architecture?: string;
  ncpu?: number;
  mem_total?: number;
  index_server_address?: string;
  n_events_listener?: number;
  http_proxy?: string;
  https_proxy?: string;
  no_proxy?: string;
  name?: string;
  labels?: string[];
  server_version?: string;
  live_restore_enabled?: boolean;
  init_binary?: string;
  security_options?: string[];
  product_license?: string;
  warnings?: string[];

  // Version fields
  platform?: DockerInfoPlatform;
  components?: DockerInfoComponent[];
  version?: string;
  api_version?: string;
  min_api_version?: string;
  git_commit?: string;
  go_version?: string;
  version_os?: string;
  version_arch?: string;
  version_kernel_version?: string;
  version_experimental?: string | boolean;
  build_time?: string;
}
