import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC } from '@tauri-apps/api/mocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContainerActions } from './container-actions';
import { Container, ContainerState } from './container-types';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

function mockContainerCommands(
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

const containersIn = (state: ContainerState): Container[] =>
  ['a', 'b', 'c'].map(id => ({ id, names: [`/${id}`], state }));

const failingFor = (failingId: string, error: string) => () => ({
  succeeded: ['a', 'b', 'c'].filter(id => id !== failingId),
  failed: [{ id: failingId, error }],
});

describe('container actions', () => {
  beforeEach(() => {
    toast.success.mockClear();
    toast.error.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('reports the containers it could not stop and how many of the selection failed', async () => {
    const user = userEvent.setup();
    mockContainerCommands({
      bulk_stop_containers: failingFor('b', 'Failed to stop container: boom'),
    });
    render(
      <ContainerActions
        selectedContainers={['a', 'b', 'c']}
        containers={containersIn(ContainerState.Running)}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Stop' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to stop 1 of 3 containers: Failed to stop container: boom'
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('lists each distinct reason once when several containers fail', async () => {
    const user = userEvent.setup();
    mockContainerCommands({
      bulk_start_containers: () => ({
        succeeded: [],
        failed: [
          { id: 'a', error: 'port is already allocated' },
          { id: 'b', error: 'port is already allocated' },
          { id: 'c', error: 'no such image' },
        ],
      }),
    });
    render(
      <ContainerActions
        selectedContainers={['a', 'b', 'c']}
        containers={containersIn(ContainerState.Created)}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Start' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to start 3 containers: port is already allocated; no such image'
    );
  });

  it('confirms the action when every container succeeds', async () => {
    const user = userEvent.setup();
    mockContainerCommands({
      bulk_stop_containers: () => ({
        succeeded: ['a', 'b', 'c'],
        failed: [],
      }),
    });
    render(
      <ContainerActions
        selectedContainers={['a', 'b', 'c']}
        containers={containersIn(ContainerState.Running)}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Stop' }));

    expect(toast.success).toHaveBeenCalledWith('Stopped 3 containers');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('keeps only the containers it could not delete selected', async () => {
    const user = userEvent.setup();
    mockContainerCommands({
      bulk_remove_containers: failingFor(
        'b',
        'Failed to remove container: conflict'
      ),
    });
    const onSelectionChange = vi.fn();
    render(
      <ContainerActions
        selectedContainers={['a', 'b', 'c']}
        containers={containersIn(ContainerState.Exited)}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to remove 1 of 3 containers: Failed to remove container: conflict'
    );
    expect(onSelectionChange).toHaveBeenCalledWith(['b']);
  });

  it('clears the selection after deleting every container', async () => {
    const user = userEvent.setup();
    mockContainerCommands({
      bulk_remove_containers: () => ({
        succeeded: ['a', 'b', 'c'],
        failed: [],
      }),
    });
    const onSelectionChange = vi.fn();
    render(
      <ContainerActions
        selectedContainers={['a', 'b', 'c']}
        containers={containersIn(ContainerState.Exited)}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(toast.success).toHaveBeenCalledWith('Removed 3 containers');
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('reports why the engine could not be reached and keeps the selection', async () => {
    const user = userEvent.setup();
    mockContainerCommands({
      bulk_remove_containers: () => Promise.reject('Docker not found'),
    });
    const onSelectionChange = vi.fn();
    render(
      <ContainerActions
        selectedContainers={['a', 'b', 'c']}
        containers={containersIn(ContainerState.Exited)}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to remove 3 containers: Docker not found'
    );
    expect(onSelectionChange).not.toHaveBeenCalledWith([]);
  });

  describe('when a selected container is running', () => {
    const webAndOld: Container[] = [
      { id: 'web', names: ['/web'], state: ContainerState.Running },
      { id: 'old', names: ['/old'], state: ContainerState.Exited },
    ];

    const renderWithRunningSelection = () => {
      const forceRemove = vi.fn(() => ({
        succeeded: ['web', 'old'],
        failed: [],
      }));
      mockContainerCommands({ bulk_force_remove_containers: forceRemove });
      const onSelectionChange = vi.fn();
      render(
        <ContainerActions
          selectedContainers={['web', 'old']}
          containers={webAndOld}
          onSelectionChange={onSelectionChange}
        />
      );
      return { forceRemove, onSelectionChange };
    };

    it('labels the toolbar delete Force Delete when a selected container is running', () => {
      renderWithRunningSelection();

      expect(
        screen.getByRole('button', { name: 'Force Delete' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Delete' })
      ).not.toBeInTheDocument();
    });

    it('asks before force deleting and names the running containers', async () => {
      const user = userEvent.setup();
      const { forceRemove } = renderWithRunningSelection();

      await user.click(screen.getByRole('button', { name: 'Force Delete' }));

      const dialog = screen.getByRole('dialog', {
        name: 'Confirm Force Delete',
      });
      expect(dialog).toHaveTextContent('2 containers');
      expect(dialog).toHaveTextContent('web');
      expect(dialog).not.toHaveTextContent('old');
      expect(forceRemove).not.toHaveBeenCalled();
    });

    it('sends nothing when the force delete is cancelled', async () => {
      const user = userEvent.setup();
      const { forceRemove, onSelectionChange } = renderWithRunningSelection();

      await user.click(screen.getByRole('button', { name: 'Force Delete' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(forceRemove).not.toHaveBeenCalled();
      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it('force deletes the selection once confirmed', async () => {
      const user = userEvent.setup();
      const { forceRemove, onSelectionChange } = renderWithRunningSelection();

      await user.click(screen.getByRole('button', { name: 'Force Delete' }));
      await user.click(
        screen.getByRole('button', { name: 'Force Delete Containers' })
      );

      expect(forceRemove).toHaveBeenCalledWith({ ids: ['web', 'old'] });
      expect(toast.success).toHaveBeenCalledWith('Removed 2 containers');
      expect(onSelectionChange).toHaveBeenCalledWith([]);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('deletes stopped containers without asking', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(() => ({ succeeded: ['a', 'b'], failed: [] }));
    mockContainerCommands({ bulk_remove_containers: remove });
    render(
      <ContainerActions
        selectedContainers={['a', 'b']}
        containers={containersIn(ContainerState.Exited)}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(remove).toHaveBeenCalledWith({ ids: ['a', 'b'] });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
