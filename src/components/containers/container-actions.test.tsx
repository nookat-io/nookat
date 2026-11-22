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
});
