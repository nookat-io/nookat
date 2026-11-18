use crate::entities::DockerCliContext;
use serde::Deserialize;
use std::path::Path;

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct InspectedContext {
    name: String,
    #[serde(default)]
    endpoints: InspectedEndpoints,
}

#[derive(Deserialize, Default)]
struct InspectedEndpoints {
    docker: Option<InspectedEndpoint>,
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct InspectedEndpoint {
    host: Option<String>,
}

pub fn parse_current_docker_context(
    inspect_output: &str,
    colima_socket: &Path,
) -> Result<DockerCliContext, String> {
    let contexts: Vec<InspectedContext> = serde_json::from_str(inspect_output)
        .map_err(|e| format!("Failed to parse docker context inspect output: {}", e))?;
    let context = contexts
        .into_iter()
        .next()
        .ok_or("docker context inspect printed no context")?;

    let host = context.endpoints.docker.and_then(|endpoint| endpoint.host);
    let colima_host = format!("unix://{}", colima_socket.display());
    let uses_colima = host.as_deref() == Some(colima_host.as_str());

    Ok(DockerCliContext {
        name: context.name,
        host,
        uses_colima,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const COLIMA_SOCKET: &str = "/Users/me/.colima/default/docker.sock";

    fn inspect(name: &str, host: &str) -> String {
        format!(
            r#"[{{"Name":"{name}","Metadata":{{"Description":"{name}"}},"Endpoints":{{"docker":{{"Host":"{host}","SkipTLSVerify":false}}}},"TLSMaterial":{{}},"Storage":{{}}}}]"#
        )
    }

    #[test]
    fn a_context_on_the_colima_socket_uses_colima() {
        let context = parse_current_docker_context(
            &inspect("colima", "unix:///Users/me/.colima/default/docker.sock"),
            Path::new(COLIMA_SOCKET),
        )
        .unwrap();

        assert_eq!(
            context,
            DockerCliContext {
                name: "colima".to_string(),
                host: Some("unix:///Users/me/.colima/default/docker.sock".to_string()),
                uses_colima: true,
            }
        );
    }

    #[test]
    fn another_engine_does_not_use_colima() {
        let context = parse_current_docker_context(
            &inspect("orbstack", "unix:///Users/me/.orbstack/run/docker.sock"),
            Path::new(COLIMA_SOCKET),
        )
        .unwrap();

        assert_eq!(context.name, "orbstack");
        assert!(!context.uses_colima);
    }

    #[test]
    fn a_context_of_another_colima_profile_does_not_use_this_one() {
        let context = parse_current_docker_context(
            &inspect("colima-work", "unix:///Users/me/.colima/work/docker.sock"),
            Path::new(COLIMA_SOCKET),
        )
        .unwrap();

        assert!(!context.uses_colima);
    }

    #[test]
    fn a_docker_host_variable_pointing_at_colima_counts_whatever_the_context_is_called() {
        let context = parse_current_docker_context(
            &inspect("default", "unix:///Users/me/.colima/default/docker.sock"),
            Path::new(COLIMA_SOCKET),
        )
        .unwrap();

        assert!(context.uses_colima);
    }

    #[test]
    fn a_context_without_a_docker_endpoint_has_no_host() {
        let context = parse_current_docker_context(
            r#"[{"Name":"remote","Endpoints":{}}]"#,
            Path::new(COLIMA_SOCKET),
        )
        .unwrap();

        assert_eq!(context.host, None);
        assert!(!context.uses_colima);
    }

    #[test]
    fn reports_output_without_a_context() {
        assert!(parse_current_docker_context("[]", Path::new(COLIMA_SOCKET)).is_err());
        assert!(parse_current_docker_context("not json", Path::new(COLIMA_SOCKET)).is_err());
    }
}
