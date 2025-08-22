fn main() {
    if std::env::var("SENTRY_DSN").is_err() {
        println!("cargo:warning=SENTRY_DSN is not set");
    } else {
        // Intentionally using warning level to see the log-entry in the build output.
        println!("cargo:warning=SENTRY_DSN is set");
    }

    tauri_build::build()
}
