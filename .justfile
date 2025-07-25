alias i := install
alias p := pre_commit
alias k := kill_tauri_runs
alias r := tauri_dev

kill_tauri_runs:
    echo "Killing tauri runs"
    ps aux | grep "npm run tauri" | grep -v grep | awk '{print $2}' | xargs -r kill -9


tauri_dev:
    npm run tauri dev


install:
    #!/usr/bin/env bash
    echo "🚀 Setting up development environment..."

    # Install Node.js dependencies
    echo "📦 Installing Node.js dependencies..."
    npm install

    # Install pre-commit hooks
    echo "🔧 Installing pre-commit hooks..."
    pip install pre-commit
    pre-commit install

    # Install Rust components
    echo "🦀 Installing Rust components..."
    rustup component add rustfmt
    rustup component add clippy

    echo "✅ Development environment setup complete!"
    echo "💡 Run 'just p' to run pre-commit checks"

pre_commit:
    #!/usr/bin/env bash
    echo "🔍 Running pre-commit checks on all files..."
    pre-commit run --all-files
