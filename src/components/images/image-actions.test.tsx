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
  'Failed to delete image bbb: conflict: unable to delete bbb (cannot be forced) - image is being used by running container web';

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
    render(<ImageActions selectedImages={['aaa', 'bbb']} />);

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
    render(<ImageActions selectedImages={[]} />);

    await user.click(screen.getByRole('button', { name: 'Prune Unused' }));
    await user.click(screen.getByRole('button', { name: 'Prune Images' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to prune images: Docker not found'
    );
    expect(window.alert).not.toHaveBeenCalled();
    expect(screen.queryByText('Prune Results')).not.toBeInTheDocument();
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
  });
});
