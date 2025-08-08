use sentry::{ClientInitGuard, init, ClientOptions};
use std::sync::Once;
use tracing::warn;

static INIT: Once = Once::new();

pub fn init_sentry() -> Option<ClientInitGuard> {
    tracing::info!("Initializing Sentry crash reporting");

    let dsn: String = std::env::var("SENTRY_DSN").unwrap_or_else(|_| "".to_string());

    // Only initialize once
    let mut guard = None;
    INIT.call_once(|| {
        // Skip initialization if no valid DSN is provided
        if dsn.is_empty() {
            warn!("Sentry DSN not configured, crash reporting disabled");
            return;
        }

        // With the `panic` feature enabled in Cargo.toml, sentry::init automatically
        // registers a robust global panic handler that captures panics (including from
        // other threads) with stacktraces.
        guard = Some(init((
            dsn,
            ClientOptions {
                release: Some(env!("CARGO_PKG_VERSION").into()),
                ..Default::default()
            },
        )));
    });

    // Set application tags
    set_tag("app.name", "nookat");
    set_tag("app.version", env!("CARGO_PKG_VERSION"));
    set_tag("app.platform", std::env::consts::OS);

    tracing::info!("Sentry crash reporting initialized");
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
