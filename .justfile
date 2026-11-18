set dotenv-load := true

alias i := install
alias p := pre_commit
alias k := kill_tauri_runs
alias r := tauri_dev
alias b := tauri_build
alias c := clean
alias v := upgrade_version
alias rc := remove_colima

kill_tauri_runs:
    echo "Killing tauri runs"
    ps aux | grep "npm run tauri" | grep -v grep | awk '{print $2}' | xargs -r kill -9
    lsof -i:1420 | awk 'NR>1 {print $2}' | xargs -r kill -9

remove_colima:
    echo "Removing Colima..."
    rm -rf ~/.colima
    rm -rf ~/.local/bin/colima
    rm -rf ~/.local/bin/lima
    rm -rf ~/.local/bin/limactl
    rm -rf ~/.local/bin/nerdctl
    rm -rf ~/.local/bin/nerdctl.lima
    rm -rf ~/.local/bin/podman.lima
    rm -rf ~/.local/bin/apptainer.lima
    rm -rf ~/.local/bin/kubectl.lima
    rm -rf ~/.local/bin/docker.lima
    rm -rf ~/.local/share/lima

clean:
    echo "Cleaning up..."
    rm -rf dist
    rm -rf node_modules
    cd src-tauri && cargo clean && cd ..

tauri_dev:
    SENTRY_DSN="$SENTRY_DSN" npm run tauri dev

tauri_build:
    SENTRY_DSN="$SENTRY_DSN" npm run tauri build

install:
    #!/usr/bin/env bash
    echo "🚀 Setting up development environment..."

    echo "📦 Installing Node.js dependencies..."
    npm install

    echo "🔧 Installing pre-commit hooks..."
    pip install pre-commit
    pre-commit install

    echo "🦀 Installing Rust components..."
    rustup component add rustfmt
    rustup component add clippy

    echo "Setting up environment variables for Nookat..."

    if [ ! -f .env ]; then
        echo "Creating .env file from env.example..."
        cp env.example .env
        echo "✅ .env file created"
    else
        echo "⚠️  .env file already exists"
    fi

    echo ""
    echo "📝 Please edit .env file and add your Aptabase app key:"
    echo "✅ Development environment setup complete!"
    echo "💡 Run 'just p' to run pre-commit checks"

pre_commit:
    #!/usr/bin/env bash
    echo "🔍 Running pre-commit checks on all files..."
    pre-commit run --all-files

upgrade_version version:
    #!/usr/bin/env bash
    echo "🔄 Upgrading version number to v{{version}}..."

    if [ -f package.json ]; then
        jq '.version = "{{version}}"' package.json > package.json.tmp && mv package.json.tmp package.json
        echo "✅ Updated version in package.json"
    else
        echo "❌ package.json not found!"
    fi

    if [ -f src-tauri/tauri.conf.json ]; then
        jq '.version = "{{version}}"' src-tauri/tauri.conf.json > src-tauri/tauri.conf.json.tmp && mv src-tauri/tauri.conf.json.tmp src-tauri/tauri.conf.json
        echo "✅ Updated version in src-tauri/tauri.conf.json"
    else
        echo "❌ src-tauri/tauri.conf.json not found!"
    fi

    if [ -f src-tauri/Cargo.toml ]; then
        sed -i.bak -E "s/^version = \".*\"/version = \"{{version}}\"/" src-tauri/Cargo.toml && rm src-tauri/Cargo.toml.bak
        echo "✅ Updated version in src-tauri/Cargo.toml"
    else
        echo "❌ src-tauri/Cargo.toml not found!"
    fi
    echo "🎉 Version upgrade complete!"
