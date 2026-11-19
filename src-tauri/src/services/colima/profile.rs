use super::{default_settings, gib_from_bytes, vm_type_for};
use crate::entities::{
    ColimaArchitecture, ColimaHost, ColimaProfile, ColimaProfileStatus, ColimaVmSettings,
    ColimaVmType,
};
use serde::Deserialize;
use std::path::{Path, PathBuf};

#[cfg(target_os = "macos")]
pub const PROFILE_ENV_VAR: &str = "COLIMA_PROFILE";
const DEFAULT_PROFILE: &str = "default";
const PROFILE_CONFIG_FILE: &str = "colima.yaml";
const DOCKER_SOCKET_FILE: &str = "docker.sock";
const DEFAULT_PROFILE_DOCKER_CONTEXT: &str = "colima";
const COLIMA_ACTIVATES_DOCKER_CONTEXT_BY_DEFAULT: bool = true;

pub fn colima_profile_name(requested: Option<&str>) -> String {
    match requested {
        None | Some("") | Some("colima") | Some(DEFAULT_PROFILE) => DEFAULT_PROFILE.to_string(),
        Some(name) => name.strip_prefix("colima-").unwrap_or(name).to_string(),
    }
}

pub fn colima_home(
    home: &Path,
    env_var: impl Fn(&str) -> Option<String>,
    exists: impl Fn(&Path) -> bool,
) -> PathBuf {
    if let Some(explicit_home) = env_var("COLIMA_HOME")
        .map(PathBuf::from)
        .filter(|dir| exists(dir))
    {
        return explicit_home;
    }

    let default_home = home.join(".colima");
    if exists(&default_home) {
        return default_home;
    }

    match env_var("XDG_CONFIG_HOME").filter(|dir| !dir.is_empty()) {
        Some(xdg_config_home) => PathBuf::from(xdg_config_home).join("colima"),
        None => default_home,
    }
}

pub fn profile_config_path(colima_home: &Path, profile: &str) -> PathBuf {
    colima_home.join(profile).join(PROFILE_CONFIG_FILE)
}

pub fn colima_docker_socket(colima_home: &Path, profile: &str) -> PathBuf {
    colima_home.join(profile).join(DOCKER_SOCKET_FILE)
}

pub fn colima_docker_context_name(profile: &str) -> String {
    match profile {
        DEFAULT_PROFILE => DEFAULT_PROFILE_DOCKER_CONTEXT.to_string(),
        name => format!("{DEFAULT_PROFILE_DOCKER_CONTEXT}-{name}"),
    }
}

#[derive(Deserialize, Debug, Default, Clone, PartialEq)]
#[serde(default)]
pub struct ColimaInstance {
    pub name: String,
    pub status: Option<ColimaProfileStatus>,
    pub arch: String,
    pub cpus: u32,
    pub memory: u64,
    pub disk: u64,
}

pub fn parse_colima_list(output: &str) -> Result<Vec<ColimaInstance>, String> {
    output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(|line| {
            serde_json::from_str::<ColimaInstance>(line)
                .map_err(|e| format!("Unexpected `colima list --json` output {line:?}: {e}"))
        })
        .collect()
}

#[derive(Deserialize, Debug, Default, Clone, PartialEq)]
#[serde(default, rename_all = "camelCase")]
pub struct ColimaProfileConfig {
    pub cpu: Option<u32>,
    pub memory: Option<f64>,
    pub disk: Option<u32>,
    pub vm_type: Option<String>,
    pub rosetta: bool,
    pub mount_inotify: bool,
    pub auto_activate: Option<bool>,
}

pub fn parse_profile_config(yaml: &str) -> Result<ColimaProfileConfig, String> {
    serde_yaml_ng::from_str(yaml).map_err(|e| format!("Invalid Colima profile config: {e}"))
}

pub fn colima_profile(
    name: &str,
    instance: Option<&ColimaInstance>,
    config: Option<&ColimaProfileConfig>,
    host: &ColimaHost,
) -> ColimaProfile {
    let Some(instance) = instance else {
        return ColimaProfile {
            name: name.to_string(),
            status: ColimaProfileStatus::Missing,
            settings: default_settings(host),
            activates_docker_context: COLIMA_ACTIVATES_DOCKER_CONTEXT_BY_DEFAULT,
        };
    };

    let config = config.cloned().unwrap_or_default();
    let architecture = architecture_from_lima(&instance.arch).unwrap_or(host.architecture);
    let status = instance.status.unwrap_or(ColimaProfileStatus::Unknown);

    let vm_memory_gib = gib_from_bytes(instance.memory);
    let vm_disk_gib = gib_from_bytes(instance.disk).round() as u32;
    let (cpus, memory_gib, disk_gib) = if status == ColimaProfileStatus::Running {
        (instance.cpus, vm_memory_gib, vm_disk_gib)
    } else {
        (
            config.cpu.unwrap_or(instance.cpus),
            config.memory.unwrap_or(vm_memory_gib),
            config
                .disk
                .map_or(vm_disk_gib, |disk| disk.max(vm_disk_gib)),
        )
    };

    ColimaProfile {
        name: name.to_string(),
        status,
        settings: ColimaVmSettings {
            cpus,
            memory_gib,
            disk_gib,
            architecture,
            vm_type: configured_vm_type(config.vm_type.as_deref(), architecture, host),
            rosetta: config.rosetta,
            mount_inotify: config.mount_inotify,
        },
        activates_docker_context: config
            .auto_activate
            .unwrap_or(COLIMA_ACTIVATES_DOCKER_CONTEXT_BY_DEFAULT),
    }
}

