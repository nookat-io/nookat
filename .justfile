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
    set -euo pipefail
    echo "🔄 Upgrading version number to v{{version}}..."

    npm version "{{version}}" --no-git-tag-version --allow-same-version > /dev/null
    if ! jq -e '.version == "{{version}}" and .packages[""].version == "{{version}}"' package-lock.json > /dev/null; then
        echo "❌ npm version did not record {{version}} in package-lock.json"
        exit 1
    fi
    echo "✅ Updated version in package.json and package-lock.json"

    jq '.version = "{{version}}"' src-tauri/tauri.conf.json > src-tauri/tauri.conf.json.tmp
    mv src-tauri/tauri.conf.json.tmp src-tauri/tauri.conf.json
    npx --no-install prettier --write src-tauri/tauri.conf.json > /dev/null
    echo "✅ Updated version in src-tauri/tauri.conf.json"

    sed -i.bak -E "s/^version = \".*\"/version = \"{{version}}\"/" src-tauri/Cargo.toml
    rm src-tauri/Cargo.toml.bak
    (cd src-tauri && cargo update --workspace --offline --quiet)
    echo "✅ Updated version in src-tauri/Cargo.toml and src-tauri/Cargo.lock"

    echo "🎉 Version upgrade complete!"
