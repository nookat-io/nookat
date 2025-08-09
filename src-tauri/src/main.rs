// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use nookat_lib::sentry::init_sentry;
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::EnvFilter;
use tracing_subscriber::util::SubscriberInitExt;

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

    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "info".into());

    // Use a very simple approach that should work with this version
    if let Some(file_appender) = file_appender {
        // Create subscriber with file output only (console will be handled by default)
        let subscriber = tracing_subscriber::fmt::Subscriber::builder()
            .with_env_filter(env_filter)
            .with_writer(file_appender)
            .with_ansi(false)
            .finish();

        subscriber.init();
    } else {
        // Create basic console subscriber
        let subscriber = tracing_subscriber::fmt::Subscriber::builder()
            .with_env_filter(env_filter)
            .finish();

        subscriber.init();
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
