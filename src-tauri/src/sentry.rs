use crate::entities::AppConfig;
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

    if !error_reporting_allowed(ConfigService::get_config()) {
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

fn error_reporting_allowed(config: Result<AppConfig, String>) -> bool {
    match config {
        Ok(config) if config.telemetry.error_reporting => true,
        Ok(_) => {
            info!("Error reporting is turned off in the settings, crash reporting disabled");
            false
        }
        Err(reason) => {
            warn!("Could not read the config ({reason}), crash reporting disabled for this run");
            false
        }
    }
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

pub fn stop_error_reporting() {
    if let Some(client) = Hub::current().client() {
        client.close(Some(FLUSH_TIMEOUT));
        info!("Error reporting turned off in the settings, crash reporting stopped");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sentry::test::TestTransport;
    use sentry::Level;
    use std::sync::Arc;

    fn hub_reporting_to(transport: &Arc<TestTransport>) -> Arc<Hub> {
        let mut options = ClientOptions::default();
        options.dsn = Some("https://public@sentry.invalid/1".parse().unwrap());
        options.transport = Some(Arc::new(transport.clone()));
        Arc::new(Hub::new(
            Some(Arc::new(options.into())),
            Arc::new(Default::default()),
        ))
    }

    #[test]
    fn test_errors_are_reported_while_reporting_is_on() {
        let transport = TestTransport::new();

        Hub::run(hub_reporting_to(&transport), || {
            sentry::capture_message("while reporting is on", Level::Error);
        });

        assert_eq!(transport.fetch_and_clear_events().len(), 1);
    }

    #[test]
    fn test_no_errors_are_reported_after_reporting_is_turned_off() {
        let transport = TestTransport::new();

        Hub::run(hub_reporting_to(&transport), || {
            stop_error_reporting();
            sentry::capture_message("after reporting was turned off", Level::Error);
        });

        assert!(transport.fetch_and_clear_events().is_empty());
    }

    #[test]
    fn a_config_that_cannot_be_read_turns_crash_reporting_off() {
        let unreadable = Err("Failed to read config file: Permission denied".to_string());

        assert!(!error_reporting_allowed(unreadable));
    }

    #[test]
    fn crash_reporting_follows_the_saved_setting() {
        let mut config = AppConfig::default();

        config.telemetry.error_reporting = true;
        assert!(error_reporting_allowed(Ok(config.clone())));

        config.telemetry.error_reporting = false;
        assert!(!error_reporting_allowed(Ok(config)));
    }
}
