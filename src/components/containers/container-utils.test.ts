import { describe, expect, it } from 'vitest';
import { aContainer, inComposeProject } from '../../tests/containers';
import { ContainerState } from './container-types';
import {
  canDeleteContainer,
  canOpenContainerTerminal,
  canPauseContainer,
  canRestartContainer,
  canResumeContainer,
  canStartContainer,
  canStopContainer,
  formatContainerImage,
  formatContainerName,
  organizeContainers,
} from './container-utils';

const { Running, Exited, Created, Paused, Restarting } = ContainerState;

describe('container utils', () => {
  it('groups containers by their compose project and keeps the others individual', () => {
    const web = aContainer('web', Running, inComposeProject('shop'));
    const solo = aContainer('solo', Exited);
    const db = aContainer('db', Running, inComposeProject('shop'));

    const { individualContainers, groupedContainers } = organizeContainers(
      [web, solo, db],
      new Set()
    );

    expect(groupedContainers).toEqual([
      { projectName: 'shop', containers: [web, db], isExpanded: false },
    ]);
    expect(individualContainers).toEqual([solo]);
  });

  it('marks only the expanded groups as expanded', () => {
    const { groupedContainers } = organizeContainers(
      [
        aContainer('web', Running, inComposeProject('shop')),
        aContainer('worker', Running, inComposeProject('jobs')),
      ],
      new Set(['jobs'])
    );

    expect(
      groupedContainers.map(({ projectName, isExpanded }) => ({
        projectName,
        isExpanded,
      }))
    ).toEqual([
      { projectName: 'shop', isExpanded: false },
      { projectName: 'jobs', isExpanded: true },
    ]);
  });

  it.each([
    ['canStartContainer', canStartContainer, [Exited, Created]],
    ['canStopContainer', canStopContainer, [Running, Restarting]],
    ['canPauseContainer', canPauseContainer, [Running]],
    ['canResumeContainer', canResumeContainer, [Paused]],
    ['canRestartContainer', canRestartContainer, [Running, Restarting]],
    ['canDeleteContainer', canDeleteContainer, [Running, Exited, Created]],
    ['canOpenContainerTerminal', canOpenContainerTerminal, [Running]],
  ])(
    'offers each action only in the states that allow it: %s',
    (_name, allows, allowedStates) => {
      const states = [Running, Exited, Created, Paused, Restarting];

      const allowed = states.filter(state => allows(aContainer('web', state)));

      expect(allowed).toEqual(allowedStates);
    }
  );

  it('formats the name without its leading slash and the image without its digest', () => {
    expect(formatContainerName(aContainer('web', Running))).toBe('web');
    expect(
      formatContainerName(aContainer('web', Running, { names: ['plain'] }))
    ).toBe('plain');
    expect(formatContainerName(aContainer('web', Running, { names: [] }))).toBe(
      ''
    );
    expect(formatContainerImage('nginx:1.27@sha256:abc123')).toBe('nginx:1.27');
    expect(formatContainerImage('nginx:1.27')).toBe('nginx:1.27');
  });
});
