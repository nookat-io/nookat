import { describe, expect, it } from 'vitest';
import {
  checkImageReference,
  checkRegistry,
  needsConfirmation,
} from './check-image-source';
import { OFFICIAL_IMAGES } from './known-sources';

describe('checkImageReference', () => {
  it.each([
    ['ghrc.io/org/app', 'ghrc.io', 'ghcr.io'],
    ['GHRC.IO/org/app', 'ghrc.io', 'ghcr.io'],
    ['ghrc.io:443/org/app:1.0', 'ghrc.io', 'ghcr.io'],
    ['ghcr.co/org/app', 'ghcr.co', 'ghcr.io'],
    ['ghcr.com/org/app', 'ghcr.com', 'ghcr.io'],
    ['ghcr-io.net/org/app', 'ghcr-io.net', 'ghcr.io'],
    ['dockerhub.io/library/nginx', 'dockerhub.io', 'docker.io'],
    ['docker-hub.com/nginx', 'docker-hub.com', 'docker.io'],
    ['dokcer.io/library/nginx', 'dokcer.io', 'docker.io'],
    ['docker.co/library/nginx', 'docker.co', 'docker.io'],
    ['registry.docker.net/nginx', 'registry.docker.net', 'docker.io'],
    ['quay.co/org/app', 'quay.co', 'quay.io'],
    ['qauy.io/org/app', 'qauy.io', 'quay.io'],
    ['gcr.co/project/app', 'gcr.co', 'gcr.io'],
    [
      'registry.gitlab.co/group/app',
      'registry.gitlab.co',
      'registry.gitlab.com',
    ],
    ['mcr.microsoft.co/dotnet/sdk', 'mcr.microsoft.co', 'mcr.microsoft.com'],
    ['nvcr.co/nvidia/cuda', 'nvcr.co', 'nvcr.io'],
    ['lcsr.io/linuxserver/plex', 'lcsr.io', 'lscr.io'],
  ])(
    'asks before pulling %s from %s, which looks like %s',
    (reference, registry, resembled) => {
      const check = checkImageReference(reference);

      expect(check).toMatchObject({
        kind: 'lookalike-registry',
        registry,
        resembles: { host: resembled },
      });
      expect(needsConfirmation(check)).toBe(true);
    }
  );

  it.each([
    ['ubunti', 'ubuntu'],
    ['ubunti:24.04', 'ubuntu'],
    ['docker.io/library/ubunti', 'ubuntu'],
    ['index.docker.io/ubnutu', 'ubuntu'],
    ['ngnix', 'nginx'],
    ['postgress', 'postgres'],
    ['postgers', 'postgres'],
    ['pyhton', 'python'],
    ['alpnie', 'alpine'],
    ['rabitmq', 'rabbitmq'],
    ['mysq1', 'mysql'],
    ['elasticsearh', 'elasticsearch'],
    ['elastcsearh', 'elasticsearch'],
    ['libary/ubuntu', 'ubuntu'],
    ['llbrary/nginx:latest', 'nginx'],
  ])(
    'asks before pulling %s, which looks like the official %s image',
    (reference, resembled) => {
      const check = checkImageReference(reference);

      expect(check).toMatchObject({
        kind: 'lookalike-image',
        resembles: resembled,
      });
      expect(needsConfirmation(check)).toBe(true);
    }
  );

  it.each([
    'node',
    'nats',
    'redis',
    'rabbitmq',
    'mono',
    'odoo',
    'php',
    'ubuntu:24.04',
    'library/ubuntu',
    'bitnami/redis',
    'myorg/ubunti',
    'phq',
    'docker.io/library/nginx',
    'index.docker.io/library/nginx',
    'registry-1.docker.io/library/nginx',
    'registry.hub.docker.com/library/nginx',
    'mirror.gcr.io/library/nginx',
    'gcr.io/distroless/static',
    'us-docker.pkg.dev/project/repo/app',
    'europe-west1-docker.pkg.dev/project/repo/app',
    'ghcr.io/org/app',
    'docker.pkg.github.com/org/repo/app',
    'quay.io/org/app',
    'public.ecr.aws/nginx/nginx',
    '123456789012.dkr.ecr.us-east-1.amazonaws.com/app',
    'mcr.microsoft.com/dotnet/sdk',
    'myregistry.azurecr.io/app',
    'registry.k8s.io/pause',
    'k8s.gcr.io/pause',
    'registry.gitlab.com/group/app',
    'nvcr.io/nvidia/cuda',
    'cgr.dev/chainguard/static',
    'lscr.io/linuxserver/plex',
    'docker.elastic.co/elasticsearch/elasticsearch',
    'registry.redhat.io/ubi9/ubi',
    'registry.access.redhat.com/ubi9/ubi',
    'container-registry.oracle.com/os/oraclelinux',
    'registry.suse.com/bci/bci-base',
  ])('pulls %s without asking', reference => {
    expect(needsConfirmation(checkImageReference(reference))).toBe(false);
  });

  it.each(OFFICIAL_IMAGES)(
    'pulls the official %s image without asking',
    name => {
      expect(checkImageReference(name)).toEqual({
        kind: 'known-registry',
        registry: 'docker.io',
      });
    }
  );

  it.each([
    'myregistry.local:5000/app',
    'localhost:5000/app',
    'localhost/app',
    'registry:5000/team/app',
    'host.docker.internal:5000/app',
    'nas.home.arpa/app',
    'harbor.corp/team/app',
    'dockerhub.internal/library/nginx',
    '10.0.0.5:5000/app',
    '[fd00::1]:5000/app',
  ])('treats %s as an internal registry that needs no notice', reference => {
    expect(checkImageReference(reference)).toMatchObject({
      kind: 'internal-registry',
    });
  });

  it.each([
    ['registry.mycompany.com/team/app', 'registry.mycompany.com'],
    ['harbor.example.co.uk/team/app', 'harbor.example.co.uk'],
    ['k3s.io/rancher/app', 'k3s.io'],
    ['gcrr.io/project/app', 'gcrr.io'],
    ['docker-registry.io/app', 'docker-registry.io'],
  ])(
    'only notes that %s comes from %s, a registry it does not know',
    (reference, registry) => {
      const check = checkImageReference(reference);

      expect(check).toEqual({ kind: 'unknown-registry', registry });
      expect(needsConfirmation(check)).toBe(false);
    }
  );

  it('does not judge a reference Docker would refuse', () => {
    expect(checkImageReference('ghrc.io//app')).toEqual({ kind: 'invalid' });
  });
});

describe('checkRegistry', () => {
  it('checks a registry on its own, before an image is chosen', () => {
    expect(checkRegistry('ghrc.io')).toMatchObject({
      kind: 'lookalike-registry',
      registry: 'ghrc.io',
      resembles: { host: 'ghcr.io', name: 'GitHub Container Registry' },
    });
    expect(checkRegistry('ghcr.io')).toEqual({
      kind: 'known-registry',
      registry: 'ghcr.io',
    });
    expect(checkRegistry('localhost:5000')).toEqual({
      kind: 'internal-registry',
      registry: 'localhost',
    });
    expect(checkRegistry('registry.mycompany.com')).toEqual({
      kind: 'unknown-registry',
      registry: 'registry.mycompany.com',
    });
  });

  it('does not judge a registry that is still being typed', () => {
    expect(checkRegistry('ghrc.')).toEqual({ kind: 'invalid' });
    expect(checkRegistry('')).toEqual({ kind: 'invalid' });
  });
});
