use serde_json::Value;

const TAURI_CONFIG: &str = include_str!("../tauri.conf.json");
const DEFAULT_CAPABILITY: &str = include_str!("../capabilities/default.json");

fn parse(source: &str) -> Value {
    serde_json::from_str(source).expect("file must be valid JSON")
}

fn permission_identifier(permission: &Value) -> &str {
    match permission {
        Value::String(identifier) => identifier,
        Value::Object(fields) => fields
            .get("identifier")
            .and_then(Value::as_str)
            .expect("permission object must have an identifier"),
        other => panic!("unexpected permission entry: {other}"),
    }
}

fn directive_sources<'a>(csp: &'a serde_json::Map<String, Value>, directive: &str) -> Vec<&'a str> {
    csp.get(directive)
        .unwrap_or_else(|| panic!("csp must define {directive}"))
        .as_array()
        .unwrap_or_else(|| panic!("{directive} must use the list form"))
        .iter()
        .map(|source| source.as_str().expect("source must be a string"))
        .collect()
}

#[test]
fn webview_capability_grants_no_shell_permission() {
    let capability = parse(DEFAULT_CAPABILITY);
    let permissions = capability["permissions"]
        .as_array()
        .expect("capability must list permissions");

    let shell_permissions: Vec<&str> = permissions
        .iter()
        .map(permission_identifier)
        .filter(|identifier| identifier.starts_with("shell:"))
        .collect();

    assert!(
        shell_permissions.is_empty(),
        "webview must not be granted shell permissions: {shell_permissions:?}"
    );
}

#[test]
fn bundled_pages_get_a_strict_content_security_policy() {
    let config = parse(TAURI_CONFIG);
    let security = &config["app"]["security"];
    let csp = security["csp"]
        .as_object()
        .expect("app.security.csp must be a directive map");

    assert_eq!(directive_sources(csp, "default-src"), ["'self'"]);
    assert_eq!(directive_sources(csp, "script-src"), ["'self'"]);
    assert_eq!(directive_sources(csp, "object-src"), ["'none'"]);

    for directive in csp.keys() {
        let sources = directive_sources(csp, directive);
        assert!(
            !sources.contains(&"'unsafe-eval'"),
            "{directive} must not allow 'unsafe-eval'"
        );
    }

    let connect_sources = directive_sources(csp, "connect-src");
    assert!(connect_sources.contains(&"ipc:"));
    assert!(connect_sources.contains(&"http://ipc.localhost"));

    assert!(security.get("devCsp").is_none_or(Value::is_null));
    assert!(security
        .get("dangerousDisableAssetCspModification")
        .is_none_or(Value::is_null));
}
