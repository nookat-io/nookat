import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VmResourcesCard } from './vm-resources-card';
import {
  ColimaPerformanceWarning,
  ColimaProfileStatus,
  ColimaVm,
  ColimaVmSettingsChanges,
} from '../types';

function colimaVm(
  status: ColimaProfileStatus,
  warnings: ColimaPerformanceWarning[] = []
): ColimaVm {
  return {
    profile: {
      name: 'default',
      status,
      settings: {
        cpus: 2,
        memory_gib: 4,
        disk_gib: 60,
        architecture: 'aarch64',
        vm_type: 'vz',
        rosetta: false,
        mount_inotify: false,
      },
      activates_docker_context: true,
    },
    host: {
      cpus: 12,
      memory_gib: 36,
      architecture: 'aarch64',
      supports_vz: true,
    },
    warnings,
    docker_context: null,
  };
}

function renderCard({
  vm = colimaVm('Stopped'),
  changes = {},
  isEngineRunning = false,
}: {
  vm?: ColimaVm;
  changes?: ColimaVmSettingsChanges;
  isEngineRunning?: boolean;
} = {}) {
  const onChangeSetting = vi.fn();
  render(
    <VmResourcesCard
      vm={vm}
      changes={changes}
      onChangeSetting={onChangeSetting}
      isEngineRunning={isEngineRunning}
      isBusy={false}
    />
  );
  return { onChangeSetting };
}

describe('VmResourcesCard', () => {
  it('labels every resource control, including the architecture picker', () => {
    renderCard();

    expect(screen.getByLabelText('CPU Cores')).toHaveValue(2);
    expect(screen.getByLabelText('Memory (GB)')).toHaveValue(4);
    expect(screen.getByLabelText('Disk (GB)')).toHaveValue(60);
    expect(
      screen.getByRole('combobox', { name: 'Architecture' })
    ).toHaveTextContent('ARM64');
    expect(
      screen.getByRole('switch', {
        name: 'Propagate file changes (hot reload)',
      })
    ).not.toBeChecked();
  });

  it('shows the values the user changed on top of the profile', () => {
    renderCard({ changes: { cpus: 6, mount_inotify: true } });

    expect(screen.getByLabelText('CPU Cores')).toHaveValue(6);
    expect(screen.getByLabelText('Memory (GB)')).toHaveValue(4);
    expect(
      screen.getByRole('switch', {
        name: 'Propagate file changes (hot reload)',
      })
    ).toBeChecked();
  });

  it('turns hot reload on through the change setter', async () => {
    const user = userEvent.setup();
    const { onChangeSetting } = renderCard();

    await user.click(
      screen.getByRole('switch', {
        name: 'Propagate file changes (hot reload)',
      })
    );

    expect(onChangeSetting).toHaveBeenCalledWith('mount_inotify', true);
  });

  it('keeps the architecture of an existing profile, because Colima fixes it at creation', () => {
    renderCard();

    expect(
      screen.getByRole('combobox', { name: 'Architecture' })
    ).toBeDisabled();
  });

  it('lets the user pick the architecture of a profile that does not exist yet', () => {
    renderCard({ vm: colimaVm('Missing') });

    expect(
      screen.getByRole('combobox', { name: 'Architecture' })
    ).toBeEnabled();
    expect(screen.getByText(/does not exist yet/)).toBeInTheDocument();
  });

  it('caps CPU cores at the cores of the Mac', () => {
    renderCard();

    expect(screen.getByLabelText('CPU Cores')).toHaveAttribute('max', '12');
  });

  it('does not offer to shrink the disk of an existing profile', () => {
    renderCard();

    expect(screen.getByLabelText('Disk (GB)')).toHaveAttribute('min', '60');
  });

  it('locks the form while the VM runs and says how to change it', () => {
    renderCard({ vm: colimaVm('Running'), isEngineRunning: true });

    expect(screen.getByLabelText('CPU Cores')).toBeDisabled();
    expect(
      screen.getByRole('switch', {
        name: 'Propagate file changes (hot reload)',
      })
    ).toBeDisabled();
    expect(
      screen.getByText(/Stop the engine to change its resources/)
    ).toBeInTheDocument();
  });

  it('warns about a slow VM the backend reports', () => {
    renderCard({
      vm: colimaVm('Running', [
        { kind: 'FewCpus', cpus: 2 },
        { kind: 'RosettaOff' },
      ]),
      isEngineRunning: true,
    });

    expect(
      screen.getByText('The engine runs on only 2 CPU cores')
    ).toBeInTheDocument();
    expect(screen.getByText(/than with all 12 cores/)).toBeInTheDocument();
    expect(screen.getByText('Rosetta is off')).toBeInTheDocument();
  });

  it('names a single CPU core in the singular', () => {
    renderCard({
      vm: colimaVm('Running', [{ kind: 'FewCpus', cpus: 1 }]),
      isEngineRunning: true,
    });

    expect(
      screen.getByText('The engine runs on only 1 CPU core')
    ).toBeInTheDocument();
  });
});
