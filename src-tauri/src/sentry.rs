use crate::services::config::ConfigService;
use sentry::{init, ClientInitGuard, ClientOptions};
use std::sync::Once;
use tracing::{info, warn};

static SENTRY_DSN: Option<&'static str> = option_env!("SENTRY_DSN");
static INIT: Once = Once::new();

pub fn init_sentry() -> Option<ClientInitGuard> {
    info!("Initializing Sentry crash reporting");

    // Only initialize once
    let mut guard = None;
    INIT.call_once(|| {
        let config = ConfigService::get_config().expect("Failed to get config");
        let error_reporting = config.telemetry.error_reporting;

        // Skip initialization if DSN is not provided or error reporting is disabled
        if SENTRY_DSN.is_none() || !error_reporting {
            warn!("Sentry DSN not configured, crash reporting disabled");
            return;
        }

        // With the `panic` feature enabled in Cargo.toml, sentry::init automatically
        // registers a robust global panic handler that captures panics (including from
        // other threads) with stacktraces.
        guard = Some(init((
            SENTRY_DSN.unwrap(),
            ClientOptions {
                release: Some(env!("CARGO_PKG_VERSION").into()),
                ..Default::default()
            },
        )));
        info!("Sentry crash reporting initialized");

        // Set application tags
        set_tag("app.name", "nookat");
        set_tag("app.version", env!("CARGO_PKG_VERSION"));
        set_tag("app.platform", std::env::consts::OS);
    });

    guard
}

/// Set tag for crash reports
pub fn set_tag(key: &str, value: &str) {
    sentry::configure_scope(|scope| {
        scope.set_tag(key, value);
    });
}

/// Flush Sentry events (useful before shutdown)
pub fn flush_sentry() {
    // Basic best-effort flush for this crate version
    std::thread::sleep(std::time::Duration::from_secs(2));
}
