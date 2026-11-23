import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent, { UserEvent } from '@testing-library/user-event';
import { Channel } from '@tauri-apps/api/core';
import { mockIPC } from '@tauri-apps/api/mocks';
import { describe, expect, it } from 'vitest';
import { DockerHubImage, DockerHubTag } from '../../../types/docker-images';
import { ImagePullLayer, ImagePullProgress } from '../../../types/image-pull';
import { PullImage } from './pull-image-modal';

const searchResult = (name: string, isOfficial: boolean): DockerHubImage => ({
  name,
  description: '',
  star_count: 0,
  pull_count: 0,
  is_official: isOfficial,
  is_automated: false,
});

const NGINX = searchResult('nginx', true);
const CUDA = searchResult('nvidia/cuda', false);
const CUDA_TAG = '13.5.0-runtime-ubuntu24.04';
const PUSHED_AT = '2026-11-18T09:30:00Z';
const MB = 1024 * 1024;

interface PullRequest {
  pullId: string;
  imageName: string;
  tag: string;
  registry: string;
  onProgress: Channel<ImagePullProgress>;
}

const pullRequest = (args: unknown): PullRequest => {
  const { request, onProgress } = args as {
    request: Omit<PullRequest, 'onProgress'>;
    onProgress: Channel<ImagePullProgress>;
  };
  return { ...request, onProgress };
};

const withoutProgress = ({ imageName, tag, registry }: PullRequest) => ({
  imageName,
  tag,
  registry,
});

const tagDetails = (name: string): DockerHubTag => ({
  name,
  size: 61 * 1024 * 1024,
  last_pushed: PUSHED_AT,
  platforms: ['linux/amd64', 'linux/arm64/v8', 'linux/386', 'linux/arm/v7'],
});

function mockDockerHub(
  searchResults: DockerHubImage[],
  { hubTags = ['latest'] }: { hubTags?: string[] } = {}
) {
  const pulls: unknown[] = [];
  const tagLookups: string[] = [];
  mockIPC((cmd, args) => {
    switch (cmd) {
      case 'search_docker_hub':
        return { results: searchResults };
      case 'fetch_image_tags':
        return hubTags;
      case 'fetch_image_tag': {
        const { tag } = args as { tag: string };
        tagLookups.push(tag);
        return hubTags.includes(tag) ? tagDetails(tag) : null;
      }
      case 'pull_image':
        pulls.push(withoutProgress(pullRequest(args)));
        return 'completed';
      default:
        throw new Error(`Unexpected command ${cmd}`);
    }
  });
  return { pulls, tagLookups };
}

const tagInput = () => screen.getByRole('combobox', { name: 'Tag' });
const pullButton = () => screen.getByRole('button', { name: 'Pull' });

async function pullOnceTheTagIsChecked(user: UserEvent) {
  await waitFor(() => expect(pullButton()).toBeEnabled());
  await user.click(pullButton());
}

async function typeTag(user: UserEvent, tag: string) {
  await user.clear(tagInput());
  await user.type(tagInput(), tag);
}

async function choosePullSource({
  registry,
  image,
}: {
  registry?: string;
  image: string;
}) {
  const user = userEvent.setup();
  render(<PullImage />);
  await user.click(screen.getByRole('button', { name: 'Pull Image' }));

  if (registry) {
    screen.getByRole('combobox', { name: 'Registry' }).focus();
    await user.keyboard('{Enter}');
    await user.click(
      await screen.findByRole('option', { name: 'Add new registry' })
    );
    await user.type(screen.getByLabelText('Registry address'), registry);
  }

  await user.type(screen.getByLabelText('Image Name'), image);
  await user.click(await screen.findByText(image, { selector: 'span' }));
  return user;
}

