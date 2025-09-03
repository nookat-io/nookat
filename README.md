<h1 align="center">
  <img src="public/logo.png" alt="Nookat" width="200" />
</h1>

<p align="center">
Nookat is a lightweight container management tool that provides all the essential features you need without the bloat. Fast, intuitive, and completely free.
</p>

<p align="center">
Built with <strong>Tauri</strong>, <strong>React</strong>, and <strong>TypeScript</strong>.
</p>

<div align="center">

![GitHub Release](https://img.shields.io/github/v/release/nookat-io/nookat)
[![built_with-Rust](https://img.shields.io/badge/built_with-Rust-dca282.svg?style=flat-square)](https://www.rust-lang.org/)
[![built_with-React](https://img.shields.io/badge/built_with-React-61dafb.svg?style=flat-square)](https://reactjs.org/)
[![built_with-Tauri](https://img.shields.io/badge/built_with-Tauri-ffc131.svg?style=flat-square)](https://tauri.app/)

</div>

<div align="center">

[![Linux Support](https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://github.com/nookat-io/nookat/releases)
[![macOS Support](https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/nookat-io/nookat/releases)
[![Windows Support](https://img.shields.io/badge/windows-838C91?style=for-the-badge&logo=compilerexplorer&logoColor=white)](https://github.com/nookat-io/nookat/releases)

</div>

<div align="center">

**Get started for free.** [Download](https://github.com/nookat-io/nookat/releases) | [Website](https://nookat-io.github.io)

</div>

---

## Key Features

- **🚀 Lightweight & Fast**: Built with Rust and Tauri for optimal performance
- **📦 Container Management**: Start, stop, and manage containers with ease
- **🖼️ Image Management**: Browse, pull, and manage Docker images
- **🌐 Network Management**: Configure and monitor Docker networks
- **💾 Volume Management**: Handle Docker volumes and data persistence
- **⚙️ Settings & Configuration**: Customize your Docker experience
- **🔧 Auto Container Engine Setup**: Downloads and Installs container engines if needed, with Colima as the default
- **🎨 Modern UI**: Clean, intuitive interface built with React and Tailwind CSS
- **🆓 Completely Free**: No premium features, no subscriptions

## Screenshots

<div align="center">

![Containers Page](screenshots/dark/containers.png)
_Container management interface_

</div>

> **📸 More Screenshots Available**
>
> Explore the complete collection of screenshots in the [`screenshots/`](screenshots/) folder, including both light and dark theme variants for all major features

## Installation

### Prerequisites

- **macOS**: macOS 10.15 or later
- **Linux**: Most modern distributions
- **Windows**: Windows 10 or later
- **Any Docker-compatible container runtime**, or install Colima in Nookat app settings
- [Tauri](https://tauri.app/start/prerequisites/) (for development)

### Download Nookat

You can download the latest release from [GitHub Releases](https://github.com/nookat-io/nookat/releases):

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://rustup.rs/) (latest stable)

### Build from Source

```bash
# Clone the repository
git clone https://github.com/nookat-io/nookat.git
cd nookat

# Install dependencies
npm i

# Set up environment variables
cp env.example .env

# Start development server
npm run tauri dev
```

### Available Scripts

- `npm run tauri dev` - Start Tauri development mode
- `npm run build` - Build for production

> **💡 Pro Tip**: Most of the convenient development scripts are available in the `justfile`. Check out `just --list` to see all available commands, or run `just` to see the most common ones.

## Architecture

Nookat is built with a modern, cross-platform architecture:

- **Frontend**: React with TypeScript and Tailwind CSS
- **Backend**: Rust with Tauri
- **Container Engine**: Colima an Lima as a container runtime
- **Docker API**: bollard-rs for Docker daemon communication

## Contributing

We welcome contributions from the community! Here's how to get started:

1. **Fork** the repository
2. **Create** a new branch (`git checkout -b feature/YourFeature`)
3. **Make** your changes
4. **Commit** your changes (`git commit -am 'Add YourFeature'`)
5. **Push** to the branch (`git push origin feature/YourFeature`)
6. **Open** a Pull Request

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) with extensions:
  - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
  - [TypeScript Importer](https://marketplace.visualstudio.com/items?itemName=pmneo.tsimporter)

## License

Nookat is licensed under the [Apache License 2.0](LICENSE).

## Acknowledgements

- Built with [Tauri](https://tauri.app/), [React](https://reactjs.org/), and [Rust](https://www.rust-lang.org/), [bollard-rs](https://github.com/fussybeaver/bollard)

## Community

- **GitHub**: [nookat-io/nookat](https://github.com/nookat-io/nookat)
- **Issues**: [Report bugs or request features](https://github.com/nookat-io/nookat/issues)
- **Discussions**: [Join the community](https://github.com/nookat-io/nookat/discussions)

## Support

If you encounter any issues or have questions:

1. Check the [GitHub Issues](https://github.com/nookat-io/nookat/issues) page
2. Search existing discussions
3. Create a new issue with detailed information
4. Join our community discussions

---

<div align="center">

**Made with ❤️ for the container community**

</div>
