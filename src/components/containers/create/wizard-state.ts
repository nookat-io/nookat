import {
  KeyValue,
  PortProtocol,
  RestartPolicyName,
  StorageMountKind,
} from './create-container-types';

export const WIZARD_STEPS = [
  { id: 'image', title: 'Image' },
  { id: 'general', title: 'General' },
  { id: 'ports', title: 'Ports' },
  { id: 'storage', title: 'Storage' },
  { id: 'environment', title: 'Environment' },
  { id: 'network', title: 'Network and resources' },
  { id: 'review', title: 'Review' },
] as const;

export type StepId = (typeof WIZARD_STEPS)[number]['id'];

export type MemoryUnit = 'MiB' | 'GiB';

export interface PortRow {
  id: number;
  containerPort: string;
  protocol: PortProtocol;
  hostPort: string;
  hostIp: string;
}

export interface MountRow {
  id: number;
  kind: StorageMountKind;
  source: string;
  target: string;
  readOnly: boolean;
}

export interface KeyValueRow {
  id: number;
  key: string;
  value: string;
}

interface RowTypes {
  ports: PortRow;
  mounts: MountRow;
  env: KeyValueRow;
  labels: KeyValueRow;
}

export type RowList = keyof RowTypes;

export type RowFields<L extends RowList> = Omit<RowTypes[L], 'id'>;

type RowsByList = { [L in RowList]: RowTypes[L][] };

export interface WizardForm extends RowsByList {
  image: string;
  name: string;
  command: string;
  entrypoint: string;
  workingDir: string;
  restartPolicy: RestartPolicyName;
  maxRetries: string;
  autoRemove: boolean;
  network: string;
  cpus: string;
  memory: string;
  memoryUnit: MemoryUnit;
  startAfterCreate: boolean;
}

export interface WizardState {
  step: StepId;
  form: WizardForm;
  pulledImages: string[];
  nextRowId: number;
}

type ScalarField = Exclude<keyof WizardForm, RowList>;

export type WizardAction =
  | { type: 'goTo'; step: StepId }
  | {
      [F in ScalarField]: { type: 'set'; field: F; value: WizardForm[F] };
    }[ScalarField]
  | {
      [L in RowList]: {
        type: 'addRow';
        list: L;
        fields?: Partial<RowFields<L>>;
      };
    }[RowList]
  | {
      [L in RowList]: {
        type: 'updateRow';
        list: L;
        id: number;
        patch: Partial<RowFields<L>>;
      };
    }[RowList]
  | { type: 'removeRow'; list: RowList; id: number }
  | { type: 'importEnv'; entries: KeyValue[] }
  | { type: 'imagePulled'; reference: string }
  | { type: 'reset' };

const blankRow: { [L in RowList]: (id: number) => RowTypes[L] } = {
  ports: id => ({
    id,
    containerPort: '',
    protocol: 'tcp',
    hostPort: '',
    hostIp: '',
  }),
  mounts: id => ({
    id,
    kind: 'volume',
    source: '',
    target: '',
    readOnly: false,
  }),
  env: id => ({ id, key: '', value: '' }),
  labels: id => ({ id, key: '', value: '' }),
};

export const isBlankPort = (row: PortRow) =>
  !row.containerPort.trim() && !row.hostPort.trim() && !row.hostIp.trim();

export const isBlankMount = (row: MountRow) =>
  !row.source.trim() && !row.target.trim();

export const isBlankKeyValue = (row: KeyValueRow) =>
  !row.key.trim() && !row.value;

export function initialWizardState(): WizardState {
  return {
    step: 'image',
    form: {
      image: '',
      name: '',
      command: '',
      entrypoint: '',
      workingDir: '',
      restartPolicy: 'no',
      maxRetries: '',
      autoRemove: false,
      ports: [],
      mounts: [],
      env: [],
      labels: [],
      network: '',
      cpus: '',
      memory: '',
      memoryUnit: 'MiB',
      startAfterCreate: true,
    },
    pulledImages: [],
    nextRowId: 1,
  };
}

function rowsOf<L extends RowList>(lists: RowsByList, list: L): RowTypes[L][] {
  return lists[list];
}

function withRows<L extends RowList>(
  form: WizardForm,
  list: L,
  rows: RowTypes[L][]
): WizardForm {
  return { ...form, [list]: rows };
}

function addRow<L extends RowList>(
  state: WizardState,
  list: L,
  fields: Partial<RowFields<L>> = {}
): WizardState {
  const row = { ...blankRow[list](state.nextRowId), ...fields };
  return {
    ...state,
    nextRowId: state.nextRowId + 1,
    form: withRows(state.form, list, [...rowsOf(state.form, list), row]),
  };
}

function updateRow<L extends RowList>(
  form: WizardForm,
  list: L,
  id: number,
  patch: Partial<RowFields<L>>
): WizardForm {
  const rows = rowsOf(form, list).map(row =>
    row.id === id ? { ...row, ...patch } : row
  );
  return withRows(form, list, rows);
}

function removeRow<L extends RowList>(
  form: WizardForm,
  list: L,
  id: number
): WizardForm {
  const rows = rowsOf(form, list).filter(row => row.id !== id);
  return withRows(form, list, rows);
}

function importEnv(state: WizardState, entries: KeyValue[]): WizardState {
  let nextRowId = state.nextRowId;
  const env = state.form.env.filter(row => !isBlankKeyValue(row));
  for (const { key, value } of entries) {
    const existing = env.findIndex(row => row.key.trim() === key);
    if (existing === -1) {
      env.push({ id: nextRowId++, key, value });
    } else {
      env[existing] = { ...env[existing], value };
    }
  }
  return { ...state, nextRowId, form: { ...state.form, env } };
}

export function wizardReducer(
  state: WizardState,
  action: WizardAction
): WizardState {
  switch (action.type) {
    case 'goTo':
      return { ...state, step: action.step };
    case 'set':
      return {
        ...state,
        form: { ...state.form, [action.field]: action.value },
      };
    case 'addRow':
      return addRow(state, action.list, action.fields);
    case 'updateRow':
      return {
        ...state,
        form: updateRow(state.form, action.list, action.id, action.patch),
      };
    case 'removeRow':
      return { ...state, form: removeRow(state.form, action.list, action.id) };
    case 'importEnv':
      return importEnv(state, action.entries);
    case 'imagePulled':
      return {
        ...state,
        pulledImages: [...new Set([...state.pulledImages, action.reference])],
        form: { ...state.form, image: action.reference },
      };
    case 'reset':
      return initialWizardState();
  }
}
