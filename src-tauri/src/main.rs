#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use nookat_lib::sentry::init_sentry;
use sentry_tracing::{BreadcrumbLayer, ErrorLayer, LogLayer, SpanLayer};
use tracing::{Level, Subscriber};
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::filter::{filter_fn, LevelFilter};
use tracing_subscriber::registry::LookupSpan;
use tracing_subscriber::EnvFilter;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, Layer};

fn sentry_layer<S>() -> impl Layer<S>
where
    S: Subscriber + for<'a> LookupSpan<'a>,
{
    let spans_from_info = SpanLayer::new().with_filter(LevelFilter::INFO);
    let breadcrumbs_from_warn_and_info =
        BreadcrumbLayer::new().with_filter(filter_fn(|metadata| {
            matches!(*metadata.level(), Level::WARN | Level::INFO)
        }));
    let error_events_from_error = ErrorLayer::new().with_filter(LevelFilter::ERROR);
    let structured_logs_from_info = LogLayer::new().with_filter(LevelFilter::INFO);

    spans_from_info
        .and_then(breadcrumbs_from_warn_and_info)
        .and_then(error_events_from_error)
        .and_then(structured_logs_from_info)
}

fn setup_file_logging() -> Result<RollingFileAppender, Box<dyn std::error::Error>> {
    let home_dir = dirs::home_dir().ok_or("Could not determine home directory")?;

    let logs_dir = home_dir.join(".nookat").join("logs");
    std::fs::create_dir_all(&logs_dir)?;

    let file_appender = RollingFileAppender::builder()
        .rotation(Rotation::DAILY)
        .filename_suffix("log")
        .max_log_files(5)
        .build(&logs_dir)?;
    Ok(file_appender)
}

fn initialize_tracing(file_appender: Option<RollingFileAppender>) {
    if let Some(file_appender) = file_appender {
        tracing_subscriber::registry()
            .with(
                EnvFilter::try_from_default_env()
                    .unwrap_or_else(|_| "nookat_lib=debug,bollard=warn,info".into()),
            )
            .with(
                tracing_subscriber::fmt::layer()
                    .with_writer(file_appender)
                    .with_ansi(false)
                    .with_filter(LevelFilter::DEBUG),
            )
            .with(tracing_subscriber::fmt::layer().with_filter(LevelFilter::INFO))
            .with(sentry_layer())
            .init();
    } else {
        tracing_subscriber::registry()
            .with(
                EnvFilter::try_from_default_env()
                    .unwrap_or_else(|_| "nookat_lib=info,bollard=warn,info".into()),
            )
            .with(tracing_subscriber::fmt::layer())
            .with(sentry_layer())
            .init();
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let file_appender = setup_file_logging()
        .map_err(|e| eprintln!("Failed to initialize file logging: {}", e))
        .ok();

    initialize_tracing(file_appender);

    let _guard = init_sentry();
    nookat_lib::run();

    Ok(())
}
