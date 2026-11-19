use crate::entities::ConnectedEngine;

const ORBSTACK: &str = "OrbStack";
const DOCKER_DESKTOP: &str = "Docker Desktop";
const RANCHER_DESKTOP: &str = "Rancher Desktop";
const PODMAN: &str = "Podman";
const REMOTE_ENGINE: &str = "Remote engine";
const DOCKER_ENGINE: &str = "Docker Engine";
const COLIMA: &str = "Colima";
const COLIMA_DEFAULT_PROFILE: &str = "default";
const COLIMA_DEFAULT_HOST_NAME: &str = "colima";
const COLIMA_HOST_NAME_PREFIX: &str = "colima-";
const COLIMA_HOME_SEGMENT: &str = "/.colima/";
const REMOTE_SCHEMES: [&str; 2] = ["tcp://", "ssh://"];

pub fn describe_connected_engine(
    endpoint: &str,
    operating_system: Option<&str>,
    host_name: Option<&str>,
    managed_colima_endpoint: Option<&str>,
) -> ConnectedEngine {
    ConnectedEngine {
        name: engine_name(
            endpoint,
            operating_system.unwrap_or_default(),
            host_name.unwrap_or_default(),
        ),
        endpoint: endpoint.to_string(),
        is_managed_colima: managed_colima_endpoint == Some(endpoint),
    }
}

fn engine_name(endpoint: &str, operating_system: &str, host_name: &str) -> String {
    if operating_system == ORBSTACK || endpoint.contains("/.orbstack/") {
        return ORBSTACK.to_string();
    }
    if operating_system == DOCKER_DESKTOP || endpoint.contains("/.docker/run/") {
        return DOCKER_DESKTOP.to_string();
    }
    if let Some(profile) = colima_profile(endpoint, host_name) {
        return match profile {
            COLIMA_DEFAULT_PROFILE => COLIMA.to_string(),
            profile => format!("{COLIMA} ({profile})"),
        };
    }
    if endpoint.contains("/.rd/") || host_name.contains("rancher-desktop") {
        return RANCHER_DESKTOP.to_string();
    }
    if endpoint.contains("podman") {
        return PODMAN.to_string();
    }
    if REMOTE_SCHEMES
        .iter()
        .any(|scheme| endpoint.starts_with(scheme))
    {
        return REMOTE_ENGINE.to_string();
    }
    DOCKER_ENGINE.to_string()
}

fn colima_profile<'a>(endpoint: &'a str, host_name: &'a str) -> Option<&'a str> {
    if host_name == COLIMA_DEFAULT_HOST_NAME {
        return Some(COLIMA_DEFAULT_PROFILE);
    }
    if let Some(profile) = host_name.strip_prefix(COLIMA_HOST_NAME_PREFIX) {
        return Some(profile);
    }
    endpoint
        .split(COLIMA_HOME_SEGMENT)
        .nth(1)
        .and_then(|rest| rest.split('/').next())
        .filter(|profile| !profile.is_empty())
}

#[cfg(test)]
mod tests {
    use super::describe_connected_engine;

    const NOOKAT_COLIMA: &str = "unix:///Users/me/.colima/default/docker.sock";

    fn name_of(endpoint: &str, operating_system: &str, host_name: &str) -> String {
        describe_connected_engine(
            endpoint,
            Some(operating_system),
            Some(host_name),
            Some(NOOKAT_COLIMA),
        )
        .name
    }

    #[test]
    fn orbstack_is_named_by_its_operating_system_even_behind_the_default_socket() {
        assert_eq!(
            name_of("unix:///var/run/docker.sock", "OrbStack", "orbstack"),
            "OrbStack"
        );
        assert_eq!(
            name_of("unix:///Users/me/.orbstack/run/docker.sock", "", ""),
            "OrbStack"
        );
    }

    #[test]
    fn docker_desktop_is_named_by_its_operating_system_or_its_socket() {
        assert_eq!(
            name_of(
                "unix:///var/run/docker.sock",
                "Docker Desktop",
                "docker-desktop"
            ),
            "Docker Desktop"
        );
        assert_eq!(
            name_of("unix:///Users/me/.docker/run/docker.sock", "", ""),
            "Docker Desktop"
        );
    }

    #[test]
    fn colima_names_a_profile_other_than_the_default() {
        assert_eq!(
            name_of(NOOKAT_COLIMA, "Ubuntu 24.04.3 LTS", "colima"),
            "Colima"
        );
        assert_eq!(
            name_of(
                "unix:///Users/me/.colima/work/docker.sock",
                "Ubuntu 24.04.3 LTS",
                "colima-work"
            ),
            "Colima (work)"
        );
        assert_eq!(
            name_of("unix:///Users/me/.colima/work/docker.sock", "", ""),
            "Colima (work)"
        );
    }

    #[test]
    fn other_local_engines_are_named_by_their_sockets() {
        assert_eq!(
            name_of("unix:///Users/me/.rd/docker.sock", "Alpine Linux v3.20", ""),
            "Rancher Desktop"
        );
        assert_eq!(
            name_of(
                "unix:///var/folders/xy/T/podman/podman-machine-default-api.sock",
                "fedora",
                "localhost.localdomain"
            ),
            "Podman"
        );
        assert_eq!(
            name_of(
                "unix:///var/run/docker.sock",
                "Ubuntu 24.04 LTS",
                "build-box"
            ),
            "Docker Engine"
        );
    }

    #[test]
    fn an_engine_over_tcp_or_ssh_is_remote() {
        assert_eq!(
            name_of("tcp://10.0.0.5:2376", "Ubuntu 24.04 LTS", "ci"),
            "Remote engine"
        );
        assert_eq!(
            name_of("ssh://deploy@build-box", "Debian GNU/Linux 12", "build-box"),
            "Remote engine"
        );
    }

    #[test]
    fn only_the_colima_socket_nookat_manages_counts_as_managed() {
        let managed = describe_connected_engine(
            NOOKAT_COLIMA,
            Some("Ubuntu 24.04.3 LTS"),
            Some("colima"),
            Some(NOOKAT_COLIMA),
        );
        assert!(managed.is_managed_colima);
        assert_eq!(managed.endpoint, NOOKAT_COLIMA);

        let other_profile = describe_connected_engine(
            "unix:///Users/me/.colima/work/docker.sock",
            Some("Ubuntu 24.04.3 LTS"),
            Some("colima-work"),
            Some(NOOKAT_COLIMA),
        );
        assert!(!other_profile.is_managed_colima);

        let without_colima = describe_connected_engine(
            "unix:///var/run/docker.sock",
            Some("Ubuntu 24.04 LTS"),
            None,
            None,
        );
        assert!(!without_colima.is_managed_colima);
    }
}
