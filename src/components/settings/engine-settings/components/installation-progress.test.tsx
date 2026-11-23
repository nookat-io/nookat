import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InstallationProgress } from './installation-progress';
import { EngineActionsCard } from './engine-actions-card';
import {
  ColimaEngineStopProgressType,
  EngineOperation,
  InstallationProgress as Progress,
} from '../types';

const progressAt = (step: string): ColimaEngineStopProgressType => ({
  step,
  message: '',
  percentage: 100,
  logs: [],
});

const running = (overrides: Partial<Progress>): Progress => ({
  step: 'Installing colima with Homebrew (1 of 2)...',
  message: 'brew install colima',
  percentage: null,
  logs: [],
  ...overrides,
});

describe('InstallationProgress while it runs', () => {
  it('shows an indeterminate bar and no percentage while the backend cannot tell how far it is', () => {
    render(
      <InstallationProgress
        operation="install"
        step="installing"
        progress={running({ percentage: null })}
        error={null}
      />
    );

    expect(screen.getByRole('progressbar')).not.toHaveAttribute(
      'aria-valuenow'
    );
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it('shows the percentage when the backend knows it, as the binary installation does', () => {
    render(
      <InstallationProgress
        operation="install"
        step="installing"
        progress={running({ percentage: 42 })}
        error={null}
      />
    );

    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '42'
    );
  });

  it('shows the newest output line under the bar', () => {
    render(
      <InstallationProgress
        operation="start"
        step="starting-vm"
        progress={running({
          message: 'time="..." level=info msg="starting colima"',
        })}
        error={null}
      />
    );

    expect(
      screen.getByText('time="..." level=info msg="starting colima"')
    ).toBeInTheDocument();
  });

  it('keeps the newest log line in view', () => {
    const { rerender } = render(
      <InstallationProgress
        operation="install"
        step="installing"
        progress={running({ logs: ['==> Fetching colima', '==> Pouring'] })}
        error={null}
      />
    );
    const log = screen.getByRole('log');
    Object.defineProperty(log, 'scrollHeight', {
      configurable: true,
      value: 480,
    });

    rerender(
      <InstallationProgress
        operation="install"
        step="installing"
        progress={running({
          logs: ['==> Fetching colima', '==> Pouring', '==> Summary'],
        })}
        error={null}
      />
    );

    expect(log.scrollTop).toBe(480);
  });
});

describe('InstallationProgress', () => {
  it.each<[EngineOperation, string]>([
    ['install', 'Installation failed'],
    ['start', 'Engine start failed'],
    ['stop', 'Engine stop failed'],
  ])(
    'titles a failed %s after that operation, so a failed stop is not reported as a failed installation',
    (operation, title) => {
      render(
        <InstallationProgress
          operation={operation}
          step="error"
          progress={progressAt('Stopping Engine...')}
          error="colima stop: exit status 1"
        />
      );

      expect(screen.getByText(title)).toBeInTheDocument();
      expect(
        screen.getByText('colima stop: exit status 1')
      ).toBeInTheDocument();
    }
  );
});

describe('EngineActionsCard', () => {
  it('reports a failed stop once, even though the engine start earlier in the session finished', () => {
    render(
      <EngineActionsCard
        isEngineRunning
        isInstalling={false}
        installationOperation="start"
        installationStep="complete"
        installationProgress={progressAt('Engine Ready!')}
        stopStep="error"
        stopProgress={progressAt('Stopping Engine...')}
        error="colima stop: exit status 1"
        onStartEngine={() => {}}
        onStopEngine={() => {}}
        dockerContext={null}
        isSwitchingDockerContext={false}
        dockerContextError={null}
        onSwitchDockerToColima={() => {}}
        otherEngine={null}
        activatesDockerContext
      />
    );

    expect(screen.getByText('Engine Ready!')).toBeInTheDocument();
    expect(screen.getAllByText('colima stop: exit status 1')).toHaveLength(1);
    expect(screen.getByText('Engine stop failed')).toBeInTheDocument();
    expect(screen.queryByText('Installation failed')).not.toBeInTheDocument();
    expect(screen.queryByText('Engine start failed')).not.toBeInTheDocument();
  });
});
