import { Dispatch } from 'react';
import { WizardAction, WizardForm } from '../wizard-state';
import { StepIssues } from '../wizard-validation';

export interface StepProps {
  form: WizardForm;
  issues: StepIssues;
  dispatch: Dispatch<WizardAction>;
}
