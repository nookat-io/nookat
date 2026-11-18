#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "macos")]
pub use macos::*;

#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "windows")]
pub use windows::*;

#[cfg(target_os = "linux")]
mod linux;

#[cfg(target_os = "linux")]
pub use linux::*;

pub const DOCKER_CONTEXT_LIST_FORMAT: &str = "{{.Current}}\t{{.DockerEndpoint}}";

pub fn endpoints_with_the_current_context_first(context_list: &str) -> Vec<String> {
    let (current, others): (Vec<_>, Vec<_>) = context_list
        .lines()
        .filter_map(|line| line.split_once('\t'))
        .map(|(is_current, endpoint)| (is_current.trim() == "true", endpoint.trim()))
        .filter(|(_, endpoint)| !endpoint.is_empty())
        .partition(|(is_current, _)| *is_current);

    current
        .into_iter()
        .chain(others)
        .map(|(_, endpoint)| endpoint.to_string())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tries_the_current_context_before_the_others_like_the_docker_cli() {
        let context_list = "false\tunix:///var/run/docker.sock\n\
                            true\tunix:///Users/me/.colima/work/docker.sock\n\
                            false\tunix:///Users/me/.orbstack/run/docker.sock\n";

        assert_eq!(
            endpoints_with_the_current_context_first(context_list),
            [
                "unix:///Users/me/.colima/work/docker.sock",
                "unix:///var/run/docker.sock",
                "unix:///Users/me/.orbstack/run/docker.sock",
            ]
        );
    }

    #[test]
    fn keeps_the_listed_order_when_no_context_is_current() {
        let context_list = "false\tnpipe:////./pipe/docker_engine\n\
                            false\tnpipe:////./pipe/dockerDesktopLinuxEngine\n";

        assert_eq!(
            endpoints_with_the_current_context_first(context_list),
            [
                "npipe:////./pipe/docker_engine",
                "npipe:////./pipe/dockerDesktopLinuxEngine",
            ]
        );
    }

    #[test]
    fn skips_contexts_without_a_docker_endpoint_and_lines_it_cannot_read() {
        let context_list = "true\t\n\nnot a context line\nfalse\tunix:///var/run/docker.sock\n";

        assert_eq!(
            endpoints_with_the_current_context_first(context_list),
            ["unix:///var/run/docker.sock"]
        );
    }
}
