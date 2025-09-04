---
name: Feature request
about: Implement Linux code signing for application security and trust
title: '[DIST-002] Implement Linux code signing'
labels: 'distribution, security, linux'
assignees: ''
---

**Is your feature request related to a problem? Please describe.**
Linux users need secure and trusted applications that meet distribution security requirements. Currently, our application lacks proper code signing for Linux, which can prevent installation on secure systems, trigger package manager warnings, and reduce user trust. Many Linux distributions and security tools require signed packages for installation.

**Describe the solution you'd like**
Implement comprehensive Linux code signing with explicit workflows for each target format:

## Package Format Signing Workflows

### .deb Package Signing (Ubuntu/Debian)

**Build Process:**

1. `dpkg-buildpackage` → generates .deb and .changes files
2. `debsign -k <GPG_KEY_ID> *.changes` → signs .changes file with GPG
3. `dpkg-sig --sign builder -k <GPG_KEY_ID> *.deb` → signs .deb package

**Artifacts:**

- Signed `.changes` file (contains package metadata and GPG signature)
- Signed `.deb` package with embedded GPG signature
- `Release` file signed with GPG for apt repository metadata

**Repository Integration:**

- `reprepro` or `aptly` to manage signed repository
- GPG-signed `Release` file in `.dists/<suite>/Release`
- `Release.gpg` detached signature file
- `InRelease` file with inline GPG signature

**Tools:** `dpkg-sig`, `debsign`, `reprepro`/`aptly`, `gpg`

### .rpm Package Signing (Red Hat/Fedora/CentOS)

**Build Process:**

1. `rpmbuild -ba nookat.spec` → generates .rpm package
2. `rpm --addsign -D "_gpg_name <GPG_KEY_ID>" *.rpm` → signs .rpm with GPG
3. `createrepo_c .` → generates repository metadata
4. `gpg --detach-sign --armor repodata/repomd.xml` → signs repodata

**Artifacts:**

- Signed `.rpm` package with embedded GPG signature
- `repomd.xml` with GPG signature (`repomd.xml.asc`)
- Repository metadata in `repodata/` directory

**Repository Integration:**

- GPG-signed `repomd.xml` for yum/dnf repository metadata
- Repository configuration with GPG key import instructions
- Support for both GPG and RPM-specific signing keys

**Tools:** `rpm`, `rpm-sign`, `createrepo_c`, `gpg`

### AppImage Signing (Universal Linux)

**Build Process:**

1. `appimagetool <appdir> nookat.AppImage` → generates AppImage
2. `gpg --detach-sign --armor nookat.AppImage` → creates detached signature
3. `zsyncmake nookat.AppImage` → generates zsync file for updates

**Artifacts:**

- `nookat.AppImage` (unsigned binary)
- `nookat.AppImage.sig` (GPG detached signature)
- `nookat.AppImage.zsync` (for delta updates)
- Optional: `nookat.AppImage.zsync.sig` (signed zsync file)

**Update Integration:**

- AppImageUpdate integration for automatic updates
- Zsync support for delta updates
- GPG signature verification before update installation

**Tools:** `appimagetool`, `gpg`, `zsyncmake`, `AppImageUpdate`

## Repository Signing

### APT Repository Signing

- GPG-signed `Release` files in each distribution suite
- `Release.gpg` detached signatures
- `InRelease` files with inline signatures
- Repository key distribution via `apt-key` or `sources.list` integration

### YUM/DNF Repository Signing

- GPG-signed `repomd.xml` files
- Repository GPG key configuration
- Package signature verification during installation

## Certificate and Key Management

### Secure Key Storage

- **HSM Integration**: Hardware Security Modules for key protection
- **Cloud KMS**: AWS KMS, Azure Key Vault, or Google Cloud KMS
- **HashiCorp Vault**: Centralized secret management with key rotation
- **Air-gapped Signing**: Offline signing for maximum security

### Key Lifecycle Management

- Key generation with proper entropy sources
- Key rotation policies and automated rotation
- Key escrow and backup procedures
- Revocation list management (CRL/OCSP)

## CI/CD Integration

### Ephemeral Key Management

```bash
# Fetch signing keys from secure storage
vault kv get -field=private_key secret/signing/gpg-key > /tmp/signing.key
gpg --import /tmp/signing.key

# Sign packages
debsign -k <KEY_ID> *.changes
rpm --addsign -D "_gpg_name <KEY_ID>" *.rpm
gpg --detach-sign --armor *.AppImage

# Clean up ephemeral keys
rm -f /tmp/signing.key
gpg --delete-secret-keys <KEY_ID>
```

### Signature Verification in CI

```bash
# Verify .deb signatures
dpkg-sig --verify *.deb
debsig-verify *.deb

# Verify .rpm signatures
rpm --checksig *.rpm

# Verify AppImage signatures
gpg --verify *.AppImage.sig *.AppImage
```

### Build Pipeline Automation

- Automated signing after successful builds
- Signature verification as part of quality gates
- Repository publishing with signed metadata
- Integration with existing GitHub Actions/CI workflows

## Frontend Integration

- Display signing status and key information in application
- Show GPG key fingerprints and verification status
- Provide links to public key servers for key verification
- Integration with system package manager verification status

**Describe alternatives you've considered**

- Manual signing process: Too error-prone and doesn't scale with automated builds
- No signing: Not viable as it prevents installation on secure systems and reduces trust
- Third-party signing services: Could work but adds external dependency
- Self-signed certificates: Limited trust value, better than no signing but not ideal
- Distribution-specific signing: Too complex to maintain multiple signing processes

**Additional context**

- This is part of a broader code signing initiative across all platforms
- macOS code signing is already implemented
- Windows code signing will be handled in [DIST-011](./DIST-011-windows-code-signing.md)
- Linux code signing is important for enterprise Linux environments and secure distributions
- Consider integration with package managers like apt, yum, dnf, and snap
- Must comply with Linux distribution security requirements and best practices
- GPG key management and distribution is crucial for user trust
