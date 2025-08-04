# Nookat

A modern Docker management application built with Tauri, React, and TypeScript.

## Features

- Container management and monitoring
- Image management
- Network configuration
- Volume management
- Settings and configuration
- Anonymous usage analytics (optional)

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://rustup.rs/) (latest stable)
- [Docker](https://docker.com/) (for testing Docker functionality)

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see Analytics Configuration below)
4. Start development server: `npm run tauri dev`

## Analytics Configuration

This application includes optional anonymous usage analytics powered by Aptabase. To configure analytics:

1. Copy `env.example` to `.env`
2. Add your Aptabase app key:
   ```
   VITE_APTABASE_APP_KEY=your_aptabase_app_key_here
   ```
3. Optionally configure other settings:
   ```
   VITE_ANALYTICS_ENABLED=true
   VITE_APP_VERSION=0.1.1
   ```

### Environment Variables

- `VITE_APTABASE_APP_KEY` (required): Your Aptabase app key from the dashboard
- `VITE_ANALYTICS_ENABLED` (optional): Enable/disable analytics (default: true)
- App version is automatically read from `package.json` during build

### Privacy

- All analytics data is anonymous
- No personally identifiable information is collected
- Analytics can be disabled via environment variables
- Data is transmitted securely to Aptabase servers

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
