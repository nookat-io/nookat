import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { describe, expect, it } from 'vitest';
import { DockerHubImage } from '../../../types/docker-images';
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

function mockDockerHub(searchResults: DockerHubImage[]) {
  const pulls: unknown[] = [];
  mockIPC((cmd, args) => {
    switch (cmd) {
      case 'search_docker_hub':
        return { results: searchResults };
      case 'fetch_image_tags':
        return ['latest'];
      case 'pull_image':
        pulls.push(args);
        return null;
      default:
        throw new Error(`Unexpected command ${cmd}`);
    }
  });
  return pulls;
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

const lookalikeConfirmation = (title: string) =>
  screen.queryByRole('dialog', { name: title });

describe('PullImage', () => {
  it('asks before pulling from a registry that looks like a well-known one', async () => {
    const pulls = mockDockerHub([NGINX]);
    const user = await choosePullSource({
      registry: 'ghrc.io',
      image: 'nginx',
    });

    expect(
      screen.getByText(
        'ghrc.io looks like ghcr.io (GitHub Container Registry), but it is a different registry. Check the spelling before you pull.'
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pull' }));

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
    const pulls = mockDockerHub([NGINX]);
    const user = await choosePullSource({
      registry: 'ghrc.io',
      image: 'nginx',
    });

    await user.click(screen.getByRole('button', { name: 'Pull' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(lookalikeConfirmation('Pull from ghrc.io?')).not.toBeInTheDocument();
    expect(
      screen.getByRole('dialog', { name: 'Pull Image from Registry' })
    ).toBeInTheDocument();
    expect(pulls).toEqual([]);
  });

  it('checks and pulls the registry without the spaces around it', async () => {
    const pulls = mockDockerHub([NGINX]);
    const user = await choosePullSource({
      registry: ' ghrc.io ',
      image: 'nginx',
    });

    expect(
      screen.getByText(/^ghrc\.io looks like ghcr\.io/)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pull' }));
    await user.click(screen.getByRole('button', { name: 'Pull anyway' }));

    expect(pulls).toEqual([
      { imageName: 'nginx', tag: 'latest', registry: 'ghrc.io' },
    ]);
  });

  it('asks before pulling an image named like a popular official image', async () => {
    const pulls = mockDockerHub([searchResult('ubunti', false)]);
    const user = await choosePullSource({ image: 'ubunti' });

    await user.click(screen.getByRole('button', { name: 'Pull' }));

    expect(lookalikeConfirmation('Pull ubunti?')).toHaveAccessibleDescription(
      'ubunti looks like the official ubuntu image, but it is a different image. Lookalike names are a common way to spread malicious images, so check the spelling before you pull.'
    );

    await user.click(screen.getByRole('button', { name: 'Pull anyway' }));

    expect(pulls).toEqual([
      { imageName: 'ubunti', tag: 'latest', registry: 'docker.io' },
    ]);
  });

  it('only notes a registry it does not know and pulls without asking', async () => {
    const pulls = mockDockerHub([NGINX]);
    const user = await choosePullSource({
      registry: 'registry.mycompany.com',
      image: 'nginx',
    });

    expect(
      screen.getByText(
        'registry.mycompany.com is not a registry Nookat recognizes. Pull only images you trust.'
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pull' }));

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
        case 'pull_image':
          return (args as { imageName: string }).imageName === 'nginx'
            ? Promise.reject('manifest for nginx:latest not found')
            : null;
        default:
          throw new Error(`Unexpected command ${cmd}`);
      }
    });
    const user = await choosePullSource({ image: 'nginx' });

    await user.click(screen.getByRole('button', { name: 'Pull' }));
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
    const pulls = mockDockerHub([NGINX]);
    const user = await choosePullSource({ image: 'nginx' });

    expect(screen.queryByText(/looks like|recognizes/)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Pull' }));

    expect(screen.queryByRole('button', { name: 'Pull anyway' })).toBeNull();
    expect(pulls).toEqual([
      { imageName: 'nginx', tag: 'latest', registry: 'docker.io' },
    ]);
  });
});
