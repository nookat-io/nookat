import { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../ui/dialog';
import { createContainer, pullImage } from './create-container-actions-service';
import { dockerRunCommand } from './docker-run-command';
import { EnvironmentStep } from './steps/environment-step';
import { GeneralStep } from './steps/general-step';
import { ImageStep } from './steps/image-step';
import { NetworkStep } from './steps/network-step';
import { PortsStep } from './steps/ports-step';
import { ReviewStep } from './steps/review-step';
import { StorageStep } from './steps/storage-step';
import { useCreateContainerWizard } from './use-create-container-wizard';
import { StepId, WIZARD_STEPS } from './wizard-state';
import { invalidSteps } from './wizard-validation';
import { WizardStepper } from './wizard-stepper';

const STEP_DESCRIPTIONS: Record<StepId, string> = {
  image: 'Pick a local image, or type a reference to pull one.',
  general:
    'Name the container and override how it runs. Everything here is optional.',
  ports: 'Publish container ports on this machine.',
  storage: 'Keep data in named volumes or share folders from this machine.',
  environment: 'Set environment variables and labels.',
  network: 'Attach the container to a network and limit its CPU and memory.',
  review: 'Check the settings, then create the container.',
};

export function CreateContainerDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [pulling, setPulling] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const wizard = useCreateContainerWizard();
  const { state, dispatch, issues, context, spec } = wizard;
  const isBusy = isCreating || pulling !== null;
  const step = WIZARD_STEPS[wizard.currentIndex];
  const startAfterCreate = state.form.startAfterCreate;

  const handleOpenChange = (open: boolean) => {
    if (open) {
      dispatch({ type: 'reset' });
      setFailure(null);
      setIsOpen(true);
    } else if (!isBusy) {
      setIsOpen(false);
    }
  };

  const handlePull = async (reference: string) => {
    setPulling(reference);
    const pulled = await pullImage(reference);
    setPulling(null);
    if (pulled) {
      dispatch({ type: 'imagePulled', reference });
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    setFailure(null);
    const outcome = await createContainer(spec, startAfterCreate);
    setIsCreating(false);
    if ('created' in outcome) {
      setIsOpen(false);
    } else {
      setFailure(outcome.failure);
    }
  };

  const stepProps = {
    form: state.form,
    issues: issues[state.step],
    dispatch,
  };

  const renderStep = () => {
    switch (state.step) {
      case 'image':
        return (
          <ImageStep
            {...stepProps}
            choices={wizard.imageChoices}
            pulling={pulling}
            onPull={handlePull}
          />
        );
      case 'general':
        return <GeneralStep {...stepProps} />;
      case 'ports':
        return <PortsStep {...stepProps} />;
      case 'storage':
        return <StorageStep {...stepProps} volumes={context.volumes} />;
      case 'environment':
        return <EnvironmentStep {...stepProps} />;
      case 'network':
        return <NetworkStep {...stepProps} networks={context.networks} />;
      case 'review':
        return (
          <ReviewStep
            spec={spec}
            command={dockerRunCommand(spec, startAfterCreate)}
            startAfterCreate={startAfterCreate}
            volumes={context.volumes}
            failure={failure}
            onEdit={wizard.goTo}
            dispatch={dispatch}
          />
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Create Container
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex h-[min(44rem,calc(100vh-2rem))] max-w-4xl flex-col gap-0 overflow-hidden p-0"
        onInteractOutside={event => event.preventDefault()}
        onEscapeKeyDown={event => {
          if (isBusy) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="border-b px-6 pb-4 pt-6">
          <DialogTitle>Create Container</DialogTitle>
          <DialogDescription>
            Configure a new container step by step.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <div className="w-56 shrink-0 overflow-y-auto border-r bg-muted/30 p-3">
            <WizardStepper
              current={state.step}
              invalid={invalidSteps(issues)}
              canVisit={wizard.canVisit}
              onSelect={wizard.goTo}
              disabled={isBusy}
            />
          </div>

          <section
            key={state.step}
            aria-labelledby="wizard-step-title"
            className="min-w-0 flex-1 space-y-5 overflow-y-auto px-6 py-5"
          >
            <div className="space-y-1">
              <h3 id="wizard-step-title" className="text-base font-semibold">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {STEP_DESCRIPTIONS[state.step]}
              </p>
            </div>
            {renderStep()}
          </section>
        </div>

        <div className="flex items-center justify-between gap-4 border-t px-6 py-4">
          <span className="text-sm text-muted-foreground">
            Step {wizard.currentIndex + 1} of {WIZARD_STEPS.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={wizard.goBack}
              disabled={wizard.currentIndex === 0 || isBusy}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            {state.step === 'review' ? (
              <Button
                onClick={handleCreate}
                disabled={!wizard.isComplete || isBusy}
                className="min-w-36"
              >
                {isCreating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isCreating
                  ? 'Creating...'
                  : startAfterCreate
                    ? 'Create and start'
                    : 'Create'}
              </Button>
            ) : (
              <Button
                onClick={wizard.goNext}
                disabled={!wizard.canGoNext || isBusy}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
