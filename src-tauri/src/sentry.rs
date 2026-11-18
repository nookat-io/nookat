use crate::services::ConfigService;
use sentry::{init, ClientInitGuard, ClientOptions, Hub};
use std::time::Duration;
use tracing::{info, warn};

static SENTRY_DSN: Option<&'static str> = option_env!("SENTRY_DSN");
const FLUSH_TIMEOUT: Duration = Duration::from_secs(2);

pub fn init_sentry() -> Option<ClientInitGuard> {
    info!("Initializing Sentry crash reporting");

    let Some(dsn) = SENTRY_DSN else {
        warn!("Sentry DSN not configured, crash reporting disabled");
        return None;
    };

    let config = ConfigService::get_config().expect("Failed to get config");
    if !config.telemetry.error_reporting {
        info!("Error reporting is turned off in the settings, crash reporting disabled");
        return None;
    }

    let mut options = ClientOptions::default();
    options.release = Some(env!("CARGO_PKG_VERSION").into());

    let guard = init((dsn, options));
    info!("Sentry crash reporting initialized");

    set_tag("app.name", "nookat");
    set_tag("app.version", env!("CARGO_PKG_VERSION"));
    set_tag("app.platform", std::env::consts::OS);

    Some(guard)
}

fn set_tag(key: &str, value: &str) {
    sentry::configure_scope(|scope| {
        scope.set_tag(key, value);
    });
}

pub fn flush_sentry() {
    if let Some(client) = Hub::current().client() {
        client.flush(Some(FLUSH_TIMEOUT));
    }
}
