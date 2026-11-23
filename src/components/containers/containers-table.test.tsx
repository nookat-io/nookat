import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  aContainer,
  inComposeProject,
  recordCommands,
  succeedsFor,
} from '../../tests/containers';
import { Container, ContainerState } from './container-types';
import { ContainersTable } from './containers-table';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

const { Running, Exited, Created, Paused, Restarting } = ContainerState;

function renderTable(containers: Container[], selected: string[] = []) {
  const onSelectionChange = vi.fn();
  const view = render(
    <ContainersTable
      selectedContainers={selected}
      onSelectionChange={onSelectionChange}
      containers={containers}
    />
  );
  return { ...view, onSelectionChange };
}

function SelectableTable({
  containers,
  onSelectionChange,
}: {
  containers: Container[];
  onSelectionChange: (selected: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <ContainersTable
      selectedContainers={selected}
      onSelectionChange={ids => {
        onSelectionChange(ids);
        setSelected(ids);
      }}
      containers={containers}
    />
  );
}

const rowCheckbox = (name: string) =>
  screen.getByRole('checkbox', { name: `Select ${name}` });

const rowOf = (name: string) => rowCheckbox(name).closest('tr') as HTMLElement;

const listedNames = () =>
  screen
    .getAllByRole('checkbox', { name: /^Select (?!all containers$)/ })
    .map(checkbox =>
      checkbox.getAttribute('aria-label')?.replace('Select ', '')
    );

const menuItemNames = () =>
  screen.getAllByRole('menuitem').map(item => item.textContent);

async function openRowMenu(name: string) {
  const user = userEvent.setup();
  await user.click(
    within(rowOf(name)).getByRole('button', { name: 'Container actions' })
  );
  return user;
}

async function chooseRowAction(name: string, action: string) {
  const user = await openRowMenu(name);
  await user.click(await screen.findByRole('menuitem', { name: action }));
}

async function openGroupMenu() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Group actions' }));
  return user;
}

