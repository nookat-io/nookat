use crate::entities::AppConfig;
use crate::services::ConfigService;
use sentry::transports::DefaultTransportFactory;
use sentry::{
    init, ClientInitGuard, ClientOptions, Envelope, Hub, Transport, TransportFactory,
    TransportOptions,
};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, LazyLock};
use std::time::Duration;
use tracing::{info, warn};

static SENTRY_DSN: Option<&'static str> = option_env!("SENTRY_DSN");
const FLUSH_TIMEOUT: Duration = Duration::from_secs(2);
static ERROR_REPORTING: LazyLock<Arc<AtomicBool>> =
    LazyLock::new(|| Arc::new(AtomicBool::new(false)));

pub fn init_sentry() -> Option<ClientInitGuard> {
    info!("Initializing Sentry crash reporting");

    let Some(dsn) = SENTRY_DSN else {
        warn!("Sentry DSN not configured, crash reporting disabled");
        return None;
    };

    set_error_reporting(error_reporting_allowed(ConfigService::get_config()));

    let options = client_options(
        dsn,
        ERROR_REPORTING.clone(),
        Arc::new(DefaultTransportFactory),
    );
    let guard = init(options);
    info!("Sentry crash reporting initialized");

    set_tag("app.name", "nookat");
    set_tag("app.version", env!("CARGO_PKG_VERSION"));
    set_tag("app.platform", std::env::consts::OS);

    Some(guard)
}

fn client_options(
    dsn: &str,
    reporting: Arc<AtomicBool>,
    transport: Arc<dyn TransportFactory>,
) -> ClientOptions {
    let breadcrumbs_reporting = reporting.clone();
    let mut options = ClientOptions::default();
    options.dsn = dsn.parse().ok();
    options.release = Some(env!("CARGO_PKG_VERSION").into());
    options.transport = Some(Arc::new(GatedTransportFactory {
        reporting,
        inner: transport,
    }));
    options.before_breadcrumb = Some(Arc::new(move |breadcrumb| {
        breadcrumbs_reporting
            .load(Ordering::Relaxed)
            .then_some(breadcrumb)
    }));
    options
}

struct GatedTransportFactory {
    reporting: Arc<AtomicBool>,
    inner: Arc<dyn TransportFactory>,
}

impl TransportFactory for GatedTransportFactory {
    fn create_transport_with_options(&self, options: TransportOptions) -> Arc<dyn Transport> {
        Arc::new(GatedTransport {
            reporting: self.reporting.clone(),
            inner: self.inner.create_transport_with_options(options),
        })
    }
}

struct GatedTransport {
    reporting: Arc<AtomicBool>,
    inner: Arc<dyn Transport>,
}

impl Transport for GatedTransport {
    fn send_envelope(&self, envelope: Envelope) {
        if self.reporting.load(Ordering::Relaxed) {
            self.inner.send_envelope(envelope);
        }
    }

    fn flush(&self, timeout: Duration) -> bool {
        self.inner.flush(timeout)
    }

    fn shutdown(&self, timeout: Duration) -> bool {
        self.inner.shutdown(timeout)
    }
}

fn error_reporting_allowed(config: Result<AppConfig, String>) -> bool {
    match config {
        Ok(config) if config.telemetry.error_reporting => true,
        Ok(_) => {
            info!("Error reporting is turned off in the settings, crash reporting disabled");
            false
        }
        Err(reason) => {
            warn!("Could not read the config ({reason}), crash reporting starts turned off");
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

pub fn set_error_reporting(enabled: bool) {
    ERROR_REPORTING.store(enabled, Ordering::Relaxed);
    info!(
        "Crash reporting turned {}",
        if enabled { "on" } else { "off" }
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use sentry::protocol::Breadcrumb;
    use sentry::test::TestTransport;
    use sentry::Level;

    struct Reporting {
        switch: Arc<AtomicBool>,
        transport: Arc<TestTransport>,
        hub: Arc<Hub>,
    }

    impl Reporting {
        fn starting(enabled: bool) -> Self {
            let switch = Arc::new(AtomicBool::new(enabled));
            let transport = TestTransport::new();
            let options = client_options(
                "https://public@sentry.invalid/1",
                switch.clone(),
                Arc::new(transport.clone()),
            );
            let hub = Arc::new(Hub::new(
                Some(Arc::new(options.into())),
                Arc::new(Default::default()),
            ));
            Self {
                switch,
                transport,
                hub,
            }
        }

        fn turn(&self, enabled: bool) {
            self.switch.store(enabled, Ordering::Relaxed);
        }

        fn run(&self, body: impl FnOnce()) {
            Hub::run(self.hub.clone(), body);
        }
    }

    fn capture_error() {
        sentry::capture_message("backend error", Level::Error);
    }

    #[test]
    fn test_errors_are_reported_while_reporting_is_on() {
        let reporting = Reporting::starting(true);

        reporting.run(capture_error);

        assert_eq!(reporting.transport.fetch_and_clear_events().len(), 1);
    }

    #[test]
    fn nothing_is_sent_while_reporting_is_off() {
        let reporting = Reporting::starting(false);

        reporting.run(capture_error);

        assert!(reporting.transport.fetch_and_clear_envelopes().is_empty());
    }

    #[test]
    fn errors_are_reported_once_reporting_is_turned_on_after_a_launch_with_it_off() {
        let reporting = Reporting::starting(false);

        reporting.turn(true);
        reporting.run(capture_error);

        assert_eq!(reporting.transport.fetch_and_clear_events().len(), 1);
    }

    #[test]
    fn errors_are_reported_again_when_reporting_is_turned_back_on() {
        let reporting = Reporting::starting(true);

        reporting.run(capture_error);
        assert_eq!(reporting.transport.fetch_and_clear_events().len(), 1);

        reporting.turn(false);
        reporting.run(capture_error);
        assert!(reporting.transport.fetch_and_clear_envelopes().is_empty());

        reporting.turn(true);
        reporting.run(capture_error);
        assert_eq!(reporting.transport.fetch_and_clear_events().len(), 1);
    }

    #[test]
    fn breadcrumbs_from_while_reporting_was_off_are_not_sent_later() {
        let reporting = Reporting::starting(false);

        reporting.run(|| {
            sentry::add_breadcrumb(Breadcrumb {
                message: Some("while off".into()),
                ..Default::default()
            })
        });
        reporting.turn(true);
        reporting.run(|| {
            sentry::add_breadcrumb(Breadcrumb {
                message: Some("while on".into()),
                ..Default::default()
            });
            capture_error();
        });

        let events = reporting.transport.fetch_and_clear_events();
        assert_eq!(events.len(), 1);
        let messages: Vec<_> = events[0]
            .breadcrumbs
            .iter()
            .filter_map(|breadcrumb| breadcrumb.message.as_deref())
            .collect();
        assert_eq!(messages, ["while on"]);
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