fn architecture_from_lima(arch: &str) -> Option<ColimaArchitecture> {
    match arch {
        "aarch64" | "arm64" => Some(ColimaArchitecture::Aarch64),
        "x86_64" | "amd64" => Some(ColimaArchitecture::X86_64),
        _ => None,
    }
}

fn configured_vm_type(
    configured: Option<&str>,
    architecture: ColimaArchitecture,
    host: &ColimaHost,
) -> ColimaVmType {
    match configured {
        None | Some("") => vm_type_for(architecture, host),
        Some("vz") => ColimaVmType::Vz,
        Some("qemu") => ColimaVmType::Qemu,
        Some("krunkit") => ColimaVmType::Krunkit,
        Some(_) => ColimaVmType::Other,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::{HashMap, HashSet};

    const APPLE_SILICON: ColimaHost = ColimaHost {
        cpus: 12,
        memory_gib: 36.0,
        architecture: ColimaArchitecture::Aarch64,
        supports_vz: true,
    };

    const STOPPED_DEFAULT_PROFILE: &str = r#"{"name":"default","status":"Stopped","arch":"aarch64","cpus":2,"memory":2147483648,"disk":10737418240,"runtime":"docker"}"#;
    const RUNNING_TUNED_PROFILE: &str = r#"{"name":"work","status":"Running","arch":"aarch64","cpus":8,"memory":8589934592,"disk":107374182400,"runtime":"docker","address":"192.168.106.2"}"#;

    const PROFILE_CONFIG: &str = "cpu: 8\n\
        disk: 100\n\
        memory: 8\n\
        arch: aarch64\n\
        runtime: docker\n\
        kubernetes:\n\
        \x20 enabled: false\n\
        \x20 k3sArgs:\n\
        \x20   - --disable=traefik\n\
        network:\n\
        \x20 address: false\n\
        \x20 dns: null\n\
        vmType: vz\n\
        portForwarder: ssh\n\
        rosetta: true\n\
        mountType: virtiofs\n\
        mountInotify: true\n\
        mounts: []\n\
        autoActivate: true\n";

    #[test]
    fn the_default_profile_has_several_names_in_colima() {
        assert_eq!(colima_profile_name(None), "default");
        assert_eq!(colima_profile_name(Some("")), "default");
        assert_eq!(colima_profile_name(Some("colima")), "default");
        assert_eq!(colima_profile_name(Some("default")), "default");
    }

    #[test]
    fn a_named_profile_drops_the_lima_instance_prefix_like_colima_does() {
        assert_eq!(colima_profile_name(Some("nookat-e2e")), "nookat-e2e");
        assert_eq!(colima_profile_name(Some("colima-nookat-e2e")), "nookat-e2e");
    }

    fn resolve_home(env: &[(&str, &str)], existing_dirs: &[&str]) -> PathBuf {
        let env: HashMap<String, String> = env
            .iter()
            .map(|(key, value)| (key.to_string(), value.to_string()))
            .collect();
        let existing_dirs: HashSet<PathBuf> = existing_dirs.iter().map(PathBuf::from).collect();
        colima_home(
            Path::new("/Users/me"),
            |key| env.get(key).cloned(),
            |dir| existing_dirs.contains(dir),
        )
    }

    #[test]
    fn colima_home_honors_an_existing_colima_home_variable() {
        assert_eq!(
            resolve_home(
                &[("COLIMA_HOME", "/custom/colima")],
                &["/custom/colima", "/Users/me/.colima"]
            ),
            PathBuf::from("/custom/colima")
        );
    }

    #[test]
    fn colima_home_ignores_a_colima_home_variable_that_points_nowhere() {
        assert_eq!(
            resolve_home(&[("COLIMA_HOME", "/missing")], &["/Users/me/.colima"]),
            PathBuf::from("/Users/me/.colima")
        );
    }

    #[test]
    fn colima_home_prefers_the_dot_colima_directory_over_xdg_config_home() {
        assert_eq!(
            resolve_home(&[("XDG_CONFIG_HOME", "/xdg")], &["/Users/me/.colima"]),
            PathBuf::from("/Users/me/.colima")
        );
    }

    #[test]
    fn colima_home_falls_back_to_xdg_config_home_when_dot_colima_is_missing() {
        assert_eq!(
            resolve_home(&[("XDG_CONFIG_HOME", "/xdg")], &[]),
            PathBuf::from("/xdg/colima")
        );
        assert_eq!(resolve_home(&[], &[]), PathBuf::from("/Users/me/.colima"));
    }

    #[test]
    fn the_profile_config_lives_in_a_directory_named_after_the_profile() {
        assert_eq!(
            profile_config_path(Path::new("/Users/me/.colima"), "nookat-e2e"),
            PathBuf::from("/Users/me/.colima/nookat-e2e/colima.yaml")
        );
    }

    #[test]
    fn the_docker_socket_sits_next_to_the_profile_config() {
        assert_eq!(
            colima_docker_socket(Path::new("/Users/me/.colima"), "nookat-e2e"),
            PathBuf::from("/Users/me/.colima/nookat-e2e/docker.sock")
        );
    }

    #[test]
    fn names_the_docker_context_the_way_colima_creates_it() {
        assert_eq!(colima_docker_context_name("default"), "colima");
        assert_eq!(
            colima_docker_context_name("nookat-e2e"),
            "colima-nookat-e2e"
        );
    }

    #[test]
    fn parses_one_instance_per_line_with_sizes_in_bytes() {
        let instances = parse_colima_list(&format!(
            "{STOPPED_DEFAULT_PROFILE}\n{RUNNING_TUNED_PROFILE}\n"
        ))
        .expect("valid list output");

        assert_eq!(
            instances,
            vec![
                ColimaInstance {
                    name: "default".to_string(),
                    status: Some(ColimaProfileStatus::Stopped),
                    arch: "aarch64".to_string(),
                    cpus: 2,
                    memory: 2 << 30,
                    disk: 10 << 30,
                },
                ColimaInstance {
                    name: "work".to_string(),
                    status: Some(ColimaProfileStatus::Running),
                    arch: "aarch64".to_string(),
                    cpus: 8,
                    memory: 8 << 30,
                    disk: 100 << 30,
                },
            ]
        );
    }

    #[test]
    fn no_instances_is_an_empty_list() {
        assert_eq!(parse_colima_list(""), Ok(vec![]));
    }

    #[test]
    fn an_unknown_lima_status_does_not_break_the_listing() {
        let instances = parse_colima_list(r#"{"name":"default","status":"Starting"}"#)
            .expect("valid list output");

        assert_eq!(instances[0].status, Some(ColimaProfileStatus::Unknown));
    }

    #[test]
    fn reports_output_that_is_not_json_lines() {
        let error = parse_colima_list("PROFILE STATUS").expect_err("must fail");

        assert!(error.contains("PROFILE STATUS"), "{error}");
    }

    #[test]
    fn reads_rosetta_hot_reload_and_vm_type_from_the_profile_config() {
        assert_eq!(
            parse_profile_config(PROFILE_CONFIG),
            Ok(ColimaProfileConfig {
                cpu: Some(8),
                memory: Some(8.0),
                disk: Some(100),
                vm_type: Some("vz".to_string()),
                rosetta: true,
                mount_inotify: true,
                auto_activate: Some(true),
            })
        );
    }

    #[test]
    fn a_profile_config_without_the_keys_uses_colima_defaults() {
        assert_eq!(
            parse_profile_config("runtime: docker\n"),
            Ok(ColimaProfileConfig::default())
        );
    }

    #[test]
    fn a_missing_profile_shows_the_defaults_for_a_fresh_vm() {
        let profile = colima_profile("default", None, None, &APPLE_SILICON);

        assert_eq!(profile.status, ColimaProfileStatus::Missing);
        assert_eq!(profile.settings, default_settings(&APPLE_SILICON));
        assert!(profile.activates_docker_context);
    }

    #[test]
    fn a_profile_switches_the_docker_context_on_start_unless_its_config_turns_that_off() {
        let instance = &parse_colima_list(STOPPED_DEFAULT_PROFILE).unwrap()[0];
        let profile_with = |yaml: &str| {
            let config = parse_profile_config(yaml).unwrap();
            colima_profile("default", Some(instance), Some(&config), &APPLE_SILICON)
        };

        assert!(profile_with("autoActivate: true\n").activates_docker_context);
        assert!(profile_with("runtime: docker\n").activates_docker_context);
        assert!(!profile_with("autoActivate: false\n").activates_docker_context);
    }

    #[test]
    fn a_stopped_profile_shows_its_real_resources_in_gib() {
        let instance = &parse_colima_list(STOPPED_DEFAULT_PROFILE).unwrap()[0];
        let config = ColimaProfileConfig {
            vm_type: Some("vz".to_string()),
            ..ColimaProfileConfig::default()
        };

        let profile = colima_profile("default", Some(instance), Some(&config), &APPLE_SILICON);

        assert_eq!(
            profile,
            ColimaProfile {
                name: "default".to_string(),
                status: ColimaProfileStatus::Stopped,
                settings: ColimaVmSettings {
                    cpus: 2,
                    memory_gib: 2.0,
                    disk_gib: 10,
                    architecture: ColimaArchitecture::Aarch64,
                    vm_type: ColimaVmType::Vz,
                    rosetta: false,
                    mount_inotify: false,
                },
                activates_docker_context: true,
            }
        );
    }

    fn resources(profile: &ColimaProfile) -> (u32, f64, u32) {
        let settings = &profile.settings;
        (settings.cpus, settings.memory_gib, settings.disk_gib)
    }

    #[test]
    fn a_stopped_profile_shows_the_resources_its_next_start_takes_from_colima_yaml() {
        let instance = &parse_colima_list(STOPPED_DEFAULT_PROFILE).unwrap()[0];
        let config = ColimaProfileConfig {
            cpu: Some(4),
            memory: Some(6.5),
            disk: Some(60),
            ..ColimaProfileConfig::default()
        };

        let profile = colima_profile("default", Some(instance), Some(&config), &APPLE_SILICON);

        assert_eq!(resources(&profile), (4, 6.5, 60));
    }

    #[test]
    fn a_running_profile_shows_the_resources_its_vm_runs_with() {
        let instance = &parse_colima_list(RUNNING_TUNED_PROFILE).unwrap()[0];
        let config = ColimaProfileConfig {
            cpu: Some(4),
            memory: Some(6.0),
            disk: Some(200),
            ..ColimaProfileConfig::default()
        };

        let profile = colima_profile("work", Some(instance), Some(&config), &APPLE_SILICON);

        assert_eq!(resources(&profile), (8, 8.0, 100));
    }

    #[test]
    fn a_stopped_profile_never_shows_a_smaller_disk_than_its_vm_has_since_disks_only_grow() {
        let instance = &parse_colima_list(STOPPED_DEFAULT_PROFILE).unwrap()[0];
        let config = ColimaProfileConfig {
            disk: Some(5),
            ..ColimaProfileConfig::default()
        };

        let profile = colima_profile("default", Some(instance), Some(&config), &APPLE_SILICON);

        assert_eq!(resources(&profile), (2, 2.0, 10));
    }

    #[test]
    fn keeps_fractional_memory_instead_of_rounding_it_away() {
        let instance = ColimaInstance {
            memory: 2_684_354_560,
            arch: "aarch64".to_string(),
            ..ColimaInstance::default()
        };

        let profile = colima_profile("default", Some(&instance), None, &APPLE_SILICON);

        assert_eq!(profile.settings.memory_gib, 2.5);
    }

    #[test]
    fn an_unreadable_profile_config_falls_back_to_colima_defaults_like_colima_itself() {
        let instance = &parse_colima_list(RUNNING_TUNED_PROFILE).unwrap()[0];

        let profile = colima_profile("work", Some(instance), None, &APPLE_SILICON);

        assert_eq!(profile.settings.vm_type, ColimaVmType::Vz);
        assert!(!profile.settings.rosetta);
        assert!(!profile.settings.mount_inotify);
    }

    #[test]
    fn an_x86_64_profile_on_apple_silicon_without_a_vm_type_runs_on_qemu() {
        let instance = ColimaInstance {
            arch: "x86_64".to_string(),
            ..ColimaInstance::default()
        };

        let profile = colima_profile("amd", Some(&instance), None, &APPLE_SILICON);

        assert_eq!(profile.settings.architecture, ColimaArchitecture::X86_64);
        assert_eq!(profile.settings.vm_type, ColimaVmType::Qemu);
    }

    #[test]
    fn keeps_an_unknown_vm_type_distinct_from_vz() {
        let instance = &parse_colima_list(RUNNING_TUNED_PROFILE).unwrap()[0];
        let config = ColimaProfileConfig {
            vm_type: Some("hyperkit".to_string()),
            ..ColimaProfileConfig::default()
        };

        let profile = colima_profile("work", Some(instance), Some(&config), &APPLE_SILICON);

        assert_eq!(profile.settings.vm_type, ColimaVmType::Other);
    }
}
