import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageActions } from './image-actions';
import { ImagesTable } from './images-table';
import { Image } from './image-types';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

const IN_USE =
  'conflict: unable to delete bbb (cannot be forced) - image is being used by running container web';

function mockImageCommands(
  handlers: Partial<Record<string, (args: Record<string, unknown>) => unknown>>
) {
  mockIPC((cmd, args) => {
    const handler = handlers[cmd];
    if (!handler) {
      throw new Error(`Unexpected command ${cmd}`);
    }
    return handler(args as Record<string, unknown>);
  });
}

const deleteFailingFor =
  (failingId: string, reason: string) => (args: Record<string, unknown>) =>
    args.imageId === failingId ? Promise.reject(reason) : null;

const webImage: Image = {
  id: 'bbb',
  repository: 'web',
  tag: 'latest',
  image_id: 'bbb',
  created: 1_700_000_000,
  size: 1024,
  in_use: true,
  dangling: false,
};

const alpineImage: Image = {
  id: 'alpine:3.20',
  repository: 'alpine',
  tag: '3.20',
  image_id: 'sha256:aaa',
  created: 1_700_000_000,
  size: 8_000_000,
  in_use: false,
  dangling: false,
};

const localBuild: Image = {
  id: 'nookat-prune:dev',
  repository: 'nookat-prune',
  tag: 'dev',
  image_id: 'sha256:bbb',
  created: 1_700_000_000,
  size: 8_000_000,
  in_use: false,
  dangling: false,
};

const danglingBuild: Image = {
  id: 'sha256:ccc',
  repository: '<untagged>@ccc',
  tag: null,
  image_id: 'sha256:ccc',
  created: 1_700_000_000,
  size: 8_000_000,
  in_use: false,
  dangling: true,
};

const pruneCandidates = [danglingBuild, webImage, localBuild, alpineImage];

