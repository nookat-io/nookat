import { useCallback, useMemo, useReducer } from 'react';
import { useEngineState } from '../../../hooks/use-engine-state';
import { localImageReference } from './image-reference';
import {
  initialWizardState,
  StepId,
  WIZARD_STEPS,
  wizardReducer,
} from './wizard-state';
import {
  hasErrors,
  invalidSteps,
  toCreateContainerSpec,
  validateWizard,
  wizardContext,
} from './wizard-validation';

export interface ImageChoice {
  reference: string;
  size: number | null;
}

const stepIndex = (step: StepId) =>
  WIZARD_STEPS.findIndex(candidate => candidate.id === step);

export function useCreateContainerWizard() {
  const { engineState } = useEngineState();
  const [state, dispatch] = useReducer(
    wizardReducer,
    undefined,
    initialWizardState
  );

  const context = useMemo(
    () => wizardContext(engineState, state.pulledImages),
    [engineState, state.pulledImages]
  );
  const issues = useMemo(
    () => validateWizard(state.form, context),
    [state.form, context]
  );
  const spec = useMemo(() => toCreateContainerSpec(state.form), [state.form]);

  const imageChoices = useMemo<ImageChoice[]>(() => {
    const sizes = new Map(
      Object.values(engineState?.images ?? {}).map(image => [
        localImageReference(image),
        image.size,
      ])
    );
    return context.localImages.map(reference => ({
      reference,
      size: sizes.get(reference) ?? null,
    }));
  }, [engineState, context.localImages]);

  const blockingSteps = useMemo(() => invalidSteps(issues), [issues]);
  const currentIndex = stepIndex(state.step);

  const canVisit = useCallback(
    (step: StepId) =>
      blockingSteps.every(blocking => stepIndex(blocking) >= stepIndex(step)),
    [blockingSteps]
  );

  const goTo = useCallback(
    (step: StepId) => {
      if (canVisit(step)) {
        dispatch({ type: 'goTo', step });
      }
    },
    [canVisit]
  );

  const nextStep = WIZARD_STEPS[currentIndex + 1]?.id;
  const previousStep = WIZARD_STEPS[currentIndex - 1]?.id;

  return {
    state,
    dispatch,
    context,
    issues,
    spec,
    imageChoices,
    currentIndex,
    canVisit,
    goTo,
    canGoNext: nextStep !== undefined && !hasErrors(issues[state.step]),
    goNext: () => nextStep && goTo(nextStep),
    goBack: () => previousStep && goTo(previousStep),
    isComplete: blockingSteps.length === 0,
  };
}
