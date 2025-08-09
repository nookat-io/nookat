fn main() {
    if std::env::var("SENTRY_DSN").is_err() {
        println!("cargo:warning=SENTRY_DSN is not set");
    } else {
        println!("cargo:warning=SENTRY_DSN is set");
    }

    tauri_build::build()
}
