import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { argv, env } from 'node:process';
import { fileURLToPath } from 'node:url';

export const REQUIRED_PLATFORMS = [
  'darwin-aarch64',
  'darwin-aarch64-app',
  'darwin-universal',
  'darwin-universal-app',
  'darwin-x86_64',
  'darwin-x86_64-app',
  'linux-aarch64',
  'linux-aarch64-appimage',
  'linux-aarch64-deb',
  'linux-aarch64-rpm',
  'linux-x86_64',
  'linux-x86_64-appimage',
  'linux-x86_64-deb',
  'linux-x86_64-rpm',
  'windows-x86_64',
  'windows-x86_64-msi',
  'windows-x86_64-nsis',
];

const ARCHITECTURES = {
  amd64: ['x86_64'],
  x64: ['x86_64'],
  x86_64: ['x86_64'],
  arm64: ['aarch64'],
  aarch64: ['aarch64'],
  universal: ['aarch64', 'x86_64', 'universal'],
};

const BUNDLES = [
  {
    os: 'darwin',
    installer: 'app',
    isDefault: true,
    pattern: /_(universal)\.app\.tar\.gz$/,
  },
  {
    os: 'linux',
    installer: 'appimage',
    isDefault: true,
    pattern: /_(amd64|aarch64)\.AppImage$/,
  },
  {
    os: 'linux',
    installer: 'deb',
    isDefault: false,
    pattern: /_(amd64|arm64)\.deb$/,
  },
  {
    os: 'linux',
    installer: 'rpm',
    isDefault: false,
    pattern: /\.(x86_64|aarch64)\.rpm$/,
  },
  {
    os: 'windows',
    installer: 'nsis',
    isDefault: true,
    pattern: /_(x64)-setup\.exe$/,
  },
  {
    os: 'windows',
    installer: 'msi',
    isDefault: false,
    pattern: /_(x64)_[A-Za-z-]+\.msi$/,
  },
];

export function platformKeys(bundleName) {
  for (const { os, installer, isDefault, pattern } of BUNDLES) {
    const match = bundleName.match(pattern);
    if (match) {
      return ARCHITECTURES[match[1]].flatMap(arch =>
        isDefault
          ? [`${os}-${arch}`, `${os}-${arch}-${installer}`]
          : [`${os}-${arch}-${installer}`]
      );
    }
  }
  throw new Error(`${bundleName} is not a bundle the updater knows`);
}

export function buildManifest({
  version,
  pubDate,
  downloadUrl,
  assetNames,
  signatures,
}) {
  const platforms = {};
  const bundleOfPlatform = {};

  for (const [bundleName, signature] of Object.entries(signatures)) {
    if (!assetNames.includes(bundleName)) {
      throw new Error(`${bundleName}.sig has no ${bundleName} in the release`);
    }
    for (const key of platformKeys(bundleName)) {
      if (bundleOfPlatform[key]) {
        throw new Error(
          `${key} matches both ${bundleOfPlatform[key]} and ${bundleName}`
        );
      }
      bundleOfPlatform[key] = bundleName;
      platforms[key] = { signature, url: downloadUrl(bundleName) };
    }
  }

  const missing = REQUIRED_PLATFORMS.filter(key => !platforms[key]);
  if (missing.length > 0) {
    throw new Error(`The release has no bundle for ${missing.join(', ')}`);
  }

  return {
    version,
    notes: '',
    pub_date: pubDate,
    platforms: Object.fromEntries(
      Object.entries(platforms).sort(([a], [b]) => a.localeCompare(b))
    ),
  };
}

function requiredEnv(name) {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

async function readSignatures(directory) {
  const signatures = {};
  for (const file of await readdir(directory)) {
    if (file.endsWith('.sig')) {
      signatures[file.slice(0, -'.sig'.length)] = await readFile(
        join(directory, file),
        'utf8'
      );
    }
  }
  return signatures;
}

async function main([assetNamesFile, signatureDirectory, outputFile]) {
  if (!assetNamesFile || !signatureDirectory || !outputFile) {
    throw new Error(
      'Usage: updater-manifest.mjs <asset-names.json> <signature-dir> <output.json>'
    );
  }

  const releaseDownloads = [
    requiredEnv('GITHUB_SERVER_URL'),
    requiredEnv('GITHUB_REPOSITORY'),
    'releases/download',
    encodeURIComponent(requiredEnv('TAG')),
  ].join('/');

  const manifest = buildManifest({
    version: requiredEnv('VERSION'),
    pubDate: new Date().toISOString(),
    downloadUrl: name => `${releaseDownloads}/${encodeURIComponent(name)}`,
    assetNames: JSON.parse(await readFile(assetNamesFile, 'utf8')),
    signatures: await readSignatures(signatureDirectory),
  });

  await writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `Wrote ${Object.keys(manifest.platforms).length} platforms to ${outputFile}`
  );
}

if (argv[1] === fileURLToPath(import.meta.url)) {
  await main(argv.slice(2));
}
