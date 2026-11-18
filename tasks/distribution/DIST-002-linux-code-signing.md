# [DIST-002] Sign the Linux packages

- **Status:** Not started
- **Related:** DIST-001, DIST-006, DIST-008

## Problem

Linux users need packages that meet distribution security requirements.
The Linux packages are not signed, which can prevent installation on hardened systems, trigger package manager warnings, and reduce user trust.
Many distributions and security tools require signed packages.

## Current state

`.github/workflows/build-linux.yaml` builds with `tauri-apps/tauri-action` for `x86_64` and `aarch64`, and `src-tauri/tauri.conf.json` sets `bundle.targets` to `all`.
Each release therefore ships an AppImage, a `.deb` and an `.rpm` per architecture, none of them GPG signed.
The only signatures are the Tauri updater's minisign `.sig` files, which package managers do not check.
There is no apt or yum repository.
Nothing outside the code blocks this, since a GPG key costs nothing.

## Scope

Sign every Linux format in CI after Tauri builds it.

### .deb packages (Ubuntu, Debian)

1. Tauri builds the `.deb`.
2. `dpkg-sig --sign builder -k <GPG_KEY_ID> *.deb` signs the package.
3. When a `.changes` file is produced, `debsign -k <GPG_KEY_ID> *.changes` signs it.

Artifacts:

- Signed `.deb` package with an embedded GPG signature.
- Signed `.changes` file with the package metadata, when one is produced.
- GPG-signed `Release` file for the apt repository metadata.

Repository:

- `reprepro` or `aptly` manages the signed repository.
- GPG-signed `Release` file in `dists/<suite>/Release`, a `Release.gpg` detached signature, and an `InRelease` file with an inline signature.

Tools: `dpkg-sig`, `debsign`, `reprepro` or `aptly`, `gpg`.

### .rpm packages (Red Hat, Fedora, CentOS)

1. Tauri builds the `.rpm`.
2. `rpm --addsign -D "_gpg_name <GPG_KEY_ID>" *.rpm` signs the package.
3. `createrepo_c .` generates the repository metadata.
4. `gpg --detach-sign --armor repodata/repomd.xml` signs the metadata.

Artifacts:

- Signed `.rpm` package with an embedded GPG signature.
- `repomd.xml` with its signature `repomd.xml.asc`.
- Repository metadata in `repodata/`.

Repository:

- GPG-signed `repomd.xml` for yum and dnf.
- Repository configuration with instructions for importing the GPG key.
- Support for both GPG and RPM-specific signing keys.

Tools: `rpm`, `rpm-sign`, `createrepo_c`, `gpg`.

### AppImage (any distribution)

1. Tauri builds the AppImage.
2. `gpg --detach-sign --armor nookat.AppImage` creates a detached signature.
3. `zsyncmake nookat.AppImage` generates a zsync file for delta updates.

Artifacts:

- `nookat.AppImage`.
- `nookat.AppImage.asc`, the GPG detached signature.
  It cannot be named `.sig`, because the updater's minisign signature already uses that name.
- `nookat.AppImage.zsync`, and optionally a signed `nookat.AppImage.zsync.asc`.

Updates:

- AppImageUpdate integration with zsync delta updates.
- GPG signature verification before an update is installed.

Tools: `gpg`, `zsyncmake`, `AppImageUpdate`.

### Repository signing

- apt: GPG-signed `Release` files in each suite, `Release.gpg` detached signatures, `InRelease` inline signatures, and key distribution through a keyring file referenced from `sources.list`.
- yum and dnf: GPG-signed `repomd.xml`, repository GPG key configuration, and package signature checks during installation.

### Key management

- Store the private key in a secret store, for example a hardware security module, a cloud KMS (AWS KMS, Azure Key Vault, Google Cloud KMS) or HashiCorp Vault, or sign offline on an air-gapped machine.
- Generate keys with proper entropy, and define rotation, backup and escrow procedures.
- Publish a revocation certificate and keep the public key on key servers.

### CI integration

Fetch the key only for the signing step and delete it afterwards:

```bash
vault kv get -field=private_key secret/signing/gpg-key > /tmp/signing.key
gpg --import /tmp/signing.key

dpkg-sig --sign builder -k <KEY_ID> *.deb
rpm --addsign -D "_gpg_name <KEY_ID>" *.rpm
gpg --detach-sign --armor *.AppImage

rm -f /tmp/signing.key
gpg --batch --yes --delete-secret-keys <KEY_ID>
```

Verify the signatures as a release gate:

```bash
dpkg-sig --verify *.deb
rpm --checksig *.rpm
gpg --verify *.AppImage.asc *.AppImage
```

- Sign automatically after a successful build.
- Fail the release when a signature is missing or invalid.
- Publish the repositories with signed metadata.

### In the app

- Show the signing status, the GPG key fingerprint and the verification result.
- Link to the public key on key servers so users can check it.

## Notes

- Alternatives considered:
  - Manual signing is too error-prone and doesn't scale with automated builds.
  - Not signing is not viable, because it blocks installation on hardened systems and reduces trust.
  - Third-party signing services could work but add an external dependency.
  - Self-signed keys give limited trust, better than nothing but not ideal.
  - A separate signing process per distribution would be too complex to maintain.
- This is part of the code signing work across all platforms: Windows is DIST-001 and macOS is DIST-008.
- macOS releases are only ad-hoc signed since dfe9427, so no platform has a trusted signature yet.
- Linux signing matters for enterprise Linux environments and hardened distributions.
- Coordinate with Snap packaging (DIST-006), since the Snap Store signs snaps itself.
- Must comply with distribution security requirements, and GPG key management and distribution are crucial for user trust.