describe('image actions', () => {
  beforeEach(() => {
    toast.success.mockClear();
    toast.error.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('reports the images it could not delete in a toast with the reason from the backend, keeping only those selected', async () => {
    const user = userEvent.setup();
    mockImageCommands({ delete_image: deleteFailingFor('bbb', IN_USE) });
    const onImagesDeleted = vi.fn();
    const onSelectionChange = vi.fn();
    render(
      <ImageActions
        selectedImages={['aaa', 'bbb']}
        images={[]}
        onImagesDeleted={onImagesDeleted}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'Delete Selected (2)' })
    );
    await user.click(screen.getByRole('button', { name: 'Delete Images' }));

    expect(toast.error).toHaveBeenCalledWith(
      `Failed to delete 1 of 2 images: ${IN_USE}`
    );
    expect(window.alert).not.toHaveBeenCalled();
    expect(onImagesDeleted).toHaveBeenCalledWith(['aaa']);
    expect(onSelectionChange).toHaveBeenCalledWith(['bbb']);
  });

  it('confirms deleting the selected images in a toast, like the other pages', async () => {
    const user = userEvent.setup();
    mockImageCommands({ delete_image: () => null });
    render(<ImageActions selectedImages={['aaa', 'bbb']} images={[]} />);

    await user.click(
      screen.getByRole('button', { name: 'Delete Selected (2)' })
    );
    await user.click(screen.getByRole('button', { name: 'Delete Images' }));

    expect(toast.success).toHaveBeenCalledWith('Deleted 2 images');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('reports a failed prune in a toast with the reason from the backend and shows no results', async () => {
    const user = userEvent.setup();
    mockImageCommands({
      prune_images: () => Promise.reject('Docker not found'),
    });
    render(<ImageActions selectedImages={[]} images={[alpineImage]} />);

    await user.click(screen.getByRole('button', { name: 'Prune Unused' }));
    await user.click(screen.getByRole('button', { name: 'Remove 1 Image' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to prune images: Docker not found'
    );
    expect(window.alert).not.toHaveBeenCalled();
    expect(screen.queryByText('Prune Results')).not.toBeInTheDocument();
  });

  it('names every image Prune Unused will remove before it asks', async () => {
    const user = userEvent.setup();
    mockImageCommands({});
    render(<ImageActions selectedImages={[]} images={pruneCandidates} />);

    await user.click(screen.getByRole('button', { name: 'Prune Unused' }));

    const dialog = screen.getByRole('dialog');
    const toRemove = within(dialog).getByRole('list', {
      name: 'Images to remove',
    });
    expect(
      within(toRemove)
        .getAllByRole('listitem')
        .map(item => item.textContent)
    ).toEqual([
      expect.stringMatching(/^alpine:3\.20/),
      expect.stringMatching(/^nookat-prune:dev/),
      expect.stringMatching(/^<untagged>@ccc/),
    ]);
    expect(within(dialog).queryByText('web:latest')).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole('radio', { name: 'All unused images (3)' })
    ).toBeChecked();
    expect(
      within(dialog).getByRole('button', { name: 'Remove 3 Images' })
    ).toBeEnabled();
  });

  it('prunes every unused image when confirmed as it opens', async () => {
    const user = userEvent.setup();
    const pruneArgs: unknown[] = [];
    mockImageCommands({
      prune_images: args => {
        pruneArgs.push(args);
        return { images_deleted: [], space_reclaimed: 0 };
      },
    });
    render(<ImageActions selectedImages={[]} images={pruneCandidates} />);

    await user.click(screen.getByRole('button', { name: 'Prune Unused' }));
    await user.click(screen.getByRole('button', { name: 'Remove 3 Images' }));

    expect(pruneArgs).toEqual([{ scope: 'all_unused' }]);
  });

  it('removes only dangling images when that is chosen', async () => {
    const user = userEvent.setup();
    const pruneArgs: unknown[] = [];
    mockImageCommands({
      prune_images: args => {
        pruneArgs.push(args);
        return { images_deleted: [], space_reclaimed: 0 };
      },
    });
    render(<ImageActions selectedImages={[]} images={pruneCandidates} />);

    await user.click(screen.getByRole('button', { name: 'Prune Unused' }));
    const dialog = screen.getByRole('dialog');
    await user.click(
      within(dialog).getByRole('radio', { name: 'Dangling images only (1)' })
    );

    expect(within(dialog).getByText('<untagged>@ccc')).toBeInTheDocument();
    expect(within(dialog).queryByText('alpine:3.20')).not.toBeInTheDocument();
    expect(
      within(dialog).queryByText('nookat-prune:dev')
    ).not.toBeInTheDocument();

    await user.click(
      within(dialog).getByRole('button', { name: 'Remove 1 Image' })
    );

    expect(pruneArgs).toEqual([{ scope: 'dangling' }]);
  });

  it('chooses every unused image again each time the dialog opens', async () => {
    const user = userEvent.setup();
    mockImageCommands({});
    render(<ImageActions selectedImages={[]} images={pruneCandidates} />);

    await user.click(screen.getByRole('button', { name: 'Prune Unused' }));
    await user.click(
      screen.getByRole('radio', { name: 'Dangling images only (1)' })
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Prune Unused' }));

    expect(
      screen.getByRole('radio', { name: 'All unused images (3)' })
    ).toBeChecked();
  });

  it('has nothing to remove when every image is in use', async () => {
    const user = userEvent.setup();
    mockImageCommands({});
    render(<ImageActions selectedImages={[]} images={[webImage]} />);

    await user.click(screen.getByRole('button', { name: 'Prune Unused' }));

    expect(screen.getByText('No unused images to remove.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Nothing to Remove' })
    ).toBeDisabled();
  });

  it('names each removed image once in the results', async () => {
    const user = userEvent.setup();
    mockImageCommands({
      prune_images: () => ({
        images_deleted: [
          { id: 'sha256:aaa', tags: ['alpine:3.20'] },
          { id: 'sha256:0123456789abcdef0123', tags: [] },
        ],
        space_reclaimed: 1024,
      }),
    });
    render(<ImageActions selectedImages={[]} images={pruneCandidates} />);

    await user.click(screen.getByRole('button', { name: 'Prune Unused' }));
    await user.click(screen.getByRole('button', { name: 'Remove 3 Images' }));

    const results = await screen.findByRole('dialog', {
      name: 'Prune Results',
    });
    expect(within(results).getByText('2 images removed')).toBeInTheDocument();
    expect(within(results).getByText('alpine:3.20')).toBeInTheDocument();
    expect(within(results).getByText('0123456789ab')).toBeInTheDocument();
    expect(within(results).queryByText(/unknown/)).not.toBeInTheDocument();
  });

  it('says so when a prune removed no image', async () => {
    const user = userEvent.setup();
    mockImageCommands({
      prune_images: () => ({ images_deleted: [], space_reclaimed: 0 }),
    });
    render(<ImageActions selectedImages={[]} images={pruneCandidates} />);

    await user.click(screen.getByRole('button', { name: 'Prune Unused' }));
    await user.click(screen.getByRole('button', { name: 'Remove 3 Images' }));

    const results = await screen.findByRole('dialog', {
      name: 'Prune Results',
    });
    expect(
      within(results).getByText('No images were removed.')
    ).toBeInTheDocument();
    expect(within(results).queryByText(/0 removed/)).not.toBeInTheDocument();
  });

  it('reports a failed delete from the row menu in a toast with the reason from the backend and keeps the image listed', async () => {
    const user = userEvent.setup();
    mockImageCommands({ delete_image: deleteFailingFor('bbb', IN_USE) });
    const onImagesDeleted = vi.fn();
    render(
      <ImagesTable
        selectedImages={[]}
        onSelectionChange={() => {}}
        images={[webImage]}
        onImagesDeleted={onImagesDeleted}
        emptyState={null}
      />
    );

    const row = screen.getByRole('row', { name: /web/ });
    await user.click(within(row).getByRole('button'));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete Image' }));

    expect(toast.error).toHaveBeenCalledWith(
      `Failed to delete image: ${IN_USE}`
    );
    expect(window.alert).not.toHaveBeenCalled();
    expect(onImagesDeleted).not.toHaveBeenCalled();
  });

  it('removes only the chosen tag of an image that has other tags', async () => {
    const user = userEvent.setup();
    const deleted: unknown[] = [];
    mockImageCommands({
      delete_image: args => {
        deleted.push(args.imageId);
        return null;
      },
    });
    const onImagesDeleted = vi.fn();
    const alpine: Image = {
      id: 'alpine:3.20',
      repository: 'alpine',
      tag: '3.20',
      image_id: 'sha256:abc',
      created: 1_700_000_000,
      size: 1024,
      in_use: true,
      dangling: false,
    };
    const localAlpine: Image = {
      ...alpine,
      id: 'localhost:5000/alpine:3.20',
      repository: 'localhost:5000/alpine',
    };
    render(
      <ImagesTable
        selectedImages={[]}
        onSelectionChange={() => {}}
        images={[localAlpine]}
        allImages={[alpine, localAlpine]}
        onImagesDeleted={onImagesDeleted}
        emptyState={null}
      />
    );

    const row = screen.getByRole('row', { name: /localhost:5000\/alpine/ });
    await user.click(within(row).getByRole('button'));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText('localhost:5000/alpine:3.20')
    ).toBeInTheDocument();
    expect(within(dialog).getByText('alpine:3.20')).toBeInTheDocument();
    expect(within(dialog).queryByText(/in use/)).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Delete Image' })
    ).not.toBeInTheDocument();

    await user.click(
      within(dialog).getByRole('button', { name: 'Remove Tag' })
    );

    expect(deleted).toEqual(['localhost:5000/alpine:3.20']);
    expect(onImagesDeleted).toHaveBeenCalledWith([
      'localhost:5000/alpine:3.20',
    ]);
    expect(toast.success).toHaveBeenCalledWith(
      'Removed tag localhost:5000/alpine:3.20'
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('reports a failed tag removal in a toast with the reason from the backend', async () => {
    const user = userEvent.setup();
    const reason = 'No such image: localhost:5000/alpine:3.20';
    mockImageCommands({ delete_image: () => Promise.reject(reason) });
    const onImagesDeleted = vi.fn();
    const alpine: Image = {
      id: 'alpine:3.20',
      repository: 'alpine',
      tag: '3.20',
      image_id: 'sha256:abc',
      created: 1_700_000_000,
      size: 1024,
      in_use: false,
      dangling: false,
    };
    const localAlpine: Image = {
      ...alpine,
      id: 'localhost:5000/alpine:3.20',
      repository: 'localhost:5000/alpine',
    };
    render(
      <ImagesTable
        selectedImages={[]}
        onSelectionChange={() => {}}
        images={[localAlpine]}
        allImages={[alpine, localAlpine]}
        onImagesDeleted={onImagesDeleted}
        emptyState={null}
      />
    );

    const row = screen.getByRole('row', { name: /localhost:5000\/alpine/ });
    await user.click(within(row).getByRole('button'));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Remove Tag' }));

    expect(toast.error).toHaveBeenCalledWith(
      `Failed to remove tag localhost:5000/alpine:3.20: ${reason}`
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(onImagesDeleted).not.toHaveBeenCalled();
  });
});