describe('ContainersTable', () => {
  beforeEach(() => {
    toast.success.mockClear();
    toast.error.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it.each([
    [Running, ['Stop', 'Pause', 'Restart', 'Terminal', 'Logs', 'Force Delete']],
    [Exited, ['Start', 'Logs', 'Delete']],
    [Created, ['Start', 'Logs', 'Delete']],
    [Paused, ['Resume', 'Logs']],
    [Restarting, ['Stop', 'Restart', 'Logs']],
  ])(
    'offers the row actions that fit the container state: %s',
    async (state, actions) => {
      recordCommands({});
      renderTable([aContainer('web', state)]);

      await openRowMenu('web');

      expect(menuItemNames()).toEqual(actions);
    }
  );

  it.each([
    ['Start', Exited, 'start_container', 'Started container'],
    ['Stop', Running, 'stop_container', 'Stopped container'],
    ['Pause', Running, 'pause_container', 'Paused container'],
    ['Resume', Paused, 'unpause_container', 'Resumed container'],
    ['Restart', Running, 'restart_container', 'Restarted container'],
    ['Terminal', Running, 'open_terminal', 'Terminal opened'],
  ])(
    'sends the command for each row action and confirms it: %s',
    async (action, state, command, confirmation) => {
      const sent = recordCommands({ [command]: () => null });
      renderTable([aContainer('web', state)]);

      await chooseRowAction('web', action);

      expect(sent).toEqual([{ cmd: command, args: { id: 'web-id' } }]);
      expect(toast.success).toHaveBeenCalledWith(confirmation);
    }
  );

  it('force deletes a running container and deletes a stopped one', async () => {
    const sent = recordCommands({
      force_remove_container: () => null,
      remove_container: () => null,
    });
    renderTable([aContainer('web', Running), aContainer('old', Exited)]);

    await chooseRowAction('web', 'Force Delete');
    await chooseRowAction('old', 'Delete');

    expect(sent).toEqual([
      { cmd: 'force_remove_container', args: { id: 'web-id' } },
      { cmd: 'remove_container', args: { id: 'old-id' } },
    ]);
    expect(toast.success).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenNthCalledWith(1, 'Removed container');
    expect(toast.success).toHaveBeenNthCalledWith(2, 'Removed container');
  });

  it('reports why a row action failed', async () => {
    recordCommands({
      stop_container: () => Promise.reject('Docker not found'),
    });
    renderTable([aContainer('web', Running)]);

    await chooseRowAction('web', 'Stop');

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to stop container: Docker not found'
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('opens the logs of the container whose menu was used', async () => {
    recordCommands({ container_logs: () => [] });
    renderTable([aContainer('web', Running), aContainer('db', Running)]);

    await chooseRowAction('web', 'Logs');

    expect(
      await screen.findByRole('dialog', { name: 'Container Logs: web' })
    ).toBeInTheDocument();
  });

  it('folds a compose project into one collapsed group row', async () => {
    const user = userEvent.setup();
    recordCommands({});
    renderTable([
      aContainer('shop-web', Running, inComposeProject('shop')),
      aContainer('solo', Running),
      aContainer('shop-db', Running, inComposeProject('shop')),
    ]);

    expect(screen.getByText('shop')).toBeInTheDocument();
    expect(screen.getByText('2 containers')).toBeInTheDocument();
    expect(listedNames()).toEqual(['solo']);

    await user.click(screen.getByRole('button', { name: 'Expand shop' }));
    expect(listedNames()).toEqual(['shop-db', 'shop-web', 'solo']);

    await user.click(screen.getByRole('button', { name: 'Collapse shop' }));
    expect(listedNames()).toEqual(['solo']);
  });

  it('offers Start and Delete for a stopped group and sends them for the whole group', async () => {
    const sent = recordCommands({
      bulk_start_containers: succeedsFor,
      bulk_remove_containers: succeedsFor,
    });
    renderTable([
      aContainer('shop-api', Exited, inComposeProject('shop')),
      aContainer('shop-web', Exited, inComposeProject('shop')),
      aContainer('solo', Exited),
    ]);

    let user = await openGroupMenu();
    expect(menuItemNames()).toEqual(['Start', 'Delete']);
    await user.click(screen.getByRole('menuitem', { name: 'Start' }));

    user = await openGroupMenu();
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

    const ids = ['shop-api-id', 'shop-web-id'];
    expect(sent).toEqual([
      { cmd: 'bulk_start_containers', args: { ids } },
      { cmd: 'bulk_remove_containers', args: { ids } },
    ]);
  });

  it('offers Stop and Force Delete for a group with a running container', async () => {
    const sent = recordCommands({
      bulk_stop_containers: succeedsFor,
      bulk_force_remove_containers: succeedsFor,
    });
    renderTable([
      aContainer('shop-api', Running, inComposeProject('shop')),
      aContainer('shop-web', Exited, inComposeProject('shop')),
      aContainer('solo', Running),
    ]);

    let user = await openGroupMenu();
    expect(menuItemNames()).toEqual(['Stop', 'Force Delete']);
    await user.click(screen.getByRole('menuitem', { name: 'Stop' }));

    user = await openGroupMenu();
    await user.click(screen.getByRole('menuitem', { name: 'Force Delete' }));

    const ids = ['shop-api-id', 'shop-web-id'];
    expect(sent).toEqual([
      { cmd: 'bulk_stop_containers', args: { ids } },
      { cmd: 'bulk_force_remove_containers', args: { ids } },
    ]);
  });

  it('selects every container from the header checkbox, including those in collapsed groups', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <SelectableTable
        containers={[
          aContainer('shop-web', Running, inComposeProject('shop')),
          aContainer('solo', Running),
          aContainer('shop-db', Exited, inComposeProject('shop')),
        ]}
        onSelectionChange={onSelectionChange}
      />
    );
    const selectAll = screen.getByRole('checkbox', {
      name: 'Select all containers',
    });

    await user.click(selectAll);

    expect([...onSelectionChange.mock.lastCall![0]].sort()).toEqual([
      'shop-db-id',
      'shop-web-id',
      'solo-id',
    ]);
    expect(selectAll).toBeChecked();

    await user.click(selectAll);

    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    expect(selectAll).not.toBeChecked();
  });

  it('adds and removes one container with its row checkbox', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <SelectableTable
        containers={[aContainer('web', Running), aContainer('db', Running)]}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(rowCheckbox('web'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['web-id']);
    expect(rowCheckbox('web')).toBeChecked();
    expect(rowCheckbox('db')).not.toBeChecked();

    await user.click(rowCheckbox('db'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['web-id', 'db-id']);

    await user.click(rowCheckbox('web'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['db-id']);
    expect(rowCheckbox('web')).not.toBeChecked();
  });

  it('drops selected containers that are no longer listed', () => {
    const web = aContainer('web', Running);
    const db = aContainer('db', Running);
    const { rerender, onSelectionChange } = renderTable(
      [web, db],
      ['web-id', 'db-id']
    );
    expect(onSelectionChange).not.toHaveBeenCalled();

    rerender(
      <ContainersTable
        selectedContainers={['web-id', 'db-id']}
        onSelectionChange={onSelectionChange}
        containers={[web]}
      />
    );

    expect(onSelectionChange).toHaveBeenCalledWith(['web-id']);
  });

  it('sorts the rows by name and reverses them on a click on Name', async () => {
    const user = userEvent.setup();
    renderTable([
      aContainer('bravo', Running),
      aContainer('charlie', Running),
      aContainer('alpha', Running),
    ]);

    expect(listedNames()).toEqual(['alpha', 'bravo', 'charlie']);

    await user.click(screen.getByRole('columnheader', { name: 'Name' }));

    expect(listedNames()).toEqual(['charlie', 'bravo', 'alpha']);
  });

  it('shows the loading message, and the error with a Retry button that calls onRetry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(
      <ContainersTable
        selectedContainers={[]}
        onSelectionChange={() => {}}
        containers={[]}
        isLoading
      />
    );

    expect(screen.getByText('Loading containers...')).toBeInTheDocument();

    rerender(
      <ContainersTable
        selectedContainers={[]}
        onSelectionChange={() => {}}
        containers={[]}
        error="Cannot reach the engine"
        onRetry={onRetry}
      />
    );

    expect(screen.getByText('Cannot reach the engine')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
