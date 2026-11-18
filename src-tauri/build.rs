fn show_in_build_output(message: &str) {
    println!("cargo:warning={message}");
}

fn main() {
    let sentry_dsn_state = if std::env::var("SENTRY_DSN").is_ok() {
        "set"
    } else {
        "not set"
    };
    show_in_build_output(&format!("SENTRY_DSN is {sentry_dsn_state}"));

    tauri_build::build()
}