function mockPullThatRunsUntilCancelled() {
  const pullIds: string[] = [];
  const cancellations: string[] = [];
  const runningPulls = new Map<string, () => void>();
  mockIPC((cmd, args) => {
    switch (cmd) {
      case 'search_docker_hub':
        return { results: [NGINX] };
      case 'fetch_image_tags':
        return ['latest'];
      case 'fetch_image_tag':
        return tagDetails('latest');
      case 'pull_image': {
        const { pullId } = pullRequest(args);
        pullIds.push(pullId);
        return new Promise(resolve => {
          runningPulls.set(pullId, () => resolve('cancelled'));
        });
      }
      case 'cancel_image_pull': {
        const { pullId } = args as { pullId: string };
        cancellations.push(pullId);
        runningPulls.get(pullId)?.();
        return true;
      }
      default:
        throw new Error(`Unexpected command ${cmd}`);
    }
  });
  return { pullIds, cancellations };
}

const pullImageDialog = () =>
  screen.queryByRole('dialog', { name: 'Pull Image from Registry' });

const lookalikeConfirmation = (title: string) =>
  screen.queryByRole('dialog', { name: title });

describe('PullImage', () => {
  it('asks before pulling from a registry that looks like a well-known one', async () => {
    const { pulls } = mockDockerHub([NGINX]);
    const user = await choosePullSource({
      registry: 'ghrc.io',
      image: 'nginx',
    });

    expect(
      screen.getByText(
        'ghrc.io looks like ghcr.io (GitHub Container Registry), but it is a different registry. Check the spelling before you pull.'
      )
    ).toBeInTheDocument();

    await pullOnceTheTagIsChecked(user);

    const confirmation = lookalikeConfirmation('Pull from ghrc.io?');
    expect(confirmation).toHaveAccessibleDescription(
      'ghrc.io looks like ghcr.io (GitHub Container Registry), but it is a different registry. Lookalike names are a common way to spread malicious images, so check the spelling before you pull.'
    );
    expect(pulls).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Pull anyway' }));

    expect(pulls).toEqual([
      { imageName: 'nginx', tag: 'latest', registry: 'ghrc.io' },
    ]);
    expect(lookalikeConfirmation('Pull from ghrc.io?')).not.toBeInTheDocument();
  });

  it('goes back to the form without pulling when the warning is cancelled', async () => {
    const { pulls } = mockDockerHub([NGINX]);
    const user = await choosePullSource({
      registry: 'ghrc.io',
      image: 'nginx',
    });

    await pullOnceTheTagIsChecked(user);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(lookalikeConfirmation('Pull from ghrc.io?')).not.toBeInTheDocument();
    expect(
      screen.getByRole('dialog', { name: 'Pull Image from Registry' })
    ).toBeInTheDocument();
    expect(pulls).toEqual([]);
  });

  it('checks and pulls the registry without the spaces around it', async () => {
    const { pulls } = mockDockerHub([NGINX]);
    const user = await choosePullSource({
      registry: ' ghrc.io ',
      image: 'nginx',
    });

    expect(
      screen.getByText(/^ghrc\.io looks like ghcr\.io/)
    ).toBeInTheDocument();

    await pullOnceTheTagIsChecked(user);
    await user.click(screen.getByRole('button', { name: 'Pull anyway' }));

    expect(pulls).toEqual([
      { imageName: 'nginx', tag: 'latest', registry: 'ghrc.io' },
    ]);
  });

  it.each(['https://ghcr.io', 'ghcr.io/', ' HTTPS://ghcr.io// '])(
    'pulls a registry typed with a scheme or a trailing slash from its host: %j',
    async registry => {
      const { pulls } = mockDockerHub([NGINX]);
      const user = await choosePullSource({ registry, image: 'nginx' });

      await pullOnceTheTagIsChecked(user);

      expect(pulls).toEqual([
        { imageName: 'nginx', tag: 'latest', registry: 'ghcr.io' },
      ]);
    }
  );

  it('asks before pulling from a lookalike registry typed with a trailing slash', async () => {
    const { pulls } = mockDockerHub([NGINX]);
    const user = await choosePullSource({
      registry: 'ghrc.io/',
      image: 'nginx',
    });

    expect(
      screen.getByText(
        'ghrc.io looks like ghcr.io (GitHub Container Registry), but it is a different registry. Check the spelling before you pull.'
      )
    ).toBeInTheDocument();

    await pullOnceTheTagIsChecked(user);

    expect(lookalikeConfirmation('Pull from ghrc.io?')).toBeInTheDocument();
    expect(pulls).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Pull anyway' }));

    expect(pulls).toEqual([
      { imageName: 'nginx', tag: 'latest', registry: 'ghrc.io' },
    ]);
  });

  it('checks the tag on Docker Hub when docker.io is typed as a custom registry', async () => {
    const { pulls, tagLookups } = mockDockerHub([NGINX]);
    const user = await choosePullSource({
      registry: 'docker.io/',
      image: 'nginx',
    });

    expect(await screen.findByText('Tag latest')).toBeInTheDocument();
    expect(screen.getByText('docker.io/nginx:latest')).toBeInTheDocument();
    await pullOnceTheTagIsChecked(user);

    expect(tagLookups).toContain('latest');
    expect(pulls).toEqual([
      { imageName: 'nginx', tag: 'latest', registry: 'docker.io' },
    ]);
  });

  it('refuses a registry that Docker would read as a Docker Hub namespace', async () => {
    const { pulls } = mockDockerHub([NGINX]);
    const user = await choosePullSource({
      registry: 'myregistry',
      image: 'nginx',
    });

    await pullOnceTheTagIsChecked(user);

    expect(
      await screen.findByText(
        'myregistry is not a registry address, so Docker would pull from Docker Hub. Add its domain or port, such as myregistry:5000'
      )
    ).toBeInTheDocument();
    expect(pulls).toEqual([]);
  });

  it('refuses a reference Docker cannot parse', async () => {
    const { pulls } = mockDockerHub([NGINX]);
    const user = await choosePullSource({
      registry: 'ghcr.io:abc',
      image: 'nginx',
    });

    await pullOnceTheTagIsChecked(user);

    expect(
      await screen.findByText(
        'ghcr.io:abc/nginx:latest is not a valid image reference'
      )
    ).toBeInTheDocument();
    expect(pulls).toEqual([]);
  });

  it('refuses to pull while the registry address is empty', async () => {
    const { pulls } = mockDockerHub([NGINX]);
    const user = userEvent.setup();
    render(<PullImage />);
    await user.click(screen.getByRole('button', { name: 'Pull Image' }));
    screen.getByRole('combobox', { name: 'Registry' }).focus();
    await user.keyboard('{Enter}');
    await user.click(
      await screen.findByRole('option', { name: 'Add new registry' })
    );
    await user.type(screen.getByLabelText('Image Name'), 'nginx');
    await user.click(await screen.findByText('nginx', { selector: 'span' }));

    await pullOnceTheTagIsChecked(user);

    expect(
      await screen.findByText('Registry address is required')
    ).toBeInTheDocument();
    expect(pulls).toEqual([]);
  });

  it.each(['https://', 'HTTP://', '//'])(
    'refuses to pull while the registry address %s has no host',
    async registry => {
      const { pulls } = mockDockerHub([NGINX]);
      const user = await choosePullSource({ registry, image: 'nginx' });

      await pullOnceTheTagIsChecked(user);

      expect(
        await screen.findByText('Registry address is required')
      ).toBeInTheDocument();
      expect(pulls).toEqual([]);
    }
  );

  it('asks before pulling an image named like a popular official image', async () => {
    const { pulls } = mockDockerHub([searchResult('ubunti', false)]);
    const user = await choosePullSource({ image: 'ubunti' });

    await pullOnceTheTagIsChecked(user);

    expect(lookalikeConfirmation('Pull ubunti?')).toHaveAccessibleDescription(
      'ubunti looks like the official ubuntu image, but it is a different image. Lookalike names are a common way to spread malicious images, so check the spelling before you pull.'
    );

    await user.click(screen.getByRole('button', { name: 'Pull anyway' }));

    expect(pulls).toEqual([
      { imageName: 'ubunti', tag: 'latest', registry: 'docker.io' },
    ]);
  });

  it('only notes a registry it does not know and pulls without asking', async () => {
    const { pulls } = mockDockerHub([NGINX]);
    const user = await choosePullSource({
      registry: 'registry.mycompany.com',
      image: 'nginx',
    });

    expect(
      screen.getByText(
        'registry.mycompany.com is not a registry Nookat recognizes. Pull only images you trust.'
      )
    ).toBeInTheDocument();

    await pullOnceTheTagIsChecked(user);

    expect(screen.queryByRole('button', { name: 'Pull anyway' })).toBeNull();
    expect(pulls).toEqual([
      {
        imageName: 'nginx',
        tag: 'latest',
        registry: 'registry.mycompany.com',
      },
    ]);
  });

  it('drops the error of a failed pull once another image is chosen', async () => {
    mockIPC((cmd, args) => {
      switch (cmd) {
        case 'search_docker_hub':
          return { results: [NGINX, searchResult('redis', true)] };
        case 'fetch_image_tags':
          return ['latest'];
        case 'fetch_image_tag':
          return tagDetails('latest');
        case 'pull_image':
          return pullRequest(args).imageName === 'nginx'
            ? Promise.reject('manifest for nginx:latest not found')
            : null;
        default:
          throw new Error(`Unexpected command ${cmd}`);
      }
    });
    const user = await choosePullSource({ image: 'nginx' });

    await pullOnceTheTagIsChecked(user);
    expect(
      await screen.findByText('manifest for nginx:latest not found')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await user.type(screen.getByLabelText('Image Name'), 'redis');
    await user.click(await screen.findByText('redis', { selector: 'span' }));

    expect(
      screen.queryByText('manifest for nginx:latest not found')
    ).toBeNull();
  });

  it('pulls an official Docker Hub image without any notice', async () => {
    const { pulls } = mockDockerHub([NGINX]);
    const user = await choosePullSource({ image: 'nginx' });

    expect(screen.queryByText(/looks like|recognizes/)).toBeNull();

    await pullOnceTheTagIsChecked(user);

    expect(screen.queryByRole('button', { name: 'Pull anyway' })).toBeNull();
    expect(pulls).toEqual([
      { imageName: 'nginx', tag: 'latest', registry: 'docker.io' },
    ]);
  });

  it('shows the pull progress the engine reports until the pull ends', async () => {
    let progressChannel: Channel<ImagePullProgress> | undefined;
    let finishPull = () => {};
    mockIPC((cmd, args) => {
      switch (cmd) {
        case 'search_docker_hub':
          return { results: [NGINX] };
        case 'fetch_image_tags':
          return ['latest'];
        case 'fetch_image_tag':
          return tagDetails('latest');
        case 'pull_image':
          progressChannel = pullRequest(args).onProgress;
          return new Promise(resolve => {
            finishPull = () => resolve('completed');
          });
        default:
          throw new Error(`Unexpected command ${cmd}`);
      }
    });
    const user = await choosePullSource({ image: 'nginx' });
    await pullOnceTheTagIsChecked(user);
    const report = (...layers: ImagePullLayer[]) =>
      act(() => progressChannel?.onmessage({ layers }));
    const bar = () =>
      screen.getByRole('progressbar', { name: 'Pull progress' });

    expect(bar()).not.toHaveAttribute('aria-valuenow');
    expect(screen.getByText('Waiting for the registry')).toBeInTheDocument();

    report(
      {
        id: 'a',
        phase: 'downloading',
        size: 100 * MB,
        downloaded: 30 * MB,
        extracted: 0,
      },
      { id: 'b', phase: 'pending', size: null, downloaded: 0, extracted: 0 }
    );

    expect(bar()).toHaveAttribute('aria-valuenow', '12');
    expect(
      screen.getByText('30 MB downloaded · 0 of 2 layers ready')
    ).toBeInTheDocument();

    report(
      {
        id: 'a',
        phase: 'extracting',
        size: 100 * MB,
        downloaded: 100 * MB,
        extracted: 50 * MB,
      },
      {
        id: 'b',
        phase: 'downloading',
        size: 20 * MB,
        downloaded: 10 * MB,
        extracted: 0,
      }
    );

    expect(bar()).toHaveAttribute('aria-valuenow', '81');
    expect(screen.getByText('81%')).toBeInTheDocument();
    expect(
      screen.getByText('110 MB of 120 MB downloaded · 0 of 2 layers ready')
    ).toBeInTheDocument();

    await act(async () => finishPull());

    expect(
      await screen.findByText('Image pulled successfully!')
    ).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('leaves the tag blank and says so when the image has no latest tag', async () => {
    const { pulls } = mockDockerHub([CUDA], { hubTags: [CUDA_TAG] });
    const user = await choosePullSource({ image: 'nvidia/cuda' });

    await waitFor(() =>
      expect(tagInput()).toHaveAccessibleDescription(
        'This image has no latest tag.'
      )
    );
    expect(tagInput()).toHaveValue('');
    expect(tagInput()).not.toBeInvalid();
    expect(pullButton()).toBeDisabled();
    expect(screen.getByText('docker.io/nvidia/cuda')).toBeInTheDocument();
    expect(screen.getByText('Repository nvidia/cuda')).toBeInTheDocument();
    expect(screen.queryByText(/^Tag /)).toBeNull();

    await user.click(tagInput());
    await user.click(screen.getByRole('option', { name: CUDA_TAG }));
    await pullOnceTheTagIsChecked(user);

    expect(pulls).toEqual([
      { imageName: 'nvidia/cuda', tag: CUDA_TAG, registry: 'docker.io' },
    ]);
  });

  it('shows the size, push date and platforms of the chosen tag', async () => {
    mockDockerHub([NGINX]);
    await choosePullSource({ image: 'nginx' });

    expect(await screen.findByText('Tag latest')).toBeInTheDocument();
    expect(
      screen.getByText(
        `61 MB compressed · pushed ${new Date(PUSHED_AT).toLocaleDateString()}`
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('linux/amd64, linux/arm64/v8, linux/386, linux/arm/v7')
    ).toBeInTheDocument();
    expect(screen.getByText('Repository nginx')).toBeInTheDocument();
  });

  it('refuses a tag Docker Hub does not have', async () => {
    mockDockerHub([NGINX]);
    const user = await choosePullSource({ image: 'nginx' });
    await waitFor(() => expect(pullButton()).toBeEnabled());

    await typeTag(user, 'no-such-tag');

    await waitFor(() =>
      expect(tagInput()).toHaveAccessibleDescription(
        'No tag no-such-tag on Docker Hub.'
      )
    );
    expect(tagInput()).toBeInvalid();
    expect(pullButton()).toBeDisabled();
    expect(screen.queryByText(/^Tag /)).toBeNull();
  });

  it('explains which characters a tag can have without asking Docker Hub', async () => {
    const { tagLookups } = mockDockerHub([NGINX]);
    const user = await choosePullSource({ image: 'nginx' });
    await waitFor(() => expect(pullButton()).toBeEnabled());

    await typeTag(user, '-rc 1');

    expect(tagInput()).toHaveAccessibleDescription(
      'Use letters, digits, _, . and -, not starting with . or -.'
    );
    expect(tagInput()).toBeInvalid();
    expect(pullButton()).toBeDisabled();
    expect(tagLookups).toEqual(['latest']);
  });

  it('still pulls a tag it could not check on Docker Hub', async () => {
    const pulls: unknown[] = [];
    mockIPC((cmd, args) => {
      switch (cmd) {
        case 'search_docker_hub':
          return { results: [NGINX] };
        case 'fetch_image_tags':
          return ['latest'];
        case 'fetch_image_tag':
          return Promise.reject('Docker Hub is unreachable');
        case 'pull_image':
          pulls.push(withoutProgress(pullRequest(args)));
          return 'completed';
        default:
          throw new Error(`Unexpected command ${cmd}`);
      }
    });
    const user = await choosePullSource({ image: 'nginx' });

    await waitFor(() =>
      expect(tagInput()).toHaveAccessibleDescription(
        'Could not check this tag on Docker Hub.'
      )
    );
    expect(tagInput()).toHaveValue('latest');
    expect(tagInput()).not.toBeInvalid();
    await pullOnceTheTagIsChecked(user);

    expect(pulls).toEqual([
      { imageName: 'nginx', tag: 'latest', registry: 'docker.io' },
    ]);
  });

  it('forgets the image and its tag on Clear', async () => {
    mockDockerHub([NGINX]);
    const user = await choosePullSource({ image: 'nginx' });
    await waitFor(() => expect(pullButton()).toBeEnabled());

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(screen.getByLabelText('Image Name')).toHaveValue('');
    expect(tagInput()).toHaveValue('');
    expect(pullButton()).toBeDisabled();
  });

  it('chooses a search result with the keyboard', async () => {
    const { pulls } = mockDockerHub([NGINX]);
    const user = userEvent.setup();
    render(<PullImage />);
    await user.click(screen.getByRole('button', { name: 'Pull Image' }));

    await user.type(screen.getByLabelText('Image Name'), 'nginx');
    await screen.findByText('nginx', { selector: 'span' });
    await user.keyboard('{ArrowDown}{Enter}');

    expect(await screen.findByText('Tag latest')).toBeInTheDocument();
    await pullOnceTheTagIsChecked(user);
    expect(pulls).toEqual([
      { imageName: 'nginx', tag: 'latest', registry: 'docker.io' },
    ]);
  });

  it('closes an open list with Escape before it closes the dialog', async () => {
    mockDockerHub([NGINX]);
    const user = await choosePullSource({ image: 'nginx' });
    const dialog = screen.getByRole('dialog', {
      name: 'Pull Image from Registry',
    });

    await user.click(tagInput());
    expect(tagInput()).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');

    expect(tagInput()).toHaveAttribute('aria-expanded', 'false');
    expect(dialog).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  });

  it('cancels a running pull and says so, keeping the dialog open', async () => {
    const { pullIds, cancellations } = mockPullThatRunsUntilCancelled();
    const user = await choosePullSource({ image: 'nginx' });
    await pullOnceTheTagIsChecked(user);
    expect(screen.getByText('Pulling image...')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel Pull' }));

    expect(await screen.findByText('Pull cancelled')).toBeInTheDocument();
    expect(cancellations).toEqual(pullIds);
    expect(pullIds).toHaveLength(1);
    expect(pullImageDialog()).toBeInTheDocument();
    expect(pullButton()).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  });

  it('stops the pull when the dialog is closed during it', async () => {
    const { pullIds, cancellations } = mockPullThatRunsUntilCancelled();
    const user = await choosePullSource({ image: 'nginx' });
    await pullOnceTheTagIsChecked(user);

    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(pullImageDialog()).not.toBeInTheDocument());
    expect(cancellations).toEqual(pullIds);
  });

  it('stops the pull when Escape closes the dialog during it', async () => {
    const { pullIds, cancellations } = mockPullThatRunsUntilCancelled();
    const user = await choosePullSource({ image: 'nginx' });
    await pullOnceTheTagIsChecked(user);

    await user.keyboard('{Escape}');

    await waitFor(() => expect(pullImageDialog()).not.toBeInTheDocument());
    expect(cancellations).toEqual(pullIds);
  });

  it('keeps the pull running when a click lands outside the dialog', async () => {
    const { cancellations } = mockPullThatRunsUntilCancelled();
    const user = await choosePullSource({ image: 'nginx' });
    await pullOnceTheTagIsChecked(user);

    fireEvent.pointerDown(document.body);

    expect(pullImageDialog()).toBeInTheDocument();
    expect(screen.getByText('Pulling image...')).toBeInTheDocument();
    expect(cancellations).toEqual([]);
  });

  it('starts clean when reopened after a pull was stopped by closing', async () => {
    mockPullThatRunsUntilCancelled();
    const user = await choosePullSource({ image: 'nginx' });
    await pullOnceTheTagIsChecked(user);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(pullImageDialog()).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Pull Image' }));

    expect(pullImageDialog()).toBeInTheDocument();
    expect(screen.queryByText('Pull cancelled')).toBeNull();
    expect(screen.queryByText('Pulling image...')).toBeNull();
  });
});
