import { describe, expect, it } from 'vitest';
import {
  initialWizardState,
  WizardAction,
  wizardReducer,
  WizardState,
} from './wizard-state';

const apply = (...actions: WizardAction[]): WizardState =>
  actions.reduce(wizardReducer, initialWizardState());

describe('wizardReducer', () => {
  it('starts on the image step with nothing chosen and starting after create on', () => {
    const state = initialWizardState();

    expect(state.step).toBe('image');
    expect(state.form.image).toBe('');
    expect(state.form.restartPolicy).toBe('no');
    expect(state.form.startAfterCreate).toBe(true);
    expect(state.form.ports).toEqual([]);
  });

  it('moves to any step it is told to', () => {
    expect(apply({ type: 'goTo', step: 'storage' }).step).toBe('storage');
  });

  it('sets single fields without touching the others', () => {
    const state = apply(
      { type: 'set', field: 'name', value: 'web' },
      { type: 'set', field: 'autoRemove', value: true }
    );

    expect(state.form.name).toBe('web');
    expect(state.form.autoRemove).toBe(true);
    expect(state.form.image).toBe('');
  });

  it('adds blank rows with ids that stay unique across lists', () => {
    const state = apply(
      { type: 'addRow', list: 'ports' },
      { type: 'addRow', list: 'mounts', fields: { kind: 'bind' } },
      { type: 'addRow', list: 'env' },
      { type: 'addRow', list: 'ports' }
    );

    expect(state.form.ports).toEqual([
      { id: 1, containerPort: '', protocol: 'tcp', hostPort: '', hostIp: '' },
      { id: 4, containerPort: '', protocol: 'tcp', hostPort: '', hostIp: '' },
    ]);
    expect(state.form.mounts).toEqual([
      { id: 2, kind: 'bind', source: '', target: '', readOnly: false },
    ]);
    expect(state.form.env).toEqual([{ id: 3, key: '', value: '' }]);
  });

  it('updates and removes only the row with the given id', () => {
    const state = apply(
      { type: 'addRow', list: 'ports' },
      { type: 'addRow', list: 'ports' },
      { type: 'updateRow', list: 'ports', id: 2, patch: { hostPort: '8080' } },
      { type: 'updateRow', list: 'ports', id: 1, patch: { protocol: 'udp' } },
      { type: 'removeRow', list: 'ports', id: 1 }
    );

    expect(state.form.ports).toEqual([
      {
        id: 2,
        containerPort: '',
        protocol: 'tcp',
        hostPort: '8080',
        hostIp: '',
      },
    ]);
  });

  it('imports a pasted .env block, overwriting keys already set and dropping blank rows', () => {
    const state = apply(
      { type: 'addRow', list: 'env' },
      { type: 'updateRow', list: 'env', id: 1, patch: { key: 'MODE' } },
      { type: 'addRow', list: 'env' },
      {
        type: 'importEnv',
        entries: [
          { key: 'MODE', value: 'prod' },
          { key: 'PORT', value: '8080' },
        ],
      }
    );

    expect(state.form.env).toEqual([
      { id: 1, key: 'MODE', value: 'prod' },
      { id: 3, key: 'PORT', value: '8080' },
    ]);
    expect(state.nextRowId).toBe(4);
  });

  it('remembers a pulled image and selects it', () => {
    const state = apply(
      { type: 'imagePulled', reference: 'nginx:1.27' },
      { type: 'imagePulled', reference: 'nginx:1.27' }
    );

    expect(state.form.image).toBe('nginx:1.27');
    expect(state.pulledImages).toEqual(['nginx:1.27']);
  });

  it('resets to a fresh wizard', () => {
    const state = apply(
      { type: 'set', field: 'name', value: 'web' },
      { type: 'goTo', step: 'review' },
      { type: 'reset' }
    );

    expect(state).toEqual(initialWizardState());
  });
});
