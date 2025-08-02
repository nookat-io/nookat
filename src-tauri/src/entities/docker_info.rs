use serde::{Deserialize, Serialize};
use bollard::models::SystemInfo;
use bollard::system::Version;
use std::collections::HashMap;
use serde_json::Value;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum DockerStatus {
    Running,
    Stopped,
    Error,
    Loading,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DockerInfoPlatform {
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DockerInfoComponent {
    pub name: String,
    pub version: String,
    pub details: Option<HashMap<String, Value>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DockerInfoPlugins {
    pub volume: Option<Vec<String>>,
    pub network: Option<Vec<String>>,
    pub authorization: Option<Vec<String>>,
    pub log: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DockerInfo {
    pub id: Option<String>,
    pub containers: Option<i64>,
    pub containers_running: Option<i64>,
    pub containers_paused: Option<i64>,
    pub containers_stopped: Option<i64>,
    pub images: Option<i64>,
    pub driver: Option<String>,
    pub docker_root_dir: Option<String>,
    pub plugins: Option<DockerInfoPlugins>,
    pub memory_limit: Option<bool>,
    pub swap_limit: Option<bool>,
    pub kernel_memory_tcp: Option<bool>,
    pub cpu_cfs_period: Option<bool>,
    pub cpu_cfs_quota: Option<bool>,
    pub cpu_shares: Option<bool>,
    pub cpu_set: Option<bool>,
    pub pids_limit: Option<bool>,
    pub oom_kill_disable: Option<bool>,
    pub ipv4_forwarding: Option<bool>,
    pub bridge_nf_iptables: Option<bool>,
    pub bridge_nf_ip6tables: Option<bool>,
    pub debug: Option<bool>,
    pub nfd: Option<i64>,
    pub n_goroutines: Option<i64>,
    pub system_time: Option<String>,
    pub logging_driver: Option<String>,
    pub cgroup_driver: Option<String>,
    pub cgroup_version: Option<String>,
    pub kernel_version: Option<String>,
    pub operating_system: Option<String>,
    pub os_type: Option<String>,
    pub architecture: Option<String>,
    pub ncpu: Option<i64>,
    pub mem_total: Option<i64>,
    pub index_server_address: Option<String>,
    pub n_events_listener: Option<i64>,
    pub http_proxy: Option<String>,
    pub https_proxy: Option<String>,
    pub no_proxy: Option<String>,
    pub name: Option<String>,
    pub labels: Option<Vec<String>>,
    pub server_version: Option<String>,
    pub live_restore_enabled: Option<bool>,
    pub init_binary: Option<String>,
    pub security_options: Option<Vec<String>>,
    pub product_license: Option<String>,
    pub warnings: Option<Vec<String>>,

    pub platform: Option<DockerInfoPlatform>,
    pub components: Option<Vec<DockerInfoComponent>>,
    pub version: Option<String>,
    pub api_version: Option<String>,
    pub min_api_version: Option<String>,
    pub git_commit: Option<String>,
    pub go_version: Option<String>,
    pub version_os: Option<String>,
    pub version_arch: Option<String>,
    pub version_kernel_version: Option<String>,
    #[cfg(not(target_os = "windows"))]
    pub version_experimental: Option<String>,
    #[cfg(target_os = "windows")]
    pub version_experimental: Option<bool>,
    pub build_time: Option<String>,

    pub status: DockerStatus,
}

impl From<(SystemInfo, Version)> for DockerInfo {
    fn from((info, version): (SystemInfo, Version)) -> Self {
        let plugins = info.plugins.map(|p| DockerInfoPlugins {
            volume: p.volume,
            network: p.network,
            authorization: p.authorization,
            log: p.log,
        });

        let platform = version.platform.map(|p| DockerInfoPlatform {
            name: p.name,
        });

        let components = version.components.map(|comps| {
            comps.into_iter().map(|comp| DockerInfoComponent {
                name: comp.name,
                version: comp.version,
                details: comp.details,
            }).collect()
        });

        // Determine status based on actual Docker daemon state
        // If we can get SystemInfo, Docker is running and responding
        let status = DockerStatus::Running;

        DockerInfo {
            id: info.id,
            containers: info.containers,
            containers_running: info.containers_running,
            containers_paused: info.containers_paused,
            containers_stopped: info.containers_stopped,
            images: info.images,
            driver: info.driver,
            docker_root_dir: info.docker_root_dir,
            plugins,
            memory_limit: info.memory_limit,
            swap_limit: info.swap_limit,
            kernel_memory_tcp: info.kernel_memory_tcp,
            cpu_cfs_period: info.cpu_cfs_period,
            cpu_cfs_quota: info.cpu_cfs_quota,
            cpu_shares: info.cpu_shares,
            cpu_set: info.cpu_set,
            pids_limit: info.pids_limit,
            oom_kill_disable: info.oom_kill_disable,
            ipv4_forwarding: info.ipv4_forwarding,
            bridge_nf_iptables: info.bridge_nf_iptables,
            bridge_nf_ip6tables: info.bridge_nf_ip6tables,
            debug: info.debug,
            nfd: info.nfd,
            n_goroutines: info.n_goroutines,
            system_time: info.system_time,
            logging_driver: info.logging_driver,
            cgroup_driver: info.cgroup_driver.map(|d| d.to_string()),
            cgroup_version: info.cgroup_version.map(|v| v.to_string()),
            kernel_version: info.kernel_version,
            operating_system: info.operating_system,
            os_type: info.os_type,
            architecture: info.architecture,
            ncpu: info.ncpu,
            mem_total: info.mem_total,
            index_server_address: info.index_server_address,
            n_events_listener: info.n_events_listener,
            http_proxy: info.http_proxy,
            https_proxy: info.https_proxy,
            no_proxy: info.no_proxy,
            name: info.name,
            labels: info.labels,
            server_version: info.server_version,
            live_restore_enabled: info.live_restore_enabled,
            init_binary: info.init_binary,
            security_options: info.security_options,
            product_license: info.product_license,
            warnings: info.warnings,
            platform,
            components,
            version: version.version,
            api_version: version.api_version,
            min_api_version: version.min_api_version,
            git_commit: version.git_commit,
            go_version: version.go_version,
            version_os: version.os,
            version_arch: version.arch,
            version_kernel_version: version.kernel_version,
            version_experimental: version.experimental,
            build_time: version.build_time,

            status,
        }
    }
}

impl Default for DockerInfo {
    fn default() -> Self {
        DockerInfo {
            id: None,
            containers: None,
            containers_running: None,
            containers_paused: None,
            containers_stopped: None,
            images: None,
            driver: None,
            docker_root_dir: None,
            plugins: None,
            memory_limit: None,
            swap_limit: None,
            kernel_memory_tcp: None,
            cpu_cfs_period: None,
            cpu_cfs_quota: None,
            cpu_shares: None,
            cpu_set: None,
            pids_limit: None,
            oom_kill_disable: None,
            ipv4_forwarding: None,
            bridge_nf_iptables: None,
            bridge_nf_ip6tables: None,
            debug: None,
            nfd: None,
            n_goroutines: None,
            system_time: None,
            logging_driver: None,
            cgroup_driver: None,
            cgroup_version: None,
            kernel_version: None,
            operating_system: None,
            os_type: None,
            architecture: None,
            ncpu: None,
            mem_total: None,
            index_server_address: None,
            n_events_listener: None,
            http_proxy: None,
            https_proxy: None,
            no_proxy: None,
            name: None,
            labels: None,
            server_version: None,
            live_restore_enabled: None,
            init_binary: None,
            security_options: None,
            product_license: None,
            warnings: None,

            platform: None,
            components: None,
            version: None,
            api_version: None,
            min_api_version: None,
            git_commit: None,
            go_version: None,
            version_os: None,
            version_arch: None,
            version_kernel_version: None,
            version_experimental: None,
            build_time: None,

            status: DockerStatus::Stopped,
        }
    }
}
