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

export const describeFailures = (
  failed: BulkFailure[],
  label: (id: string) => string
) => {
  const labelsByReason = new Map<string, string[]>();
  for (const { id, error } of failed) {
    labelsByReason.set(error, [
      ...(labelsByReason.get(error) ?? []),
      label(id),
    ]);
  }
  return [...labelsByReason]
    .map(([reason, labels]) => `${labels.join(', ')}: ${reason}`)
    .join('; ');
};
