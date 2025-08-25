// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use nookat_lib::sentry::init_sentry;
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::EnvFilter;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, Layer};

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

fn initialize_tracing(
    file_appender: Option<RollingFileAppender>,
) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(file_appender) = file_appender {
        // Create subscriber with file output using registry approach
        tracing_subscriber::registry()
            .with(
                EnvFilter::try_from_default_env()
                    .unwrap_or_else(|_| "nookat_lib=debug,bollard=warn,info".into()),
            )
            .with(
                tracing_subscriber::fmt::layer()
                    .with_writer(file_appender)
                    .with_ansi(false)
                    .with_filter(tracing_subscriber::filter::LevelFilter::DEBUG),
            )
            .with(
                tracing_subscriber::fmt::layer()
                    .with_filter(tracing_subscriber::filter::LevelFilter::INFO),
            )
            .with(sentry_tracing::layer())
            .init();
    } else {
        tracing_subscriber::registry()
            .with(
                EnvFilter::try_from_default_env()
                    .unwrap_or_else(|_| "nookat_lib=debug,bollard=warn,info".into()),
            )
            .with(tracing_subscriber::fmt::layer())
            .with(sentry_tracing::layer())
            .init();
    }

    Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let file_appender = setup_file_logging()
        .map_err(|e| eprintln!("Failed to initialize file logging: {}", e))
        .ok();

    let _ = initialize_tracing(file_appender);

    let _guard = init_sentry();
    nookat_lib::run();

    Ok(())
}
