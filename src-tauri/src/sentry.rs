use crate::entities::AppConfig;
use crate::services::ConfigService;
use sentry::protocol::EnvelopeItem;
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
static ERROR_REPORTING: LazyLock<Arc<ReportingSwitch>> =
    LazyLock::new(|| Arc::new(ReportingSwitch::new(false)));

struct ReportingSwitch {
    enabled: AtomicBool,
    off_since_last_envelope: AtomicBool,
}

impl ReportingSwitch {
    fn new(enabled: bool) -> Self {
        Self {
            enabled: AtomicBool::new(enabled),
            off_since_last_envelope: AtomicBool::new(!enabled),
        }
    }

    fn set(&self, enabled: bool) {
        if !enabled {
            self.off_since_last_envelope.store(true, Ordering::SeqCst);
        }
        self.enabled.store(enabled, Ordering::SeqCst);
    }

    fn is_on(&self) -> bool {
        self.enabled.load(Ordering::SeqCst)
    }

    fn take_off_period(&self) -> bool {
        self.off_since_last_envelope.swap(false, Ordering::SeqCst)
    }
}

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
    reporting: Arc<ReportingSwitch>,
    transport: Arc<dyn TransportFactory>,
) -> ClientOptions {
    let breadcrumbs_reporting = reporting.clone();
    let logs_reporting = reporting.clone();
    let mut options = ClientOptions::default();
    options.dsn = dsn.parse().ok();
    options.release = Some(env!("CARGO_PKG_VERSION").into());
    options.transport = Some(Arc::new(GatedTransportFactory {
        reporting,
        inner: transport,
    }));
    options.before_breadcrumb = Some(Arc::new(move |breadcrumb| {
        breadcrumbs_reporting.is_on().then_some(breadcrumb)
    }));
    options.before_send_log = Some(Arc::new(move |log| logs_reporting.is_on().then_some(log)));
    options
}

struct GatedTransportFactory {
    reporting: Arc<ReportingSwitch>,
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
    reporting: Arc<ReportingSwitch>,
    inner: Arc<dyn Transport>,
}

impl Transport for GatedTransport {
    fn send_envelope(&self, envelope: Envelope) {
        if !self.reporting.is_on() {
            return;
        }
        if self.reporting.take_off_period() {
            self.inner.send_envelope(without_client_reports(envelope));
        } else {
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

fn without_client_reports(envelope: Envelope) -> Envelope {
    let mut kept = Envelope::new().with_headers(envelope.headers().clone());
    envelope
        .into_items()
        .filter(|item| !matches!(item, EnvelopeItem::ClientReport(_)))
        .for_each(|item| kept.add_item(item));
    kept
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
    ERROR_REPORTING.set(enabled);
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
        switch: Arc<ReportingSwitch>,
        transport: Arc<TestTransport>,
        hub: Arc<Hub>,
    }

    impl Reporting {
        fn starting(enabled: bool) -> Self {
            let switch = Arc::new(ReportingSwitch::new(enabled));
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
            self.switch.set(enabled);
        }

        fn run(&self, body: impl FnOnce()) {
            Hub::run(self.hub.clone(), body);
        }

        fn flush(&self) {
            if let Some(client) = self.hub.client() {
                client.flush(Some(FLUSH_TIMEOUT));
            }
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

    fn has_client_report(envelope: &Envelope) -> bool {
        envelope
            .items()
            .any(|item| matches!(item, EnvelopeItem::ClientReport(_)))
    }

    #[test]
    fn logs_from_while_reporting_was_off_are_not_sent_later() {
        for starting_enabled in [false, true] {
            let reporting = Reporting::starting(starting_enabled);

            reporting.turn(false);
            reporting.run(|| sentry::logger_info!("while off"));
            reporting.turn(true);
            reporting.flush();
            assert!(reporting.transport.fetch_and_clear_envelopes().is_empty());

            reporting.run(capture_error);

            let envelopes = reporting.transport.fetch_and_clear_envelopes();
            assert_eq!(envelopes.len(), 1);
            assert!(envelopes[0].event().is_some());
            assert!(!has_client_report(&envelopes[0]));
        }
    }

    #[test]
    fn logs_are_sent_while_reporting_is_on() {
        let reporting = Reporting::starting(true);

        reporting.run(|| sentry::logger_info!("while on"));
        reporting.flush();

        assert_eq!(reporting.transport.fetch_and_clear_envelopes().len(), 1);
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
