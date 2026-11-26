import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  REQUIRED_PLATFORMS,
  buildManifest,
  platformKeys,
} from './updater-manifest.mjs';

const RELEASE_BUNDLES = [
  'Nookat_universal.app.tar.gz',
  'Nookat_0.1.10_aarch64.AppImage',
  'Nookat_0.1.10_amd64.AppImage',
  'Nookat_0.1.10_arm64.deb',
  'Nookat_0.1.10_amd64.deb',
  'Nookat-0.1.10-1.aarch64.rpm',
  'Nookat-0.1.10-1.x86_64.rpm',
  'Nookat_0.1.10_x64-setup.exe',
  'Nookat_0.1.10_x64_en-US.msi',
];

function signaturesOf(bundles) {
  return Object.fromEntries(
    bundles.map(name => [name, `signature of ${name}`])
  );
}

function manifestOf(bundles, assetNames = bundles) {
  return buildManifest({
    version: '0.1.10',
    pubDate: '2026-11-26T16:00:00.000Z',
    downloadUrl: name => `https://example.test/v0.1.10/${name}`,
    assetNames: [...assetNames, ...bundles.map(name => `${name}.sig`)],
    signatures: signaturesOf(bundles),
  });
}

describe('buildManifest', () => {
  it('lists every platform of a full release', () => {
    const manifest = manifestOf(RELEASE_BUNDLES);

    assert.deepEqual(Object.keys(manifest.platforms), REQUIRED_PLATFORMS);
    assert.equal(manifest.version, '0.1.10');
    assert.equal(manifest.notes, '');
    assert.equal(manifest.pub_date, '2026-11-26T16:00:00.000Z');
  });

  it('points each platform at the bundle the updater installs', () => {
    const bundleOf = Object.fromEntries(
      Object.entries(manifestOf(RELEASE_BUNDLES).platforms).map(
        ([key, { url }]) => [key, url.split('/').at(-1)]
      )
    );

    assert.deepEqual(bundleOf, {
      'darwin-aarch64': 'Nookat_universal.app.tar.gz',
      'darwin-aarch64-app': 'Nookat_universal.app.tar.gz',
      'darwin-universal': 'Nookat_universal.app.tar.gz',
      'darwin-universal-app': 'Nookat_universal.app.tar.gz',
      'darwin-x86_64': 'Nookat_universal.app.tar.gz',
      'darwin-x86_64-app': 'Nookat_universal.app.tar.gz',
      'linux-aarch64': 'Nookat_0.1.10_aarch64.AppImage',
      'linux-aarch64-appimage': 'Nookat_0.1.10_aarch64.AppImage',
      'linux-aarch64-deb': 'Nookat_0.1.10_arm64.deb',
      'linux-aarch64-rpm': 'Nookat-0.1.10-1.aarch64.rpm',
      'linux-x86_64': 'Nookat_0.1.10_amd64.AppImage',
      'linux-x86_64-appimage': 'Nookat_0.1.10_amd64.AppImage',
      'linux-x86_64-deb': 'Nookat_0.1.10_amd64.deb',
      'linux-x86_64-rpm': 'Nookat-0.1.10-1.x86_64.rpm',
      'windows-x86_64': 'Nookat_0.1.10_x64-setup.exe',
      'windows-x86_64-msi': 'Nookat_0.1.10_x64_en-US.msi',
      'windows-x86_64-nsis': 'Nookat_0.1.10_x64-setup.exe',
    });
  });

  it('keeps the signature of the bundle it points at', () => {
    const { platforms } = manifestOf(RELEASE_BUNDLES);

    assert.deepEqual(platforms['linux-x86_64-deb'], {
      signature: 'signature of Nookat_0.1.10_amd64.deb',
      url: 'https://example.test/v0.1.10/Nookat_0.1.10_amd64.deb',
    });
  });

  it('names the platforms a release without the Linux amd64 bundles misses', () => {
    const withoutAmd64 = RELEASE_BUNDLES.filter(
      name => !/amd64|x86_64/.test(name)
    );

    assert.throws(() => manifestOf(withoutAmd64), {
      message:
        'The release has no bundle for linux-x86_64, linux-x86_64-appimage, linux-x86_64-deb, linux-x86_64-rpm',
    });
  });

  it('refuses a signature whose bundle is not in the release', () => {
    const assetNames = RELEASE_BUNDLES.filter(
      name => name !== 'Nookat_0.1.10_amd64.deb'
    );

    assert.throws(() => manifestOf(RELEASE_BUNDLES, assetNames), {
      message:
        'Nookat_0.1.10_amd64.deb.sig has no Nookat_0.1.10_amd64.deb in the release',
    });
  });

  it('refuses two bundles for the same platform', () => {
    const bundles = [...RELEASE_BUNDLES, 'Nookat_0.1.9_amd64.deb'];

    assert.throws(() => manifestOf(bundles), {
      message:
        'linux-x86_64-deb matches both Nookat_0.1.10_amd64.deb and Nookat_0.1.9_amd64.deb',
    });
  });
});

describe('platformKeys', () => {
  it('refuses a bundle it does not know', () => {
    assert.throws(() => platformKeys('Nookat_0.1.10_x64.zip'), {
      message: 'Nookat_0.1.10_x64.zip is not a bundle the updater knows',
    });
  });
});
