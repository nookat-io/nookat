import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InstallationProgress } from './installation-progress';
import { EngineActionsCard } from './engine-actions-card';
import { EngineOperation, InstallationProgress as Progress } from '../types';

const progressAt = (step: string): Progress => ({
  step,
  message: '',
  percentage: 100,
  logs: [],
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
