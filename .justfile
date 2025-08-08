set dotenv-load := true

alias i := install
alias p := pre_commit
alias k := kill_tauri_runs
alias r := tauri_dev
alias c := clean

kill_tauri_runs:
    echo "Killing tauri runs"
    ps aux | grep "npm run tauri" | grep -v grep | awk '{print $2}' | xargs -r kill -9

clean:
    echo "Cleaning up..."
    rm -rf dist
    rm -rf node_modules
    cd src-tauri && cargo clean && cd ..

tauri_dev:
    SENTRY_DSN="$SENTRY_DSN" npm run tauri dev


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

    # Setup environment variables for Nookat
    echo "Setting up environment variables for Nookat..."

    # Check if .env file exists
    if [ ! -f .env ]; then
        echo "Creating .env file from env.example..."
        cp env.example .env
        echo "✅ .env file created"
    else
        echo "⚠️  .env file already exists"
    fi

    echo ""
    echo "📝 Please edit .env file and add your Aptabase app key:"
    echo "   VITE_APTABASE_APP_KEY=your_actual_app_key_here"
    echo ""
    echo "🔗 Get your app key from: https://aptabase.com/dashboard"
    echo ""
    echo "📊 Analytics will be disabled if no app key is provided"
    echo "📦 App version will be automatically read from package.json"

    echo "✅ Development environment setup complete!"
    echo "💡 Run 'just p' to run pre-commit checks"

pre_commit:
    #!/usr/bin/env bash
    echo "🔍 Running pre-commit checks on all files..."
    pre-commit run --all-files

upgrade_version version:
    #!/usr/bin/env bash
    echo "🔄 Upgrading version number to v{{version}}..."

    # Update version in package.json
    if [ -f package.json ]; then
        jq '.version = "{{version}}"' package.json > package.json.tmp && mv package.json.tmp package.json
        echo "✅ Updated version in package.json"
    else
        echo "❌ package.json not found!"
    fi

    # Update version in src-tauri/tauri.conf.json
    if [ -f src-tauri/tauri.conf.json ]; then
        jq '.version = "{{version}}"' src-tauri/tauri.conf.json > src-tauri/tauri.conf.json.tmp && mv src-tauri/tauri.conf.json.tmp src-tauri/tauri.conf.json
        echo "✅ Updated version in src-tauri/tauri.conf.json"
    else
        echo "❌ src-tauri/tauri.conf.json not found!"
    fi

    # Update version in src-tauri/Cargo.toml
    if [ -f src-tauri/Cargo.toml ]; then
        sed -i.bak -E "s/^version = \".*\"/version = \"{{version}}\"/" src-tauri/Cargo.toml && rm src-tauri/Cargo.toml.bak
        echo "✅ Updated version in src-tauri/Cargo.toml"
    else
        echo "❌ src-tauri/Cargo.toml not found!"
    fi
    echo "🎉 Version upgrade complete!"
