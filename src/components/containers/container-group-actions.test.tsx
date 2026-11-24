import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContainerGroupActions } from './container-group-actions';
import { ContainerState } from './container-types';
import { aContainer, recordCommands } from '../../tests/containers';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

describe('container group actions', () => {
  beforeEach(() => {
    toast.success.mockClear();
    toast.error.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('names the containers of a Compose group that failed to stop', async () => {
    const user = userEvent.setup();
    const web = aContainer('web', ContainerState.Running);
    const db = aContainer('db', ContainerState.Running);
    const sent = recordCommands({
      bulk_stop_containers: () => ({
        succeeded: [web.id],
        failed: [{ id: db.id, error: 'boom' }],
      }),
    });
    render(
      <ContainerGroupActions
        containers={[web, db]}
        hasRunningContainers={true}
        allStopped={false}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Group actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Stop' }));

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to stop 1 of 2 containers: db: boom'
      )
    );
    expect(sent).toEqual([
      { cmd: 'bulk_stop_containers', args: { ids: [web.id, db.id] } },
    ]);
  });
});
