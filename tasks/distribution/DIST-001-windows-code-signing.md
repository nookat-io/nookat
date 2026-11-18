# [DIST-001] Sign the Windows build

- **Status:** Blocked
- **Blocked by:** a paid Windows code-signing certificate (Authenticode, or an Azure Trusted Signing account)
- **Related:** DIST-002, DIST-005, DIST-008

## Problem

Windows users need an application that meets Microsoft's security requirements.
The Windows installers are unsigned, so Windows Defender SmartScreen and other security tools flag them as potentially unsafe.
That triggers security warnings, can prevent installation, and reduces user trust.

## Current state

`.github/workflows/build-windows.yaml` builds the NSIS installer (`*-setup.exe`) and the MSI with `tauri-apps/tauri-action` and has no signing step.
`src-tauri/tauri.conf.json` has no `bundle.windows` certificate configuration.
The only signatures on the Windows artifacts are the Tauri updater's minisign `.sig` files, which Windows does not check.

## Scope

- Store the Authenticode certificate securely, for example in Azure Key Vault or an Azure Trusted Signing account, and expose it to CI through secrets.
- Sign the `.exe` and `.msi` installers and the bundled executables automatically in `build-windows.yaml`.
- Add RFC 3161 timestamping so signatures stay valid after the certificate expires.
- Verify the signature in CI (for example with `signtool verify /pa`) and fail the release when it is missing.
- Report signing failures clearly in the workflow output.
- Show the signing status and certificate information in the app.

## Notes

- Alternatives considered:
  - Manual signing is too error-prone and doesn't scale with automated builds.
  - Third-party signing services could work but add an external dependency and potential security concerns.
  - Self-signed certificates are not suitable for production because they don't give users trust.
  - Not signing is not viable, because it significantly hurts adoption and security compliance.
- This is part of the code signing work across all platforms: Linux is DIST-002 and macOS is DIST-008.
- macOS releases are only ad-hoc signed since dfe9427, so no platform has a trusted signature yet.
- Windows code signing is critical for enterprise adoption and is a prerequisite for the Microsoft Store (DIST-005).
- Must comply with Microsoft's code signing requirements and best practices.
