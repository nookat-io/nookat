export const messageId = (fieldId: string) => `${fieldId}-message`;

export const fieldAria = (fieldId: string, error?: string) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': messageId(fieldId),
});
