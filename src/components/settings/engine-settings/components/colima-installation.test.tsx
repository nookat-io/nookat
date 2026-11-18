import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ColimaInstallation } from './colima-installation';
import { BinaryInstallPlan, InstallationMethod } from '../types';

const PLAN: BinaryInstallPlan = {
  install_dir: '/Users/me/.nookat/engine',
  bin_dir: '/Users/me/.nookat/engine/bin',
  components: [
    { name: 'Colima', version: '0.10.3' },
    { name: 'Lima', version: '2.2.1' },
    { name: 'Docker CLI', version: '29.10.0' },
  ],
  download_bytes: 64_315_959,
  installed_bytes: 130_450_970,
};

interface Setup {
  method?: InstallationMethod;
  homebrewAvailable?: boolean | null;
  plan?: BinaryInstallPlan | null;
  planError?: string | null;
}

function renderInstallation({
  method = 'binary',
  homebrewAvailable = false,
  plan = PLAN,
  planError = null,
}: Setup = {}) {
  const onMethodChange = vi.fn();
  const onInstall = vi.fn();
  render(
    <ColimaInstallation
      method={method}
      onMethodChange={onMethodChange}
      homebrewAvailable={homebrewAvailable}
      binaryInstallPlan={plan}
      binaryInstallPlanError={planError}
      installationOperation="install"
      installationStep="idle"
      installationProgress={{ step: '', message: '', percentage: 0, logs: [] }}
      isInstalling={false}
      error={null}
      onInstall={onInstall}
    />
  );
  return { onMethodChange, onInstall };
}

describe('ColimaInstallation', () => {
  it('offers the binary installation with the releases it downloads', async () => {
    const user = userEvent.setup();
    const { onMethodChange } = renderInstallation({
      method: 'homebrew',
      homebrewAvailable: true,
    });

    await user.click(screen.getByText('Binary Installation'));

    expect(onMethodChange).toHaveBeenCalledWith('binary');
    expect(
      screen.getByText(
        'Downloads Colima 0.10.3, Lima 2.2.1 and Docker CLI 29.10.0 from their official releases and checks each SHA-256 digest. No Homebrew needed.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/Not available yet/)).not.toBeInTheDocument();
  });

  it('installs with the binary method on a Mac without Homebrew', async () => {
    const user = userEvent.setup();
    const { onInstall } = renderInstallation();

    await user.click(screen.getByRole('button', { name: 'Install Colima' }));

    expect(onInstall).toHaveBeenCalledOnce();
  });

  it('says where the binaries go, how much they take and how to use them in a terminal', () => {
    renderInstallation();

    expect(
      screen.getByText(
        'Colima 0.10.3, Lima 2.2.1 and Docker CLI 29.10.0 into /Users/me/.nookat/engine. Downloads 65 MB and takes 131 MB of disk space. Nookat runs them from there; to use them in a terminal too, add /Users/me/.nookat/engine/bin to your PATH.'
      )
    ).toBeInTheDocument();
  });

  it('waits for the backend to describe the binary installation before installing', () => {
    renderInstallation({ plan: null });

    expect(screen.getByText('Checking availability...')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Install Colima' })
    ).toBeDisabled();
  });

  it('explains why the binary installation is unavailable', async () => {
    const user = userEvent.setup();
    const { onMethodChange } = renderInstallation({
      method: 'homebrew',
      homebrewAvailable: true,
      plan: null,
      planError: 'Failed to read host hardware with sysctl',
    });

    await user.click(screen.getByText('Binary Installation'));

    expect(onMethodChange).not.toHaveBeenCalled();
    expect(
      screen.getByText('Failed to read host hardware with sysctl')
    ).toBeInTheDocument();
  });
});
