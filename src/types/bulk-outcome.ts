export interface BulkFailure {
  id: string;
  error: string;
}

export interface BulkOutcome {
  succeeded: string[];
  failed: BulkFailure[];
}

export const distinctReasons = (failed: BulkFailure[]) =>
  [...new Set(failed.map(failure => failure.error))].join('; ');
