import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { errorMessage } from '../../../utils/error-message';
import {
  CreateContainerError,
  CreateContainerSpec,
  CreatedContainer,
} from './create-container-types';
import { pullTarget } from './image-reference';

export type CreateOutcome = { created: CreatedContainer } | { failure: string };

const SHORT_ID_LENGTH = 12;

const isNotStarted = (
  error: unknown
): error is Extract<CreateContainerError, { kind: 'not_started' }> =>
  typeof error === 'object' &&
  error !== null &&
  'kind' in error &&
  error.kind === 'not_started';

function describeFailure(error: unknown): string {
  if (!isNotStarted(error)) {
    return `Failed to create container: ${errorMessage(error)}`;
  }
  const aftermath = error.removed
    ? 'Nookat removed it again, so you can adjust the settings and try again.'
    : 'Nookat could not remove it, so delete it from the containers list before you try again.';
  return `The container was created but could not start: ${error.message}. ${aftermath}`;
}

export async function pullImage(reference: string): Promise<boolean> {
  const target = pullTarget(reference);
  if (!target) {
    toast.error(`Cannot pull ${reference}: pull a tagged image instead`);
    return false;
  }
  try {
    await invoke('pull_image', { ...target });
    toast.success(`Pulled ${reference}`);
    return true;
  } catch (error) {
    console.error(`Failed to pull ${reference}:`, error);
    toast.error(`Failed to pull ${reference}: ${errorMessage(error)}`);
    return false;
  }
}

export async function createContainer(
  spec: CreateContainerSpec,
  start: boolean
): Promise<CreateOutcome> {
  try {
    const created = await invoke<CreatedContainer>('create_container', {
      spec,
      start,
    });
    const container = spec.name ?? created.id.slice(0, SHORT_ID_LENGTH);
    toast.success(
      created.started
        ? `Created and started container ${container}`
        : `Created container ${container}`
    );
    created.warnings.forEach(warning => toast.warning(warning));
    return { created };
  } catch (error) {
    console.error('Failed to create container:', error);
    const failure = describeFailure(error);
    toast.error(failure);
    return { failure };
  }
}
